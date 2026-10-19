"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { activateTrail, answerClarification, deleteTrail, setTrailArchived, UserFacingError } from "@/server/services/trails";
import { createStudyPdf, deleteStudyPdf } from "@/server/services/pdf";
import { logEvent } from "@/server/observability";

export async function startTrailAction(trailId: string) {
  const user = await requireUser();
  try {
    await activateTrail(trailId, user.id);
  } catch (e) {
    if (e instanceof UserFacingError) redirect(`/trilhas/${trailId}?erro=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath(`/trilhas/${trailId}`);
  redirect(`/trilhas/${trailId}`);
}

export async function archiveTrailAction(trailId: string, archived: boolean) {
  const user = await requireUser();
  await setTrailArchived(trailId, user.id, archived);
  revalidatePath("/trilhas");
  revalidatePath(`/trilhas/${trailId}`);
}

export async function deleteTrailAction(trailId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await deleteTrail(trailId, user.id);
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("trail.delete_failed", { trailId, error: (e as Error).message });
    return { ok: false, error: "Não foi possível excluir agora. Tente novamente." };
  }
  revalidatePath("/trilhas");
  revalidatePath("/painel");
  return { ok: true };
}

export interface ClarifyState {
  error?: string;
}

export async function answerClarificationAction(trailId: string, _prev: ClarifyState, form: FormData): Promise<ClarifyState> {
  const user = await requireUser();
  const choice = String(form.get("choice") ?? "");
  const detail = String(form.get("detail") ?? "").trim();
  const answer = [choice, detail].filter(Boolean).join(" — ");
  if (!answer) return { error: "Escolha uma opção ou escreva sua resposta." };
  try {
    await answerClarification(user.id, trailId, answer);
  } catch (e) {
    if (e instanceof UserFacingError) return { error: e.message };
    throw e;
  }
  revalidatePath(`/trilhas/${trailId}/processando`);
  redirect(`/trilhas/${trailId}/processando`);
}

export interface PdfState {
  error?: string;
  created?: number;
}

// O segundo parâmetro (estado anterior) é exigido por useActionState e não é usado.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function createPdfAction(trailId: string, _prev: PdfState): Promise<PdfState> {
  const user = await requireUser();
  try {
    const r = await createStudyPdf(user.id, trailId);
    revalidatePath("/aula/[id]", "page");
    return { created: r.pdfVersion };
  } catch (e) {
    if (e instanceof UserFacingError) return { error: e.message };
    await logEvent("study_pdf.failed", { trailId, error: (e as Error).message });
    return { error: "Não foi possível gerar o PDF agora. Tente novamente." };
  }
}

/** Exclui uma versão do PDF do conteúdo. */
export async function deletePdfAction(trailId: string, pdfId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  try {
    await deleteStudyPdf(user.id, pdfId);
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("study_pdf.delete_failed", { trailId, pdfId, error: (e as Error).message });
    return { ok: false, error: "Não foi possível excluir o PDF agora. Tente novamente." };
  }
  revalidatePath("/aula/[id]", "page");
  return { ok: true };
}
