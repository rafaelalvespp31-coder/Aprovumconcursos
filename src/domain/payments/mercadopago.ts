import { createHmac, timingSafeEqual } from "node:crypto";
import { nextPeriodEnd } from "@/domain/plans/limits";
import type { OfferKey } from "@/domain/plans/offers";

/** Estados internos de um pagamento. */
export type PayStatus = "pendente" | "aprovado" | "recusado" | "cancelado" | "reembolsado";
export const PAY_STATUS_LABEL: Record<PayStatus, string> = { pendente: "Pendente", aprovado: "Aprovado", recusado: "Recusado", cancelado: "Cancelado", reembolsado: "Reembolsado" };

/** Estado do Mercado Pago → estado interno. Só "approved" libera o plano. */
export function mapStatus(mp: string | null | undefined): PayStatus {
  switch (mp) {
    case "approved":
      return "aprovado";
    case "refunded":
    case "charged_back":
      return "reembolsado";
    case "rejected":
      return "recusado";
    case "cancelled":
    case "expired":
      return "cancelado";
    default:
      return "pendente"; // pending, in_process, authorized, in_mediation, ...
  }
}

/**
 * Valida o cabeçalho `x-signature` do webhook (https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks):
 * manifesto `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` assinado com HMAC-SHA256 pelo segredo.
 */
export function verifySignature(o: { header: string | null; requestId: string | null; dataId: string | null; secret: string }): boolean {
  if (!o.header || !o.dataId || !o.secret) return false;
  const parts = Object.fromEntries(o.header.split(",").map((p) => p.trim().split("=").map((x) => x.trim()) as [string, string]));
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;
  const id = /^[a-z0-9]+$/i.test(o.dataId) ? o.dataId.toLowerCase() : o.dataId;
  const manifest = `id:${id};${o.requestId ? `request-id:${o.requestId};` : ""}ts:${ts};`;
  const expected = createHmac("sha256", o.secret).update(manifest).digest();
  const given = Buffer.from(v1, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Fim do acesso depois de um pagamento aprovado. Mensal = 30 dias, semestral = 6 meses, anual = 12 meses,
 * somados ao vencimento atual se ainda vigente (não perde dias). Vitalício = sem vencimento (null).
 * Quem já é vitalício continua sem vencimento.
 */
export function accessEnd(offer: OfferKey, current: { end: string | null; paid: boolean }, now: Date = new Date()): string | null {
  if (offer === "vitalicio") return null;
  if (current.paid && current.end === null) return null;
  const live = current.end && new Date(current.end).getTime() > now.getTime() ? new Date(current.end) : null;
  if (offer === "mensal") {
    const d = new Date((live ?? now).getTime());
    d.setUTCDate(d.getUTCDate() + 30);
    return d.toISOString();
  }
  return nextPeriodEnd(live ? live.toISOString() : null, offer, now).toISOString();
}

/** Valor do Mercado Pago (reais, decimal) em centavos inteiros. */
export const toCents = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) : null);

/** Só os dígitos do CPF (11) ou null se o tamanho não bate. */
export function cleanCpf(v: unknown): string | null {
  const d = typeof v === "string" ? v.replace(/\D/g, "") : "";
  return d.length === 11 ? d : null;
}

/** CPF válido (dígitos verificadores). Rejeita sequências repetidas (111.111.111-11 etc.). */
export function isValidCpf(v: unknown): boolean {
  const d = cleanCpf(v);
  if (!d || /^(\d)\1{10}$/.test(d)) return false;
  const dv = (len: number) => {
    let sum = 0;
    for (let i = 0; i < len; i++) sum += Number(d[i]) * (len + 1 - i);
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  return dv(9) === Number(d[9]) && dv(10) === Number(d[10]);
}

/** Máscara 000.000.000-00 enquanto digita. */
export function maskCpf(v: string): string {
  const d = v.replace(/\D/g, "").slice(0, 11);
  return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
}
