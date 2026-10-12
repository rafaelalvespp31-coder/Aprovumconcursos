import "server-only";
import { z } from "zod";
import { AIError, type AIProvider, type AIUsage, type StructuredRequest, type StructuredResult } from "./provider";

/**
 * Adaptador para APIs compatíveis com "chat completions" (formato OpenAI).
 * Cobre opções GRATUITAS ou de baixo custo sem SDK extra:
 *  - Google Gemini (camada gratuita do Google AI Studio), pelo endpoint de compatibilidade;
 *  - Groq, OpenRouter (modelos ":free") e servidores locais como Ollama.
 * Mesma garantia do adaptador Anthropic: a resposta é validada com Zod; se vier fora do
 * formato, há UMA nova tentativa com o erro de validação; persistindo, falha explícita.
 */
export interface OpenAICompatConfig {
  name: string;
  baseUrl: string;
  apiKey: string | null;
  model: string;
  inputPricePerMTok: number | null;
  outputPricePerMTok: number | null;
  /** "schema" = response_format json_schema; "object" = só JSON (o esquema vai no prompt). */
  jsonMode: "schema" | "object";
  /** Esforço de raciocínio dos modelos que "pensam" (ex.: Gemini): "low" economiza cota e evita truncar. */
  reasoningEffort?: string | null;
  /** Cabeçalhos extras (ex.: OpenRouter pede identificação do app). */
  headers?: Record<string, string>;
}

/** Palavras-chave de JSON Schema aceitas pela maioria dos provedores compatíveis. */
const KEEP = new Set([
  "type", "properties", "required", "items", "enum", "description", "title",
  "minimum", "maximum", "minItems", "maxItems", "additionalProperties", "anyOf",
]);

/**
 * Reduz o JSON Schema gerado pelo Zod ao subconjunto amplamente suportado
 * (Gemini e outros rejeitam `pattern`, `minLength`, `$schema` etc.). As regras
 * removidas continuam valendo: o Zod valida a resposta depois.
 */
export function sanitizeSchema(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(sanitizeSchema);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (!KEEP.has(k)) continue;
    if (k === "properties" && v && typeof v === "object") {
      out[k] = Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([p, s]) => [p, sanitizeSchema(s)]));
    } else if (k === "additionalProperties") {
      out[k] = typeof v === "boolean" ? v : sanitizeSchema(v);
    } else {
      out[k] = sanitizeSchema(v);
    }
  }
  return out;
}

/** Extrai o JSON da resposta, tolerando cercas ```json e texto em volta. */
export function parseJsonLoose(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf("{");
    const end = t.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw new Error("sem JSON");
  }
}

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatResponse {
  model?: string;
  choices?: Array<{ finish_reason?: string; message?: { content?: string | null; refusal?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

export class OpenAICompatProvider implements AIProvider {
  readonly name: string;
  readonly model: string;
  private jsonMode: "schema" | "object";

  constructor(private readonly config: OpenAICompatConfig) {
    this.name = config.name;
    this.model = config.model;
    this.jsonMode = config.jsonMode;
  }

  async generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const started = Date.now();
    const raw = z.toJSONSchema(req.schema, { target: "draft-2020-12" }) as Record<string, unknown>;
    const schema = sanitizeSchema(raw) as Record<string, unknown>;
    const name = req.schemaName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
    const usage: AIUsage = { inputTokens: 0, outputTokens: 0, estimatedCostUsd: null };
    const schemaHint = `\n\nResponda SOMENTE com um objeto JSON válido (sem texto antes ou depois) que siga este JSON Schema:\n${JSON.stringify(raw)}`;
    const messages: ChatMessage[] = [
      { role: "system", content: req.system },
      { role: "user", content: req.prompt + schemaHint },
    ];

    for (let attempt = 1; attempt <= 2; attempt++) {
      const res = await this.call(messages, req, name, schema, usage);
      usage.inputTokens += res.usage?.prompt_tokens ?? 0;
      usage.outputTokens += res.usage?.completion_tokens ?? 0;
      usage.estimatedCostUsd = this.cost(usage);

      const choice = res.choices?.[0];
      if (choice?.message?.refusal) throw new AIError("O provedor de IA recusou a solicitação.", "refused", false, usage);
      if (choice?.finish_reason === "length") {
        throw new AIError("A resposta da IA excedeu o limite de tamanho e foi truncada.", "invalid_output", true, usage);
      }
      if (choice?.finish_reason === "content_filter") {
        throw new AIError("O provedor de IA bloqueou a resposta pelo filtro de conteúdo.", "refused", false, usage);
      }
      const content = choice?.message?.content ?? "";
      let data: unknown;
      let problem: string;
      try {
        data = parseJsonLoose(content);
        const parsed = req.schema.safeParse(data);
        if (parsed.success) {
          return { data: parsed.data, usage, model: res.model ?? this.model, provider: this.name, latencyMs: Date.now() - started, attempts: attempt };
        }
        problem = z.prettifyError(parsed.error);
      } catch {
        problem = "A resposta não é um JSON válido.";
      }
      if (attempt === 2) {
        throw new AIError(`Resposta da IA fora do formato esperado: ${problem.slice(0, 500)}`, "invalid_output", true, usage);
      }
      messages.push(
        { role: "assistant", content: content.slice(0, 20_000) },
        { role: "user", content: `A resposta não passou na validação. Corrija e responda novamente só com o JSON completo.\n${problem.slice(0, 2000)}` },
      );
    }
    throw new AIError("Falha inesperada na geração.", "provider_error", true, usage);
  }

  private async call(messages: ChatMessage[], req: StructuredRequest<unknown>, name: string, schema: Record<string, unknown>, usage: AIUsage): Promise<ChatResponse> {
    const body = (mode: "schema" | "object") => ({
      model: this.model,
      messages,
      temperature: req.temperature ?? 0.2,
      max_tokens: req.maxOutputTokens,
      ...(this.config.reasoningEffort ? { reasoning_effort: this.config.reasoningEffort } : {}),
      response_format: mode === "schema" ? { type: "json_schema", json_schema: { name, strict: false, schema } } : { type: "json_object" },
    });
    let res = await this.post(body(this.jsonMode), req.timeoutMs, usage);
    // Alguns modelos não aceitam json_schema: cai para JSON simples (o esquema já está no prompt).
    if (res.status === 400 && this.jsonMode === "schema") {
      const text = await res.text();
      if (/response_format|json_schema|schema/i.test(text)) {
        this.jsonMode = "object";
        res = await this.post(body("object"), req.timeoutMs, usage);
      } else {
        throw new AIError("Erro do provedor de IA (HTTP 400).", "provider_error", false, usage);
      }
    }
    if (!res.ok) throw this.classify(res.status, usage);
    return (await res.json()) as ChatResponse;
  }

  private async post(body: unknown, timeoutMs: number | undefined, usage: AIUsage): Promise<Response> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs ?? 120_000);
    try {
      return await fetch(`${this.config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
          ...this.config.headers,
        },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
    } catch (e) {
      if ((e as Error).name === "AbortError") throw new AIError("Tempo limite excedido ao consultar a IA.", "timeout", true, usage);
      throw new AIError("Falha de comunicação com o provedor de IA.", "provider_error", true, usage);
    } finally {
      clearTimeout(timer);
    }
  }

  private cost(u: AIUsage): number | null {
    const { inputPricePerMTok: i, outputPricePerMTok: o } = this.config;
    if (i === null || o === null) return null;
    return (u.inputTokens * i + u.outputTokens * o) / 1_000_000;
  }

  private classify(status: number, usage: AIUsage): AIError {
    if (status === 429) {
      return new AIError("Limite gratuito do provedor de IA atingido. Aguarde alguns minutos e tente novamente.", "rate_limited", true, usage);
    }
    if (status === 401 || status === 403) return new AIError("Credencial do provedor de IA inválida.", "not_configured", false, usage);
    // Não propaga o corpo do erro do provedor (pode conter detalhes internos).
    return new AIError(`Erro do provedor de IA (HTTP ${status}).`, "provider_error", status >= 500, usage);
  }
}
