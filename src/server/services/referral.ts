import "server-only";
import { createAdminClient } from "../supabase";
import { auditLog } from "../observability";
import { generateReferralCode, isReferralOffer, normalizeReferralCode } from "@/domain/referral/code";

type Row = Record<string, unknown>;

export const REWARD_ITEM = "Copo + Camisa APROVUM";

/** Código do aluno (cria na primeira vez, para qualquer aluno: novos e antigos podem indicar). */
export async function ensureReferralCode(userId: string): Promise<string | null> {
  const db = createAdminClient();
  const p = await db.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
  if (!p.data) return null;
  if (p.data.referral_code) return p.data.referral_code as string;
  for (let i = 0; i < 8; i++) {
    const code = generateReferralCode();
    const up = await db.from("profiles").update({ referral_code: code }).eq("id", userId).is("referral_code", null).select("referral_code");
    if (up.error) {
      if (up.error.code === "23505") continue; // código já usado por outro aluno: sorteia outro
      throw new Error(up.error.message);
    }
    if (up.data?.length) return code;
    const again = await db.from("profiles").select("referral_code").eq("id", userId).maybeSingle();
    if (again.data?.referral_code) return again.data.referral_code as string;
  }
  return null;
}

/** Liga o aluno novo a quem indicou. Código inválido, próprio ou repetido é ignorado sem travar o cadastro. */
export async function registerReferral(newUserId: string, rawCode: unknown): Promise<"ok" | "invalido" | "ignorado"> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return "invalido";
  const db = createAdminClient();
  const owner = await db.from("profiles").select("id").eq("referral_code", code).maybeSingle();
  if (!owner.data) return "invalido";
  const referrerId = owner.data.id as string;
  if (referrerId === newUserId) return "ignorado";
  const ins = await db.from("referrals").insert({ referrer_id: referrerId, referred_id: newUserId, code });
  if (ins.error) {
    if (ins.error.code === "23505") return "ignorado"; // este aluno já tem quem o indicou
    throw new Error(ins.error.message);
  }
  return "ok";
}

/** Existe aluno com esse código? (conferência no formulário de cadastro, sem expor dados). */
export async function referralCodeExists(rawCode: unknown): Promise<boolean> {
  const code = normalizeReferralCode(rawCode);
  if (!code) return false;
  const r = await createAdminClient().from("profiles").select("id").eq("referral_code", code).maybeSingle();
  return !!r.data;
}

/**
 * Compra confirmada do indicado: anual ou vitalício gera o prêmio (copo + camisa) para o indicador e para o indicado.
 * Idempotente: só a primeira compra qualificada conta.
 */
export async function rewardOnPurchase(userId: string, paymentId: string, offer: string): Promise<boolean> {
  if (!isReferralOffer(offer)) return false;
  const db = createAdminClient();
  const claim = await db
    .from("referrals")
    .update({ qualified_at: new Date().toISOString(), qualifying_payment_id: paymentId })
    .eq("referred_id", userId)
    .is("qualified_at", null)
    .select("id, referrer_id, referred_id");
  if (claim.error) throw new Error(claim.error.message);
  const ref = (claim.data ?? [])[0] as Row | undefined;
  if (!ref) return false;
  const rows = [
    { referral_id: ref.id as string, user_id: ref.referrer_id as string, role: "indicador", item: REWARD_ITEM },
    { referral_id: ref.id as string, user_id: ref.referred_id as string, role: "indicado", item: REWARD_ITEM },
  ];
  const r = await db.from("referral_rewards").upsert(rows, { onConflict: "referral_id,role", ignoreDuplicates: true });
  if (r.error) throw new Error(r.error.message);
  await auditLog(db, { actorId: null, userId, action: "referral.premio", entity: "referrals", entityId: ref.id as string, meta: { offer } }).catch(() => {});
  return true;
}

/** Pagamento reembolsado: o prêmio ainda não enviado é cancelado e a indicação volta a valer para uma nova compra. */
export async function cancelOnRefund(paymentId: string): Promise<void> {
  const db = createAdminClient();
  const ref = await db.from("referrals").select("id").eq("qualifying_payment_id", paymentId).maybeSingle();
  if (!ref.data) return;
  await db.from("referral_rewards").update({ status: "cancelado", updated_at: new Date().toISOString() }).eq("referral_id", ref.data.id as string).eq("status", "pendente");
}

// ---------------------------------------------------------------------------
// Aluno
// ---------------------------------------------------------------------------

export interface MyReferral {
  code: string | null;
  friends: Array<{ name: string; status: "cadastrado" | "comprou"; at: string }>;
  rewards: Array<{ role: "indicador" | "indicado"; item: string; status: "pendente" | "enviado" | "cancelado" }>;
}

const firstName = (n: unknown) => (typeof n === "string" ? n.trim().split(/\s+/)[0] : "") || "Aluno";

export async function getMyReferral(userId: string): Promise<MyReferral> {
  const db = createAdminClient();
  const code = await ensureReferralCode(userId).catch(() => null);
  const [mine, rew] = await Promise.all([
    db.from("referrals").select("referred_id, qualified_at, created_at").eq("referrer_id", userId).order("created_at", { ascending: false }).limit(100),
    db.from("referral_rewards").select("role, item, status").eq("user_id", userId).order("created_at", { ascending: false }).limit(20),
  ]);
  const list = (mine.data ?? []) as Row[];
  const names = new Map<string, string>();
  if (list.length) {
    const p = await db.from("profiles").select("id, display_name").in("id", list.map((r) => r.referred_id as string));
    for (const r of (p.data ?? []) as Row[]) names.set(r.id as string, firstName(r.display_name));
  }
  return {
    code,
    friends: list.map((r) => ({ name: names.get(r.referred_id as string) ?? "Aluno", status: r.qualified_at ? "comprou" : "cadastrado", at: r.created_at as string })),
    rewards: ((rew.data ?? []) as Row[]).map((r) => ({ role: r.role as "indicador" | "indicado", item: r.item as string, status: r.status as "pendente" | "enviado" | "cancelado" })),
  };
}

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------

export interface AdminReward {
  id: string; status: "pendente" | "enviado" | "cancelado"; role: "indicador" | "indicado"; item: string; createdAt: string;
  studentName: string | null; studentEmail: string | null; whatsapp: string | null; otherName: string | null;
}

export async function listRewards(limit = 300): Promise<AdminReward[]> {
  const db = createAdminClient();
  const r = await db.from("referral_rewards").select("id, status, role, item, created_at, user_id, referral_id").order("created_at", { ascending: false }).limit(limit);
  const rows = (r.data ?? []) as Row[];
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((x) => x.user_id as string))];
  const refs = await db.from("referrals").select("id, referrer_id, referred_id").in("id", [...new Set(rows.map((x) => x.referral_id as string))]);
  const refMap = new Map(((refs.data ?? []) as Row[]).map((x) => [x.id as string, x]));
  const allIds = [...new Set([...ids, ...((refs.data ?? []) as Row[]).flatMap((x) => [x.referrer_id as string, x.referred_id as string])])];
  const prof = await db.from("profiles").select("id, display_name, whatsapp").in("id", allIds);
  const pm = new Map(((prof.data ?? []) as Row[]).map((p) => [p.id as string, p]));
  const emails = new Map<string, string>();
  await Promise.all(ids.map(async (id) => {
    const u = await db.auth.admin.getUserById(id).catch(() => null);
    if (u?.data?.user?.email) emails.set(id, u.data.user.email);
  }));
  return rows.map((x) => {
    const ref = refMap.get(x.referral_id as string);
    const otherId = ref ? (x.role === "indicador" ? ref.referred_id : ref.referrer_id) as string : null;
    const me = pm.get(x.user_id as string);
    return {
      id: x.id as string, status: x.status as AdminReward["status"], role: x.role as AdminReward["role"], item: x.item as string, createdAt: x.created_at as string,
      studentName: (me?.display_name as string | null) ?? null, studentEmail: emails.get(x.user_id as string) ?? null, whatsapp: (me?.whatsapp as string | null) ?? null,
      otherName: otherId ? ((pm.get(otherId)?.display_name as string | null) ?? null) : null,
    };
  });
}

export async function setRewardStatus(adminId: string, id: string, to: "pendente" | "enviado" | "cancelado") {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const db = createAdminClient();
  await db.from("referral_rewards").update({ status: to, updated_at: new Date().toISOString() }).eq("id", id);
  await auditLog(db, { actorId: adminId, userId: null, action: "referral.status", entity: "referral_rewards", entityId: id, meta: { to } }).catch(() => {});
}

export async function countPendingRewards(): Promise<number> {
  const r = await createAdminClient().from("referral_rewards").select("id", { count: "exact", head: true }).eq("status", "pendente");
  return r.count ?? 0;
}
