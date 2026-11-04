"use server";

import { requireUser } from "@/server/auth";
import { toggleContestAlert, toggleContestFavorite } from "@/server/services/gamification";

export async function toggleFavoriteAction(contestId: string, on: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser("/concursos");
  try {
    await toggleContestFavorite(user.id, contestId, on);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

export async function toggleAlertAction(scope: string, on: boolean): Promise<{ ok: boolean }> {
  const user = await requireUser("/concursos");
  try {
    await toggleContestAlert(user.id, scope, on);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
