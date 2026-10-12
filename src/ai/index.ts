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

/**
 * Modo só catálogo: a IA fica desligada até `AI_ENABLED=true` no servidor.
 * Desligada, os estudos vêm só do catálogo revisado e nenhuma chamada à IA é feita.
 */
export function aiEnabled(): boolean {
  return process.env.AI_ENABLED?.trim().toLowerCase() === "true";
}

export const AI_DISABLED_MESSAGE =
  "A geração por IA está temporariamente desativada. No momento, os estudos usam apenas os conteúdos do catálogo do APROVUM.";

/**
 * Seleciona o provedor por variável de ambiente. Sem configuração válida, falha
 * explicitamente — nunca cai em um gerador de conteúdo fictício.
 */
export function getAIProvider(): AIProvider {
  if (!aiEnabled()) throw new AIError(AI_DISABLED_MESSAGE, "not_configured", false);
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

export function aiIsConfigured(): boolean {
  try {
    getAIProvider();
    return true;
  } catch {
    return false;
  }
}

export { AIError } from "./provider";
export type { AIProvider } from "./provider";
