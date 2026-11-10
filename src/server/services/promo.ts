import "server-only";
import { cache } from "react";
import { createAdminClient } from "../supabase";
import { CAVEIRA_CAMPAIGN_ID, promoIsValid, toPromoGrant, type PromoGrant } from "@/domain/plans/promo";

/** Tabela/função da campanha inexistente (migração pendente): PostgREST 404 ou erro de relação. */
function isMissingRelation(e: { code?: string; message?: string }): boolean {
  return e.code === "42P01" || e.code === "PGRST205" || /could not find the table|does not exist/i.test(e.message ?? "");
}

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
  // Migração da campanha ainda não aplicada (tabela inexistente): sem degustação, nunca derruba o app.
  if (error && isMissingRelation(error)) return null;
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
  if (error && (error.code === "42883" || error.code === "PGRST202")) return null; // migração pendente
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

// ---------------------------------------------------------------- Administração (só admin; quem chama confere)

export interface PromoCampaignInfo {
  id: string;
  name: string;
  planId: string;
  durationDays: number;
  active: boolean;
  activatedAt: string | null;
  deactivatedAt: string | null;
}

export interface PromoStats {
  total: number;
  ativos: number;
  expirados: number;
  popupVistas: number;
  popupPendentes: number;
}

export interface PromoUserRow {
  grantId: string;
  userId: string;
  name: string | null;
  email: string | null;
  originalPlan: string;
  startsAt: string;
  expiresAt: string;
  status: "ativo" | "expirado" | "revogado";
  source: string;
  popupSeenAt: string | null;
}

export async function getCampaignInfo(id: string = CAVEIRA_CAMPAIGN_ID): Promise<PromoCampaignInfo | null> {
  const { data, error } = await createAdminClient().from("promo_campaigns").select("*").eq("id", id).maybeSingle();
  if (error && isMissingRelation(error)) return null; // migração ainda não aplicada
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    id: data.id as string,
    name: data.name as string,
    planId: data.plan_id as string,
    durationDays: data.duration_days as number,
    active: !!data.active,
    activatedAt: (data.activated_at as string | null) ?? null,
    deactivatedAt: (data.deactivated_at as string | null) ?? null,
  };
}

/** Indicadores da campanha, contados no banco (validade pelo relógio do servidor). */
export async function getCampaignStats(id: string = CAVEIRA_CAMPAIGN_ID): Promise<PromoStats> {
  const db = createAdminClient();
  const nowIso = new Date().toISOString();
  const count = async (build: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
    const { count: n, error } = await build(base());
    if (error) throw new Error(error.message);
    return n ?? 0;
  };
  const base = () => db.from("promo_grants").select("id", { count: "exact", head: true }).eq("campaign_id", id);
  const [total, ativos, popupVistas] = await Promise.all([
    count((q) => q.neq("status", "revogado")),
    count((q) => q.neq("status", "revogado").gt("expires_at", nowIso)),
    count((q) => q.neq("status", "revogado").not("popup_seen_at", "is", null)),
  ]);
  return { total, ativos, expirados: Math.max(0, total - ativos), popupVistas, popupPendentes: Math.max(0, total - popupVistas) };
}

/** Busca por nome ou e-mail (mín. 3 letras) entre os contemplados e, sem concessão, entre os alunos. */
export async function searchCampaignUsers(term: string, id: string = CAVEIRA_CAMPAIGN_ID): Promise<{ rows: PromoUserRow[]; withoutGrant: Array<{ userId: string; name: string | null; email: string | null }> }> {
  const q = term.trim().toLowerCase();
  if (q.length < 3) return { rows: [], withoutGrant: [] };
  const db = createAdminClient();
  const users: Array<{ id: string; email?: string }> = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const { data: profiles } = await db.from("profiles").select("id, display_name").limit(20000);
  const nameOf = new Map((profiles ?? []).map((p) => [p.id as string, (p.display_name as string | null) || null]));
  const hits = users
    .filter((u) => (u.email ?? "").toLowerCase().includes(q) || (nameOf.get(u.id) ?? "").toLowerCase().includes(q))
    .slice(0, 20);
  if (!hits.length) return { rows: [], withoutGrant: [] };
  const ids = hits.map((h) => h.id);
  const [grants, subs] = await Promise.all([
    db.from("promo_grants").select("id, user_id, starts_at, expires_at, status, source, popup_seen_at").eq("campaign_id", id).in("user_id", ids),
    db.from("subscriptions").select("user_id, plan_id, status, current_period_end").in("user_id", ids),
  ]);
  if (grants.error) throw new Error(grants.error.message);
  const gMap = new Map((grants.data ?? []).map((g) => [g.user_id as string, g]));
  const sMap = new Map((subs.data ?? []).map((s) => [s.user_id as string, s]));
  const nowMs = Date.now();
  const rows: PromoUserRow[] = [];
  const withoutGrant: Array<{ userId: string; name: string | null; email: string | null }> = [];
  for (const u of hits) {
    const g = gMap.get(u.id);
    if (!g) {
      withoutGrant.push({ userId: u.id, name: nameOf.get(u.id) ?? null, email: u.email ?? null });
      continue;
    }
    const s = sMap.get(u.id);
    const paidValid = s && s.plan_id !== "free" && s.status === "active" && (!s.current_period_end || new Date(s.current_period_end as string).getTime() > nowMs);
    const expired = new Date(g.expires_at as string).getTime() <= nowMs;
    rows.push({
      grantId: g.id as string,
      userId: u.id,
      name: nameOf.get(u.id) ?? null,
      email: u.email ?? null,
      originalPlan: paidValid ? (s!.plan_id as string) : "free",
      startsAt: g.starts_at as string,
      expiresAt: g.expires_at as string,
      status: g.status === "revogado" ? "revogado" : expired ? "expirado" : "ativo",
      source: g.source as string,
      popupSeenAt: (g.popup_seen_at as string | null) ?? null,
    });
  }
  return { rows, withoutGrant };
}

export async function setCampaignActive(adminId: string, active: boolean, id: string = CAVEIRA_CAMPAIGN_ID): Promise<number> {
  const { data, error } = await createAdminClient().rpc("promo_set_active", { p_campaign: id, p_active: active, p_actor: adminId });
  if (error) throw new Error(error.message);
  return (data as number) ?? 0;
}

export async function grantManually(adminId: string, userId: string, id: string = CAVEIRA_CAMPAIGN_ID): Promise<void> {
  const { error } = await createAdminClient().rpc("promo_grant", { p_campaign: id, p_user: userId, p_source: "manual", p_actor: adminId });
  if (error) throw new Error(error.message);
}

export async function extendGrant(adminId: string, grantId: string, days: number): Promise<void> {
  const { error } = await createAdminClient().rpc("promo_extend", { p_grant: grantId, p_days: days, p_actor: adminId });
  if (error) throw new Error(error.message);
}
