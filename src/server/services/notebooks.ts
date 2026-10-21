import "server-only";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../supabase";
import { UserFacingError, enforceRateLimit } from "./trails";
import { NOTEBOOK_TITLE_MAX, suggestTitle } from "@/domain/notebooks/model";
import type { AnswerFeedback } from "./study";

/**
 * Cadernos de questões: filtros salvos (matéria, concurso, banca, tipo) sobre o banco de
 * questões de concurso revisadas (bank_questions publicadas). Os cadernos são do aluno
 * (RLS do próprio dono); o banco só é lido pelo servidor, e o gabarito só sai depois da resposta.
 */

export interface Notebook {
  id: string;
  title: string;
  subjectId: string | null;
  subjectName: string | null;
  examId: string | null;
  examName: string | null;
  boardSlug: string | null;
  boardName: string | null;
  questionType: "multipla_escolha" | "certo_errado" | null;
  pinned: boolean;
  lastOpenedAt: string | null;
  createdAt: string;
  /** Questões publicadas que o filtro alcança hoje. */
  available: number;
  /** Respostas dadas dentro do caderno. */
  answered: number;
  correct: number;
}

export interface NotebookLookups {
  subjects: Array<{ id: string; name: string; available: number }>;
  exams: Array<{ id: string; name: string; available: number }>;
  boards: Array<{ slug: string; name: string; available: number }>;
  /** Questões publicadas (só os filtros), para contar a combinação escolhida no formulário. */
  published: Array<{ s: string | null; e: string | null; b: string | null; t: string }>;
}

export interface Notice {
  id: string;
  kicker: string | null;
  title: string;
  highlight: string | null;
  body: string;
  ctaLabel: string;
  href: string;
  image: string | null;
}

type PublishedRow = { id: string; subject_id: string | null; exam_id: string | null; board_slug: string | null; question_type: string };

async function publishedIndex(): Promise<PublishedRow[]> {
  const { data, error } = await createAdminClient()
    .from("bank_questions")
    .select("id, subject_id, exam_id, board_slug, question_type")
    .eq("status", "publicada")
    .limit(20000);
  if (error) throw new Error(error.message);
  return (data ?? []) as PublishedRow[];
}

const matches = (q: PublishedRow, n: { subjectId: string | null; examId: string | null; boardSlug: string | null; questionType: string | null }) =>
  (!n.subjectId || q.subject_id === n.subjectId) &&
  (!n.examId || q.exam_id === n.examId) &&
  (!n.boardSlug || q.board_slug === n.boardSlug) &&
  (!n.questionType || q.question_type === n.questionType);

function examLabel(e: { name: string; organ: string | null; year: number | null }) {
  return [e.name, e.organ && !e.name.toLowerCase().includes(e.organ.toLowerCase()) ? e.organ : null, e.year].filter(Boolean).join(" · ");
}

export async function notebookLookups(): Promise<NotebookLookups> {
  const admin = createAdminClient();
  const [subjects, exams, boards, pub] = await Promise.all([
    admin.from("subjects").select("id, name, status, sort_order").order("sort_order"),
    admin.from("exams").select("id, name, organ, year").order("year", { ascending: false }).limit(500),
    admin.from("exam_boards").select("slug, name, sort_order").order("sort_order"),
    publishedIndex(),
  ]);
  const count = (pick: (q: PublishedRow) => string | null) => {
    const m = new Map<string, number>();
    for (const q of pub) {
      const k = pick(q);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return m;
  };
  const bySubject = count((q) => q.subject_id);
  const byExam = count((q) => q.exam_id);
  const byBoard = count((q) => q.board_slug);
  return {
    subjects: ((subjects.data ?? []) as Array<{ id: string; name: string; status: string | null }>)
      .filter((s) => s.status !== "inativa" && s.status !== "arquivada")
      .map((s) => ({ id: s.id, name: s.name, available: bySubject.get(s.id) ?? 0 })),
    exams: ((exams.data ?? []) as Array<{ id: string; name: string; organ: string | null; year: number | null }>).map((e) => ({ id: e.id, name: examLabel(e), available: byExam.get(e.id) ?? 0 })),
    boards: ((boards.data ?? []) as Array<{ slug: string; name: string }>).map((b) => ({ slug: b.slug, name: b.name, available: byBoard.get(b.slug) ?? 0 })),
    published: pub.map((q) => ({ s: q.subject_id, e: q.exam_id, b: q.board_slug, t: q.question_type })),
  };
}

type NotebookRow = {
  id: string; title: string; subject_id: string | null; exam_id: string | null; board_slug: string | null;
  question_type: Notebook["questionType"]; pinned: boolean; last_opened_at: string | null; created_at: string;
};

export async function listNotebooks(userId: string): Promise<Notebook[]> {
  const db = await createUserClient();
  const { data, error } = await db
    .from("question_notebooks")
    .select("id, title, subject_id, exam_id, board_slug, question_type, pinned, last_opened_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as NotebookRow[];
  if (!rows.length) return [];
  const admin = createAdminClient();
  const subjectIds = [...new Set(rows.map((r) => r.subject_id).filter(Boolean))] as string[];
  const examIds = [...new Set(rows.map((r) => r.exam_id).filter(Boolean))] as string[];
  const [subjects, exams, boards, pub, attempts] = await Promise.all([
    subjectIds.length ? admin.from("subjects").select("id, name").in("id", subjectIds) : Promise.resolve({ data: [] }),
    examIds.length ? admin.from("exams").select("id, name, organ, year").in("id", examIds) : Promise.resolve({ data: [] }),
    admin.from("exam_boards").select("slug, name"),
    publishedIndex(),
    admin.from("bank_attempts").select("notebook_id, is_correct").eq("user_id", userId).in("notebook_id", rows.map((r) => r.id)).limit(20000),
  ]);
  const subjectName = new Map(((subjects.data ?? []) as Array<{ id: string; name: string }>).map((s) => [s.id, s.name]));
  const examName = new Map(((exams.data ?? []) as Array<{ id: string; name: string; organ: string | null; year: number | null }>).map((e) => [e.id, examLabel(e)]));
  const boardName = new Map(((boards.data ?? []) as Array<{ slug: string; name: string }>).map((b) => [b.slug, b.name]));
  const stats = new Map<string, { answered: number; correct: number }>();
  for (const a of (attempts.data ?? []) as Array<{ notebook_id: string; is_correct: boolean }>) {
    const s = stats.get(a.notebook_id) ?? { answered: 0, correct: 0 };
    s.answered++;
    if (a.is_correct) s.correct++;
    stats.set(a.notebook_id, s);
  }
  return rows.map((r) => {
    const filter = { subjectId: r.subject_id, examId: r.exam_id, boardSlug: r.board_slug, questionType: r.question_type };
    return {
      id: r.id,
      title: r.title,
      subjectId: r.subject_id,
      subjectName: r.subject_id ? (subjectName.get(r.subject_id) ?? null) : null,
      examId: r.exam_id,
      examName: r.exam_id ? (examName.get(r.exam_id) ?? null) : null,
      boardSlug: r.board_slug,
      boardName: r.board_slug ? (boardName.get(r.board_slug) ?? r.board_slug) : null,
      questionType: r.question_type,
      pinned: r.pinned,
      lastOpenedAt: r.last_opened_at,
      createdAt: r.created_at,
      available: pub.filter((q) => matches(q, filter)).length,
      answered: stats.get(r.id)?.answered ?? 0,
      correct: stats.get(r.id)?.correct ?? 0,
    };
  });
}

const createSchema = z.object({
  title: z.string().max(NOTEBOOK_TITLE_MAX).optional().default(""),
  subjectId: z.uuid().nullable().optional(),
  examId: z.uuid().nullable().optional(),
  boardSlug: z.string().regex(/^[a-z0-9_]{2,32}$/).nullable().optional(),
  questionType: z.enum(["multipla_escolha", "certo_errado"]).nullable().optional(),
});
export type NotebookInput = z.input<typeof createSchema>;

export async function createNotebook(userId: string, raw: unknown): Promise<string> {
  const input = createSchema.parse(raw);
  await enforceRateLimit(userId, "notebook_write", 20);
  let examName: string | null = null;
  if (input.examId) {
    const { data } = await createAdminClient().from("exams").select("name").eq("id", input.examId).maybeSingle();
    if (!data) throw new UserFacingError("Concurso não encontrado.", "invalid_input");
    examName = data.name as string;
  }
  const db = await createUserClient();
  const { data, error } = await db
    .from("question_notebooks")
    .insert({
      user_id: userId,
      title: suggestTitle({ title: input.title, examName }),
      subject_id: input.subjectId ?? null,
      exam_id: input.examId ?? null,
      board_slug: input.boardSlug ?? null,
      question_type: input.questionType ?? null,
    })
    .select("id")
    .single();
  if (error) {
    if (error.message.includes("Limite de 100")) throw new UserFacingError("Você chegou ao limite de 100 cadernos. Exclua algum para criar outro.", "limit");
    if (error.code === "23503") throw new UserFacingError("Filtro inválido. Atualize a página e tente de novo.", "invalid_input");
    throw new Error(error.message);
  }
  return data.id as string;
}

export async function updateNotebook(userId: string, id: string, raw: unknown) {
  const nid = z.uuid().parse(id);
  const patch = z
    .object({ title: z.string().trim().min(1, "Dê um nome ao caderno.").max(NOTEBOOK_TITLE_MAX).optional(), pinned: z.boolean().optional() })
    .refine((p) => p.title !== undefined || p.pinned !== undefined)
    .parse(raw);
  await enforceRateLimit(userId, "notebook_write", 30);
  const db = await createUserClient();
  const { data, error } = await db.from("question_notebooks").update(patch).eq("id", nid).eq("user_id", userId).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new UserFacingError("Caderno não encontrado.", "not_found");
}

export async function deleteNotebook(userId: string, id: string) {
  const nid = z.uuid().parse(id);
  await enforceRateLimit(userId, "notebook_write", 30);
  const db = await createUserClient();
  const { data, error } = await db.from("question_notebooks").delete().eq("id", nid).eq("user_id", userId).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new UserFacingError("Caderno não encontrado.", "not_found");
}

// ---------------------------------------------------------------------------
// Resolver um caderno
// ---------------------------------------------------------------------------

export interface NotebookQuestion {
  id: string;
  code: string | null;
  type: "multipla_escolha" | "certo_errado";
  statement: string;
  caseContext: string | null;
  board: string | null;
  year: number | null;
  examName: string | null;
  subjectName: string | null;
  origin: string;
  options: Array<{ id: string; label: string; text: string }>;
  /** Última resposta do aluno a esta questão (em qualquer caderno). */
  last: { correct: boolean; at: string } | null;
}

export async function openNotebook(userId: string, id: string): Promise<{ notebook: Notebook; questions: NotebookQuestion[] } | null> {
  const nid = z.uuid().safeParse(id);
  if (!nid.success) return null;
  const notebook = (await listNotebooks(userId)).find((n) => n.id === nid.data);
  if (!notebook) return null;
  const admin = createAdminClient();
  let q = admin
    .from("bank_questions")
    .select("id, public_code, question_type, statement, case_context, board_slug, year, origin, exam_id, subject_id, bank_question_options(id, label, text, sort_order)")
    .eq("status", "publicada")
    .order("seq", { ascending: true })
    .limit(500);
  if (notebook.subjectId) q = q.eq("subject_id", notebook.subjectId);
  if (notebook.examId) q = q.eq("exam_id", notebook.examId);
  if (notebook.boardSlug) q = q.eq("board_slug", notebook.boardSlug);
  if (notebook.questionType) q = q.eq("question_type", notebook.questionType);
  const [rows, boards] = await Promise.all([q, admin.from("exam_boards").select("slug, name")]);
  if (rows.error) throw new Error(rows.error.message);
  type Row = {
    id: string; public_code: string | null; question_type: NotebookQuestion["type"]; statement: string; case_context: string | null;
    board_slug: string | null; year: number | null; origin: string; exam_id: string | null; subject_id: string | null;
    bank_question_options: Array<{ id: string; label: string; text: string; sort_order: number }> | null;
  };
  const list = (rows.data ?? []) as Row[];
  const ids = list.map((r) => r.id);
  const examIds = [...new Set(list.map((r) => r.exam_id).filter(Boolean))] as string[];
  const subjectIds = [...new Set(list.map((r) => r.subject_id).filter(Boolean))] as string[];
  const [hist, exams, subjects] = await Promise.all([
    ids.length ? admin.from("bank_attempts").select("question_id, is_correct, created_at").eq("user_id", userId).in("question_id", ids).order("created_at", { ascending: false }).limit(5000) : Promise.resolve({ data: [] }),
    examIds.length ? admin.from("exams").select("id, name, organ, year").in("id", examIds) : Promise.resolve({ data: [] }),
    subjectIds.length ? admin.from("subjects").select("id, name").in("id", subjectIds) : Promise.resolve({ data: [] }),
  ]);
  const last = new Map<string, { correct: boolean; at: string }>();
  for (const h of (hist.data ?? []) as Array<{ question_id: string; is_correct: boolean; created_at: string }>) {
    if (!last.has(h.question_id)) last.set(h.question_id, { correct: h.is_correct, at: h.created_at });
  }
  const boardName = new Map(((boards.data ?? []) as Array<{ slug: string; name: string }>).map((b) => [b.slug, b.name]));
  const examName = new Map(((exams.data ?? []) as Array<{ id: string; name: string; organ: string | null; year: number | null }>).map((e) => [e.id, examLabel(e)]));
  const subjectName = new Map(((subjects.data ?? []) as Array<{ id: string; name: string }>).map((s) => [s.id, s.name]));

  await (await createUserClient()).from("question_notebooks").update({ last_opened_at: new Date().toISOString() }).eq("id", notebook.id).eq("user_id", userId);

  return {
    notebook,
    questions: list.map((r) => ({
      id: r.id,
      code: r.public_code,
      type: r.question_type,
      statement: r.statement,
      caseContext: r.case_context,
      board: r.board_slug ? (boardName.get(r.board_slug) ?? r.board_slug) : null,
      year: r.year,
      examName: r.exam_id ? (examName.get(r.exam_id) ?? null) : null,
      subjectName: r.subject_id ? (subjectName.get(r.subject_id) ?? null) : null,
      origin: r.origin,
      options: (r.bank_question_options ?? []).sort((a, b) => a.sort_order - b.sort_order).map(({ id, label, text }) => ({ id, label, text })),
      last: last.get(r.id) ?? null,
    })),
  };
}

const answerSchema = z.object({
  notebookId: z.uuid(),
  questionId: z.uuid(),
  optionId: z.uuid().optional(),
  answerTrue: z.boolean().optional(),
  seconds: z.number().int().min(0).max(3600).optional(),
});

/** Corrige no servidor e grava em bank_attempts (contexto "treino", ligado ao caderno). */
export async function answerNotebookQuestion(userId: string, raw: unknown): Promise<AnswerFeedback> {
  const a = answerSchema.parse(raw);
  if (!a.optionId && a.answerTrue === undefined) throw new UserFacingError("Selecione uma resposta.", "invalid_input");
  await enforceRateLimit(userId, "answer", 120);
  const db = await createUserClient();
  const own = await db.from("question_notebooks").select("id").eq("id", a.notebookId).eq("user_id", userId).maybeSingle();
  if (!own.data) throw new UserFacingError("Caderno não encontrado.", "not_found");
  const admin = createAdminClient();
  const { data: q, error } = await admin
    .from("bank_questions")
    .select("id, question_type, correct_answer_true, justification, legal_basis, current_version, status, bank_question_options(id, label, is_correct, explanation)")
    .eq("id", a.questionId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!q || q.status !== "publicada") throw new UserFacingError("Esta questão não está mais disponível.", "not_found");
  const opts = (q.bank_question_options ?? []) as Array<{ id: string; label: string; is_correct: boolean; explanation: string | null }>;
  let correct: boolean;
  let selected: string | null = null;
  if (q.question_type === "certo_errado") {
    if (a.answerTrue === undefined) throw new UserFacingError("Resposta inválida para esta questão.", "invalid_answer");
    correct = a.answerTrue === q.correct_answer_true;
  } else {
    const o = opts.find((x) => x.id === a.optionId);
    if (!o) throw new UserFacingError("Resposta inválida para esta questão.", "invalid_answer");
    correct = o.is_correct;
    selected = o.label;
  }
  const ins = await admin.from("bank_attempts").insert({
    question_id: q.id,
    version: q.current_version,
    user_id: userId,
    context: "treino",
    notebook_id: a.notebookId,
    selected_label: selected,
    answer_bool: q.question_type === "certo_errado" ? a.answerTrue : null,
    is_correct: correct,
    duration_ms: a.seconds !== undefined ? a.seconds * 1000 : null,
  });
  if (ins.error) throw new Error(ins.error.message);
  const justification = [q.justification, q.legal_basis ? `Fundamentação: ${q.legal_basis}` : null].filter(Boolean).join("\n\n");
  return {
    correct,
    justification: justification || "Sem comentário cadastrado para esta questão.",
    correctAnswerTrue: q.question_type === "certo_errado" ? (q.correct_answer_true as boolean) : null,
    options: opts.map((o) => ({ id: o.id, label: o.label, isCorrect: o.is_correct, explanation: o.explanation ?? "" })),
  };
}

// ---------------------------------------------------------------------------
// Avisos e mapa anual
// ---------------------------------------------------------------------------

export async function listNotices(): Promise<Notice[]> {
  const db = await createUserClient();
  const { data, error } = await db
    .from("app_notices")
    .select("id, kicker, title, highlight, body, cta_label, href, image")
    .order("sort_order")
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ id: string; kicker: string | null; title: string; highlight: string | null; body: string; cta_label: string; href: string; image: string | null }>).map(
    (n) => ({ id: n.id, kicker: n.kicker, title: n.title, highlight: n.highlight, body: n.body, ctaLabel: n.cta_label, href: n.href, image: n.image }),
  );
}

export async function yearActivity(year: number): Promise<Array<[string, number]>> {
  const db = await createUserClient();
  const { data, error } = await db.rpc("my_year_activity", { p_year: year });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ day: string; answers: number }>).map((r) => [r.day, r.answers]);
}
