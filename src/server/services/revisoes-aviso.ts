import "server-only";
import { createAdminClient } from "../supabase";
import { sendPushToUsers } from "./push";
import { sortear } from "@/domain/mentor/variar";

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
    const r = await sendPushToUsers([id], { title: sortear(["Hora de revisar", "Revisão na área", "Não deixe esfriar", "Reforce o que aprendeu"]), body: sortear([n === 1 ? "Você tem 1 revisão pendente. Reforce agora e não deixe o conteúdo esfriar." : `Você tem ${n} revisões pendentes. Reforce agora e não deixe o conteúdo esfriar.`, n === 1 ? "1 revisão esperando por você. Leva poucos minutos." : `${n} revisões esperando por você. Comece pela mais antiga.`, "Revisar hoje fixa o conteúdo para a prova. Toque e comece."]), url: "/revisoes", tag: "revisoes" });
    sent += r.sent;
  }
  return { users: users.length, comRevisao: due.size, sent };
}
