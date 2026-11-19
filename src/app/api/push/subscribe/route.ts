import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth";
import { removeSubscription, saveSubscription } from "@/server/services/push";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

const isUrl = (v: unknown): v is string => typeof v === "string" && v.length < 600 && /^https:\/\//.test(v);

/** Liga o aviso neste aparelho (POST) ou desliga (DELETE). Só para quem está logado. */
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Entre na sua conta." }, { status: 401, headers: noStore });
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } } | null;
  const p256dh = b?.keys?.p256dh, auth = b?.keys?.auth;
  if (!isUrl(b?.endpoint) || typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 100) return NextResponse.json({ error: "Inscrição inválida." }, { status: 400, headers: noStore });
  try {
    await saveSubscription(user.id, { endpoint: b.endpoint, p256dh, auth }, req.headers.get("user-agent"));
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch {
    return NextResponse.json({ error: "Não foi possível ativar agora." }, { status: 500, headers: noStore });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: true }, { headers: noStore });
  const b = (await req.json().catch(() => null)) as { endpoint?: unknown } | null;
  if (!isUrl(b?.endpoint)) return NextResponse.json({ error: "Inscrição inválida." }, { status: 400, headers: noStore });
  await removeSubscription(user.id, b.endpoint).catch(() => undefined);
  return NextResponse.json({ ok: true }, { headers: noStore });
}
