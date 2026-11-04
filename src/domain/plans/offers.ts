/** Planos da tela "Meu Plano" (preços da arte oficial). Puro. */
export const OFFER_KEYS = ["mensal", "semestral", "anual", "vitalicio"] as const;
export type OfferKey = (typeof OFFER_KEYS)[number];

export const OFFERS: Record<OfferKey, { label: string; price: string; per: string; cents: number }> = {
  mensal: { label: "Combatente", price: "R$ 37,00", per: "por mês", cents: 3700 },
  semestral: { label: "Operador", price: "R$ 197,00", per: "por 6 meses", cents: 19700 },
  anual: { label: "Elite Tática", price: "R$ 347,00", per: "por 12 meses", cents: 34700 },
  vitalicio: { label: "Comando Supremo", price: "R$ 697,00", per: "acesso para sempre", cents: 69700 },
};

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
