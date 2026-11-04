/** Planos da tela "Meu Plano" (preços da arte oficial). Puro. */
export const OFFER_KEYS = ["mensal", "semestral", "anual", "vitalicio"] as const;
export type OfferKey = (typeof OFFER_KEYS)[number];

export const OFFERS: Record<OfferKey, { label: string; price: string; per: string; cents: number }> = {
  mensal: { label: "Plano Mensal", price: "R$ 37,00", per: "por mês", cents: 3700 },
  semestral: { label: "Plano Semestral", price: "R$ 197,00", per: "por 6 meses", cents: 19700 },
  anual: { label: "Plano Anual", price: "R$ 347,00", per: "por 12 meses", cents: 34700 },
  vitalicio: { label: "Plano Vitalício", price: "R$ 697,00", per: "acesso para sempre", cents: 69700 },
};

export const isOfferKey = (v: unknown): v is OfferKey => typeof v === "string" && (OFFER_KEYS as readonly string[]).includes(v);

/** Qual cartão da arte é o plano em vigor do aluno. */
export function currentOffer(paid: boolean, period: string | null, hasEnd: boolean): "gratuito" | OfferKey {
  if (!paid) return "gratuito";
  if (period === "mensal" || period === "semestral" || period === "anual") return period;
  return hasEnd ? "mensal" : "vitalicio";
}
