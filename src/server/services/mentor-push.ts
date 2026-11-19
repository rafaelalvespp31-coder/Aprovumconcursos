import "server-only";
import { createAdminClient } from "../supabase";
import { sendPushToUsers } from "./push";
import { computeMentor } from "./mentor";
import { getRaioXNotices } from "./raiox-notice";
import { resumoConcursos } from "./concursos-aviso";
import { sortear, type Rand } from "@/domain/mentor/variar";
import { brDay } from "@/domain/plans/limits";

/** Aviso do Mentor: sorteia entre Raio-X, cada prioridade e concursos, com frases diferentes. `total` alimenta o selo. */
export function textoMentor(raiox: number, prioridades: string[], concursos = 0, rand: Rand = Math.random): { title: string; body: string; total: number } | null {
  const total = raiox + prioridades.length + concursos;
  if (!total) return null;
  const opcoes: Array<{ title: string; body: string }> = [];
  const titulos = ["Mentor APROVUM", "Recado do Mentor", "Hora de evoluir", "Seu Mentor chamou"];
  if (raiox) opcoes.push({ title: "Seu Raio-X foi publicado!", body: raiox === 1 ? "Seu Raio-X está pronto. Toque para ver." : `${raiox} Raio-X publicados! Toque para ver.` });
  for (const p of prioridades) opcoes.push({ title: sortear(titulos, rand), body: sortear([p, `Prioridade de hoje: ${p}`, `Que tal agora? ${p}`], rand) });
  if (concursos) opcoes.push({ title: sortear(["Concursos no radar", "Olho nos editais", "Mentor avisa"], rand), body: sortear([concursos === 1 ? "Há 1 concurso aberto ou previsto para acompanhar." : `Há ${concursos} concursos abertos ou previstos para acompanhar.`, "Tem concurso aberto ou previsto. Veja se combina com você."], rand) });
  return { ...sortear(opcoes, rand), total };
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
  const rc = await resumoConcursos().catch(() => null);
  const concAtivos = rc ? rc.abertos + rc.previstos : 0;
  let sent = 0;
  for (let i = 0; i < users.length; i += 5) {
    await Promise.all(users.slice(i, i + 5).map(async (id) => {
      try {
        const [m, rx] = await Promise.all([computeMentor(id), getRaioXNotices(id)]);
        const pri = m.result.insufficientData ? [] : m.visible.filter((r) => r.kind !== "manutencao").map((r) => r.explanation);
        const t = textoMentor(rx.length, pri, concAtivos);
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
