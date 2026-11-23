import "server-only";
import { createAdminClient } from "../supabase";
import { UserFacingError } from "./trails";
import { getMyPlan } from "./plans";
import { LOCK_MS, faltaPara, maxLives, semTrava } from "@/domain/quiz/lives";

export interface LivesState {
  max: number;
  left: number;
  /** Fim do bloqueio de 24 h (ISO) quando as vidas acabaram; null se pode jogar. */
  lockedUntil: string | null;
}

interface Row { lost: number; locked_until: string | null }

async function read(userId: string): Promise<Row> {
  const db = createAdminClient();
  const { data, error } = await db.from("game_lives").select("lost, locked_until").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  const row = (data as Row | null) ?? { lost: 0, locked_until: null };
  // Passou das 24 h: as vidas voltam cheias.
  if (row.locked_until && Date.parse(row.locked_until) <= Date.now()) {
    await db.from("game_lives").upsert({ user_id: userId, lost: 0, locked_until: null, updated_at: new Date().toISOString() });
    return { lost: 0, locked_until: null };
  }
  return row;
}

/** Vidas atuais do aluno. Gratuito: 2 vidas e trava de 24 h. Plano pago (qualquer) e administrador: sem perda de vidas e sem bloqueio (`admin` = "sem trava"). */
export async function getLives(userId: string): Promise<LivesState & { admin: boolean }> {
  const [plan, row] = await Promise.all([getMyPlan(userId), read(userId)]);
  const max = maxLives(plan.unlimited);
  if (semTrava(plan)) return { max, left: max, lockedUntil: null, admin: true };
  const locked = row.locked_until && Date.parse(row.locked_until) > Date.now() ? row.locked_until : null;
  return { max, left: locked ? 0 : Math.max(0, max - row.lost), lockedUntil: locked, admin: false };
}

export const mensagemTravado = (lockedUntil: string) => `Suas vidas acabaram. O Modo Jogo volta daqui a ${faltaPara(lockedUntil)}. Enquanto isso, estude em Questões.`;

/** Barra jogar/responder enquanto o bloqueio de 24 h estiver valendo. */
export async function assertHasLives(userId: string): Promise<LivesState> {
  const s = await getLives(userId);
  if (s.lockedUntil) throw new UserFacingError(mensagemTravado(s.lockedUntil), "quiz_locked");
  return s;
}

/** Tira uma vida por erro; ao zerar, trava por 24 h. */
export async function loseLife(userId: string): Promise<LivesState> {
  const cur = await getLives(userId);
  if (cur.admin || cur.lockedUntil) return cur;
  const lost = cur.max - cur.left + 1;
  const lockedUntil = lost >= cur.max ? new Date(Date.now() + LOCK_MS).toISOString() : null;
  const { error } = await createAdminClient().from("game_lives").upsert({ user_id: userId, lost, locked_until: lockedUntil, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  return { max: cur.max, left: Math.max(0, cur.max - lost), lockedUntil };
}
