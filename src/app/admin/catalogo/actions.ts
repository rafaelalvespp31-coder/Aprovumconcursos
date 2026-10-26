"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AIError } from "@/ai/provider";
import { logEvent } from "@/server/observability";
import { UserFacingError } from "@/server/services/trails";
import {
  deleteTopic,
  topicDeleteImpact,
  type TopicDeleteImpact,
  promoteLesson,
  publishTopic,
  removeTopicQuestion,
  requireAdmin,
  setTopicStatus,
  updateTopicQuestion,
  updateTopicSection,
} from "@/server/services/catalog";
import { importLessonUpload, previewLessonUpload, type LessonUploadPreview } from "@/server/services/catalog-upload";
import { bannerUrlFor, removeBanner, saveBanner } from "@/server/services/banners";

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

const MAX_TEXT = 400_000;
const pasted = (text: unknown) => {
  const t = typeof text === "string" ? text : "";
  if (!t.trim()) throw new UserFacingError("Cole o texto da aula no campo.", "invalid_input");
  if (t.length > MAX_TEXT) throw new UserFacingError("Texto grande demais (máximo de 400 mil caracteres). Divida a aula em partes.", "invalid_input");
  return t;
};

/** Lê o texto colado e mostra como a aula ficará, sem gravar. */
export async function previewLessonUploadAction(text: string): Promise<UploadPreviewResult> {
  await requireAdmin();
  let preview = null as LessonUploadPreview | null;
  const r = await guard("catalog.upload_preview", async () => {
    preview = await previewLessonUpload(pasted(text));
  });
  return r.ok && preview ? { ok: true, preview } : { ok: false, error: r.error ?? "Não foi possível ler o texto." };
}

/** Cataloga a aula colada (publica na hora quando tem ≥ 10 questões por nível) e abre a página dela. */
export async function importLessonUploadAction(text: string): Promise<AdminResult> {
  const user = await requireAdmin();
  let id = "";
  const r = await guard("catalog.upload", async () => {
    id = (await importLessonUpload(user, pasted(text), "texto colado")).id;
  });
  if (!r.ok) return r;
  revalidatePath("/admin/catalogo");
  revalidatePath("/nova-trilha");
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

export type BannerResult = { ok: true; url: string | null } | { ok: false; error: string };

/** Anexa (ou troca) o banner de uma matéria: vale para todas as aulas dela. */
export async function saveBannerAction(form: FormData): Promise<BannerResult> {
  const user = await requireAdmin();
  const mode = String(form.get("mode") ?? "");
  const r = await guard("catalog.banner", async () => saveBanner(user, mode, form.get("file") as File));
  if (!r.ok) return { ok: false, error: r.error ?? "Não foi possível salvar o banner." };
  revalidatePath("/admin/catalogo/banners");
  revalidatePath("/aula/[id]", "page");
  return { ok: true, url: await bannerUrlFor(mode) };
}

export async function removeBannerAction(mode: string): Promise<BannerResult> {
  const user = await requireAdmin();
  const r = await guard("catalog.banner_remove", async () => removeBanner(user, mode));
  if (!r.ok) return { ok: false, error: r.error ?? "Não foi possível remover." };
  revalidatePath("/admin/catalogo/banners");
  revalidatePath("/aula/[id]", "page");
  return { ok: true, url: null };
}

export type ImpactResult = { ok: true; impact: TopicDeleteImpact } | { ok: false; error: string };

export async function deleteImpactAction(id: string): Promise<ImpactResult> {
  await requireAdmin();
  let impact = null as TopicDeleteImpact | null;
  const r = await guard("catalog.delete_impact", async () => {
    impact = await topicDeleteImpact(id);
  });
  return r.ok && impact ? { ok: true, impact } : { ok: false, error: r.error ?? "Não foi possível consultar." };
}

/** Exclui o tema (matéria/assunto) do catálogo de vez. */
export async function deleteTopicAction(id: string): Promise<AdminResult> {
  const user = await requireAdmin();
  const r = await guard("catalog.delete", async () => {
    const i = await deleteTopic(user, z.uuid().parse(id));
    return `“${i.title}” foi excluída do catálogo.`;
  });
  if (r.ok) {
    revalidatePath("/admin/catalogo");
    revalidatePath("/nova-trilha");
  }
  return r;
}
