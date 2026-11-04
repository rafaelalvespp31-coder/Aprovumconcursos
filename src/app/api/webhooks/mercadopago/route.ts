import { NextResponse, type NextRequest } from "next/server";
import { verifySignature } from "@/domain/payments/mercadopago";
import { claimWebhookEvent, releaseWebhookEvent, syncPayment } from "@/server/services/payments";
import { logEvent } from "@/server/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook oficial do Mercado Pago. Confere a assinatura (x-signature), ignora eventos repetidos
 * e confirma o pagamento direto na API do Mercado Pago antes de liberar qualquer plano.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "webhook não configurado" }, { status: 503 });
  const url = new URL(req.url);
  let body: { type?: string; action?: string; data?: { id?: string | number } } = {};
  try {
    body = await req.json();
  } catch {
    /* alguns avisos vêm só com a query */
  }
  const dataId = url.searchParams.get("data.id") ?? (body.data?.id != null ? String(body.data.id) : null);
  const requestId = req.headers.get("x-request-id");
  if (!verifySignature({ header: req.headers.get("x-signature"), requestId, dataId, secret })) {
    await logEvent("webhook.mp.invalid_signature", {});
    return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });
  }
  const type = url.searchParams.get("type") ?? body.type ?? "";
  if (type !== "payment" || !dataId || !/^\d+$/.test(dataId)) return NextResponse.json({ ok: true, ignored: true });

  const key = `${requestId ?? "sem-id"}:${dataId}:${body.action ?? ""}`;
  try {
    if (!(await claimWebhookEvent(key, Number(dataId)))) return NextResponse.json({ ok: true, duplicate: true });
  } catch (e) {
    await logEvent("webhook.mp.failed", { error: (e as Error).message.slice(0, 300) });
    return NextResponse.json({ error: "falha ao registrar" }, { status: 500 });
  }
  try {
    const r = await syncPayment(dataId);
    if (!r.ok) await logEvent("webhook.mp.ignored", { reason: r.reason ?? "" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    await releaseWebhookEvent(key).catch(() => undefined); // o Mercado Pago tenta de novo
    await logEvent("webhook.mp.failed", { error: (e as Error).message.slice(0, 300) });
    return NextResponse.json({ error: "falha ao processar" }, { status: 500 });
  }
}
