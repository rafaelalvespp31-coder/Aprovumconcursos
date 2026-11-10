/**
 * Planos do APROVUM: o gratuito tem limites diários; os pagos (Pro e Premium) são ilimitados.
 * Puro: decide o plano em vigor e se uma ação ainda cabe no dia (fuso de Brasília).
 */

export const FREE_LIMITS = {
  /** Aulas diferentes por dia (abrir ou responder as questões de uma aula conta como estudar aquela aula). */
  lessonsPerDay: 1,
  /** Questões respondidas por dia no banco de questões e nos cadernos. */
  questionsPerDay: 5,
  /** Questões respondidas por dia no Modo Jogo. */
  gameQuestionsPerDay: 5,
  /** Redações enviadas para correção por IA por dia (plano pago e degustação seguem o limite geral da redação). */
  redacoesPerDay: 1,
} as const;

export const PLAN_IDS = ["free", "pro", "premium"] as const;
export type PlanId = (typeof PLAN_IDS)[number];
export const PLAN_LABELS: Record<PlanId, string> = { free: "Gratuito", pro: "Pro", premium: "Premium" };

export const BILLING_PERIODS = ["mensal", "semestral", "anual"] as const;
export type BillingPeriod = (typeof BILLING_PERIODS)[number];
export const PERIOD_MONTHS: Record<BillingPeriod, number> = { mensal: 1, semestral: 6, anual: 12 };
export const PERIOD_LABELS: Record<BillingPeriod, string> = { mensal: "Mensal", semestral: "Semestral", anual: "Anual" };

export interface SubscriptionRow {
  planId: string;
  status: string;
  /** Fim do período pago (null = sem data de vencimento). */
  currentPeriodEnd: string | null;
}

export type PlanState = "gratuito" | "ativo" | "expirado" | "cancelado";

/** Plano em vigor agora: pago vencido ou cancelado volta a valer como gratuito. */
export function effectivePlan(sub: SubscriptionRow | null, now: Date = new Date()): { planId: PlanId; paid: boolean; state: PlanState } {
  if (!sub || sub.planId === "free" || !(PLAN_IDS as readonly string[]).includes(sub.planId)) return { planId: "free", paid: false, state: "gratuito" };
  if (sub.status === "canceled") return { planId: "free", paid: false, state: "cancelado" };
  if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd).getTime() <= now.getTime()) return { planId: "free", paid: false, state: "expirado" };
  return { planId: sub.planId as PlanId, paid: true, state: "ativo" };
}

/** Novo vencimento ao marcar como pago: soma o período ao vencimento atual (se ainda vigente) ou a partir de hoje. */
export function nextPeriodEnd(currentEnd: string | null, period: BillingPeriod, now: Date = new Date()): Date {
  const base = currentEnd && new Date(currentEnd).getTime() > now.getTime() ? new Date(currentEnd) : now;
  const d = new Date(base);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + PERIOD_MONTHS[period]);
  // 31/jan + 1 mês = último dia de fevereiro (não 3 de março).
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

/** Dia corrente em Brasília (AAAA-MM-DD) e o instante em que ele começou. */
export function brDay(now: Date = new Date()): { day: string; start: string } {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return { day, start: new Date(`${day}T00:00:00-03:00`).toISOString() };
}

export type QuotaKind = "aula" | "questoes" | "jogo";

export function quotaFor(kind: QuotaKind): number {
  return kind === "aula" ? FREE_LIMITS.lessonsPerDay : kind === "questoes" ? FREE_LIMITS.questionsPerDay : FREE_LIMITS.gameQuestionsPerDay;
}

/** Mensagem quando o limite do dia acaba. */
export function limitMessage(kind: QuotaKind): string {
  if (kind === "aula") return `O plano gratuito libera ${FREE_LIMITS.lessonsPerDay} aula por dia e você já estudou a de hoje. Volte amanhã ou assine um plano para estudar sem limites.`;
  if (kind === "questoes") return `Você respondeu as ${FREE_LIMITS.questionsPerDay} questões de hoje do plano gratuito. Volte amanhã ou assine um plano para resolver sem limites.`;
  return `O Modo Jogo do plano gratuito libera ${FREE_LIMITS.gameQuestionsPerDay} questões por dia e as de hoje acabaram. Volte amanhã ou assine um plano para jogar sem limites.`;
}

/** Correções de redação por dia: o gratuito tem o limite do plano; pago/degustação, o limite geral; admin não tem. */
export function redacaoDailyLimit(plan: { unlimited: boolean }, generalLimit: number): number {
  return plan.unlimited ? generalLimit : FREE_LIMITS.redacoesPerDay;
}

export function redacaoLimitMessage(limit: number, free: boolean): string {
  return free
    ? `O plano gratuito libera ${limit} redação por dia e a de hoje já foi enviada. Volte amanhã ou assine um plano para corrigir mais redações.`
    : `Você atingiu o limite de ${limit} correções por dia. Volte amanhã ou reescreva depois.`;
}

/** Usos de IA da redação por dia (além da correção): gratuito x pago/degustação. Ajuste aqui. */
export const REDACAO_IA_DIARIO = {
  "redacao.tema": { free: 1, pago: 10, label: "gerar propostas de tema" },
  "redacao.exercicio": { free: 1, pago: 10, label: "gerar exercícios" },
  "redacao.exercicio_correcao": { free: 1, pago: 10, label: "corrigir exercícios" },
  "redacao.comparacao": { free: 1, pago: 10, label: "comparar versões" },
  "redacao.chat": { free: 10, pago: 60, label: "conversar com o professor" },
} as const;
export type RedacaoIaKind = keyof typeof REDACAO_IA_DIARIO;

export function redacaoIaLimit(kind: RedacaoIaKind, plan: { unlimited: boolean }): number {
  return plan.unlimited ? REDACAO_IA_DIARIO[kind].pago : REDACAO_IA_DIARIO[kind].free;
}

export function redacaoIaMessage(kind: RedacaoIaKind, limit: number, free: boolean): string {
  const o = REDACAO_IA_DIARIO[kind].label;
  return free
    ? `O plano gratuito libera ${limit} uso${limit > 1 ? "s" : ""} por dia para ${o} e o de hoje acabou. Volte amanhã ou assine um plano para usar mais.`
    : `Você atingiu o limite de ${limit} usos por dia para ${o}. Volte amanhã.`;
}
