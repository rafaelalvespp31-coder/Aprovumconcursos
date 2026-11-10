import "server-only";
import { createAdminClient } from "../supabase";
import { UserFacingError } from "./trails";
import { brDay, effectivePlan, limitMessage, quotaFor, type PlanId, type QuotaKind } from "@/domain/plans/limits";
import type { PromoGrant } from "@/domain/plans/promo";
import { getActivePromo } from "./promo";

export interface MyPlan {
  /** Plano ORIGINAL em vigor (o que o aluno tem/pagou); a degustação não muda isto. */
  planId: PlanId;
  paid: boolean;
  /** Sem limites do gratuito: plano pago em vigor, admin ou degustação promocional válida. */
  unlimited: boolean;
  /** Degustação premium vigente (validada agora, no servidor), se houver. */
  promo: PromoGrant | null;
}

/**
 * Sistema central de permissões: plano gravado + situação da assinatura + concessão promocional
 * válida. Lido pelo servidor, pelo id da sessão. Ao vencer a concessão, volta sozinho ao plano original.
 */
export async function getMyPlan(userId: string): Promise<MyPlan> {
  const db = createAdminClient();
  const [sub, admin, promo] = await Promise.all([
    db.from("subscriptions").select("plan_id, status, current_period_end").eq("user_id", userId).maybeSingle(),
    db.from("admin_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    getActivePromo(userId),
  ]);
  const eff = effectivePlan(sub.data ? { planId: sub.data.plan_id as string, status: sub.data.status as string, currentPeriodEnd: sub.data.current_period_end as string | null } : null);
  return { planId: eff.planId, paid: eff.paid, unlimited: eff.paid || !!admin.data || !!promo, promo };
}

async function usedToday(userId: string, kind: Exclude<QuotaKind, "aula">): Promise<number> {
  const { start } = brDay();
  const table = kind === "questoes" ? "bank_attempts" : "quiz_attempts";
  const { count, error } = await createAdminClient().from(table).select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", start);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

/** Barra a ação quando o limite diário do plano gratuito acabou (questões ou Modo Jogo). */
export async function assertQuota(userId: string, kind: "questoes" | "jogo"): Promise<void> {
  const plan = await getMyPlan(userId);
  if (plan.unlimited) return;
  if ((await usedToday(userId, kind)) >= quotaFor(kind)) throw new UserFacingError(limitMessage(kind), "plan_limit");
}

export type LessonGate = { ok: true } | { ok: false; today: { id: string; title: string } | null; message: string };

/**
 * Aula do dia no plano gratuito: a primeira aula usada no dia fica liberada (pode abrir e
 * responder quantas vezes quiser); outra aula diferente só no dia seguinte.
 */
export async function claimDailyLesson(userId: string, lessonId: string): Promise<LessonGate> {
  const plan = await getMyPlan(userId);
  if (plan.unlimited) return { ok: true };
  const db = createAdminClient();
  const { day } = brDay();
  const { data, error } = await db.from("daily_lesson_access").select("lesson_id").eq("user_id", userId).eq("day", day);
  if (error) throw new Error(error.message);
  const used = (data ?? []).map((r) => r.lesson_id as string);
  if (used.includes(lessonId)) return { ok: true };
  if (used.length >= quotaFor("aula")) {
    const { data: l } = await db.from("lessons").select("id, title").eq("id", used[0]!).maybeSingle();
    return { ok: false, today: l ? { id: l.id as string, title: l.title as string } : null, message: limitMessage("aula") };
  }
  const ins = await db.from("daily_lesson_access").insert({ user_id: userId, day, lesson_id: lessonId });
  if (ins.error && ins.error.code !== "23505") throw new Error(ins.error.message);
  return { ok: true };
}

/** O mesmo controle, para ações (lança o aviso em vez de devolver). */
export async function assertLesson(userId: string, lessonId: string): Promise<void> {
  const g = await claimDailyLesson(userId, lessonId);
  if (!g.ok) throw new UserFacingError(g.message, "plan_limit");
}

export interface PlanUsage {
  paid: boolean;
  unlimited: boolean;
  questionsLeft: number | null;
  gameLeft: number | null;
  /** Fim da degustação premium vigente (ISO), se houver. */
  promoUntil: string | null;
}

/** Quanto ainda resta hoje (para mostrar ao aluno do plano gratuito). */
export async function getPlanUsage(userId: string): Promise<PlanUsage> {
  const plan = await getMyPlan(userId);
  const promoUntil = plan.promo?.expiresAt ?? null;
  if (plan.unlimited) return { paid: plan.paid, unlimited: true, questionsLeft: null, gameLeft: null, promoUntil };
  const [q, g] = await Promise.all([usedToday(userId, "questoes"), usedToday(userId, "jogo")]);
  return { paid: false, unlimited: false, questionsLeft: Math.max(0, quotaFor("questoes") - q), gameLeft: Math.max(0, quotaFor("jogo") - g), promoUntil };
}
