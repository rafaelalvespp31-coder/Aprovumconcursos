"use server";

import { setMentorGoalAction } from "@/app/(app)/mentor/actions";

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
