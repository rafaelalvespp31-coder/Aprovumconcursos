import type { PlanDay, StudyPlan } from "./plan";

export interface CalCell {
  /** AAAA-MM-DD */
  key: string;
  day: number;
  weekday: number;
  plan: PlanDay | null;
  isToday: boolean;
  isExam: boolean;
  isPast: boolean;
  /** Depois da prova não há mais estudo programado. */
  afterExam: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
export const keyOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

/** Dias de um mês (m: 0 a 11) com o plano de cada data, hoje, dia da prova e o que já passou. Puro e testável. */
export function monthCells(plan: StudyPlan, year: number, month: number, today: string, examDay: string | null): CalCell[] {
  const total = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells: CalCell[] = [];
  for (let d = 1; d <= total; d++) {
    const key = keyOf(year, month, d);
    const weekday = new Date(Date.UTC(year, month, d)).getUTCDay();
    const afterExam = examDay !== null && key > examDay;
    const isExam = examDay === key;
    const dp = plan.days.find((x) => x.weekday === weekday) ?? null;
    cells.push({ key, day: d, weekday, plan: afterExam || isExam || !dp || !dp.blocks.length ? null : dp, isToday: key === today, isExam, isPast: key < today, afterExam });
  }
  return cells;
}

/** Dia da prova (AAAA-MM-DD) a partir de "hoje" e dos dias que faltam. */
export function examDayFrom(today: string, daysToExam: number | null): string | null {
  if (daysToExam === null || daysToExam < 0) return null;
  const t = Date.parse(`${today}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  return new Date(t + daysToExam * 86_400_000).toISOString().slice(0, 10);
}

/** Um dia está concluído quando todos os blocos do dia foram marcados. */
export const diaConcluido = (plan: PlanDay | null, feitos: readonly number[]): boolean =>
  !!plan && plan.blocks.length > 0 && plan.blocks.every((_, i) => feitos.includes(i));

export const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"] as const;
