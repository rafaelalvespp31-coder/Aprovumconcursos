"use server";

import { checkAnswer, getRanking, startRound, type QuizCheck, type QuizRound, type RankingRow } from "@/server/services/quiz";
import { UserFacingError } from "@/server/services/trails";

const UUID = /^[0-9a-f-]{36}$/i;

export async function startRoundAction(topicId: string): Promise<{ ok: true; round: QuizRound } | { ok: false; error: string }> {
  if (!UUID.test(topicId)) return { ok: false, error: "Conteúdo inválido." };
  try {
    return { ok: true, round: await startRound(topicId) };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível começar a rodada. Tente de novo." };
  }
}

export async function checkAnswerAction(topicId: string, nodeKey: string, given: string[], tier: number): Promise<{ ok: true; check: QuizCheck } | { ok: false; error: string }> {
  if (!UUID.test(topicId) || !/^N\d{4}$/.test(nodeKey) || !Array.isArray(given) || given.length > 4 || !Number.isInteger(tier)) return { ok: false, error: "Resposta inválida." };
  try {
    return { ok: true, check: await checkAnswer(topicId, nodeKey, given.map(String), tier) };
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
