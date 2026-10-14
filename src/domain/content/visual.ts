import { z } from "zod";

/**
 * Exemplos visuais dos cards "Na prática":
 *  - Tirinha: 1 a 3 quadros com cenário, personagens, fala e legenda (a situação).
 *  - Esquema: fluxo, linha do tempo ou comparação (a resposta, revelada ao tocar).
 * Tudo é desenhado no app (SVG/HTML): sem imagens externas, leve e funciona offline.
 */

export const ROLES = ["delegado", "pm", "policial_penal", "perito", "promotor", "juiz", "advogado", "vitima", "investigado", "preso", "cidadao", "servidor", "gestor", "professor"] as const;
export const SCENES = ["delegacia", "local_crime", "cela", "forum", "rua", "casa", "bar", "hospital", "piscina", "reparticao", "escola", "obra", "transito", "rodovia"] as const;
export const POSES = ["neutro", "fala", "aponta", "pega", "ataca", "bracos_cruzados"] as const;
export const MOODS = ["neutro", "serio", "bravo", "surpreso", "feliz", "triste"] as const;
export const PROPS = ["arma", "documento", "celular", "maleta", "faca", "copo", "carimbo"] as const;

const character = z.object({
  p: z.enum(ROLES),
  lado: z.enum(["esq", "centro", "dir"]).default("centro"),
  pose: z.enum(POSES).default("neutro"),
  humor: z.enum(MOODS).default("neutro"),
  objeto: z.enum(PROPS).optional(),
  /** Para onde o personagem olha: padrão é para o centro do quadro. */
  olha: z.enum(["esq", "dir"]).optional(),
});

const panel = z.object({
  cenario: z.enum(SCENES),
  legenda: z.string().max(90).optional(),
  personagens: z.array(character).max(3).default([]),
  fala: z.object({ quem: z.number().int().min(0).max(2), texto: z.string().min(1).max(80) }).optional(),
  /** Efeito de impacto (ex.: "PÁ!"), sem violência explícita. */
  efeito: z.string().max(12).optional(),
});

export const stripSchema = z.array(panel).min(1).max(3);

const step = z.object({ rotulo: z.string().min(1).max(70), detalhe: z.string().max(120).optional(), estado: z.enum(["ok", "erro", "neutro", "alerta"]).default("neutro") });

export const schemeSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("fluxo"), titulo: z.string().max(70).optional(), passos: z.array(step).min(2).max(6), conclusao: step.optional() }),
  z.object({
    tipo: z.literal("linha_tempo"),
    titulo: z.string().max(70).optional(),
    unidade: z.string().max(12).default("dias"),
    marcos: z.array(z.object({ em: z.number().min(0), rotulo: z.string().min(1).max(50), estado: z.enum(["ok", "erro", "neutro", "alerta"]).default("neutro") })).min(2).max(6),
  }),
  z.object({
    tipo: z.literal("comparacao"),
    titulo: z.string().max(70).optional(),
    lados: z
      .array(z.object({ titulo: z.string().min(1).max(50), resultado: z.string().min(1).max(60), estado: z.enum(["ok", "erro", "neutro", "alerta"]).default("neutro"), itens: z.array(z.string().max(80)).max(4).default([]) }))
      .length(2),
  }),
]);

export type Strip = z.infer<typeof stripSchema>;
export type StripPanel = Strip[number];
export type StripCharacter = StripPanel["personagens"][number];
export type Scheme = z.infer<typeof schemeSchema>;
export type StepState = "ok" | "erro" | "neutro" | "alerta";

/** Lê o JSON de um campo visual; inválido = ignorado (o card continua só com texto). */
export function parseVisual<T>(raw: string | undefined, schema: z.ZodType<T>): T | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const r = schema.safeParse(JSON.parse(raw));
    return r.success ? r.data : undefined;
  } catch {
    return undefined;
  }
}
