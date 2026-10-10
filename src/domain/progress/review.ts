/**
 * Revisão inteligente (seção 12).
 * Intervalos configuráveis, com fator de facilidade inspirado em repetição espaçada.
 * A prioridade é sempre acompanhada dos motivos — nunca uma "previsão" opaca.
 */

export interface ReviewConfig {
  /** Intervalos em dias para cada etapa de sucesso consecutivo. */
  intervalsDays: number[];
  /** Ajuste máximo (para mais ou para menos) causado pelo fator de facilidade. */
  minEase: number;
  maxEase: number;
}

export const DEFAULT_REVIEW_CONFIG: ReviewConfig = {
  intervalsDays: [1, 3, 7, 15, 30, 60],
  minEase: 1.3,
  maxEase: 2.6,
};

export interface ReviewState {
  step: number;
  ease: number;
  lapses: number;
  attempts: number;
  lastReviewedAt: Date | null;
  dueAt: Date;
}

export function initialReviewState(now: Date, config = DEFAULT_REVIEW_CONFIG): ReviewState {
  return {
    step: 0,
    ease: 2.0,
    lapses: 0,
    attempts: 0,
    lastReviewedAt: null,
    dueAt: addDays(now, config.intervalsDays[0] ?? 1),
  };
}

/**
 * @param accuracy acerto na sessão (0–1)
 * @param perceivedDifficulty 1 (fácil) … 5 (muito difícil), informado pelo aluno, opcional
 */
export function scheduleNext(
  state: ReviewState,
  accuracy: number,
  now: Date,
  perceivedDifficulty: number | null = null,
  config = DEFAULT_REVIEW_CONFIG,
): ReviewState {
  const success = accuracy >= 0.7;
  const diff = perceivedDifficulty ?? 3;
  let ease = state.ease + (success ? 0.1 : -0.3) - (diff - 3) * 0.08;
  ease = clamp(ease, config.minEase, config.maxEase);

  const step = success ? Math.min(state.step + 1, config.intervalsDays.length - 1) : 0;
  const base = config.intervalsDays[step] ?? 1;
  const days = success ? Math.max(1, Math.round(base * (ease / 2))) : base;

  return {
    step,
    ease,
    lapses: state.lapses + (success ? 0 : 1),
    attempts: state.attempts + 1,
    lastReviewedAt: now,
    dueAt: addDays(now, days),
  };
}

export interface ReviewCandidate {
  unitId: string;
  title: string;
  review: ReviewState;
  /** Erros recentes em questões da unidade. */
  recentErrors: number;
  /** Importância relativa do tópico (0–1), quando conhecida. */
  importance: number | null;
}

export interface ReviewRecommendation {
  unitId: string;
  title: string;
  priority: number;
  due: boolean;
  reasons: string[];
}

export function prioritizeReviews(items: ReviewCandidate[], now: Date): ReviewRecommendation[] {
  return items
    .map((it) => {
      const reasons: string[] = [];
      const overdueDays = (now.getTime() - it.review.dueAt.getTime()) / DAY;
      const due = overdueDays >= 0;
      let priority = 0;
      if (due) {
        priority += 30 + Math.min(overdueDays, 30) * 2;
        reasons.push(
          overdueDays >= 1
            ? `Revisão atrasada há ${Math.floor(overdueDays)} dia(s).`
            : "Revisão programada para hoje.",
        );
      }
      if (it.recentErrors > 0) {
        priority += Math.min(it.recentErrors, 10) * 5;
        reasons.push(`${it.recentErrors} erro(s) recente(s) neste assunto.`);
      }
      if (it.review.lapses > 0) {
        priority += Math.min(it.review.lapses, 5) * 4;
        reasons.push(`Esquecido em ${it.review.lapses} revisão(ões) anterior(es).`);
      }
      if (it.review.ease < 1.7) {
        priority += 8;
        reasons.push("Assunto que você tem achado difícil.");
      }
      if (it.importance !== null && it.importance >= 0.7) {
        priority += 10;
        reasons.push("Tópico de alta relevância no conteúdo informado.");
      }
      if (it.review.lastReviewedAt) {
        const since = (now.getTime() - it.review.lastReviewedAt.getTime()) / DAY;
        if (since > 30) {
          priority += 6;
          reasons.push(`Sem contato há ${Math.floor(since)} dias.`);
        }
      }
      return { unitId: it.unitId, title: it.title, priority: Math.round(priority), due, reasons };
    })
    .filter((r) => r.priority > 0)
    .sort((a, b) => b.priority - a.priority);
}

const DAY = 24 * 60 * 60 * 1000;

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY);
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
