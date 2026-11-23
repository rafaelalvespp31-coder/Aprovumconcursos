"use server";

import { ZodError } from "zod";
import { resumoConcursos } from "@/server/services/concursos-aviso";
import { getSessionUser } from "@/server/auth";
import { computeMentor, setRecommendationStatus } from "@/server/services/mentor";
import { getRaioXNotices } from "@/server/services/raiox-notice";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import type { MentorPanelState } from "@/components/mentor/types";
import { listMyMessages, newTeamReplies, sendStudentMessage, unreadReplies, type TeamMessage, type TeamPopup } from "@/server/services/team-chat";
import { listEditalOptions, setMentorGoal, type EditalOption } from "@/server/services/mentor-goal";
import type { StudyPlan } from "@/domain/mentor/plan";

/** Mentor flutuante: a identidade vem só da sessão; sem sessão, avisa (sem dados). */
export async function mentorPanelAction(): Promise<MentorPanelState> {
  const user = await getSessionUser();
  if (!user) return { state: "sessao" };
  try {
    const m = await computeMentor(user.id);
    const notices = await getRaioXNotices(user.id).catch(() => []);
    const concursos = await resumoConcursos().catch(() => null);
    return { state: "ok", name: m.name, result: m.result, visible: m.visible, lessons: m.lessons, goal: m.goal ? { contest: m.goal.contest, semEdital: m.semEdital } : null, plan: m.plan, concursos, notices: notices.map((n) => ({ prepId: n.prepId, title: n.title, href: n.href })) };
  } catch (e) {
    await logEvent("mentor.panel_failed", { error: (e as Error).message });
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

/** O aluno responde "qual concurso você quer passar?": guarda e devolve o plano novo. Vazio remove o foco. */
export async function setMentorGoalAction(contest: string, editalId?: string): Promise<{ ok: true; goal: { contest: string; semEdital?: boolean } | null; plan: StudyPlan | null } | { ok: false; error: string }> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  try {
    await setMentorGoal(user.id, contest, editalId ?? null);
    const m = await computeMentor(user.id);
    return { ok: true, goal: m.goal ? { contest: m.goal.contest, ...(m.semEdital ? { semEdital: true } : {}) } : null, plan: m.plan };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("mentor.goal_failed", { error: (e as Error).message });
    return { ok: false, error: "Não foi possível salvar agora. Tente de novo." };
  }
}

/** Editais do próprio aluno (Aprovum AI), para ele escolher o plano. */
export async function listMentorContestsAction(): Promise<EditalOption[]> {
  const user = await getSessionUser();
  if (!user) return [];
  return listEditalOptions(user.id).catch(() => []);
}

export type EquipeState = { ok: true; messages: TeamMessage[] } | { ok: false; error: string };

/** Conversa do aluno logado com a Equipe APROVUM (a identidade vem só da sessão). */
export async function equipeListAction(): Promise<EquipeState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  try {
    return { ok: true, messages: await listMyMessages(user.id) };
  } catch (e) {
    await logEvent("equipe.list_failed", { error: (e as Error).message });
    return { ok: false, error: "Não foi possível carregar a conversa agora." };
  }
}

export async function equipeSendAction(text: string, attachmentPath?: string | null): Promise<EquipeState> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "Sua sessão expirou. Entre novamente." };
  try {
    await sendStudentMessage(user.id, text, attachmentPath ?? null);
    return { ok: true, messages: await listMyMessages(user.id, false) };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("equipe.send_failed", { error: (e as Error).message });
    return { ok: false, error: "Não foi possível enviar agora. Tente de novo." };
  }
}

/** Quantas respostas da equipe o aluno ainda não leu (selo na aba e no aviso). */
export async function equipeNaoLidasAction(): Promise<number> {
  const user = await getSessionUser();
  if (!user) return 0;
  return unreadReplies(user.id).catch(() => 0);
}

/** Pop-up da Equipe: respostas novas, em qualquer tela do app (a identidade vem da sessão). */
export async function equipeNovasAction(): Promise<TeamPopup[]> {
  const user = await getSessionUser();
  if (!user) return [];
  return newTeamReplies(user.id).catch(() => []);
}
