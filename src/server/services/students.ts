import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { createAdminClient } from "../supabase";
import type { SessionUser } from "../auth";
import { auditLog } from "../observability";
import { UserFacingError } from "./trails";
import { BILLING_PERIODS, PLAN_IDS, effectivePlan, nextPeriodEnd, type BillingPeriod, type PlanId, type PlanState } from "@/domain/plans/limits";

export interface StudentRow {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  confirmed: boolean;
  isAdmin: boolean;
  /** Plano gravado (o que foi adquirido/definido). */
  planId: string;
  /** Plano em vigor agora (pago vencido = gratuito). */
  effectivePlanId: PlanId;
  state: PlanState;
  billingPeriod: BillingPeriod | null;
  periodEnd: string | null;
  paidAt: string | null;
  lastPayment: { period: string; amountCents: number | null; paidAt: string; planId: string } | null;
}

/** Todos os alunos cadastrados com o plano de cada um (só admin; quem chama confere). */
export async function listStudents(): Promise<StudentRow[]> {
  const db = createAdminClient();
  const users: Array<{ id: string; email?: string; created_at: string; last_sign_in_at?: string | null; email_confirmed_at?: string | null }> = [];
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error(error.message);
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const [profiles, subs, payments, admins] = await Promise.all([
    db.from("profiles").select("id, display_name").limit(20000),
    db.from("subscriptions").select("user_id, plan_id, status, current_period_end, billing_period, paid_at").limit(20000),
    db.from("subscription_payments").select("user_id, plan_id, period, amount_cents, paid_at").order("paid_at", { ascending: false }).limit(20000),
    db.from("admin_roles").select("user_id").eq("role", "admin"),
  ]);
  const name = new Map((profiles.data ?? []).map((p) => [p.id as string, (p.display_name as string | null) || null]));
  const sub = new Map((subs.data ?? []).map((s) => [s.user_id as string, s]));
  const lastPay = new Map<string, { period: string; amountCents: number | null; paidAt: string; planId: string }>();
  for (const p of payments.data ?? []) if (!lastPay.has(p.user_id as string)) lastPay.set(p.user_id as string, { period: p.period as string, amountCents: p.amount_cents as number | null, paidAt: p.paid_at as string, planId: p.plan_id as string });
  const adminIds = new Set((admins.data ?? []).map((a) => a.user_id as string));
  return users
    .map((u): StudentRow => {
      const s = sub.get(u.id);
      const eff = effectivePlan(s ? { planId: s.plan_id as string, status: s.status as string, currentPeriodEnd: s.current_period_end as string | null } : null);
      return {
        id: u.id,
        name: name.get(u.id) ?? null,
        email: u.email ?? null,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at ?? null,
        confirmed: !!u.email_confirmed_at,
        isAdmin: adminIds.has(u.id),
        planId: (s?.plan_id as string) ?? "free",
        effectivePlanId: eff.planId,
        state: eff.state,
        billingPeriod: (s?.billing_period as BillingPeriod | null) ?? null,
        periodEnd: (s?.current_period_end as string | null) ?? null,
        paidAt: (s?.paid_at as string | null) ?? null,
        lastPayment: lastPay.get(u.id) ?? null,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function assertStudent(userId: string) {
  const { data, error } = await createAdminClient().auth.admin.getUserById(userId);
  if (error || !data?.user) throw new UserFacingError("Aluno não encontrado.", "not_found");
  return data.user;
}

const idSchema = z.uuid("Aluno inválido.");

const planSchema = z.object({
  planId: z.enum(PLAN_IDS, { error: "Escolha um plano válido." }),
  /** AAAA-MM-DD; vazio = sem vencimento (só para planos pagos). */
  expiresOn: z
    .string()
    .regex(/^(\d{4}-\d{2}-\d{2})?$/, "Data de vencimento inválida.")
    .optional()
    .transform((v) => v || null),
});

/** Muda o plano do aluno pelo painel (sem registrar pagamento). Gratuito limpa vencimento e período. */
export async function setStudentPlan(admin: SessionUser, userIdInput: string, input: { planId: string; expiresOn?: string }) {
  const userId = idSchema.parse(userIdInput);
  const v = planSchema.parse(input);
  await assertStudent(userId);
  const end = v.planId === "free" || !v.expiresOn ? null : new Date(`${v.expiresOn}T23:59:59-03:00`).toISOString();
  if (end && new Date(end).getTime() < Date.now()) throw new UserFacingError("O vencimento precisa ser hoje ou depois.", "invalid_input");
  const db = createAdminClient();
  const row = { user_id: userId, plan_id: v.planId, status: "active", current_period_end: end, ...(v.planId === "free" ? { billing_period: null } : {}), updated_at: new Date().toISOString() };
  const { error } = await db.from("subscriptions").upsert(row, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  await auditLog(db, { actorId: admin.id, userId, action: "admin.plan_changed", entity: "subscriptions", entityId: userId, meta: { planId: v.planId, end } });
}

const paidSchema = z.object({
  planId: z.enum(["pro", "premium"], { error: "Escolha o plano pago." }),
  period: z.enum(BILLING_PERIODS, { error: "Escolha mensal, semestral ou anual." }),
  /** Valor em reais (texto do formulário), opcional. */
  amount: z
    .string()
    .trim()
    .optional()
    .transform((v, ctx) => {
      if (!v) return null;
      const n = Number(v.replace(/\./g, "").replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 1_000_000) {
        ctx.addIssue({ code: "custom", message: "Valor inválido." });
        return z.NEVER;
      }
      return Math.round(n * 100);
    }),
  note: z.string().trim().max(300).optional().transform((v) => v || null),
});

/**
 * Marca como PAGO: o plano pago passa a valer e o vencimento soma o período (1, 6 ou 12 meses) ao
 * vencimento atual, se ainda vigente, ou a partir de hoje. Fica no histórico de pagamentos.
 */
export async function markStudentPaid(admin: SessionUser, userIdInput: string, input: { planId: string; period: string; amount?: string; note?: string }): Promise<{ periodEnd: string }> {
  const userId = idSchema.parse(userIdInput);
  const v = paidSchema.parse(input);
  await assertStudent(userId);
  const db = createAdminClient();
  const { data: cur } = await db.from("subscriptions").select("plan_id, status, current_period_end").eq("user_id", userId).maybeSingle();
  const stillPaid = cur && cur.plan_id !== "free" && cur.status === "active";
  const end = nextPeriodEnd(stillPaid ? (cur.current_period_end as string | null) : null, v.period).toISOString();
  const now = new Date().toISOString();
  const up = await db
    .from("subscriptions")
    .upsert({ user_id: userId, plan_id: v.planId, status: "active", current_period_end: end, billing_period: v.period, paid_at: now, updated_at: now }, { onConflict: "user_id" });
  if (up.error) throw new Error(up.error.message);
  const pay = await db.from("subscription_payments").insert({ user_id: userId, plan_id: v.planId, period: v.period, amount_cents: v.amount, paid_at: now, period_end: end, note: v.note, recorded_by: admin.id });
  if (pay.error) throw new Error(pay.error.message);
  await auditLog(db, { actorId: admin.id, userId, action: "admin.plan_paid", entity: "subscriptions", entityId: userId, meta: { planId: v.planId, period: v.period, amountCents: v.amount, end } });
  return { periodEnd: end };
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
/** Senha aleatória forte (sem caracteres que se confundem). */
export function generatePassword(length = 12): string {
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)];
  // Garante número, minúscula e maiúscula.
  return /\d/.test(out) && /[a-z]/.test(out) && /[A-Z]/.test(out) ? out : generatePassword(length);
}

const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "Senha longa demais.")
  .regex(/[A-Za-z]/, "Use letras e números na senha.")
  .regex(/\d/, "Use letras e números na senha.");

/**
 * Define uma senha nova para o aluno (digitada pelo admin ou gerada). A senha volta só nesta
 * resposta, para o admin repassar; não fica gravada em lugar nenhum além do Supabase Auth.
 */
export async function resetStudentPassword(admin: SessionUser, userIdInput: string, typed?: string): Promise<{ password: string }> {
  const userId = idSchema.parse(userIdInput);
  const password = typed && typed.trim() ? passwordSchema.parse(typed.trim()) : generatePassword();
  const user = await assertStudent(userId);
  const db = createAdminClient();
  const { error } = await db.auth.admin.updateUserById(userId, { password });
  if (error) throw new UserFacingError(`Não foi possível trocar a senha: ${error.message}`, "auth");
  await auditLog(db, { actorId: admin.id, userId, action: "admin.password_reset", entity: "auth.users", entityId: userId, meta: { email: user.email ?? null, generated: !typed } });
  return { password };
}

/** Números do topo da página de alunos. */
export function studentSummary(students: readonly StudentRow[], now: number = Date.now()) {
  return {
    total: students.length,
    pagos: students.filter((s) => s.state === "ativo").length,
    gratuitos: students.filter((s) => s.state === "gratuito").length,
    expirados: students.filter((s) => s.state === "expirado" || s.state === "cancelado").length,
    vencendo: students.filter((s) => s.state === "ativo" && s.periodEnd && new Date(s.periodEnd).getTime() - now <= 7 * 86_400_000).length,
  };
}
