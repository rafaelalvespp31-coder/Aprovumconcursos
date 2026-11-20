/** APROVUM PARCEIROS: regras puras de cupom (código, desconto, validade). */
import { OFFER_KEYS, OFFERS, type OfferKey } from "@/domain/plans/offers";

/** Código do cupom: só letras e números, em maiúsculas (aceita minúsculas, espaços e hífens digitados). null se não servir. */
export function normalizeCouponCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return s.length >= 3 && s.length <= 40 ? s : null;
}

/** Desconto em centavos sobre o preço vigente, arredondado ao centavo. Nunca zera o preço. */
export function discountCents(listCents: number, pct: number): number {
  if (!Number.isFinite(listCents) || !Number.isFinite(pct) || listCents <= 0 || pct <= 0) return 0;
  const d = Math.round((listCents * Math.min(pct, 100)) / 100);
  return Math.min(d, listCents - 1);
}

export interface CouponRule {
  code: string;
  discountPct: number;
  status: string;
  maxUses: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  eligibleOffers: readonly string[];
  partnerActive: boolean;
}

export type CouponProblem = "inativo" | "ainda_nao_vale" | "expirado" | "esgotado" | "plano_nao_elegivel";
export const COUPON_PROBLEM_TEXT: Record<CouponProblem, string> = {
  inativo: "Este cupom não está ativo.",
  ainda_nao_vale: "Este cupom ainda não começou a valer.",
  expirado: "Este cupom expirou.",
  esgotado: "Este cupom atingiu o limite de utilizações.",
  plano_nao_elegivel: "Este cupom não vale para o plano escolhido.",
};

/** Confere o cupom para o plano escolhido. `usedApproved` = utilizações já aprovadas (conta no limite). */
export function checkCoupon(c: CouponRule, offer: OfferKey, usedApproved: number, now: Date = new Date()): CouponProblem | null {
  if (c.status !== "ativo" || !c.partnerActive) return "inativo";
  if (c.startsAt && Date.parse(c.startsAt) > now.getTime()) return "ainda_nao_vale";
  if (c.expiresAt && Date.parse(c.expiresAt) <= now.getTime()) return "expirado";
  if (c.maxUses !== null && usedApproved >= c.maxUses) return "esgotado";
  if (!c.eligibleOffers.includes(offer)) return "plano_nao_elegivel";
  return null;
}

export interface Quote { offer: OfferKey; listCents: number; discountCents: number; finalCents: number; discountPct: number }
/** Preço vigente do plano e o valor com o cupom (o preço original dos planos nunca é alterado). */
export function quote(offer: OfferKey, pct: number): Quote {
  const listCents = OFFERS[offer].cents;
  const d = discountCents(listCents, pct);
  return { offer, listCents, discountCents: d, finalCents: listCents - d, discountPct: pct };
}

/** Comissão do parceiro sobre o valor efetivamente pago (0% = nenhuma). */
export const commissionCents = (finalCents: number, pct: number) => (pct > 0 ? Math.round((finalCents * pct) / 100) : 0);

export const ALL_OFFERS: readonly OfferKey[] = OFFER_KEYS;

/** Link exclusivo do parceiro. */
export const partnerLink = (code: string, site = "https://aprovumconcursos.com.br") => `${site.replace(/\/$/, "")}/?ref=${encodeURIComponent(code)}`;
