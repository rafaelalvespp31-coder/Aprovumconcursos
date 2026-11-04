import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

const claimed = new Set<string>();
const sync = vi.fn(async (_id: string) => ({ ok: true }));
vi.mock("@/server/services/payments", () => ({
  claimWebhookEvent: async (k: string) => (claimed.has(k) ? false : (claimed.add(k), true)),
  releaseWebhookEvent: async (k: string) => void claimed.delete(k),
  syncPayment: (id: string) => sync(id),
}));
vi.mock("@/server/observability", () => ({ logEvent: async () => undefined }));

import { POST } from "./route";

const SECRET = "segredo-webhook";
function req(opts: { id?: string; sign?: boolean; secret?: string; type?: string; requestId?: string }) {
  const id = opts.id ?? "123456";
  const rid = opts.requestId ?? "req-1";
  const ts = "1700000000";
  const v1 = createHmac("sha256", opts.secret ?? SECRET).update(`id:${id};request-id:${rid};ts:${ts};`).digest("hex");
  const headers: Record<string, string> = { "x-request-id": rid, "content-type": "application/json" };
  if (opts.sign !== false) headers["x-signature"] = `ts=${ts},v1=${v1}`;
  return new Request(`https://x.test/api/webhooks/mercadopago?data.id=${id}&type=${opts.type ?? "payment"}`, { method: "POST", headers, body: JSON.stringify({ type: opts.type ?? "payment", action: "payment.updated", data: { id } }) }) as never;
}

describe("webhook Mercado Pago", () => {
  beforeEach(() => {
    claimed.clear();
    sync.mockClear();
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = SECRET;
  });
  it("sem segredo configurado não aceita nada", async () => {
    delete process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    expect((await POST(req({}))).status).toBe(503);
    expect(sync).not.toHaveBeenCalled();
  });
  it("assinatura inválida ou ausente: 401 e nada é processado", async () => {
    expect((await POST(req({ secret: "errado" }))).status).toBe(401);
    expect((await POST(req({ sign: false }))).status).toBe(401);
    expect(sync).not.toHaveBeenCalled();
  });
  it("evento válido confirma o pagamento no Mercado Pago", async () => {
    expect((await POST(req({}))).status).toBe(200);
    expect(sync).toHaveBeenCalledWith("123456");
  });
  it("evento duplicado não é processado de novo", async () => {
    await POST(req({}));
    const r = await POST(req({}));
    expect((await r.json()).duplicate).toBe(true);
    expect(sync).toHaveBeenCalledTimes(1);
  });
  it("outros tipos de evento são ignorados", async () => {
    expect((await (await POST(req({ type: "merchant_order" }))).json()).ignored).toBe(true);
    expect(sync).not.toHaveBeenCalled();
  });
  it("falha ao processar: 500 e o evento é liberado para nova tentativa", async () => {
    sync.mockRejectedValueOnce(new Error("boom"));
    expect((await POST(req({}))).status).toBe(500);
    expect((await POST(req({}))).status).toBe(200);
    expect(sync).toHaveBeenCalledTimes(2);
  });
});
