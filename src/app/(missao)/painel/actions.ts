"use server";

import { setMentorGoalAction } from "@/app/(app)/mentor/actions";
import { requireUser } from "@/server/auth";
import { escolherConcursoPublicado } from "@/server/services/edital";
import { UserFacingError } from "@/server/services/trails";

export type EscolhaResultado = { ok: true; destino: string } | { ok: false; error: string };

/**
 * Salva o edital anexado como objetivo (profiles.preferences.mentor_goal, via Mentor): o plano nasce do conteúdo programático dele
 * e o aluno vai ao "Meu plano de estudo"; sem plano, o Mentor continua a conversa a partir do objetivo salvo.
 */
export async function escolherConcursoAction(nome: string, editalId?: string): Promise<EscolhaResultado> {
  const r = await setMentorGoalAction(typeof nome === "string" ? nome : "", typeof editalId === "string" && editalId ? editalId : undefined);
  if (!r.ok) return { ok: false, error: r.error };
  // Com plano, ou sem edital do concurso (a página mostra como enviar o edital): vai ao plano; senão, ao Mentor.
  return { ok: true, destino: r.plan || r.goal?.semEdital ? "/meu-plano-de-estudo" : "/mentor" };
}

export type AbrirConcursoResultado = { ok: true; destino: string } | { ok: false; error: string };

/** O aluno clicou num concurso cujo edital a equipe já publicou: recebe a estrutura pronta e vai à página do conteúdo programático. */
export async function abrirConcursoAction(contestId: string): Promise<AbrirConcursoResultado> {
  const user = await requireUser("/painel");
  try {
    const { id } = await escolherConcursoPublicado(user.id, contestId);
    return { ok: true, destino: `/conteudo-programatico/${id}` };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível abrir este concurso agora." };
  }
}
