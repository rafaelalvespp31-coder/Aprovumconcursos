/**
 * Camada de IA independente de fornecedor (seção 15).
 * O produto só conhece `AIProvider`; trocar de fornecedor = novo adaptador + variável de ambiente.
 */
import type { z } from "zod";

export type AITask =
  | "analyze_content"
  | "plan_lessons"
  | "generate_lesson"
  | "generate_questions"
  | "grade_discursive"
  | "review_content"
  | "recommend";

export interface StructuredRequest<T> {
  task: AITask;
  /** Regras do sistema — nunca contém dados do usuário. */
  system: string;
  /** Instrução da tarefa + dados (dados do usuário já isolados por `wrapUntrusted`). */
  prompt: string;
  schema: z.ZodType<T>;
  /** Nome curto do formato de saída (vira o nome da ferramenta no adaptador). */
  schemaName: string;
  maxOutputTokens: number;
  temperature?: number;
  /** Tempo máximo da chamada. */
  timeoutMs?: number;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
  /** Nulo quando o preço por token não está configurado. */
  estimatedCostUsd: number | null;
}

export interface StructuredResult<T> {
  data: T;
  usage: AIUsage;
  model: string;
  provider: string;
  latencyMs: number;
  attempts: number;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>>;
}

/** Erros classificados: o pipeline decide se tenta de novo ou falha de forma visível. */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | "not_configured"
      | "invalid_output"
      | "rate_limited"
      | "timeout"
      | "provider_error"
      | "budget_exceeded"
      | "refused",
    public readonly retryable: boolean,
    public readonly usage?: AIUsage,
  ) {
    super(message);
    this.name = "AIError";
  }
}
