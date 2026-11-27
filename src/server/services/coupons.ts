import "server-only";
import { createAdminClient } from "../supabase";
import { logEvent } from "../observability";
import { UserFacingError } from "./trails";
import type { OfferKey } from "@/domain/plans/offers";
import { COUPON_PROBLEM_TEXT, checkCoupon, commissionCents, nextCommissionStatus, normalizeCouponCode, pickAttribution, quote, type CommissionStatus, type Quote } from "@/domain/partners/coupon";
import { referralFor } from "./referrals";

export interface CouponInfo {
  id: string;
  code: string;
  partnerId: string;
  partnerName: string;
  discountPct: number;
  commissionPct: number;
}
export interface ResolvedCoupon { coupon: CouponInfo; quote: Quote }

interface CouponRow {
  id: string;
  code: string;
  discount_pct: number | string;
  status: string;
  max_uses: number | null;
  starts_at: string | null;
  expires_at: string | null;
  eligible_offers: string[] | null;
  partner_id: string;
  partners: { display_name: string; status: string; commission_pct: number | string } | { display_name: string; status: string; commission_pct: number | string }[] | null;
}
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

/** Confere o cupom para o plano escolhido e calcula o valor. Quem chama o checkout nunca decide o preço. */
export async function resolveCoupon(rawCode: unknown, offer: OfferKey, userId?: string | null): Promise<ResolvedCoupon> {
  const code = normalizeCouponCode(rawCode);
  if (!code) throw new UserFacingError("Cupom inválido.", "coupon_invalid");
  const db = createAdminClient();
  const { data, error } = await db
    .from("partner_coupons")
    .select("id, code, discount_pct, status, max_uses, starts_at, expires_at, eligible_offers, partner_id, partners(display_name, status, commission_pct)")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as unknown as CouponRow | null;
  const partner = row ? one(row.partners) : null;
  if (!row || !partner) throw new UserFacingError("Cupom inválido.", "coupon_invalid");
  // Conta usos aprovados e pagamentos em andamento (iniciados há menos de 2 horas); a trava definitiva está no banco (registrar_uso_cupom).
  const recente = new Date(Date.now() - 2 * 3600_000).toISOString();
  const aberto = `status.eq.aprovado,and(status.eq.iniciado,created_at.gt.${recente})`;
  let used = 0;
  if (row.max_uses !== null) {
    const c = await db.from("partner_coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", row.id).or(aberto);
    used = c.count ?? 0;
  }
  let usedByUser = false;
  if (userId) {
    const curto = new Date(Date.now() - 15 * 60_000).toISOString();
    const u = await db.from("partner_coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", row.id).eq("user_id", userId).or(`status.eq.aprovado,and(status.eq.iniciado,created_at.gt.${curto})`);
    usedByUser = (u.count ?? 0) > 0;
  }
  const problem = checkCoupon(
    { code: row.code, discountPct: Number(row.discount_pct), status: row.status, maxUses: row.max_uses, startsAt: row.starts_at, expiresAt: row.expires_at, eligibleOffers: row.eligible_offers ?? [], partnerActive: partner.status === "ativo" },
    offer,
    used,
    new Date(),
    usedByUser,
  );
  if (problem) throw new UserFacingError(COUPON_PROBLEM_TEXT[problem], "coupon_" + problem);
  const pct = Number(row.discount_pct);
  return { coupon: { id: row.id, code: row.code, partnerId: row.partner_id, partnerName: partner.display_name, discountPct: pct, commissionPct: Number(partner.commission_pct) }, quote: quote(offer, pct) };
}

/** Registra a utilização do cupom junto do pagamento (uma por pagamento). */
export async function recordRedemption(paymentId: string, userId: string, r: ResolvedCoupon, visitorId?: string | null, storedRefCode?: string | null): Promise<void> {
  // Prioridade: o cupom digitado decide; só herda a indicação do link se for o mesmo cupom e dentro da janela.
  const ref = await referralFor(visitorId, r.coupon.partnerId).catch(() => null);
  const attr = pickAttribution(r.coupon.code, storedRefCode ?? null, !!ref?.inWindow);
  // Atômico no banco: trava o cupom, confere o limite e o uso por aluno e grava o uso.
  const { error } = await createAdminClient().rpc("registrar_uso_cupom", {
    p_coupon: r.coupon.id,
    p_partner: r.coupon.partnerId,
    p_user: userId,
    p_payment: paymentId,
    p_offer: r.quote.offer,
    p_original: r.quote.listCents,
    p_discount: r.quote.discountCents,
    p_final: r.quote.finalCents,
    p_commission_pct: r.coupon.commissionPct,
    p_source: attr.source,
    p_referral: attr.useReferral ? (ref?.id ?? null) : null,
  });
  if (error) {
    if (/cupom_esgotado/.test(error.message)) throw new UserFacingError(COUPON_PROBLEM_TEXT.esgotado, "coupon_esgotado");
    if (/cupom_ja_usado/.test(error.message)) throw new UserFacingError(COUPON_PROBLEM_TEXT.ja_usado, "coupon_ja_usado");
    throw new Error(error.message);
  }
}

/** Acompanha o pagamento: aprovado, recusado, cancelado ou reembolsado. Nunca derruba o fluxo do pagamento. */
export async function syncRedemption(paymentId: string, status: string, approvedAt: string | null): Promise<void> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("partner_coupon_redemptions").select("id, final_cents, commission_pct, status, commission_status").eq("payment_id", paymentId).maybeSingle();
    if (!data) return;
    const next = status === "aprovado" ? "aprovado" : status === "recusado" ? "recusado" : status === "cancelado" ? "cancelado" : status === "reembolsado" ? "reembolsado" : "iniciado";
    if (data.status === next) return;
    const pct = Number(data.commission_pct);
    const cs = nextCommissionStatus(next, pct, data.commission_status as CommissionStatus);
    await db
      .from("partner_coupon_redemptions")
      .update({
        status: next,
        approved_at: next === "aprovado" ? (approvedAt ?? new Date().toISOString()) : undefined,
        refunded_at: next === "reembolsado" ? new Date().toISOString() : undefined,
        commission_status: cs,
        commission_cents: cs === "nenhuma" || cs === "cancelada" ? 0 : commissionCents(Number(data.final_cents), pct),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
  } catch (e) {
    await logEvent("coupons.sync_failed", { paymentId, error: String((e as Error).message).slice(0, 200) });
  }
}
