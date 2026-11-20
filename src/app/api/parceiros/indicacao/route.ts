import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/server/http";
import { enforceRateLimit } from "@/server/services/trails";
import { PARTNER_COOKIE, VISITOR_COOKIE, recordVisit, validVisitorId } from "@/server/services/referrals";
import { logEvent } from "@/server/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Link de parceiro (?ref=CODIGO): confere no banco, registra a visita e guarda a origem por 90 dias (a janela de atribuição decide até quando vale). */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ ok: false }, { status: 403 });
  let body: { ref?: unknown; path?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const existing = req.cookies.get(VISITOR_COOKIE)?.value;
  const visitorId = validVisitorId(existing) ? existing : crypto.randomUUID();
  try {
    await enforceRateLimit(visitorId, "partner_ref", 20);
    const r = await recordVisit(body.ref, visitorId, typeof body.path === "string" ? body.path : "/");
    const res = NextResponse.json({ ok: r.ok });
    if (r.ok && r.code) {
      const opts = { maxAge: 60 * 60 * 24 * 90, path: "/", sameSite: "lax" as const, httpOnly: true, secure: process.env.NODE_ENV === "production" };
      res.cookies.set(PARTNER_COOKIE, r.code, opts);
      res.cookies.set(VISITOR_COOKIE, visitorId, opts);
    }
    return res;
  } catch (e) {
    await logEvent("partners.referral.error", { error: String((e as Error).message).slice(0, 200) });
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}
