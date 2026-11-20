import "server-only";
import { createAdminClient } from "../supabase";
import { logEvent } from "../observability";
import { UserFacingError } from "./trails";
import type { OfferKey } from "@/domain/plans/offers";
import { COUPON_PROBLEM_TEXT, checkCoupon, commissionCents, normalizeCouponCode, partnerLink, quote, type Quote } from "@/domain/partners/coupon";

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
export async function resolveCoupon(rawCode: unknown, offer: OfferKey): Promise<ResolvedCoupon> {
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
  let used = 0;
  if (row.max_uses !== null) {
    const c = await db.from("partner_coupon_redemptions").select("id", { count: "exact", head: true }).eq("coupon_id", row.id).eq("status", "aprovado");
    used = c.count ?? 0;
  }
  const problem = checkCoupon(
    { code: row.code, discountPct: Number(row.discount_pct), status: row.status, maxUses: row.max_uses, startsAt: row.starts_at, expiresAt: row.expires_at, eligibleOffers: row.eligible_offers ?? [], partnerActive: partner.status === "ativo" },
    offer,
    used,
  );
  if (problem) throw new UserFacingError(COUPON_PROBLEM_TEXT[problem], "coupon_" + problem);
  const pct = Number(row.discount_pct);
  return { coupon: { id: row.id, code: row.code, partnerId: row.partner_id, partnerName: partner.display_name, discountPct: pct, commissionPct: Number(partner.commission_pct) }, quote: quote(offer, pct) };
}

/** Registra a utilização do cupom junto do pagamento (uma por pagamento). */
export async function recordRedemption(paymentId: string, userId: string, r: ResolvedCoupon): Promise<void> {
  const { error } = await createAdminClient().from("partner_coupon_redemptions").insert({
    coupon_id: r.coupon.id,
    partner_id: r.coupon.partnerId,
    user_id: userId,
    payment_id: paymentId,
    offer: r.quote.offer,
    original_cents: r.quote.listCents,
    discount_cents: r.quote.discountCents,
    final_cents: r.quote.finalCents,
    commission_pct: r.coupon.commissionPct,
    commission_cents: 0,
  });
  if (error && error.code !== "23505") throw new Error(error.message);
}

/** Acompanha o pagamento: aprovado, recusado, cancelado ou reembolsado. Nunca derruba o fluxo do pagamento. */
export async function syncRedemption(paymentId: string, status: string, approvedAt: string | null): Promise<void> {
  try {
    const db = createAdminClient();
    const { data } = await db.from("partner_coupon_redemptions").select("id, final_cents, commission_pct, status").eq("payment_id", paymentId).maybeSingle();
    if (!data) return;
    const next = status === "aprovado" ? "aprovado" : status === "recusado" ? "recusado" : status === "cancelado" ? "cancelado" : status === "reembolsado" ? "reembolsado" : "iniciado";
    if (data.status === next) return;
    await db
      .from("partner_coupon_redemptions")
      .update({
        status: next,
        approved_at: next === "aprovado" ? (approvedAt ?? new Date().toISOString()) : undefined,
        commission_cents: next === "aprovado" ? commissionCents(Number(data.final_cents), Number(data.commission_pct)) : 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
  } catch (e) {
    await logEvent("coupons.sync_failed", { paymentId, error: String((e as Error).message).slice(0, 200) });
  }
}

export interface PartnerOverview {
  id: string;
  name: string;
  status: string;
  commissionPct: number;
  coupons: Array<{ id: string; code: string; discountPct: number; status: string; maxUses: number | null; expiresAt: string | null; stackable: boolean; link: string }>;
  uses: number;
  approved: number;
  refunded: number;
  grossCents: number;
  discountCents: number;
  commissionCents: number;
}
export interface RedemptionRow { id: string; code: string; partner: string; offer: string; originalCents: number; discountCents: number; finalCents: number; status: string; createdAt: string; approvedAt: string | null }

/** Painel administrativo: parceiros, cupons, utilizações e pagamentos aprovados. */
export async function partnersOverview(): Promise<{ partners: PartnerOverview[]; recent: RedemptionRow[] }> {
  const db = createAdminClient();
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "https://aprovumconcursos.com.br";
  const [ps, cs, rs] = await Promise.all([
    db.from("partners").select("id, display_name, status, commission_pct").order("created_at"),
    db.from("partner_coupons").select("id, partner_id, code, discount_pct, status, max_uses, expires_at, stackable").order("created_at"),
    db.from("partner_coupon_redemptions").select("id, coupon_id, partner_id, offer, original_cents, discount_cents, final_cents, commission_cents, status, created_at, approved_at").order("created_at", { ascending: false }).limit(5000),
  ]);
  for (const r of [ps, cs, rs]) if (r.error) throw new Error(r.error.message);
  const codeOf = new Map((cs.data ?? []).map((c) => [c.id as string, c.code as string]));
  const nameOf = new Map((ps.data ?? []).map((p) => [p.id as string, p.display_name as string]));
  const partners: PartnerOverview[] = (ps.data ?? []).map((p) => {
    const mine = (rs.data ?? []).filter((r) => r.partner_id === p.id);
    const ok = mine.filter((r) => r.status === "aprovado");
    return {
      id: p.id as string,
      name: p.display_name as string,
      status: p.status as string,
      commissionPct: Number(p.commission_pct),
      coupons: (cs.data ?? []).filter((c) => c.partner_id === p.id).map((c) => ({ id: c.id as string, code: c.code as string, discountPct: Number(c.discount_pct), status: c.status as string, maxUses: (c.max_uses as number | null) ?? null, expiresAt: (c.expires_at as string | null) ?? null, stackable: !!c.stackable, link: partnerLink(c.code as string, site) })),
      uses: mine.length,
      approved: ok.length,
      refunded: mine.filter((r) => r.status === "reembolsado").length,
      grossCents: ok.reduce((n, r) => n + Number(r.final_cents), 0),
      discountCents: ok.reduce((n, r) => n + Number(r.discount_cents), 0),
      commissionCents: ok.reduce((n, r) => n + Number(r.commission_cents), 0),
    };
  });
  const recent: RedemptionRow[] = (rs.data ?? []).slice(0, 50).map((r) => ({ id: r.id as string, code: codeOf.get(r.coupon_id as string) ?? "?", partner: nameOf.get(r.partner_id as string) ?? "?", offer: r.offer as string, originalCents: Number(r.original_cents), discountCents: Number(r.discount_cents), finalCents: Number(r.final_cents), status: r.status as string, createdAt: r.created_at as string, approvedAt: (r.approved_at as string | null) ?? null }));
  return { partners, recent };
}
