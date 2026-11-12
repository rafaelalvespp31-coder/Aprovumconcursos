import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/server/http";
import { webauthnRateLimited } from "@/server/services/webauthn-login";
import { loginOptions, rpFromRequest } from "@/server/services/webauthn";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  if (await webauthnRateLimited(req)) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos." }, { status: 429 });
  const { options, challengeId } = await loginOptions(rpFromRequest(req));
  return NextResponse.json({ options, challengeId }, { headers: { "Cache-Control": "no-store" } });
}
