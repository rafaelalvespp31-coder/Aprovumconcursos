"use server";

import { checkAnswer, getRanking, startRound, type QuizCheck, type QuizRound, type RankingRow } from "@/server/services/quiz";
import { UserFacingError } from "@/server/services/trails";
import { requireUser } from "@/server/auth";
import { createUserClient } from "@/server/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

export async function startRoundAction(topicId: string): Promise<{ ok: true; round: QuizRound } | { ok: false; error: string }> {
  if (!UUID.test(topicId)) return { ok: false, error: "Conteúdo inválido." };
  try {
    return { ok: true, round: await startRound(topicId) };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível começar a rodada. Tente de novo." };
  }
}

export async function checkAnswerAction(topicId: string, nodeKey: string, given: string[], tier: number, responseMs?: number): Promise<{ ok: true; check: QuizCheck } | { ok: false; error: string }> {
  if (!UUID.test(topicId) || !/^N\d{4}$/.test(nodeKey) || !Array.isArray(given) || given.length > 4 || !Number.isInteger(tier)) return { ok: false, error: "Resposta inválida." };
  try {
    return { ok: true, check: await checkAnswer(topicId, nodeKey, given.map(String), tier, typeof responseMs === "number" ? responseMs : undefined) };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível conferir agora. Tente de novo." };
  }
}

export async function rankingAction(): Promise<{ ok: true; rows: RankingRow[] } | { ok: false; error: string }> {
  try {
    return { ok: true, rows: await getRanking(20) };
  } catch {
    return { ok: false, error: "Não foi possível carregar o ranking agora." };
  }
}

/** Frase motivacional do próprio aluno (aparece ao lado do nome nos rankings). Só altera o perfil de quem está logado. */
export async function saveMottoAction(text: string): Promise<{ ok: true; motto: string | null } | { ok: false; error: string }> {
  const motto = typeof text === "string" ? text.trim().replace(/\s+/g, " ") : "";
  if (motto.length > 60) return { ok: false, error: "Use no máximo 60 caracteres." };
  try {
    const user = await requireUser("/quiz");
    const { error } = await (await createUserClient()).from("profiles").update({ motto: motto || null }).eq("id", user.id);
    if (error) throw new Error(error.message);
    return { ok: true, motto: motto || null };
  } catch {
    return { ok: false, error: "Não foi possível salvar agora. Tente de novo." };
  }
}
