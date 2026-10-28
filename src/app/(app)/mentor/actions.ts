"use server";

import { ZodError } from "zod";
import { getSessionUser } from "@/server/auth";
import { computeMentor, setRecommendationStatus } from "@/server/services/mentor";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import type { MentorCardState } from "@/components/mentor/types";
import { toMentorItem } from "@/components/mentor/to-item";

/** Card do Mentor no painel. A identidade vem só da sessão; sem sessão, avisa (sem dados). */
export async function mentorCardAction(): Promise<MentorCardState> {
  const user = await getSessionUser();
  if (!user) return { state: "sessao" };
  try {
    const m = await computeMentor(user.id);
    if (m.result.insufficientData) return { state: "sem_dados", name: m.name };
    const items = m.visible.map(toMentorItem);
    if (!items.length) return { state: "vazio", name: m.name, completed: m.result.completedLessons.length };
    return { state: "ok", name: m.name, items, pending: m.result.all.filter((r) => r.kind !== "manutencao").length, completed: m.result.completedLessons.length };
  } catch (e) {
    await logEvent("mentor.card_failed", { error: (e as Error).message });
    return { state: "erro" };
  }
}

/** Visualizada (abriu a ação) ou dispensada — só de recomendações do próprio aluno. */
export async function mentorStatusAction(id: string, status: "visualizada" | "dispensada"): Promise<{ ok: true } | { ok: false; error: string; expired?: boolean }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente.", expired: true };
  if (status !== "visualizada" && status !== "dispensada") return { ok: false, error: "Ação inválida." };
  try {
    await setRecommendationStatus(user.id, id, status);
    return { ok: true };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    if (e instanceof ZodError) return { ok: false, error: "Recomendação inválida." };
    await logEvent("mentor.status_failed", { error: (e as Error).message });
    return { ok: false, error: "Não foi possível salvar agora. Tente de novo." };
  }
}
