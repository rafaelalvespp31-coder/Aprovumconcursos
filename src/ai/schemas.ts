/**
 * Schemas das respostas estruturadas da IA. Os limites aqui também protegem custo
 * e armazenamento (tamanho máximo de cada campo).
 */
import { z } from "zod";
import { DISCIPLINE_MODES, LESSON_SECTION_KINDS } from "./pedagogy";

const nodeKey = z.string().regex(/^N\d{4,6}$/);

// ---- Análise / enriquecimento -------------------------------------------------
export const analysisSchema = z.object({
  disciplineMode: z.enum(DISCIPLINE_MODES),
  nodes: z
    .array(
      z.object({
        key: nodeKey,
        relevance: z.enum(["alta", "media", "baixa"]),
        prerequisiteKeys: z.array(nodeKey).max(8),
        needsExternalVerification: z.boolean(),
      }),
    )
    .max(400),
  ambiguities: z
    .array(z.object({ nodeKeys: z.array(nodeKey).max(10), description: z.string().min(5).max(400) }))
    .max(20),
});
export type AnalysisOutput = z.infer<typeof analysisSchema>;

// ---- Planejamento -------------------------------------------------------------
export const planSchema = z.object({
  modules: z
    .array(
      z.object({
        title: z.string().min(2).max(160),
        lessons: z
          .array(
            z.object({
              ref: z.string().min(1).max(20).describe("Identificador curto da aula dentro deste plano, ex.: A1"),
              title: z.string().min(2).max(160),
              objective: z.string().min(5).max(400),
              nodeKeys: z.array(nodeKey).max(40),
              supplementary: z
                .array(z.object({ title: z.string().min(2).max(160), justification: z.string().min(10).max(400) }))
                .max(5),
              prerequisiteRefs: z.array(z.string().max(20)).max(10),
              estimatedMinutes: z.number().int().min(5).max(240),
            }),
          )
          .min(1)
          .max(60),
      }),
    )
    .min(1)
    .max(30),
});
export type PlanOutput = z.infer<typeof planSchema>;

// ---- Aula ---------------------------------------------------------------------
export const lessonSchema = z.object({
  title: z.string().min(2).max(200),
  objective: z.string().min(5).max(500),
  sections: z
    .array(
      z.object({
        kind: z.enum(LESSON_SECTION_KINDS),
        title: z.string().min(2).max(160),
        bodyMarkdown: z.string().min(1).max(12_000),
        nodeKeys: z.array(nodeKey).max(40),
        sourceKey: nodeKey.optional().describe("Para texto_legal: o nó cujo texto foi transcrito."),
      }),
    )
    .min(2)
    .max(30),
  taughtNodeKeys: z.array(nodeKey).min(1).max(60),
  references: z
    .array(
      z.object({
        kind: z.enum(["texto_informado", "lei", "doutrina", "jurisprudencia", "outro"]),
        citation: z.string().min(3).max(400),
      }),
    )
    .max(20),
  unverifiedClaims: z.array(z.string().min(5).max(400)).max(20),
});
export type LessonOutput = z.infer<typeof lessonSchema>;

// ---- Questões -----------------------------------------------------------------
const optionSchema = z.object({
  label: z.string().min(1).max(3),
  text: z.string().min(1).max(1500),
  correct: z.boolean(),
  explanation: z.string().min(5).max(1500),
});

export const questionsSchema = z.object({
  questions: z
    .array(
      z.object({
        type: z.enum(["multipla_escolha", "certo_errado", "situacional"]),
        statement: z.string().min(10).max(4000),
        options: z.array(optionSchema).max(5),
        correctAnswerTrue: z.boolean().optional().describe("Somente para certo_errado"),
        justification: z.string().min(10).max(3000),
        nodeKey,
        difficulty: z.number().int().min(1).max(5),
        essential: z.boolean(),
        dependsOnExternalSource: z.boolean(),
      }),
    )
    .min(1)
    .max(15),
});
export type QuestionsOutput = z.infer<typeof questionsSchema>;
