import "server-only";
import { cache } from "react";
import { createAdminClient } from "../supabase";
import { CAVEIRA_CAMPAIGN_ID, promoIsValid, toPromoGrant, type PromoGrant } from "@/domain/plans/promo";

type GrantRow = Parameters<typeof toPromoGrant>[0];

/**
 * Concessão promocional VIGENTE do aluno (validade conferida agora, no servidor). Só leitura.
 * Usada pelo sistema central de permissões (getMyPlan); nada vem do navegador.
 */
export const getActivePromo = cache(async function getActivePromo(userId: string): Promise<PromoGrant | null> {
  const { data, error } = await createAdminClient()
    .from("promo_grants")
    .select("id, campaign_id, starts_at, expires_at, popup_seen_at, promo_campaigns(name, plan_id)")
    .eq("user_id", userId)
    .neq("status", "revogado")
    .gt("expires_at", new Date().toISOString())
    .order("expires_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const c = data.promo_campaigns as unknown as { name: string; plan_id: string } | null;
  const g = toPromoGrant({
    grant_id: data.id as string,
    campaign_id: data.campaign_id as string,
    campaign_name: c?.name ?? "",
    plan_id: c?.plan_id ?? "premium",
    starts_at: data.starts_at as string,
    expires_at: data.expires_at as string,
    popup_seen_at: (data.popup_seen_at as string | null) ?? null,
  });
  return promoIsValid(g) ? g : null;
});

/**
 * Primeira inicialização autenticada: concede (idempotente, no banco) as campanhas ativas que o
 * aluno ainda não tem e devolve a concessão vigente. Logout/login, outro aparelho ou cookies limpos
 * nunca reiniciam o prazo: a concessão é única por aluno e campanha, com datas do relógio do banco.
 */
export const ensurePromo = cache(async function ensurePromo(userId: string): Promise<PromoGrant | null> {
  const { data, error } = await createAdminClient().rpc("promo_ensure", { p_user: userId });
  if (error) throw new Error(error.message);
  const row = ((data ?? []) as GrantRow[])[0];
  const g = row ? toPromoGrant(row) : null;
  return promoIsValid(g) ? g : null;
});

/** Marca a popup como vista (uma vez; não mexe no prazo). Só a concessão do próprio aluno. */
export async function markPromoPopupSeen(userId: string, campaignId: string): Promise<void> {
  const { error } = await createAdminClient()
    .from("promo_grants")
    .update({ popup_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("campaign_id", campaignId)
    .is("popup_seen_at", null);
  if (error) throw new Error(error.message);
}

export { CAVEIRA_CAMPAIGN_ID };
