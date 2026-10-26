"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AIError } from "@/ai/provider";
import { logEvent } from "@/server/observability";
import { UserFacingError } from "@/server/services/trails";
import {
  promoteLesson,
  publishTopic,
  removeTopicQuestion,
  requireAdmin,
  setTopicStatus,
  updateTopicQuestion,
  updateTopicSection,
} from "@/server/services/catalog";
import { importLessonUpload, previewLessonUpload, type LessonUploadPreview } from "@/server/services/catalog-upload";
import { uploadedText } from "@/server/upload-file";

export interface AdminResult {
  ok: boolean;
  error?: string;
  message?: string;
}

async function guard(name: string, fn: () => Promise<string | void>): Promise<AdminResult> {
  try {
    const message = await fn();
    return { ok: true, message: message || undefined };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    if (e instanceof AIError) return { ok: false, error: e.kind === "not_configured" ? "IA não configurada no servidor." : e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Dados inválidos." };
    await logEvent(`${name}.failed`, { error: (e as Error).message });
    return { ok: false, error: "Não foi possível concluir. Tente novamente." };
  }
}

export type UploadPreviewResult = { ok: true; preview: LessonUploadPreview } | { ok: false; error: string };

/** Lê o arquivo (PDF ou .txt) e mostra como a aula ficará, sem gravar. */
export async function previewLessonUploadAction(form: FormData): Promise<UploadPreviewResult> {
  await requireAdmin();
  let preview = null as LessonUploadPreview | null;
  const r = await guard("catalog.upload_preview", async () => {
    const f = await uploadedText(form.get("file") as File);
    preview = await previewLessonUpload(f.text);
  });
  return r.ok && preview ? { ok: true, preview } : { ok: false, error: r.error ?? "Não foi possível ler o arquivo." };
}

/** Grava a aula do arquivo como rascunho e abre a página de revisão. */
export async function importLessonUploadAction(form: FormData): Promise<AdminResult> {
  const user = await requireAdmin();
  let id = "";
  const r = await guard("catalog.upload", async () => {
    const f = await uploadedText(form.get("file") as File);
    id = (await importLessonUpload(user, f.text, f.name)).id;
  });
  if (!r.ok) return r;
  revalidatePath("/admin/catalogo");
  redirect(`/admin/catalogo/${id}`);
}

export async function saveSectionAction(id: string, index: number, data: { title: string; bodyMarkdown: string }): Promise<AdminResult> {
  await requireAdmin();
  const r = await guard("catalog.section", async () => updateTopicSection(id, index, data));
  revalidatePath(`/admin/catalogo/${id}`);
  return r;
}

export async function saveQuestionAction(topicId: string, questionId: string, data: unknown): Promise<AdminResult> {
  await requireAdmin();
  const r = await guard("catalog.question", async () => updateTopicQuestion(z.uuid().parse(questionId), data));
  revalidatePath(`/admin/catalogo/${topicId}`);
  return r;
}

export async function removeQuestionAction(topicId: string, questionId: string): Promise<AdminResult> {
  await requireAdmin();
  const r = await guard("catalog.question_remove", async () => removeTopicQuestion(z.uuid().parse(questionId)));
  revalidatePath(`/admin/catalogo/${topicId}`);
  return r;
}

export async function publishAction(id: string): Promise<AdminResult> {
  const user = await requireAdmin();
  const r = await guard("catalog.publish", async () => `Publicado (versão ${await publishTopic(user, id)}).`);
  revalidatePath(`/admin/catalogo/${id}`);
  revalidatePath("/admin/catalogo");
  return r;
}

export async function setStatusAction(id: string, status: "rascunho" | "arquivado"): Promise<AdminResult> {
  const user = await requireAdmin();
  const r = await guard("catalog.status", async () => setTopicStatus(user, id, z.enum(["rascunho", "arquivado"]).parse(status)));
  revalidatePath(`/admin/catalogo/${id}`);
  revalidatePath("/admin/catalogo");
  return r;
}

export async function promoteAction(lessonId: string): Promise<AdminResult> {
  const user = await requireAdmin();
  let id = "";
  const r = await guard("catalog.promote", async () => {
    id = await promoteLesson(user, lessonId);
  });
  if (!r.ok) return r;
  redirect(`/admin/catalogo/${id}`);
}
