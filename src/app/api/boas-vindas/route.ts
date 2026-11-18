import { NextResponse } from "next/server";
import { getSessionUser } from "@/server/auth";
import { createAdminClient } from "@/server/supabase";
import { OFFERS, type OfferKey } from "@/domain/plans/offers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" };
const DIAS = 7;

/** Última assinatura do aluno nos últimos dias (para o card de boas-vindas aparecer uma vez por compra). */
export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ pagamento: null }, { headers: noStore });
  const db = createAdminClient();
  const desde = new Date(Date.now() - DIAS * 86_400_000).toISOString();
  const { data } = await db
    .from("subscription_payments")
    .select("id, plan_id, period, paid_at")
    .eq("user_id", user.id)
    .gte("paid_at", desde)
    .order("paid_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return NextResponse.json({ pagamento: null }, { headers: noStore });
  const key = (data.plan_id === "premium" && data.period === "vitalicio" ? "vitalicio" : data.period) as OfferKey;
  return NextResponse.json({ pagamento: { id: String(data.id), plano: OFFERS[key]?.label ?? "seu plano" } }, { headers: noStore });
}
