import "server-only";
import { createAdminClient } from "../supabase";
import { sendPushToUsers } from "./push";

/** Lembrete de revisões vencidas, no celular de quem ativou os avisos. */
export async function enviarLembreteRevisoes(): Promise<{ users: number; comRevisao: number; sent: number }> {
  const db = createAdminClient();
  const { data: subs, error } = await db.from("push_subscriptions").select("user_id").limit(10000);
  if (error) throw new Error(error.message);
  const users = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  const due = new Map<string, number>();
  for (let i = 0; i < users.length; i += 200) {
    const { data } = await db.from("review_schedules").select("user_id").in("user_id", users.slice(i, i + 200)).lte("due_at", new Date().toISOString()).limit(5000);
    for (const r of data ?? []) due.set(r.user_id as string, (due.get(r.user_id as string) ?? 0) + 1);
  }
  let sent = 0;
  for (const [id, n] of due) {
    const r = await sendPushToUsers([id], { title: "Hora de revisar", body: n === 1 ? "Você tem 1 revisão pendente. Reforce agora e não deixe o conteúdo esfriar." : `Você tem ${n} revisões pendentes. Reforce agora e não deixe o conteúdo esfriar.`, url: "/revisoes", tag: "revisoes" });
    sent += r.sent;
  }
  return { users: users.length, comRevisao: due.size, sent };
}
