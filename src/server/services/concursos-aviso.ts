import "server-only";
import { createAdminClient } from "../supabase";
import { resumir, textoAviso, STATUS_ABERTO, STATUS_PREVISTOS, type ResumoConcursos } from "@/domain/concursos-aviso";
import { sendPushToAudience } from "./push";
import { brDay } from "@/domain/plans/limits";

let cache: { at: number; v: ResumoConcursos } | null = null;

/** Concursos ativos abertos ou previstos (cache curto: o Mentor chama isso a cada carregamento). */
export async function resumoConcursos(): Promise<ResumoConcursos> {
  if (cache && Date.now() - cache.at < 5 * 60_000) return cache.v;
  const { data, error } = await createAdminClient().from("contest_catalog").select("name, uf, status").eq("active", true).in("status", [STATUS_ABERTO, ...STATUS_PREVISTOS]).order("updated_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const v = resumir(((data ?? []) as Array<{ name: string; uf: string | null; status: string }>).map((c) => ({ name: c.name, uf: c.uf, status: c.status })));
  cache = { at: Date.now(), v };
  return v;
}

/** Aviso diário no celular (1 por dia, para todos com avisos ativos) quando há concurso aberto ou previsto. */
export async function enviarAvisoDiarioConcursos(): Promise<{ enviado: boolean; sent: number; motivo?: string }> {
  cache = null;
  const resumo = await resumoConcursos();
  const texto = textoAviso(resumo);
  if (!texto) return { enviado: false, sent: 0, motivo: "sem concursos abertos ou previstos" };
  const db = createAdminClient();
  const claim = await db.from("push_daily").insert({ kind: "concursos", day: brDay().day });
  if (claim.error) return { enviado: false, sent: 0, motivo: "já enviado hoje" };
  const r = await sendPushToAudience("todos", { ...texto, url: "/concursos", tag: "concursos-diario", badge: resumo.abertos + resumo.previstos });
  await db.from("push_daily").update({ sent: r.sent }).eq("kind", "concursos").eq("day", brDay().day);
  return { enviado: true, sent: r.sent };
}
