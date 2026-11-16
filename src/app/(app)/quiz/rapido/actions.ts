"use server";

import { checkRapido, startRapidoRound, type RapidoCheck, type RapidoMode, type RapidoRound } from "@/server/services/quiz-rapido";
import { UserFacingError } from "@/server/services/trails";

const SLUG = /^[a-z0-9_]{2,80}$/;

export async function startRapidoAction(discipline: string | null, mode: RapidoMode): Promise<{ ok: true; round: RapidoRound } | { ok: false; error: string }> {
  if (discipline !== null && !SLUG.test(discipline)) return { ok: false, error: "Matéria inválida." };
  if (mode !== "novas" && mode !== "erros") return { ok: false, error: "Modo inválido." };
  try {
    return { ok: true, round: await startRapidoRound(discipline, mode) };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível começar a rodada. Tente de novo." };
  }
}

export async function checkRapidoAction(key: string, choice: string, responseMs?: number): Promise<{ ok: true; check: RapidoCheck } | { ok: false; error: string }> {
  if (typeof key !== "string" || typeof choice !== "string" || choice.length > 2) return { ok: false, error: "Resposta inválida." };
  try {
    return { ok: true, check: await checkRapido(key, choice, typeof responseMs === "number" ? responseMs : undefined) };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível conferir agora. Tente de novo." };
  }
}
