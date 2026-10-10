import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AIError, type AIProvider, type AIUsage, type StructuredRequest, type StructuredResult } from "./provider";

interface AnthropicConfig {
  apiKey: string;
  model: string;
  /** Preço em USD por milhão de tokens; nulo = custo desconhecido. */
  inputPricePerMTok: number | null;
  outputPricePerMTok: number | null;
  maxRetries: number;
}

/**
 * Adaptador Anthropic. Saída estruturada via ferramenta obrigatória (tool_choice),
 * depois validada com Zod. Uma resposta inválida gera UMA nova tentativa com o erro
 * de validação como retorno; persistindo, falha de forma explícita.
 */
export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model: string;
  private client: Anthropic;

  constructor(private readonly config: AnthropicConfig) {
    this.model = config.model;
    this.client = new Anthropic({ apiKey: config.apiKey, maxRetries: config.maxRetries });
  }

  async generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const started = Date.now();
    const inputSchema = z.toJSONSchema(req.schema, { target: "draft-2020-12" }) as Record<string, unknown>;
    delete inputSchema.$schema;
    const toolName = req.schemaName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);

    const usage: AIUsage = { inputTokens: 0, outputTokens: 0, estimatedCostUsd: null };
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: req.prompt }];

    for (let attempt = 1; attempt <= 2; attempt++) {
      let response: Anthropic.Message;
      try {
        response = await this.client.messages.create(
          {
            model: this.model,
            max_tokens: req.maxOutputTokens,
            temperature: req.temperature ?? 0.2,
            system: req.system,
            messages,
            tools: [
              {
                name: toolName,
                description: "Registra a resposta no formato estruturado exigido.",
                input_schema: inputSchema as Anthropic.Tool.InputSchema,
              },
            ],
            tool_choice: { type: "tool", name: toolName },
          },
          { timeout: req.timeoutMs ?? 120_000 },
        );
      } catch (err) {
        throw this.classify(err, usage);
      }

      usage.inputTokens += response.usage.input_tokens;
      usage.outputTokens += response.usage.output_tokens;
      usage.estimatedCostUsd = this.cost(usage);

      if (response.stop_reason === "refusal") {
        throw new AIError("O provedor de IA recusou a solicitação.", "refused", false, usage);
      }
      const block = response.content.find(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === toolName,
      );
      if (response.stop_reason === "max_tokens") {
        throw new AIError("A resposta da IA excedeu o limite de tamanho e foi truncada.", "invalid_output", true, usage);
      }
      if (!block) {
        throw new AIError("A IA não retornou a resposta estruturada.", "invalid_output", true, usage);
      }

      const parsed = req.schema.safeParse(block.input);
      if (parsed.success) {
        return {
          data: parsed.data,
          usage,
          model: response.model,
          provider: this.name,
          latencyMs: Date.now() - started,
          attempts: attempt,
        };
      }
      if (attempt === 2) {
        throw new AIError(
          `Resposta da IA fora do formato esperado: ${z.prettifyError(parsed.error).slice(0, 500)}`,
          "invalid_output",
          true,
          usage,
        );
      }
      messages.push(
        { role: "assistant", content: response.content },
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: block.id,
              is_error: true,
              content: `A resposta não passou na validação. Corrija e chame a ferramenta novamente.\n${z.prettifyError(parsed.error).slice(0, 2000)}`,
            },
          ],
        },
      );
    }
    throw new AIError("Falha inesperada na geração.", "provider_error", true, usage);
  }

  private cost(u: AIUsage): number | null {
    const { inputPricePerMTok: i, outputPricePerMTok: o } = this.config;
    if (i === null || o === null) return null;
    return (u.inputTokens * i + u.outputTokens * o) / 1_000_000;
  }

  private classify(err: unknown, usage: AIUsage): AIError {
    if (err instanceof Anthropic.APIConnectionTimeoutError) {
      return new AIError("Tempo limite excedido ao consultar a IA.", "timeout", true, usage);
    }
    if (err instanceof Anthropic.RateLimitError) {
      return new AIError("Limite de uso do provedor de IA atingido. Tente novamente em instantes.", "rate_limited", true, usage);
    }
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      return new AIError("Credencial do provedor de IA inválida.", "not_configured", false, usage);
    }
    if (err instanceof Anthropic.APIError) {
      const retryable = (err.status ?? 500) >= 500 || err.status === 529;
      // Não propaga corpo de erro do provedor (pode conter detalhes internos).
      return new AIError(`Erro do provedor de IA (HTTP ${err.status ?? "?"}).`, "provider_error", retryable, usage);
    }
    return new AIError("Falha de comunicação com o provedor de IA.", "provider_error", true, usage);
  }
}
