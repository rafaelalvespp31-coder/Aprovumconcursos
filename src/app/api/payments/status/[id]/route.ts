import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/server/auth";
import { getPaymentStatus } from "@/server/services/payments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Estado de um pagamento do próprio aluno (confirmado no Mercado Pago pelo servidor). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  const { id } = await ctx.params;
  const payment = await getPaymentStatus(user.id, id).catch(() => null);
  if (!payment) return NextResponse.json({ error: "Pagamento não encontrado." }, { status: 404 });
  return NextResponse.json({ payment });
}
