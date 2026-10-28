"use server";

import { revalidatePath } from "next/cache";
import { loadErrorNotebook, saveErrorNotebookEntries } from "@/server/services/error-notebook";
import type { ErrorNotebookData, ErrorNotebookEdit } from "@/domain/notebooks/error-notebook";
import { requireUser } from "@/server/auth";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import { answerNotebookQuestion, saveNotebookPosition, createNotebook, deleteNotebook, reportQuestion, saveQuestionNote, setFavorite, updateNotebook, type NotebookInput } from "@/server/services/notebooks";
import type { AnswerFeedback } from "@/server/services/study";
import { ZodError } from "zod";

export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function guard<T>(name: string, fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    if (e instanceof ZodError) return { ok: false, error: e.issues[0]?.message && !/^Invalid/.test(e.issues[0].message) ? e.issues[0].message : "Dados inválidos." };
    await logEvent(`${name}.failed`, { error: (e as Error).message });
    return { ok: false, error: "Não foi possível concluir. Verifique a conexão e tente novamente." };
  }
}

export async function createNotebookAction(input: NotebookInput): Promise<Result<string>> {
  const user = await requireUser();
  const r = await guard("notebook_create", () => createNotebook(user.id, input));
  if (r.ok) revalidatePath("/questoes");
  return r;
}

export async function renameNotebookAction(id: string, title: string): Promise<Result<null>> {
  const user = await requireUser();
  const r = await guard("notebook_rename", async () => {
    await updateNotebook(user.id, id, { title });
    return null;
  });
  if (r.ok) revalidatePath("/questoes");
  return r;
}

export async function pinNotebookAction(id: string, pinned: boolean): Promise<Result<null>> {
  const user = await requireUser();
  const r = await guard("notebook_pin", async () => {
    await updateNotebook(user.id, id, { pinned });
    return null;
  });
  if (r.ok) revalidatePath("/questoes");
  return r;
}

export async function deleteNotebookAction(id: string): Promise<Result<null>> {
  const user = await requireUser();
  const r = await guard("notebook_delete", async () => {
    await deleteNotebook(user.id, id);
    return null;
  });
  if (r.ok) revalidatePath("/questoes");
  return r;
}

export async function answerNotebookAction(input: { notebookId: string; questionId: string; optionId?: string; answerTrue?: boolean; attemptKey: string; seconds?: number }): Promise<Result<AnswerFeedback>> {
  const user = await requireUser();
  return guard("notebook_answer", () => answerNotebookQuestion(user.id, input));
}

export async function favoriteQuestionAction(questionId: string, on: boolean): Promise<Result<boolean>> {
  const user = await requireUser();
  return guard("question_favorite", async () => {
    await setFavorite(user.id, questionId, on);
    return on;
  });
}

export async function fullStatementAction(id: string, on: boolean): Promise<Result<null>> {
  const user = await requireUser();
  return guard("notebook_full_statement", async () => {
    await updateNotebook(user.id, id, { showFullStatement: on });
    return null;
  });
}

export async function saveNoteAction(questionId: string, body: string): Promise<Result<null>> {
  const user = await requireUser();
  return guard("question_note", async () => {
    await saveQuestionNote(user.id, questionId, body);
    return null;
  });
}

export async function reportQuestionAction(questionId: string, details: string): Promise<Result<null>> {
  const user = await requireUser();
  return guard("question_report", async () => {
    await reportQuestion(user.id, questionId, details);
    return null;
  });
}

export async function notebookPositionAction(notebookId: string, questionId: string): Promise<Result<null>> {
  const user = await requireUser();
  return guard("notebook_position", async () => {
    await saveNotebookPosition(user.id, notebookId, questionId);
    return null;
  });
}

export async function openErrorNotebookAction(notebookId: string): Promise<Result<ErrorNotebookData>> {
  const user = await requireUser();
  return guard("error_notebook_open", () => loadErrorNotebook(user.id, notebookId));
}

export async function saveErrorNotebookAction(notebookId: string, edits: ErrorNotebookEdit[]): Promise<Result<{ savedAt: string }>> {
  const user = await requireUser();
  return guard("error_notebook_save", () => saveErrorNotebookEntries(user.id, notebookId, edits));
}
