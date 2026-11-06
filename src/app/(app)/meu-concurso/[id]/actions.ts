"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { startEditalStudy } from "@/server/services/edital-study";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import { requireUser } from "@/server/auth";
import { updatePreparationInfo } from "@/server/services/edital";

export async function updateInfoAction(id: string, form: FormData) {
  const user = await requireUser(`/meu-concurso/${id}`);
  const y = String(form.get("year") ?? "").trim();
  const year = y ? Number(y) : null;
  await updatePreparationInfo(user.id, id, {
    contestName: String(form.get("contestName") ?? "").slice(0, 160),
    roleName: String(form.get("roleName") ?? "").slice(0, 160),
    board: String(form.get("board") ?? "").slice(0, 80),
    year: year && year >= 1990 && year <= 2100 ? year : null,
  });
  revalidatePath(`/meu-concurso/${id}`);
}

export interface StartStudyState { error?: string }

/** Botão "Começar estudo": monta a pasta do cargo em Meus estudos e leva o aluno até ela. */
export async function startStudyAction(id: string, _: StartStudyState): Promise<StartStudyState> {
  const user = await requireUser(`/meu-concurso/${id}`);
  let folderId: string;
  try {
    folderId = (await startEditalStudy(user.id, id)).folderId;
  } catch (e) {
    if (e instanceof UserFacingError) return { error: e.message };
    await logEvent("edital.start_study_error", { userId: user.id, prepId: id, error: (e as Error).message });
    return { error: "Não foi possível começar o estudo agora. Tente novamente em instantes." };
  }
  revalidatePath("/trilhas");
  revalidatePath(`/meu-concurso/${id}`);
  redirect(`/trilhas#pasta-${folderId}`);
}
