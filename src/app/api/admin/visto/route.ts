import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/server/http";
import { getSessionUser, isAdmin } from "@/server/auth";
import { SEEN_FEATURES, markSeen, type SeenFeature } from "@/server/services/admin-pendencias";

export const dynamic = "force-dynamic";

/** A equipe abriu uma área (pagamentos, feedbacks, parceiros): zera o aviso de novidades dela. Só admin. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const user = await getSessionUser();
  if (!user || !(await isAdmin())) return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { feature?: unknown } | null;
  const f = body?.feature;
  if (typeof f !== "string" || !(SEEN_FEATURES as readonly string[]).includes(f)) return NextResponse.json({ error: "Área inválida." }, { status: 400 });
  try {
    await markSeen(f as SeenFeature);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Não foi possível registrar agora." }, { status: 500 });
  }
}
