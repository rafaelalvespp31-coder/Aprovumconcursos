"use server";

import { z } from "zod";
import { requireUser } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { submitAnswer, type AnswerFeedback } from "@/server/services/study";
import { clarify, type Clarification } from "@/server/services/tools";
import { enforceRateLimit, UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import { AIError } from "@/ai/provider";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function guard<T>(name: string, fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    if (e instanceof AIError) return { ok: false, error: e.kind === "not_configured" ? "Recurso de IA indisponível no momento." : e.message };
    await logEvent(`${name}.failed`, { error: (e as Error).message });
    return { ok: false, error: "Não foi possível concluir. Verifique a conexão e tente novamente." };
  }
}

// ---------------------------------------------------------------------------
// Respostas
// ---------------------------------------------------------------------------
export async function answerQuestion(input: {
  questionId: string;
  optionId?: string;
  answerTrue?: boolean;
  context: "fixacao" | "revisao" | "simulado";
  confidence?: number;
  seconds?: number;
}): Promise<Result<AnswerFeedback>> {
  const user = await requireUser();
  return guard("answer", () => submitAnswer(user.id, input));
}

/** Gabarito de questão já respondida (rever explicações depois). */
export async function reviewAnsweredQuestion(questionId: string): Promise<Result<AnswerFeedback | null>> {
  await requireUser();
  return guard("review_answer", async () => {
    const db = await createUserClient();
    const { data, error } = await db.rpc("answered_question_review", { p_question: z.uuid().parse(questionId) });
    if (error) throw new Error(error.message);
    return data ? ({ correct: false, ...(data as object) } as AnswerFeedback) : null;
  });
}

// ---------------------------------------------------------------------------
// Resolver depois
// ---------------------------------------------------------------------------
export async function toggleQuestionMark(questionId: string, marked: boolean): Promise<Result<boolean>> {
  await requireUser();
  return guard("question_mark", async () => {
    const id = z.uuid().parse(questionId);
    const db = await createUserClient();
    const r = marked
      ? await db.from("question_marks").upsert({ question_id: id }, { onConflict: "user_id,question_id", ignoreDuplicates: true })
      : await db.from("question_marks").delete().eq("question_id", id);
    if (r.error) throw new Error(r.error.message);
    return marked;
  });
}

// ---------------------------------------------------------------------------
// Anotações na aula (nota, revisar, dúvida) — gravadas com a sessão do aluno (RLS)
// ---------------------------------------------------------------------------
const annotationSchema = z.object({
  lessonId: z.uuid(),
  sectionId: z.uuid().nullable(),
  sectionTitle: z.string().max(160).nullable(),
  kind: z.enum(["nota", "revisar", "duvida"]),
  body: z.string().trim().max(4000, "Use no máximo 4.000 caracteres."),
});

export interface Annotation {
  id: string;
  section_id: string | null;
  section_title: string | null;
  kind: "nota" | "revisar" | "duvida";
  body: string;
  resolved: boolean;
  updated_at: string;
}

const ANN_COLS = "id, section_id, section_title, kind, body, resolved, updated_at";

export async function createAnnotation(input: z.input<typeof annotationSchema>): Promise<Result<Annotation>> {
  await requireUser();
  return guard("annotation_create", async () => {
    const parsed = annotationSchema.safeParse(input);
    if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Anotação inválida.", "invalid_input");
    const a = parsed.data;
    if (a.kind === "nota" && !a.body) throw new UserFacingError("Escreva a anotação.", "invalid_input");
    const db = await createUserClient();
    const { data, error } = await db
      .from("lesson_annotations")
      .insert({ lesson_id: a.lessonId, section_id: a.sectionId, section_title: a.sectionTitle, kind: a.kind, body: a.body })
      .select(ANN_COLS)
      .single();
    if (error) throw new Error(error.message);
    return data as Annotation;
  });
}

export async function updateAnnotation(id: string, patch: { body?: string; resolved?: boolean }): Promise<Result<Annotation>> {
  await requireUser();
  return guard("annotation_update", async () => {
    const p = z.object({ body: z.string().trim().max(4000).optional(), resolved: z.boolean().optional() }).parse(patch);
    const db = await createUserClient();
    const { data, error } = await db.from("lesson_annotations").update(p).eq("id", z.uuid().parse(id)).select(ANN_COLS).single();
    if (error) throw new Error(error.message);
    return data as Annotation;
  });
}

export async function deleteAnnotation(id: string): Promise<Result<true>> {
  await requireUser();
  return guard("annotation_delete", async () => {
    const db = await createUserClient();
    const { error } = await db.from("lesson_annotations").delete().eq("id", z.uuid().parse(id));
    if (error) throw new Error(error.message);
    return true as const;
  });
}

// ---------------------------------------------------------------------------
// Esclarecer conceito
// ---------------------------------------------------------------------------
export async function askClarification(input: { lessonId: string; sectionId: string | null; question: string }): Promise<Result<Clarification>> {
  const user = await requireUser();
  return guard("clarify", () => clarify(user.id, input));
}

// ---------------------------------------------------------------------------
// Busca rápida (⌘K) nas trilhas e temas do próprio aluno (RLS)
// ---------------------------------------------------------------------------
export interface SearchItem {
  type: "Estudo" | "Tema" | "Revisão" | "Página";
  name: string;
  href: string;
}

export async function searchStudy(query: string): Promise<Result<SearchItem[]>> {
  await requireUser();
  return guard("search", async () => {
    const q = z.string().trim().min(2).max(80).safeParse(query);
    if (!q.success) return [];
    // Escapa curingas do ILIKE para que o termo seja literal.
    const term = `%${q.data.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const db = await createUserClient();
    const [trails, lessons, reviews] = await Promise.all([
      db.from("study_trails").select("id, title").is("archived_at", null).ilike("title", term).limit(5),
      db.from("lessons").select("id, title").ilike("title", term).order("sort_order").limit(6),
      db.from("review_schedules").select("lesson_id, lessons!inner(title)").lte("due_at", new Date().toISOString()).ilike("lessons.title", term).limit(3),
    ]);
    return [
      ...(trails.data ?? []).map((t) => ({ type: "Estudo" as const, name: t.title as string, href: `/trilhas/${t.id}` })),
      ...(reviews.data ?? []).map((r) => ({
        type: "Revisão" as const,
        name: (r.lessons as unknown as { title: string }).title,
        href: `/aula/${r.lesson_id}?revisao=1#questoes`,
      })),
      ...(lessons.data ?? []).map((l) => ({ type: "Tema" as const, name: l.title as string, href: `/aula/${l.id}` })),
    ];
  });
}

// ---------------------------------------------------------------------------
// Comentários dos alunos na questão (visíveis para todos que responderam a mesma questão)
// ---------------------------------------------------------------------------
export interface QuestionComment {
  id: string;
  author: string;
  body: string;
  createdAt: string;
  isMine: boolean;
  reported: boolean;
}

const COMMENT_ERRORS: Record<string, string> = {
  "42501": "Responda a questão para ver e escrever comentários.",
  P0002: "Questão não encontrada.",
  "54000": "Muitos comentários em pouco tempo. Tente mais tarde.",
};

async function commentsOf(db: Awaited<ReturnType<typeof createUserClient>>, questionId: string): Promise<QuestionComment[]> {
  const { data, error } = await db.rpc("list_question_comments", { p_question: questionId });
  if (error) {
    const msg = COMMENT_ERRORS[error.code ?? ""];
    if (msg) throw new UserFacingError(msg, "comments");
    throw new Error(error.message);
  }
  return ((data ?? []) as Array<{ id: string; author: string; body: string; created_at: string; is_mine: boolean; reported: boolean }>).map((r) => ({
    id: r.id,
    author: r.author,
    body: r.body,
    createdAt: r.created_at,
    isMine: r.is_mine,
    reported: r.reported,
  }));
}

export async function listQuestionComments(questionId: string): Promise<Result<QuestionComment[]>> {
  await requireUser();
  return guard("comments_list", async () => commentsOf(await createUserClient(), z.uuid().parse(questionId)));
}

const commentBody = z.string().trim().min(2, "Escreva o comentário.").max(1000, "Use no máximo 1.000 caracteres.");

export async function addQuestionComment(questionId: string, body: string): Promise<Result<QuestionComment[]>> {
  const user = await requireUser();
  return guard("comments_add", async () => {
    const id = z.uuid().parse(questionId);
    const parsed = commentBody.safeParse(body);
    if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Comentário inválido.", "invalid_input");
    await enforceRateLimit(user.id, "comment", 6);
    const db = await createUserClient();
    const { error } = await db.rpc("add_question_comment", { p_question: id, p_body: parsed.data });
    if (error) {
      if (error.code === "22023") throw new UserFacingError(error.message, "invalid_input");
      const msg = COMMENT_ERRORS[error.code ?? ""];
      if (msg) throw new UserFacingError(msg, "comments");
      throw new Error(error.message);
    }
    await logEvent("comment.added", { userId: user.id });
    return commentsOf(db, id);
  });
}

export async function deleteQuestionComment(questionId: string, commentId: string): Promise<Result<QuestionComment[]>> {
  await requireUser();
  return guard("comments_delete", async () => {
    const db = await createUserClient();
    const { error } = await db.rpc("delete_question_comment", { p_comment: z.uuid().parse(commentId) });
    if (error) throw new Error(error.message);
    return commentsOf(db, z.uuid().parse(questionId));
  });
}

export async function reportQuestionComment(questionId: string, commentId: string): Promise<Result<QuestionComment[]>> {
  const user = await requireUser();
  return guard("comments_report", async () => {
    await enforceRateLimit(user.id, "comment_report", 20);
    const db = await createUserClient();
    const qid = z.uuid().parse(questionId);
    const { error } = await db.rpc("report_question_comment", { p_question: qid, p_comment: z.uuid().parse(commentId) });
    if (error) throw new Error(error.message);
    await logEvent("comment.reported", { userId: user.id, commentId });
    return commentsOf(db, qid);
  });
}
