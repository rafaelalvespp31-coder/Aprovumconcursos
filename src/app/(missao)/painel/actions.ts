"use server";

import { getSessionUser } from "@/server/auth";
import { buscarConcursosCatalogo } from "@/server/services/missao";
import type { Sugestao } from "@/domain/missao/sugestoes";
import { setMentorGoalAction } from "@/app/(app)/mentor/actions";

/** Sugestões do catálogo enquanto o aluno digita. Falha = lista vazia (o campo continua aceitando o nome digitado). */
export async function sugerirConcursosAction(q: string): Promise<Sugestao[]> {
  const user = await getSessionUser();
  if (!user) return [];
  try {
    return await buscarConcursosCatalogo(typeof q === "string" ? q : "");
  } catch {
    return [];
  }
}

export type EscolhaResultado = { ok: true; destino: string } | { ok: false; error: string };

/**
 * Salva o objetivo pela estrutura que o Aprovum já usa (profiles.preferences.mentor_goal, via Mentor).
 * Com edital do aluno (ou nome que o Mentor consiga casar com um edital dele) já existe plano: vai ao "Meu plano de estudo";
 * sem plano, o Mentor continua a conversa a partir do objetivo salvo.
 */
export async function escolherConcursoAction(nome: string, editalId?: string): Promise<EscolhaResultado> {
  const r = await setMentorGoalAction(typeof nome === "string" ? nome : "", typeof editalId === "string" && editalId ? editalId : undefined);
  if (!r.ok) return { ok: false, error: r.error };
  return { ok: true, destino: r.plan ? "/meu-plano-de-estudo" : "/mentor" };
}
