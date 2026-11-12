import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { sameOrigin } from "@/server/http";
import { rpFromRequest, verifyLogin } from "@/server/services/webauthn";
import { startSessionFor, webauthnRateLimited } from "@/server/services/webauthn-login";

export const dynamic = "force-dynamic";

const body = z.object({ challengeId: z.string().uuid(), response: z.object({ id: z.string().min(1) }).passthrough(), next: z.string().max(500).optional() });
const FAIL = { error: "Não foi possível entrar com a biometria. Use e-mail e senha." };

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  if (await webauthnRateLimited(req)) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json(FAIL, { status: 400 });
  const ok = await verifyLogin(rpFromRequest(req), parsed.data.challengeId, parsed.data.response);
  if (!ok) return NextResponse.json(FAIL, { status: 401 });
  const to = await startSessionFor(ok.userId, parsed.data.next ?? null);
  if (!to) return NextResponse.json(FAIL, { status: 401 });
  return NextResponse.json({ redirect: to }, { headers: { "Cache-Control": "no-store" } });
}
