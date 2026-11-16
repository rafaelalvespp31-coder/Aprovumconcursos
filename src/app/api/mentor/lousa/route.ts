import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/server/http";
import { getSessionUser } from "@/server/auth";
import { lousaDoCache, lousaEmFluxo, montarLousa } from "@/server/services/mentor-lousa";
import { UserFacingError } from "@/server/services/trails";
import { sanitizeStudyContext } from "@/domain/mentor/study-context";
import { pedeLousa } from "@/domain/mentor/lousa";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 40;
const noStore = { "Cache-Control": "no-store" };

/** { pedido, study } → lousa (passos escritos e desenho) para o Mentor "escrever a lápis" na tela. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada." }, { status: 401, headers: noStore });
  let body: { pedido?: unknown; study?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400, headers: noStore });
  }
  const pedido = typeof body.pedido === "string" ? body.pedido.replace(/\s+/g, " ").trim().slice(0, 500) : "";
  if (!pedeLousa(pedido)) return NextResponse.json({ lousa: { mostrar: false } }, { headers: noStore });
  if (req.nextUrl.searchParams.get("stream") === "1") {
    return new Response(lousaEmFluxo(user.id, pedido, sanitizeStudyContext(body.study)), { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
  }
  if (req.nextUrl.searchParams.get("cache") === "1") return NextResponse.json({ lousa: await lousaDoCache(pedido) }, { headers: noStore });
  try {
    return NextResponse.json({ lousa: await montarLousa(user.id, pedido, sanitizeStudyContext(body.study)) }, { headers: noStore });
  } catch (e) {
    if (e instanceof UserFacingError) return NextResponse.json({ lousa: { mostrar: false } }, { status: e.code === "rate_limited" ? 429 : 200, headers: noStore });
    return NextResponse.json({ lousa: { mostrar: false } }, { status: 200, headers: noStore });
  }
}
