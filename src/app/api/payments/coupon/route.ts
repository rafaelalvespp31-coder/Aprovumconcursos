import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/server/http";
import { getSessionUser } from "@/server/auth";
import { resolveCoupon } from "@/server/services/coupons";
import { enforceRateLimit, UserFacingError } from "@/server/services/trails";
import { isOfferKey } from "@/domain/plans/offers";
import { logEvent } from "@/server/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Valida o cupom para o plano escolhido e devolve o valor com desconto (o preço original do plano não muda). */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  let body: { offer?: unknown; code?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  if (!isOfferKey(body.offer)) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });
  try {
    await enforceRateLimit(user.id, "coupon_check", 20);
    const r = await resolveCoupon(body.code, body.offer);
    return NextResponse.json({
      coupon: { code: r.coupon.code, partner: r.coupon.partnerName, discountPct: r.coupon.discountPct },
      quote: { listCents: r.quote.listCents, discountCents: r.quote.discountCents, finalCents: r.quote.finalCents },
    });
  } catch (e) {
    if (e instanceof UserFacingError) return NextResponse.json({ error: e.message }, { status: e.code === "rate_limited" ? 429 : 400 });
    await logEvent("coupons.check.error", { error: (e as Error).message.slice(0, 300) });
    return NextResponse.json({ error: "Não foi possível conferir o cupom agora. Tente novamente." }, { status: 500 });
  }
}
