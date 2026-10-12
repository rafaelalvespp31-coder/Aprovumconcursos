import "server-only";
import { AnthropicProvider } from "./anthropic";
import { OpenAICompatProvider } from "./openai-compat";
import { AIError, type AIProvider } from "./provider";

function numberOrNull(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

let cached: AIProvider | null = null;

/** Endereços e variáveis de chave dos provedores compatíveis. */
const COMPAT_PRESETS: Record<string, { baseUrl: string; keyVar: string; keyRequired: boolean }> = {
  gemini: { baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", keyVar: "GEMINI_API_KEY", keyRequired: true },
  groq: { baseUrl: "https://api.groq.com/openai/v1", keyVar: "GROQ_API_KEY", keyRequired: true },
  openrouter: { baseUrl: "https://openrouter.ai/api/v1", keyVar: "OPENROUTER_API_KEY", keyRequired: true },
  // Qualquer servidor compatível (ex.: Ollama local em http://localhost:11434/v1). Chave opcional.
  openai_compat: { baseUrl: "", keyVar: "AI_API_KEY", keyRequired: false },
};

/** Onde a IA é usada: estudos dos alunos (aulas) ou banco de questões (equipe). */
export type AIScope = "estudos" | "banco";

/**
 * Modo só catálogo: a IA fica desligada até `AI_ENABLED` no servidor.
 *  - `true`  → liga tudo (aulas dos alunos e banco de questões);
 *  - `banco` → liga só a geração de questões do banco (equipe); aulas continuam só do catálogo.
 * Desligada, nenhuma chamada à IA é feita.
 */
export function aiEnabled(scope: AIScope = "estudos"): boolean {
  const v = process.env.AI_ENABLED?.trim().toLowerCase();
  return v === "true" || (scope === "banco" && v === "banco");
}

export const AI_DISABLED_MESSAGE =
  "A geração por IA está temporariamente desativada. No momento, os estudos usam apenas os conteúdos do catálogo do APROVUM.";

/**
 * Seleciona o provedor por variável de ambiente. Sem configuração válida, falha
 * explicitamente — nunca cai em um gerador de conteúdo fictício.
 */
export function getAIProvider(scope: AIScope = "estudos"): AIProvider {
  if (!aiEnabled(scope)) {
    throw new AIError(scope === "banco" ? "A geração de questões por IA está desligada (defina AI_ENABLED=banco no servidor)." : AI_DISABLED_MESSAGE, "not_configured", false);
  }
  if (cached) return cached;
  const provider = (process.env.AI_PROVIDER ?? "anthropic").toLowerCase();
  switch (provider) {
    case "anthropic": {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      const model = process.env.AI_MODEL;
      if (!apiKey || !model) {
        throw new AIError(
          "IA não configurada: defina ANTHROPIC_API_KEY e AI_MODEL no ambiente do servidor.",
          "not_configured",
          false,
        );
      }
      cached = new AnthropicProvider({
        apiKey,
        model,
        inputPricePerMTok: numberOrNull(process.env.AI_PRICE_INPUT_PER_MTOK),
        outputPricePerMTok: numberOrNull(process.env.AI_PRICE_OUTPUT_PER_MTOK),
        maxRetries: 2,
      });
      return cached;
    }
    // Opções gratuitas/compatíveis (formato "chat completions").
    case "gemini":
    case "groq":
    case "openrouter":
    case "openai_compat": {
      const preset = COMPAT_PRESETS[provider]!;
      // trim: valores colados pelo celular costumam vir com espaço ou quebra de linha.
      const apiKey = process.env[preset.keyVar]?.trim() || null;
      const model = process.env.AI_MODEL?.trim();
      const baseUrl = process.env.AI_BASE_URL || preset.baseUrl;
      if (!model || !baseUrl || (preset.keyRequired && !apiKey)) {
        throw new AIError(
          `IA não configurada: defina ${preset.keyRequired ? `${preset.keyVar}, ` : ""}AI_MODEL${preset.baseUrl ? "" : " e AI_BASE_URL"} no ambiente do servidor.`,
          "not_configured",
          false,
        );
      }
      cached = new OpenAICompatProvider({
        name: provider,
        baseUrl,
        apiKey,
        model,
        inputPricePerMTok: numberOrNull(process.env.AI_PRICE_INPUT_PER_MTOK),
        outputPricePerMTok: numberOrNull(process.env.AI_PRICE_OUTPUT_PER_MTOK),
        jsonMode: process.env.AI_JSON_MODE === "object" ? "object" : "schema",
        reasoningEffort: process.env.AI_REASONING_EFFORT?.trim() || null,
        // Planos gratuitos limitam tokens por minuto: o teto de saída evita pedidos recusados por tamanho.
        maxOutputTokensCap: numberOrNull(process.env.AI_MAX_OUTPUT_TOKENS) ?? (provider === "groq" ? 6000 : null),
        keyVar: preset.keyVar,
        // Google aceita a chave (AIza… ou o formato novo AQ.…) em x-goog-api-key; o "Bearer" é lido como token OAuth.
        keyHeader: provider === "gemini" ? "x-goog-api-key" : "bearer",
        headers: provider === "openrouter" ? { "X-Title": "APROVUM", ...(process.env.NEXT_PUBLIC_SITE_URL ? { "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL } : {}) } : undefined,
      });
      return cached;
    }
    default:
      throw new AIError(`Provedor de IA "${provider}" não suportado.`, "not_configured", false);
  }
}

export function aiIsConfigured(scope: AIScope = "estudos"): boolean {
  try {
    getAIProvider(scope);
    return true;
  } catch {
    return false;
  }
}

export { AIError } from "./provider";
export type { AIProvider } from "./provider";
