import "server-only";
import { aiBankOutputSchema, buildBankPrompt, type AIBankOutput, type GenerationParams } from "@/domain/bank/generation";
import type { AIProvider, StructuredResult } from "./provider";

/**
 * Chamada à IA para um lote pequeno de questões do banco. Independente do fornecedor
 * (recebe o AIProvider). A validação determinística acontece depois, em validateBankQuestions.
 */
export async function generateBankChunk(
  provider: AIProvider,
  params: GenerationParams,
  n: number,
  avoid: readonly string[],
  boardName?: string,
): Promise<StructuredResult<AIBankOutput>> {
  const { system, prompt } = buildBankPrompt(params, n, avoid, boardName);
  return provider.generateStructured({
    task: "generate_questions",
    schemaName: "questoes_ineditas",
    system,
    prompt,
    schema: aiBankOutputSchema,
    // ~1.200 tokens por questão de múltipla escolha completa; o provedor ainda aplica o teto do plano.
    maxOutputTokens: Math.min(8000, 1500 + n * 1300),
    temperature: 0.5,
    timeoutMs: 50_000,
  });
}
