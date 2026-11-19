import "server-only";
import { createAdminClient } from "../supabase";
import { sendPushToUsers } from "./push";
import { computeMentor } from "./mentor";
import { getRaioXNotices } from "./raiox-notice";
import { brDay } from "@/domain/plans/limits";

/** Texto do aviso do Mentor: Raio-X publicado primeiro, depois a prioridade mais importante. */
export function textoMentor(raiox: number, prioridades: string[]): { title: string; body: string; total: number } | null {
  const total = raiox + prioridades.length;
  if (!total) return null;
  if (raiox) return { title: "Mentor APROVUM", body: raiox === 1 ? "Seu Raio-X foi publicado! Toque para ver." : `${raiox} Raio-X publicados! Toque para ver.`, total };
  const [primeira] = prioridades;
  const mais = prioridades.length > 1 ? ` (+${prioridades.length - 1})` : "";
  return { title: "Mentor APROVUM", body: `${primeira}${mais}`, total };
}

/** Todo dia: leva as prioridades e avisos do Mentor ao celular de quem ativou os avisos (1 por aluno/dia). */
export async function enviarAvisosMentor(): Promise<{ users: number; sent: number; motivo?: string }> {
  const db = createAdminClient();
  const dia = brDay().day;
  const claim = await db.from("push_daily").insert({ kind: "mentor", day: dia });
  if (claim.error) return { users: 0, sent: 0, motivo: "já enviado hoje" };
  const { data: subs, error } = await db.from("push_subscriptions").select("user_id").limit(10000);
  if (error) throw new Error(error.message);
  const users = [...new Set((subs ?? []).map((s) => s.user_id as string))];
  let sent = 0;
  for (let i = 0; i < users.length; i += 5) {
    await Promise.all(users.slice(i, i + 5).map(async (id) => {
      try {
        const [m, rx] = await Promise.all([computeMentor(id), getRaioXNotices(id)]);
        const pri = m.result.insufficientData ? [] : m.visible.filter((r) => r.kind !== "manutencao").map((r) => r.explanation);
        const t = textoMentor(rx.length, pri);
        if (!t) return;
        const r = await sendPushToUsers([id], { title: t.title, body: t.body, url: rx[0]?.href ?? "/painel", tag: "mentor-diario", badge: t.total });
        sent += r.sent;
      } catch { /* um aluno com erro não derruba o lote */ }
    }));
  }
  await db.from("push_daily").update({ sent }).eq("kind", "mentor").eq("day", dia);
  return { users: users.length, sent };
}

/** Raio-X publicado: avisa na hora quem tem edital ligado a esse concurso. */
export async function avisarRaioXPublicado(examId: string, nome: string): Promise<{ sent: number }> {
  const { data } = await createAdminClient().from("edital_preparations").select("id, user_id").eq("strategic_exam_id", examId).limit(5000);
  const porUser = new Map<string, string>();
  for (const p of data ?? []) if (!porUser.has(p.user_id as string)) porUser.set(p.user_id as string, p.id as string);
  let sent = 0;
  for (const [uid, prep] of porUser) {
    const r = await sendPushToUsers([uid], { title: "Seu Raio-X foi publicado!", body: `O Raio-X de ${nome} já está pronto. Toque para ver.`, url: `/meu-concurso/${prep}?aba=raiox`, tag: "raiox", badge: 1 }).catch(() => ({ sent: 0 }));
    sent += r.sent;
  }
  return { sent };
}
