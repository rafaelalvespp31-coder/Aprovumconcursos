import "server-only";
import { createAdminClient } from "../supabase";
import { UserFacingError, enforceRateLimit } from "./trails";
import { OFFER_KEYS, isOfferKey, type OfferKey } from "@/domain/plans/offers";

/** Link de pagamento do plano (opcional): PLAN_CHECKOUT_MENSAL, _SEMESTRAL, _ANUAL, _VITALICIO. */
function checkoutUrl(plan: OfferKey): string | null {
  const raw = process.env[`PLAN_CHECKOUT_${plan.toUpperCase()}`]?.trim();
  return raw && /^https:\/\//.test(raw) ? raw : null;
}

/** O aluno escolheu um plano: vai ao pagamento (se houver link) ou registra o pedido para a equipe. */
export async function requestPlan(userId: string, planRaw: unknown): Promise<{ url: string | null }> {
  if (!isOfferKey(planRaw)) throw new UserFacingError("Plano inválido.", "invalid_plan");
  await enforceRateLimit(userId, "plan_request", 10);
  const url = checkoutUrl(planRaw);
  const { error } = await createAdminClient().from("plan_requests").insert({ user_id: userId, plan: planRaw });
  if (error && error.code !== "23505") throw new Error(error.message);
  return { url };
}

export interface OpenPlanRequest {
  id: string;
  plan: OfferKey;
  createdAt: string;
  name: string | null;
  email: string | null;
}

export async function listOpenPlanRequests(): Promise<OpenPlanRequest[]> {
  const db = createAdminClient();
  const { data, error } = await db.from("plan_requests").select("id, user_id, plan, created_at").eq("status", "novo").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(error.message);
  const rows = (data ?? []).filter((r) => (OFFER_KEYS as readonly string[]).includes(r.plan as string));
  const ids = [...new Set(rows.map((r) => r.user_id as string))];
  const profiles = ids.length ? await db.from("profiles").select("id, display_name").in("id", ids) : { data: [] };
  const names = new Map((profiles.data ?? []).map((p) => [p.id as string, (p.display_name as string | null) || null]));
  const emails = new Map<string, string | null>();
  await Promise.all(ids.map(async (id) => emails.set(id, (await db.auth.admin.getUserById(id)).data.user?.email ?? null)));
  return rows.map((r) => ({ id: r.id as string, plan: r.plan as OfferKey, createdAt: r.created_at as string, name: names.get(r.user_id as string) ?? null, email: emails.get(r.user_id as string) ?? null }));
}

export async function resolvePlanRequest(id: string): Promise<void> {
  const { error } = await createAdminClient().from("plan_requests").update({ status: "atendido" }).eq("id", id);
  if (error) throw new Error(error.message);
}
