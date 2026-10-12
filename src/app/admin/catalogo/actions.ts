"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { AIError } from "@/ai/provider";
import { LEVEL_KEYS } from "@/domain/progress/levels";
import { logEvent } from "@/server/observability";
import { UserFacingError } from "@/server/services/trails";
import {
  createTopic,
  generateTopicLesson,
  generateTopicQuestions,
  generateTopicStructure,
  promoteLesson,
  publishTopic,
  removeTopicQuestion,
  requireAdmin,
  setTopicStatus,
  topicInputSchema,
  updateTopic,
  updateTopicQuestion,
  updateTopicSection,
} from "@/server/services/catalog";

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

function topicForm(form: FormData) {
  return topicInputSchema.safeParse({
    title: form.get("title"),
    kind: form.get("kind"),
    lawCode: form.get("lawCode") || undefined,
    articles: form.get("articles") || undefined,
    aliases: form.get("aliases") || undefined,
    disciplineMode: form.get("disciplineMode"),
    summary: form.get("summary") || undefined,
    sourceText: form.get("sourceText") || undefined,
    estimatedMinutes: form.get("estimatedMinutes") || undefined,
  });
}

export async function createTopicAction(_: AdminResult, form: FormData): Promise<AdminResult> {
  const user = await requireAdmin();
  const parsed = topicForm(form);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  let id = "";
  const r = await guard("catalog.create", async () => {
    id = await createTopic(user, parsed.data);
  });
  if (!r.ok) return r;
  redirect(`/admin/catalogo/${id}`);
}

export async function updateTopicAction(id: string, _: AdminResult, form: FormData): Promise<AdminResult> {
  const user = await requireAdmin();
  const parsed = topicForm(form);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  const r = await guard("catalog.update", async () => {
    const { sourceChanged } = await updateTopic(user, id, parsed.data);
    return sourceChanged ? "Dados salvos. O texto-fonte mudou: gere a estrutura, a aula e as questões de novo." : "Dados salvos.";
  });
  revalidatePath(`/admin/catalogo/${id}`);
  return r;
}

const steps = ["estrutura", "aula", ...LEVEL_KEYS] as const;
export type GenerationStep = (typeof steps)[number];

/** Um passo de geração por chamada (cada um cabe no tempo de uma requisição). */
export async function runStepAction(id: string, step: GenerationStep): Promise<AdminResult> {
  await requireAdmin();
  const s = z.enum(steps).parse(step);
  const r = await guard(`catalog.step_${s}`, async () => {
    if (s === "estrutura") {
      const x = await generateTopicStructure(id);
      return `${x.items} item(ns) a ensinar.`;
    }
    if (s === "aula") {
      const x = await generateTopicLesson(id);
      return x.missingKinds.length ? `Aula com ${x.sections} seções; faltaram: ${x.missingKinds.join(", ")}.` : `Aula com ${x.sections} seções.`;
    }
    const x = await generateTopicQuestions(id, s);
    return `${x.added} questão(ões) acrescentada(s).`;
  });
  revalidatePath(`/admin/catalogo/${id}`);
  return r;
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
