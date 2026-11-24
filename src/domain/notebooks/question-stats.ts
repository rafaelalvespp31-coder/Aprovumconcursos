import { z } from "zod";

/** Números agregados de uma questão (todos os alunos) + o histórico de quem está vendo. Nada identifica ninguém. */
export const questionStatsSchema = z.object({
  type: z.enum(["multipla_escolha", "certo_errado"]),
  total: z.number().int().min(0),
  correct: z.number().int().min(0),
  wrong: z.number().int().min(0),
  students: z.number().int().min(0),
  options: z.array(z.object({ label: z.string(), isCorrect: z.boolean(), count: z.number().int().min(0) })),
  mine: z.object({ attempts: z.number().int().min(0), correct: z.number().int().min(0) }),
});
export type QuestionStats = z.infer<typeof questionStatsSchema>;

/** Percentual inteiro; 0 quando não há respostas. */
export function pct(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

/** Abaixo disso, o gráfico mostra um aviso de amostra pequena. */
export const MIN_SAMPLE = 10;
