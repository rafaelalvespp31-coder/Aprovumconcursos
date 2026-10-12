/**
 * Bancas e validação da solicitação de trilha (seção 4).
 * Validada no cliente para feedback rápido e, obrigatoriamente, de novo no servidor.
 *
 * Não registramos "características" das bancas aqui: padrões de cobrança só podem
 * ser afirmados a partir de provas verificadas, nunca de suposições.
 */
import { z } from "zod";
import { CONTENT_TYPES, type ContentType } from "./content/types";

export const EXAM_BOARDS = [
  { slug: "fgv", name: "FGV", hint: "Fundação Getulio Vargas" },
  { slug: "cebraspe", name: "CEBRASPE", hint: "Historicamente conhecida como CESPE" },
  { slug: "aocp", name: "AOCP", hint: "Instituto AOCP" },
  { slug: "vunesp", name: "VUNESP", hint: "Fundação VUNESP" },
  { slug: "ibfc", name: "IBFC", hint: "Instituto Brasileiro de Formação e Capacitação" },
  { slug: "ibade", name: "IBADE", hint: "Instituto Brasileiro de Apoio e Desenvolvimento Executivo" },
  { slug: "selecon", name: "SELECON", hint: "Instituto SELECON" },
  { slug: "outra", name: "Outra banca", hint: "Informe o nome" },
] as const;
export type ExamBoardSlug = (typeof EXAM_BOARDS)[number]["slug"];
const BOARD_SLUGS = EXAM_BOARDS.map((b) => b.slug) as [ExamBoardSlug, ...ExamBoardSlug[]];

/**
 * Tipos de conteúdo. O estudo é sempre de um conteúdo específico; o edital é só uma
 * forma opcional de organizar vários temas e nunca é exigido para começar.
 */
export const CONTENT_TYPE_OPTIONS: Array<{ value: ContentType; label: string; description: string }> = [
  { value: "tema_livre", label: "Tema", description: "Um assunto específico, como prisão em flagrante ou poderes administrativos." },
  { value: "artigo_lei", label: "Artigo ou trecho de lei", description: "Um ou mais artigos, com ou sem o texto colado (ex.: arts. 121 a 129 do CP)." },
  { value: "materia", label: "Matéria ou capítulo", description: "Uma disciplina, um capítulo ou parte dela." },
  { value: "edital", label: "Edital (opcional)", description: "Vários temas de um cargo, para organizar em sequência." },
];

/** Exemplos de pedidos para a tela de entrada. */
export const CONTENT_EXAMPLES: Array<{ text: string; type: ContentType }> = [
  { text: "Art. 5º da Constituição Federal", type: "artigo_lei" },
  { text: "Arts. 121 a 129 do Código Penal", type: "artigo_lei" },
  { text: "Prisão em flagrante", type: "tema_livre" },
  { text: "Poderes administrativos", type: "tema_livre" },
  { text: "Lei Maria da Penha, arts. 1º a 7º", type: "artigo_lei" },
];

export const CONTENT_LIMITS = {
  /** Um tema curto já basta ("Prisão em flagrante"): a IA delimita o escopo. */
  minChars: 4,
  /** ~60 mil caracteres cobrem editais extensos sem estourar custos de IA. */
  maxChars: 60_000,
} as const;

export const trailRequestSchema = z
  .object({
    board: z.enum(BOARD_SLUGS, { error: "Selecione a banca examinadora." }),
    otherBoardName: z
      .string()
      .trim()
      .max(80, "Nome da banca muito longo.")
      .optional()
      .transform((v) => (v ? v : undefined)),
    contentType: z.enum(CONTENT_TYPES, { error: "Selecione o tipo de conteúdo." }),
    content: z
      .string()
      .min(1, "Cole o conteúdo que deseja estudar.")
      .max(CONTENT_LIMITS.maxChars, `O conteúdo pode ter no máximo ${CONTENT_LIMITS.maxChars.toLocaleString("pt-BR")} caracteres.`)
      .refine((s) => s.replace(/\s+/g, "").length >= CONTENT_LIMITS.minChars, {
        message: `O conteúdo precisa ter pelo menos ${CONTENT_LIMITS.minChars} caracteres.`,
      })
      .refine((s) => /\p{L}{3,}/u.test(s), { message: "O conteúdo não parece conter texto." }),
    title: z
      .string()
      .trim()
      .max(120, "O título pode ter no máximo 120 caracteres.")
      .optional()
      .transform((v) => (v ? v : undefined)),
  })
  .superRefine((v, ctx) => {
    if (v.board === "outra" && (!v.otherBoardName || v.otherBoardName.length < 2)) {
      ctx.addIssue({ code: "custom", path: ["otherBoardName"], message: "Informe o nome da banca." });
    }
  });

export type TrailRequest = z.infer<typeof trailRequestSchema>;

export function boardDisplayName(slug: ExamBoardSlug, other?: string | null): string {
  if (slug === "outra") return other?.trim() || "Outra banca";
  return EXAM_BOARDS.find((b) => b.slug === slug)?.name ?? slug;
}
