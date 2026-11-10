/**
 * Campanhas de acesso premium temporário (ex.: "O Caveira ficou maluco").
 * Puro: regras de validade e contagem regressiva. A concessão é gravada e validada no servidor.
 */

export const CAVEIRA_CAMPAIGN_ID = "caveira-ficou-maluco";

export interface PromoGrant {
  grantId: string;
  campaignId: string;
  campaignName: string;
  /** Plano cujos limites valem durante a concessão. */
  planId: string;
  startsAt: string;
  expiresAt: string;
  popupSeenAt: string | null;
}

/** Concessão vale até o instante de expiração (exclusive), no relógio do servidor. */
export function promoIsValid(g: Pick<PromoGrant, "expiresAt"> | null | undefined, now: Date = new Date()): boolean {
  return !!g && new Date(g.expiresAt).getTime() > now.getTime();
}

/** Tempo restante: dias cheios arredondados para cima, e horas quando falta menos de um dia. */
export function promoRemaining(expiresAt: string, now: Date = new Date()): { ms: number; days: number; hours: number; expired: boolean } {
  const ms = Math.max(0, new Date(expiresAt).getTime() - now.getTime());
  return { ms, days: Math.ceil(ms / 86_400_000), hours: Math.ceil(ms / 3_600_000), expired: ms === 0 };
}

/** Texto curto do contador: "6 DIAS RESTANTES", "1 DIA RESTANTE", "5 HORAS RESTANTES". */
export function promoRemainingLabel(expiresAt: string, now: Date = new Date()): string {
  const r = promoRemaining(expiresAt, now);
  if (r.expired) return "DEGUSTAÇÃO ENCERRADA";
  if (r.ms < 86_400_000) return r.hours === 1 ? "MENOS DE 1 HORA" : `${r.hours} HORAS RESTANTES`;
  return r.days === 1 ? "1 DIA RESTANTE" : `${r.days} DIAS RESTANTES`;
}

/** Linha do banco (promo_ensure / promo_grants + campanha) para o tipo do app. */
export function toPromoGrant(row: {
  grant_id: string;
  campaign_id: string;
  campaign_name: string;
  plan_id: string;
  starts_at: string;
  expires_at: string;
  popup_seen_at: string | null;
}): PromoGrant {
  return {
    grantId: row.grant_id,
    campaignId: row.campaign_id,
    campaignName: row.campaign_name,
    planId: row.plan_id,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    popupSeenAt: row.popup_seen_at,
  };
}
