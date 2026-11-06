/** Planos da tela "Meu Plano" (preços da arte oficial). Puro. */
export const OFFER_KEYS = ["mensal", "semestral", "anual", "vitalicio"] as const;
export type OfferKey = (typeof OFFER_KEYS)[number];

export const OFFERS: Record<OfferKey, { label: string; price: string; per: string; cents: number }> = {
  mensal: { label: "Combatente", price: "R$ 37,00", per: "por mês", cents: 3700 },
  semestral: { label: "Operador", price: "R$ 197,00", per: "por 6 meses", cents: 19700 },
  anual: { label: "Elite Tática", price: "R$ 347,00", per: "por 12 meses", cents: 34700 },
  vitalicio: { label: "Comando Supremo", price: "R$ 697,00", per: "acesso para sempre", cents: 69700 },
};

/** Planos que podem ser parcelados em 12x (o mensal já é cobrado todo mês). */
export const INSTALLMENT_OFFERS: readonly OfferKey[] = ["semestral", "anual", "vitalicio"];
export const INSTALLMENTS = 12;
const brl = (cents: number) => `R$ ${(cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** Parcela = valor à vista ÷ 12 (arredondada ao centavo). null quando o plano não é parcelado. */
export function installmentOf(o: OfferKey): { count: number; value: string; cash: string } | null {
  if (!INSTALLMENT_OFFERS.includes(o)) return null;
  return { count: INSTALLMENTS, value: brl(Math.round(OFFERS[o].cents / INSTALLMENTS)), cash: OFFERS[o].price };
}

export const isOfferKey = (v: unknown): v is OfferKey => typeof v === "string" && (OFFER_KEYS as readonly string[]).includes(v);

/** Qual cartão da arte é o plano em vigor do aluno. */
export function currentOffer(paid: boolean, period: string | null, hasEnd: boolean): "gratuito" | OfferKey {
  if (!paid) return "gratuito";
  if (period === "mensal" || period === "semestral" || period === "anual") return period;
  return hasEnd ? "mensal" : "vitalicio";
}

/** Cor do "Meu Plano" nos menus: gratuito = prata, pago (mensal/semestral/anual) = vermelho neon, vitalício = dourado neon. */
export type PlanTier = "gratuito" | "pago" | "vitalicio";
export function planTier(paid: boolean, period: string | null, hasEnd: boolean): PlanTier {
  const o = currentOffer(paid, period, hasEnd);
  return o === "gratuito" ? "gratuito" : o === "vitalicio" ? "vitalicio" : "pago";
}

/** Nome e frase de cada plano (a conta gratuita é "Recruta"). */
export const PLAN_NAMES: Record<"gratuito" | OfferKey, { name: string; tagline: string }> = {
  gratuito: { name: "Recruta", tagline: "O primeiro passo da missão" },
  mensal: { name: "Combatente", tagline: "Treinamento e preparação operacional" },
  semestral: { name: "Operador", tagline: "Domínio tático e evolução avançada" },
  anual: { name: "Elite Tática", tagline: "Preparação avançada para a aprovação" },
  vitalicio: { name: "Comando Supremo", tagline: "Acesso definitivo à missão APROVUM" },
};

/** Opções que o admin escolhe em "Alunos": as mesmas da tela "Meu Plano" (Recruta + os 4 planos pagos). */
export const ADMIN_OFFERS = ["gratuito", ...OFFER_KEYS] as const;
export type AdminOffer = (typeof ADMIN_OFFERS)[number];
export const isAdminOffer = (v: unknown): v is AdminOffer => typeof v === "string" && (ADMIN_OFFERS as readonly string[]).includes(v);
export const offerName = (o: AdminOffer) => PLAN_NAMES[o].name;

/** Como cada plano da tela "Meu Plano" fica gravado na assinatura (vitalício = pago, sem período e sem vencimento). */
export function offerStorage(o: AdminOffer): { planId: "free" | "premium"; period: "mensal" | "semestral" | "anual" | null } {
  if (o === "gratuito") return { planId: "free", period: null };
  if (o === "vitalicio") return { planId: "premium", period: null };
  return { planId: "premium", period: o };
}

/** Data de "vencimento" gravada no histórico de pagamentos do vitalício (a coluna não aceita vazio). */
export const LIFETIME_PAYMENT_END = "2999-12-31T23:59:59-03:00";

/** Plano que a tela "Meu Plano" mostra para a assinatura gravada (mesmo vencida: o estado é mostrado à parte). */
export function storedOffer(planId: string, period: string | null, hasEnd: boolean): AdminOffer {
  return planId === "free" ? "gratuito" : currentOffer(true, period, hasEnd);
}
