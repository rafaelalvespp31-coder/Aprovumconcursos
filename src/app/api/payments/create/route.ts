import { NextResponse, type NextRequest } from "next/server";
import { sameOrigin } from "@/server/http";
import { getSessionUser } from "@/server/auth";
import { createPayment } from "@/server/services/payments";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cria o pagamento (PIX ou cartão) do plano escolhido. O valor é o do servidor. */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  let body: { offer?: unknown; formData?: unknown; deviceId?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }
  try {
    const payment = await createPayment(user.id, { offer: body.offer, formData: body.formData, deviceId: body.deviceId, email: user.email ?? null });
    return NextResponse.json({ payment });
  } catch (e) {
    if (e instanceof UserFacingError) return NextResponse.json({ error: e.message }, { status: e.code === "rate_limited" ? 429 : 400 });
    await logEvent("payments.create.error", { error: (e as Error).message.slice(0, 300) });
    return NextResponse.json({ error: "Não foi possível processar o pagamento agora. Tente novamente." }, { status: 500 });
  }
}
