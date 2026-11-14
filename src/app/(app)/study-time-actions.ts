"use server";

import { getSessionUser } from "@/server/auth";
import { createUserClient } from "@/server/supabase";
import { brDay } from "@/domain/plans/limits";

/** Guarda no servidor os segundos líquidos de estudo de HOJE (só aumenta; vem do relógio do aluno). O Mentor lê daqui. */
export async function reportStudyTimeAction(seconds: number): Promise<void> {
  const user = await getSessionUser();
  if (!user || typeof seconds !== "number" || !Number.isFinite(seconds)) return;
  const s = Math.min(86_400, Math.max(0, Math.floor(seconds)));
  if (!s) return;
  const db = await createUserClient();
  const day = brDay().day;
  const cur = await db.from("study_time_days").select("seconds").eq("user_id", user.id).eq("day", day).maybeSingle();
  if (cur.data && (cur.data.seconds as number) >= s) return;
  await db.from("study_time_days").upsert({ user_id: user.id, day, seconds: s, updated_at: new Date().toISOString() }, { onConflict: "user_id,day" });
}
