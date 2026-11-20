import "server-only";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "../supabase";
import { logEvent } from "../observability";
import { sendPushToAudience } from "./push";
import { enviarAvisoDiarioConcursos, resumoConcursos } from "./concursos-aviso";
import { enviarLembreteRevisoes } from "./revisoes-aviso";
import { enviarPromoPlanos } from "./promo-planos";
import { enviarAvisosMentor } from "./mentor-push";
import { AVISO_KINDS, MOTIVACAO, NOVIDADES, horaBr, montarAgenda, type AvisoKind } from "@/domain/avisos-agenda";
import { brDay } from "@/domain/plans/limits";

export interface AgendaConfig { ativo: boolean; intervalo: number; horaIni: number; horaFim: number }
export interface AgendaSlot { slot: number; kind: AvisoKind; hour: number; variant: number; doneAt: string | null; sent: number | null; result: string | null }

export async function agendaConfig(): Promise<AgendaConfig> {
  const { data } = await createAdminClient().from("push_agenda_config").select("ativo, intervalo_horas, hora_ini, hora_fim").eq("singleton", true).maybeSingle();
  return { ativo: data?.ativo ?? true, intervalo: Number(data?.intervalo_horas ?? 1), horaIni: Number(data?.hora_ini ?? 9), horaFim: Number(data?.hora_fim ?? 20) };
}

/** A chamada do agendador só vale com a chave interna guardada no banco (ou o CRON_SECRET da Vercel, se existir). */
export async function chaveValida(header: string | null): Promise<boolean> {
  const got = (header ?? "").replace(/^Bearer\s+/i, "");
  if (!got) return false;
  const aceitas: string[] = [];
  if (process.env.CRON_SECRET) aceitas.push(process.env.CRON_SECRET);
  const { data } = await createAdminClient().from("app_secrets").select("value").eq("key", "cron_avisos").maybeSingle();
  if (data?.value) aceitas.push(data.value as string);
  const a = Buffer.from(got);
  return aceitas.some((s) => { const b = Buffer.from(s); return a.length === b.length && timingSafeEqual(a, b); });
}

async function dica(variant: number): Promise<{ sent: number }> {
  const n = NOVIDADES[variant % NOVIDADES.length] ?? NOVIDADES[0]!;
  const r = await sendPushToAudience("todos", { title: n.title, body: n.body, url: n.url, tag: "dica-aprovum" });
  return { sent: r.sent };
}

async function motivacao(variant: number): Promise<{ sent: number }> {
  const m = MOTIVACAO[variant % MOTIVACAO.length] ?? MOTIVACAO[0]!;
  const r = await sendPushToAudience("todos", { title: m.title, body: m.body, url: "/painel", tag: "motivacao" });
  return { sent: r.sent };
}

async function enviar(kind: AvisoKind, variant: number): Promise<{ sent: number; result: string }> {
  switch (kind) {
    case "concursos": { const r = await enviarAvisoDiarioConcursos(); return { sent: r.sent, result: r.enviado ? "enviado" : (r.motivo ?? "não enviado") }; }
    case "revisoes": { const r = await enviarLembreteRevisoes(); return { sent: r.sent, result: r.comRevisao ? `${r.comRevisao} aluno(s) com revisão` : "ninguém com revisão pendente" }; }
    case "planos": { const r = await enviarPromoPlanos(); return { sent: r.sent, result: r.enviado ? "enviado" : (r.motivo ?? "não enviado") }; }
    case "mentor": { const r = await enviarAvisosMentor(); return { sent: r.sent, result: r.motivo ?? `${r.users} aluno(s) avaliados` }; }
    case "novidades": { const r = await dica(variant); return { sent: r.sent, result: "enviado" }; }
    case "motivacao": { const r = await motivacao(variant); return { sent: r.sent, result: "enviado" }; }
  }
}

/** Agenda de hoje (cria na primeira chamada do dia, sorteando tipos e horas). */
export async function agendaDeHoje(criar = true): Promise<AgendaSlot[]> {
  const db = createAdminClient();
  const day = brDay().day;
  const ler = async () => {
    const { data, error } = await db.from("push_agenda").select("slot, kind, hour, variant, done_at, sent, result").eq("day", day).order("hour");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({ slot: r.slot as number, kind: r.kind as AvisoKind, hour: r.hour as number, variant: Number(r.variant ?? 0), doneAt: (r.done_at as string | null) ?? null, sent: (r.sent as number | null) ?? null, result: (r.result as string | null) ?? null }));
  };
  const atual = await ler();
  if (atual.length || !criar) return atual;
  const cfg = await agendaConfig();
  const rc = await resumoConcursos().catch(() => null);
  const elegiveis = AVISO_KINDS.filter((k) => k !== "concursos" || (rc && rc.abertos + rc.previstos > 0));
  const plano = montarAgenda({ intervalo: cfg.intervalo, horaIni: cfg.horaIni, horaFim: cfg.horaFim, elegiveis, frases: MOTIVACAO.length, dicas: NOVIDADES.length });
  if (plano.length) {
    const { error } = await db.from("push_agenda").insert(plano.map((p) => ({ day, slot: p.slot, kind: p.kind, hour: p.hour, variant: p.variant })));
    if (error && error.code !== "23505") throw new Error(error.message); // 23505: outra chamada criou ao mesmo tempo
  }
  return ler();
}

/** Chamada de hora em hora: dentro da janela, envia o que já está na hora e ainda não saiu. Cada aviso sai uma vez. */
export async function rodarAgenda(now: Date = new Date()): Promise<{ ativo: boolean; hora: number; enviados: Array<{ kind: AvisoKind; sent: number; result: string }>; motivo?: string }> {
  const hora = horaBr(now);
  const cfg = await agendaConfig();
  if (!cfg.ativo) return { ativo: false, hora, enviados: [], motivo: "avisos automáticos desligados" };
  if (hora < cfg.horaIni || hora > cfg.horaFim) return { ativo: true, hora, enviados: [], motivo: "fora da janela de envio" };
  const agenda = await agendaDeHoje(true);
  const db = createAdminClient();
  const day = brDay().day;
  const enviados: Array<{ kind: AvisoKind; sent: number; result: string }> = [];
  // Nunca despeja vários avisos de uma vez: sai só o da hora (o mais recente que já venceu); os anteriores perdidos são descartados.
  const vencidos = agenda.filter((x) => !x.doneAt && x.hour <= hora);
  const perdidos = vencidos.slice(0, -1);
  if (perdidos.length) {
    await db.from("push_agenda").update({ done_at: new Date().toISOString(), sent: 0, result: "perdido (passou da hora)" }).eq("day", day).in("slot", perdidos.map((x) => x.slot)).is("done_at", null);
  }
  for (const s of vencidos.slice(-1)) {
    // Reserva o aviso antes de enviar: duas chamadas ao mesmo tempo não repetem o mesmo aviso.
    const claim = await db.from("push_agenda").update({ done_at: new Date().toISOString() }).eq("day", day).eq("slot", s.slot).is("done_at", null).select("slot");
    if (claim.error || !claim.data?.length) continue;
    try {
      const r = await enviar(s.kind, s.variant);
      await db.from("push_agenda").update({ sent: r.sent, result: r.result }).eq("day", day).eq("slot", s.slot);
      enviados.push({ kind: s.kind, ...r });
    } catch (e) {
      const msg = String((e as Error).message).slice(0, 120);
      await db.from("push_agenda").update({ sent: 0, result: `erro: ${msg}` }).eq("day", day).eq("slot", s.slot);
      await logEvent("avisos.agenda.erro", { kind: s.kind, error: msg });
    }
  }
  return { ativo: true, hora, enviados };
}
