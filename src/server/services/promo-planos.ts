import "server-only";
import { createAdminClient } from "../supabase";
import { sendPushToAudience } from "./push";
import { mensagemPlanos } from "@/domain/plans/promo-push";
import { brDay } from "@/domain/plans/limits";

/** Convite aos planos pagos no celular de quem usa a conta gratuita: a cada 2 dias, mensagem sorteada, com os valores. */
export async function enviarPromoPlanos(): Promise<{ enviado: boolean; sent: number; motivo?: string }> {
  const dia = brDay().day;
  const n = Math.floor(Date.parse(`${dia}T12:00:00Z`) / 86_400_000);
  if (n % 2 !== 0) return { enviado: false, sent: 0, motivo: "dia sem convite" };
  const db = createAdminClient();
  const claim = await db.from("push_daily").insert({ kind: "planos", day: dia });
  if (claim.error) return { enviado: false, sent: 0, motivo: "já enviado hoje" };
  const m = mensagemPlanos();
  const r = await sendPushToAudience("gratuitos", { title: m.title, body: m.body, url: "/plano", tag: "planos" });
  await db.from("push_daily").update({ sent: r.sent }).eq("kind", "planos").eq("day", dia);
  return { enviado: true, sent: r.sent };
}
