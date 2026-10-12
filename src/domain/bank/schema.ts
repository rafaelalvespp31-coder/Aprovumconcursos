import { z } from "zod";
import { DIFFICULTIES, OPTION_LABELS, ORIGINS, QUESTION_TYPES, SOURCE_KINDS, SOURCE_STATUSES, USAGE_RIGHTS } from "./labels";

const uuid = z.uuid("Identificador inválido.");
const optUuid = z.preprocess((v) => (v === "" ? undefined : v), uuid.optional());
const optText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" ? v.trim() || undefined : v), z.string().max(max, `Use até ${max} caracteres.`).optional());
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD).");
const notFuture = (d: string) => d <= new Date().toISOString().slice(0, 10);
const optDate = z.preprocess((v) => (v === "" ? undefined : v), isoDate.refine(notFuture, "A data não pode estar no futuro.").optional());
const httpsUrl = z.preprocess(
  (v) => (typeof v === "string" ? v.trim() || undefined : v),
  z.url("Link inválido.").refine((u) => u.startsWith("https://"), "Use um link https://").max(2000).optional(),
);

export const legalRefSchema = z
  .object({
    normName: z.string().trim().min(2, "Informe a norma (ex.: Código Penal).").max(200),
    normNumber: optText(60),
    normYear: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1800).max(2100).optional()),
    article: optText(30),
    paragraph: optText(30),
    item: optText(30),
    letter: optText(10),
    officialUrl: httpsUrl,
    consultedOn: isoDate.refine(notFuture, "A data de consulta não pode estar no futuro."),
    normVersion: optText(300),
    amendmentNote: optText(2000),
    caseLawCourt: optText(60),
    caseLawId: optText(120),
    caseLawThesis: optText(2000),
  })
  .superRefine((r, ctx) => {
    if (!!r.caseLawCourt !== !!r.caseLawId) {
      ctx.addIssue({ code: "custom", path: ["caseLawId"], message: "Jurisprudência precisa de tribunal e identificação (número do processo/tema)." });
    }
    if (r.caseLawThesis && !r.caseLawId) {
      ctx.addIssue({ code: "custom", path: ["caseLawThesis"], message: "Tese sem identificação da decisão não é aceita." });
    }
  });
export type LegalRefInput = z.infer<typeof legalRefSchema>;

export const optionSchema = z.object({
  text: z.string().trim().min(1, "Alternativa vazia.").max(3000),
  isCorrect: z.boolean(),
  explanation: optText(3000),
});

export const questionInputSchema = z
  .object({
    subjectId: uuid,
    topicId: optUuid,
    origin: z.enum(ORIGINS),
    questionType: z.enum(QUESTION_TYPES),
    statement: z.string().trim().min(10, "Enunciado muito curto.").max(6000),
    caseContext: optText(6000),
    initialDifficulty: z.enum(DIFFICULTIES),
    boardStyle: optText(32),
    sourceId: optUuid,
    examId: optUuid,
    boardSlug: optText(32),
    year: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(1950).max(2100).optional()),
    originalNumber: optText(20),
    correctAnswerTrue: z.boolean().optional(),
    options: z.array(optionSchema).max(5, "No máximo 5 alternativas.").default([]),
    justification: optText(6000),
    legalBasis: optText(2000),
    usageRights: z.enum(USAGE_RIGHTS),
    verifiedAt: optDate,
    legalRefs: z.array(legalRefSchema).max(10, "No máximo 10 referências.").default([]),
  })
  .superRefine((q, ctx) => {
    if (q.questionType === "multipla_escolha") {
      if (q.options.length < 2) ctx.addIssue({ code: "custom", path: ["options"], message: "Múltipla escolha precisa de 2 a 5 alternativas." });
      const correct = q.options.filter((o) => o.isCorrect).length;
      if (correct !== 1) ctx.addIssue({ code: "custom", path: ["options"], message: "Marque exatamente uma alternativa correta." });
    } else {
      if (q.correctAnswerTrue === undefined) ctx.addIssue({ code: "custom", path: ["correctAnswerTrue"], message: "Informe o gabarito: Certo ou Errado." });
      if (q.options.length) ctx.addIssue({ code: "custom", path: ["options"], message: "Questão certo/errado não tem alternativas." });
    }
    if (q.origin === "prova_anterior") {
      if (!q.sourceId) ctx.addIssue({ code: "custom", path: ["sourceId"], message: "Prova anterior exige a fonte (prova oficial) cadastrada." });
      if (q.usageRights === "proprio") ctx.addIssue({ code: "custom", path: ["usageRights"], message: "Prova anterior não é conteúdo próprio." });
    } else if (q.examId || q.year || q.originalNumber || q.boardSlug) {
      ctx.addIssue({ code: "custom", path: ["origin"], message: "Concurso, banca de origem, ano e número só existem para prova anterior real." });
    }
  });
export type QuestionInput = z.infer<typeof questionInputSchema>;

/** Converte para o formato aceito por bank_save_question (snake_case). */
export function toDbPayload(q: QuestionInput, extra: { status?: string; generationBatchId?: string } = {}) {
  return {
    subject_id: q.subjectId,
    topic_id: q.topicId ?? "",
    source_id: q.sourceId ?? "",
    exam_id: q.origin === "prova_anterior" ? (q.examId ?? "") : "",
    origin: q.origin,
    question_type: q.questionType,
    statement: q.statement,
    case_context: q.caseContext ?? "",
    board_slug: q.origin === "prova_anterior" ? (q.boardSlug ?? "") : "",
    board_style: q.boardStyle ?? "",
    year: q.origin === "prova_anterior" && q.year ? String(q.year) : "",
    original_number: q.origin === "prova_anterior" ? (q.originalNumber ?? "") : "",
    initial_difficulty: q.initialDifficulty,
    correct_answer_true: q.questionType === "certo_errado" ? q.correctAnswerTrue : null,
    justification: q.justification ?? "",
    legal_basis: q.legalBasis ?? "",
    usage_rights: q.usageRights,
    verified_at: q.verifiedAt ?? "",
    status: extra.status,
    generation_batch_id: extra.generationBatchId ?? "",
    options:
      q.questionType === "multipla_escolha"
        ? q.options.map((o, i) => ({ label: OPTION_LABELS[i], text: o.text, is_correct: o.isCorrect, explanation: o.explanation ?? "" }))
        : [],
    legal_refs: q.legalRefs.map((r) => ({
      norm_name: r.normName,
      norm_number: r.normNumber ?? "",
      norm_year: r.normYear ? String(r.normYear) : "",
      article: r.article ?? "",
      paragraph: r.paragraph ?? "",
      item: r.item ?? "",
      letter: r.letter ?? "",
      official_url: r.officialUrl ?? "",
      consulted_on: r.consultedOn,
      norm_version: r.normVersion ?? "",
      amendment_note: r.amendmentNote ?? "",
      case_law_court: r.caseLawCourt ?? "",
      case_law_id: r.caseLawId ?? "",
      case_law_thesis: r.caseLawThesis ?? "",
    })),
  };
}

export const sourceInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da fonte.").max(300),
  kind: z.enum(SOURCE_KINDS),
  authorInstitution: optText(300),
  url: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() || undefined : v),
    z.url("Link inválido.").refine((u) => /^https?:\/\//.test(u), "Use http(s)://").max(2000).optional(),
  ),
  publishedOn: optDate,
  consultedOn: optDate,
  license: optText(2000),
  legalNotes: optText(4000),
  status: z.enum(SOURCE_STATUSES),
});
export type SourceInput = z.infer<typeof sourceInputSchema>;

export const topicInputSchema = z.object({
  subjectId: uuid,
  parentId: optUuid,
  name: z.string().trim().min(2, "Informe o nome do assunto.").max(160),
  description: optText(2000),
});

export const subjectInputSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da matéria.").max(120),
  description: optText(2000),
});

export function slugify(s: string): string {
  return (
    s
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80) || "item"
  ).padEnd(2, "x");
}
