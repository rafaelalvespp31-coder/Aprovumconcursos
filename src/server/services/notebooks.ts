import "server-only";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../supabase";
import { UserFacingError, enforceRateLimit } from "./trails";
import { NOTEBOOK_TITLE_MAX } from "@/domain/notebooks/model";
import {
  autoTitle,
  countMatches,
  filterLabels,
  filtersSchema,
  matchQuestion,
  parseFilters,
  type Difficulty,
  type FilterNames,
  type IndexedQuestion,
  type MatchContext,
  type NotebookFilters,
} from "@/domain/notebooks/filters";
import type { AnswerFeedback } from "./study";

/**
 * Cadernos de questões: filtros salvos (matérias, assuntos, bancas, concursos, anos,
 * dificuldade, favoritas) sobre o banco de questões de concurso revisadas (bank_questions
 * publicadas). Cadernos e favoritas são do aluno (RLS do dono); o banco só é lido pelo
 * servidor, e o gabarito só sai depois da resposta.
 */

export interface Notebook {
  id: string;
  title: string;
  filters: NotebookFilters;
  /** Rótulos dos filtros (chips). */
  labels: string[];
  /** Linha de apoio na lista: primeira matéria/concurso/banca, ou "Todas as matérias". */
  scope: string;
  /** Nome usado para escolher o ícone (matéria principal). */
  iconHint: string;
  showFullStatement: boolean;
  pinned: boolean;
  lastOpenedAt: string | null;
  createdAt: string;
  /** Questões publicadas que o filtro alcança hoje. */
  available: number;
  /** Respostas dadas dentro do caderno. */
  answered: number;
  correct: number;
}

export interface TopicOption {
  id: string;
  name: string;
  depth: number;
}
export interface NotebookLookups {
  subjects: Array<{ id: string; name: string; topics: TopicOption[] }>;
  boards: Array<{ slug: string; name: string }>;
  exams: Array<{ id: string; name: string; organ: string | null; role: string | null; year: number | null }>;
  years: number[];
  /** Questões publicadas (só os campos dos filtros), para contar no navegador. */
  index: IndexedQuestion[];
  answered: string[];
  favorites: string[];
  topicParent: Array<[string, string | null]>;
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

// ---------------------------------------------------------------------------
// Índice do banco publicado e contexto do aluno
// ---------------------------------------------------------------------------

type PublishedRow = {
  id: string; subject_id: string | null; topic_id: string | null; exam_id: string | null; board_slug: string | null; year: number | null;
  question_type: IndexedQuestion["type"]; initial_difficulty: Difficulty; calibrated_difficulty: Difficulty | null;
};

async function publishedIndex(): Promise<IndexedQuestion[]> {
  const { data, error } = await createAdminClient()
    .from("bank_questions")
    .select("id, subject_id, topic_id, exam_id, board_slug, year, question_type, initial_difficulty, calibrated_difficulty")
    .eq("status", "publicada")
    .order("seq")
    .limit(20000);
  if (error) throw new Error(error.message);
  return ((data ?? []) as PublishedRow[]).map((q) => ({
    id: q.id,
    subject: q.subject_id,
    topic: q.topic_id,
    board: q.board_slug,
    exam: q.exam_id,
    year: q.year,
    difficulty: q.calibrated_difficulty ?? q.initial_difficulty,
    type: q.question_type,
  }));
}

async function userContext(userId: string): Promise<{ answered: Set<string>; favorites: Set<string> }> {
  const admin = createAdminClient();
  const [att, fav] = await Promise.all([
    admin.from("bank_attempts").select("question_id").eq("user_id", userId).limit(20000),
    (await createUserClient()).from("bank_question_favorites").select("question_id").eq("user_id", userId).limit(20000),
  ]);
  if (att.error) throw new Error(att.error.message);
  if (fav.error) throw new Error(fav.error.message);
  return {
    answered: new Set(((att.data ?? []) as Array<{ question_id: string }>).map((r) => r.question_id)),
    favorites: new Set(((fav.data ?? []) as Array<{ question_id: string }>).map((r) => r.question_id)),
  };
}

type Names = FilterNames & { topicParent: Map<string, string | null>; cargo: (examId: string) => string | undefined };

function examLabel(e: { name: string; organ: string | null; role_name?: string | null; year: number | null }) {
  const organ = e.organ && !e.name.toLowerCase().includes(e.organ.toLowerCase()) ? e.organ : null;
  return [e.name, organ, e.year].filter(Boolean).join(" · ");
}

async function loadNames(): Promise<{ names: Names; lookups: Omit<NotebookLookups, "index" | "answered" | "favorites" | "years" | "topicParent"> }> {
  const admin = createAdminClient();
  const [subjects, topics, boards, exams] = await Promise.all([
    admin.from("subjects").select("id, name, status, sort_order").order("sort_order"),
    admin.from("subject_topics").select("id, subject_id, parent_id, name, status, sort_order").order("sort_order").limit(5000),
    admin.from("exam_boards").select("slug, name, sort_order").order("sort_order"),
    admin.from("exams").select("id, name, organ, role_name, year").order("year", { ascending: false }).limit(1000),
  ]);
  for (const r of [subjects, topics, boards, exams]) if (r.error) throw new Error(r.error.message);
  const subj = ((subjects.data ?? []) as Array<{ id: string; name: string; status: string | null }>).filter((s) => !["inativa", "arquivada", "inativo"].includes(s.status ?? ""));
  const tops = ((topics.data ?? []) as Array<{ id: string; subject_id: string; parent_id: string | null; name: string; status: string | null }>).filter((t) => !["inativo", "inativa", "arquivado"].includes(t.status ?? ""));
  const ex = (exams.data ?? []) as Array<{ id: string; name: string; organ: string | null; role_name: string | null; year: number | null }>;
  const bd = (boards.data ?? []) as Array<{ slug: string; name: string }>;
  const subjectName = new Map(subj.map((s) => [s.id, s.name]));
  const topicName = new Map(tops.map((t) => [t.id, t.name]));
  const boardName = new Map(bd.map((b) => [b.slug, b.name]));
  const examName = new Map(ex.map((e) => [e.id, examLabel(e)]));
  const cargoName = new Map(ex.map((e) => [e.id, e.role_name ? `${e.role_name}${e.organ && !e.role_name.includes(e.organ) ? ` (${e.organ})` : ""}` : examLabel(e)]));
  const topicParent = new Map(tops.map((t) => [t.id, t.parent_id]));
  // Assuntos em árvore (pai antes dos filhos), por matéria.
  const tree = (subjectId: string): TopicOption[] => {
    const out: TopicOption[] = [];
    const walk = (parent: string | null, depth: number) => {
      for (const t of tops.filter((x) => x.subject_id === subjectId && x.parent_id === parent)) {
        out.push({ id: t.id, name: t.name, depth });
        if (depth < 6) walk(t.id, depth + 1);
      }
    };
    walk(null, 0);
    return out;
  };
  return {
    names: {
      subject: (id) => subjectName.get(id),
      topic: (id) => topicName.get(id),
      board: (slug) => boardName.get(slug),
      exam: (id) => examName.get(id),
      cargo: (id) => cargoName.get(id),
      topicParent,
    },
    lookups: {
      subjects: subj.map((s) => ({ id: s.id, name: s.name, topics: tree(s.id) })),
      boards: bd,
      exams: ex.map((e) => ({ id: e.id, name: e.name, organ: e.organ, role: e.role_name, year: e.year })),
    },
  };
}

export async function notebookLookups(userId: string): Promise<NotebookLookups> {
  const [{ names, lookups }, index, ctx] = await Promise.all([loadNames(), publishedIndex(), userContext(userId)]);
  return {
    ...lookups,
    years: [...new Set(index.map((q) => q.year).filter((y): y is number => y !== null))].sort((a, b) => b - a),
    index,
    answered: [...ctx.answered].filter((id) => index.some((q) => q.id === id)),
    favorites: [...ctx.favorites],
    topicParent: [...names.topicParent],
  };
}

// ---------------------------------------------------------------------------
// Cadernos
// ---------------------------------------------------------------------------

type NotebookRow = {
  id: string; title: string; filters: unknown; show_full_statement: boolean | null; pinned: boolean; last_opened_at: string | null; created_at: string;
  subject_id: string | null; exam_id: string | null; board_slug: string | null; question_type: string | null;
};

/** Filtros do caderno; os criados antes do JSON usam as colunas de valor único. */
function rowFilters(r: NotebookRow): NotebookFilters {
  const f = parseFilters(r.filters);
  const empty = !r.filters || (typeof r.filters === "object" && Object.keys(r.filters as object).length === 0);
  if (!empty) return f;
  return parseFilters({
    subjects: r.subject_id ? [r.subject_id] : [],
    exams: r.exam_id ? [r.exam_id] : [],
    boards: r.board_slug ? [r.board_slug] : [],
    types: r.question_type ? [r.question_type] : [],
  });
}

function toNotebook(r: NotebookRow, names: Names, index: IndexedQuestion[], ctx: MatchContext, stats?: { answered: number; correct: number }): Notebook {
  const filters = rowFilters(r);
  const labels = filterLabels(filters, names);
  const firstSubject = filters.subjects.map(names.subject).find(Boolean) ?? filters.topics.map(names.topic).find(Boolean);
  const firstExam = filters.exams.map(names.exam).find(Boolean);
  return {
    id: r.id,
    title: r.title,
    filters,
    labels,
    scope: firstSubject
      ? filters.subjects.length + filters.topics.length > 1
        ? `${firstSubject} +${filters.subjects.length + filters.topics.length - 1}`
        : firstSubject
      : (firstExam ?? (filters.boards.length ? `Banca ${names.board(filters.boards[0]!) ?? filters.boards[0]}` : "Todas as matérias")),
    iconHint: firstSubject ?? firstExam ?? "",
    showFullStatement: r.show_full_statement ?? true,
    pinned: r.pinned,
    lastOpenedAt: r.last_opened_at,
    createdAt: r.created_at,
    available: countMatches(index, filters, ctx),
    answered: stats?.answered ?? 0,
    correct: stats?.correct ?? 0,
  };
}

type AttemptRow = { notebook_id: string; question_id: string; is_correct: boolean; created_at: string };
function groupBy<T>(xs: T[], key: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of xs) m.set(key(x), [...(m.get(key(x)) ?? []), x]);
  return m;
}
/** Desempenho do caderno: cada questão conta uma vez, pela última resposta (refazer não infla a nota). */
function lastAnswerStats(list: AttemptRow[]): { answered: number; correct: number } {
  const last = new Map<string, boolean>();
  for (const a of [...list].sort((x, y) => y.created_at.localeCompare(x.created_at))) if (!last.has(a.question_id)) last.set(a.question_id, a.is_correct);
  return { answered: last.size, correct: [...last.values()].filter(Boolean).length };
}

const NOTEBOOK_COLUMNS = "id, title, filters, show_full_statement, pinned, last_opened_at, created_at, subject_id, exam_id, board_slug, question_type";

export async function listNotebooks(userId: string): Promise<Notebook[]> {
  const db = await createUserClient();
  const { data, error } = await db.from("question_notebooks").select(NOTEBOOK_COLUMNS).eq("user_id", userId).order("created_at", { ascending: false }).limit(100);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as NotebookRow[];
  if (!rows.length) return [];
  const [{ names }, index, ctx, attempts] = await Promise.all([
    loadNames(),
    publishedIndex(),
    userContext(userId),
    createAdminClient().from("bank_attempts").select("notebook_id, question_id, is_correct, created_at").eq("user_id", userId).in("notebook_id", rows.map((r) => r.id)).order("created_at", { ascending: false }).limit(20000),
  ]);
  const stats = new Map<string, { answered: number; correct: number }>();
  for (const [nid, list] of groupBy((attempts.data ?? []) as AttemptRow[], (a) => a.notebook_id)) stats.set(nid, lastAnswerStats(list));
  const mctx: MatchContext = { ...ctx, topicParent: names.topicParent };
  return rows.map((r) => toNotebook(r, names, index, mctx, stats.get(r.id)));
}

const createSchema = z.object({
  title: z.string().max(NOTEBOOK_TITLE_MAX).optional().default(""),
  filters: filtersSchema,
  showFullStatement: z.boolean().default(true),
});
export type NotebookInput = z.input<typeof createSchema>;

export async function createNotebook(userId: string, raw: unknown): Promise<string> {
  const input = createSchema.parse(raw);
  await enforceRateLimit(userId, "notebook_write", 20);
  const { names } = await loadNames();
  const f = input.filters;
  // Só ids que existem (evita guardar lixo vindo do navegador).
  const unknown = [...f.subjects.filter((x) => !names.subject(x)), ...f.topics.filter((x) => !names.topic(x)), ...f.boards.filter((x) => !names.board(x)), ...f.exams.filter((x) => !names.exam(x))];
  if (unknown.length) throw new UserFacingError("Algum filtro não existe mais. Atualize a página e tente de novo.", "invalid_input");
  const title = input.title.replace(/\s+/g, " ").trim() || autoTitle(f, names);
  const db = await createUserClient();
  const { data, error } = await db
    .from("question_notebooks")
    .insert({ user_id: userId, title: title.slice(0, NOTEBOOK_TITLE_MAX), filters: f, show_full_statement: input.showFullStatement })
    .select("id")
    .single();
  if (error) {
    if (error.message.includes("Limite de 100")) throw new UserFacingError("Você chegou ao limite de 100 cadernos. Exclua algum para criar outro.", "limit");
    throw new Error(error.message);
  }
  return data.id as string;
}

export async function updateNotebook(userId: string, id: string, raw: unknown) {
  const nid = z.uuid().parse(id);
  const patch = z
    .object({
      title: z.string().trim().min(1, "Dê um nome ao caderno.").max(NOTEBOOK_TITLE_MAX).optional(),
      pinned: z.boolean().optional(),
      showFullStatement: z.boolean().optional(),
    })
    .refine((p) => p.title !== undefined || p.pinned !== undefined || p.showFullStatement !== undefined)
    .parse(raw);
  await enforceRateLimit(userId, "notebook_write", 30);
  const db = await createUserClient();
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.pinned !== undefined) row.pinned = patch.pinned;
  if (patch.showFullStatement !== undefined) row.show_full_statement = patch.showFullStatement;
  const { data, error } = await db.from("question_notebooks").update(row).eq("id", nid).eq("user_id", userId).select("id");
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
  /** Assunto (do cadastro de assuntos do banco). */
  topicName: string | null;
  /** Cargo do concurso de origem, quando houver. */
  cargo: string | null;
  /** Anotação pessoal do aluno nesta questão. */
  note: string;
  origin: string;
  options: Array<{ id: string; label: string; text: string }>;
  favorite: boolean;
  /** Última resposta do aluno a esta questão (em qualquer caderno). */
  last: { correct: boolean; at: string } | null;
}

export async function openNotebook(userId: string, id: string): Promise<{ notebook: Notebook; questions: NotebookQuestion[] } | null> {
  const nid = z.uuid().safeParse(id);
  if (!nid.success) return null;
  const db = await createUserClient();
  const { data: row, error } = await db.from("question_notebooks").select(NOTEBOOK_COLUMNS).eq("id", nid.data).eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!row) return null;
  const admin = createAdminClient();
  const [{ names }, index, ctx, stats] = await Promise.all([
    loadNames(),
    publishedIndex(),
    userContext(userId),
    admin.from("bank_attempts").select("notebook_id, question_id, is_correct, created_at").eq("user_id", userId).eq("notebook_id", nid.data).order("created_at", { ascending: false }).limit(20000),
  ]);
  const mctx: MatchContext = { ...ctx, topicParent: names.topicParent };
  const notebook = toNotebook(row as NotebookRow, names, index, mctx, lastAnswerStats((stats.data ?? []) as AttemptRow[]));
  const ids = index.filter((q) => matchQuestion(q, notebook.filters, mctx)).map((q) => q.id).slice(0, 500);

  type Row = {
    id: string; public_code: string | null; question_type: NotebookQuestion["type"]; statement: string; case_context: string | null;
    board_slug: string | null; year: number | null; origin: string; exam_id: string | null; subject_id: string | null; topic_id: string | null; seq: number;
    bank_question_options: Array<{ id: string; label: string; text: string; sort_order: number }> | null;
  };
  const rows: Row[] = [];
  for (let i = 0; i < ids.length; i += 100) {
    const part = await admin
      .from("bank_questions")
      .select("id, seq, public_code, question_type, statement, case_context, board_slug, year, origin, exam_id, subject_id, topic_id, bank_question_options(id, label, text, sort_order)")
      .eq("status", "publicada")
      .in("id", ids.slice(i, i + 100));
    if (part.error) throw new Error(part.error.message);
    rows.push(...((part.data ?? []) as Row[]));
  }
  rows.sort((a, b) => a.seq - b.seq);
  const hist = ids.length
    ? await admin.from("bank_attempts").select("question_id, is_correct, created_at").eq("user_id", userId).in("question_id", ids).order("created_at", { ascending: false }).limit(5000)
    : { data: [] };
  const notes = new Map<string, string>();
  if (ids.length) {
    const nr = await db.from("bank_question_notes").select("question_id, body").eq("user_id", userId).in("question_id", ids);
    for (const n of (nr.data ?? []) as Array<{ question_id: string; body: string }>) notes.set(n.question_id, n.body);
  }
  const last = new Map<string, { correct: boolean; at: string }>();
  for (const h of (hist.data ?? []) as Array<{ question_id: string; is_correct: boolean; created_at: string }>) {
    if (!last.has(h.question_id)) last.set(h.question_id, { correct: h.is_correct, at: h.created_at });
  }

  await db.from("question_notebooks").update({ last_opened_at: new Date().toISOString() }).eq("id", notebook.id).eq("user_id", userId);

  return {
    notebook,
    questions: rows.map((r) => ({
      id: r.id,
      code: r.public_code,
      type: r.question_type,
      statement: r.statement,
      caseContext: r.case_context,
      board: r.board_slug ? (names.board(r.board_slug) ?? r.board_slug) : null,
      year: r.year,
      examName: r.exam_id ? (names.exam(r.exam_id) ?? null) : null,
      subjectName: r.subject_id ? (names.subject(r.subject_id) ?? null) : null,
      topicName: r.topic_id ? (names.topic(r.topic_id) ?? null) : null,
      cargo: r.exam_id ? (names.cargo(r.exam_id) ?? null) : null,
      note: notes.get(r.id) ?? "",
      origin: r.origin,
      options: (r.bank_question_options ?? []).sort((a, b) => a.sort_order - b.sort_order).map(({ id, label, text }) => ({ id, label, text })),
      favorite: ctx.favorites.has(r.id),
      last: last.get(r.id) ?? null,
    })),
  };
}

const answerSchema = z.object({
  notebookId: z.uuid(),
  questionId: z.uuid(),
  optionId: z.uuid().optional(),
  answerTrue: z.boolean().optional(),
  /** Chave da confirmação, gerada no navegador: reenviar a mesma confirmação não conta de novo. */
  attemptKey: z.uuid(),
  seconds: z.number().int().min(0).max(3600).optional(),
});

/**
 * Corrige no banco (função bank_answer_question, só service_role) e grava a tentativa em
 * bank_attempts. O gabarito e o comentário só voltam depois de uma resposta válida.
 */
export async function answerNotebookQuestion(userId: string, raw: unknown): Promise<AnswerFeedback & { duplicate?: boolean }> {
  const a = answerSchema.parse(raw);
  if (!a.optionId && a.answerTrue === undefined) throw new UserFacingError("Escolha uma alternativa para confirmar.", "invalid_input");
  await enforceRateLimit(userId, "answer", 120);
  const r = await createAdminClient().rpc("bank_answer_question", {
    p_user: userId,
    p_question: a.questionId,
    p_notebook: a.notebookId,
    p_option: a.optionId ?? null,
    p_bool: a.answerTrue ?? null,
    p_attempt: a.attemptKey,
    p_ms: a.seconds !== undefined ? a.seconds * 1000 : null,
  });
  if (r.error) {
    if (r.error.code === "P0002") throw new UserFacingError("Esta questão ou caderno não está mais disponível.", "not_found");
    if (r.error.code === "22023") throw new UserFacingError("Resposta inválida para esta questão.", "invalid_answer");
    throw new Error(r.error.message);
  }
  const d = r.data as { correct: boolean; justification: string | null; correctAnswerTrue: boolean | null; options: AnswerFeedback["options"]; duplicate: boolean };
  return {
    correct: d.correct,
    justification: d.justification ?? "Esta questão ainda não tem comentário validado.",
    correctAnswerTrue: d.correctAnswerTrue,
    options: d.options,
    duplicate: d.duplicate,
  };
}

/** Salva (ou apaga, se vazia) a anotação pessoal do aluno numa questão publicada. */
export async function saveQuestionNote(userId: string, questionId: string, body: string) {
  const qid = z.uuid().parse(questionId);
  const text = z.string().max(2000, "A anotação pode ter até 2.000 caracteres.").parse(body).trim();
  await enforceRateLimit(userId, "question_note", 30);
  const db = await createUserClient();
  if (!text) {
    const { error } = await db.from("bank_question_notes").delete().eq("user_id", userId).eq("question_id", qid);
    if (error) throw new Error(error.message);
    return;
  }
  const { data } = await createAdminClient().from("bank_questions").select("status").eq("id", qid).maybeSingle();
  if (!data || data.status !== "publicada") throw new UserFacingError("Esta questão não está mais disponível.", "not_found");
  const { error } = await db.from("bank_question_notes").upsert({ user_id: userId, question_id: qid, body: text, updated_at: new Date().toISOString() }, { onConflict: "user_id,question_id" });
  if (error) throw new Error(error.message);
}

/** Aluno relata erro numa questão: vira um alerta para a equipe revisar no /banco. */
export async function reportQuestion(userId: string, questionId: string, details: string) {
  const qid = z.uuid().parse(questionId);
  const text = z.string().trim().min(10, "Descreva o problema em pelo menos 10 caracteres.").max(1000).parse(details);
  await enforceRateLimit(userId, "question_report", 5, 600);
  const admin = createAdminClient();
  const { data } = await admin.from("bank_questions").select("status").eq("id", qid).maybeSingle();
  if (!data || data.status !== "publicada") throw new UserFacingError("Esta questão não está mais disponível.", "not_found");
  const { error } = await admin.from("bank_question_flags").insert({ question_id: qid, kind: "erro_relatado", details: text, reported_by: userId });
  if (error) throw new Error(error.message);
}

/** Marca/desmarca uma questão publicada como favorita. */
export async function setFavorite(userId: string, questionId: string, on: boolean) {
  const qid = z.uuid().parse(questionId);
  await enforceRateLimit(userId, "favorite", 60);
  const db = await createUserClient();
  if (on) {
    const { data } = await createAdminClient().from("bank_questions").select("status").eq("id", qid).maybeSingle();
    if (!data || data.status !== "publicada") throw new UserFacingError("Esta questão não está mais disponível.", "not_found");
    const { error } = await db.from("bank_question_favorites").upsert({ user_id: userId, question_id: qid }, { onConflict: "user_id,question_id", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  } else {
    const { error } = await db.from("bank_question_favorites").delete().eq("user_id", userId).eq("question_id", qid);
    if (error) throw new Error(error.message);
  }
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
