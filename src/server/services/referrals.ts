import "server-only";
import { createAdminClient } from "../supabase";
import { logEvent } from "../observability";
import { normalizeCouponCode, withinWindow } from "@/domain/partners/coupon";

export const PARTNER_COOKIE = "apv_parceiro";
export const VISITOR_COOKIE = "apv_visitante";
const VISITOR_RE = /^[a-f0-9-]{16,64}$/;
export const validVisitorId = (v: unknown): v is string => typeof v === "string" && VISITOR_RE.test(v);

/** Janela de atribuição (dias), configurável pelo administrador. */
export async function attributionWindowDays(): Promise<number> {
  const { data } = await createAdminClient().from("partner_program_settings").select("attribution_window_days").eq("singleton", true).maybeSingle();
  const n = Number(data?.attribution_window_days);
  return Number.isFinite(n) && n > 0 ? n : 30;
}

/** Registra a visita pelo link ?ref=. Só vale para cupom e parceiro existentes e ativos; uma indicação por parceiro e visitante. */
export async function recordVisit(rawCode: unknown, visitorId: string, path: string): Promise<{ ok: boolean; code: string | null }> {
  const code = normalizeCouponCode(rawCode);
  if (!code) return { ok: false, code: null };
  const db = createAdminClient();
  const { data: c } = await db.from("partner_coupons").select("id, code, status, partner_id, partners(status)").eq("code", code).maybeSingle();
  const p = c ? (Array.isArray(c.partners) ? c.partners[0] : c.partners) : null;
  if (!c || c.status !== "ativo" || p?.status !== "ativo") return { ok: false, code: null };
  const { data: prev } = await db.from("partner_referrals").select("id, visits").eq("partner_id", c.partner_id).eq("visitor_id", visitorId).maybeSingle();
  if (prev) {
    await db.from("partner_referrals").update({ last_seen_at: new Date().toISOString(), visits: Number(prev.visits) + 1 }).eq("id", prev.id);
  } else {
    const { error } = await db.from("partner_referrals").insert({ partner_id: c.partner_id, coupon_id: c.id, code: c.code, visitor_id: visitorId, landing_path: path.slice(0, 200) });
    if (error && error.code !== "23505") throw new Error(error.message);
  }
  return { ok: true, code: c.code as string };
}

/** Vincula a indicação do visitante à conta quando ele entra. Nunca sobrescreve vínculo já feito. */
export async function linkReferralToUser(userId: string, visitorId: string | null | undefined): Promise<void> {
  if (!validVisitorId(visitorId)) return;
  try {
    await createAdminClient().from("partner_referrals").update({ user_id: userId, linked_at: new Date().toISOString() }).eq("visitor_id", visitorId).is("user_id", null);
  } catch (e) {
    await logEvent("referrals.link_failed", { error: String((e as Error).message).slice(0, 200) });
  }
}

/** Indicação do visitante para o parceiro do cupom, se ainda estiver dentro da janela. */
export async function referralFor(visitorId: string | null | undefined, partnerId: string): Promise<{ id: string; inWindow: boolean } | null> {
  if (!validVisitorId(visitorId)) return null;
  const db = createAdminClient();
  const { data } = await db.from("partner_referrals").select("id, first_seen_at").eq("visitor_id", visitorId).eq("partner_id", partnerId).maybeSingle();
  if (!data) return null;
  return { id: data.id as string, inWindow: withinWindow(data.first_seen_at as string, await attributionWindowDays()) };
}
