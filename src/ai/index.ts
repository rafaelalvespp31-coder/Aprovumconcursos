import "server-only";
import { AnthropicProvider } from "./anthropic";
import { AIError, type AIProvider } from "./provider";

function numberOrNull(v: string | undefined): number | null {
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

let cached: AIProvider | null = null;

/**
 * Seleciona o provedor por variável de ambiente. Sem configuração válida, falha
 * explicitamente — nunca cai em um gerador de conteúdo fictício.
 */
export function getAIProvider(): AIProvider {
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
