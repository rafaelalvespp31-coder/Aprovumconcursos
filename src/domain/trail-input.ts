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

export const CONTENT_TYPE_OPTIONS: Array<{ value: ContentType; label: string; description: string }> = [
  { value: "edital", label: "Edital ou conteúdo programático", description: "O conteúdo completo de um ou mais cargos." },
  { value: "materia", label: "Matéria ou disciplina", description: "Uma disciplina inteira ou parte dela." },
  { value: "artigo_lei", label: "Artigo de lei", description: "Um ou mais artigos com incisos, parágrafos e alíneas." },
  { value: "tema_livre", label: "Tema livre", description: "Um assunto específico que você quer dominar." },
];

export const CONTENT_LIMITS = {
  minChars: 20,
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
    title: z.string().trim().max(120).optional(),
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
