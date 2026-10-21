/**
 * Cadernos de questões e mapa anual de estudo — regras puras (sem banco, sem React).
 */

export const NOTEBOOK_TITLE_MAX = 80;

/** "dd/mm/aaaa" no fuso de Brasília. */
export function brDate(iso: string | Date): string {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Ordem de "Recentes": último uso (ou criação), mais novo primeiro. */
export function byRecent<T extends { lastOpenedAt: string | null; createdAt: string }>(a: T, b: T): number {
  return (b.lastOpenedAt ?? b.createdAt).localeCompare(a.lastOpenedAt ?? a.createdAt);
}

// ---------------------------------------------------------------------------
// Mapa anual ("Investida")
// ---------------------------------------------------------------------------

export type ActivityLevel = 0 | 1 | 2 | 3;
export const ACTIVITY_LABELS: Record<ActivityLevel, string> = { 0: "Sem estudo", 1: "Pouco", 2: "Moderado", 3: "Intenso" };

/**
 * Faixas fixas de respostas por dia (o aluno entende sem comparar com outros dias):
 * 0 = sem estudo · 1–9 = pouco · 10–29 = moderado · 30+ = intenso.
 */
export function activityLevel(answers: number): ActivityLevel {
  if (answers <= 0) return 0;
  if (answers < 10) return 1;
  if (answers < 30) return 2;
  return 3;
}

export interface DayCell {
  /** aaaa-mm-dd */
  date: string;
  answers: number;
  level: ActivityLevel;
  /** Dia futuro (ainda não aconteceu). */
  future: boolean;
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/**
 * Grade do ano em colunas por mês (como no design): cada mês é uma coluna de semanas
 * com até 7 linhas (dom → sáb). Devolve, por mês, as semanas com as células do mês.
 */
export function yearGrid(year: number, counts: ReadonlyMap<string, number>, today: string): DayCell[][][] {
  const months: DayCell[][][] = [];
  for (let m = 1; m <= 12; m++) {
    const weeks: DayCell[][] = [];
    let week: DayCell[] = [];
    const firstDow = new Date(Date.UTC(year, m - 1, 1)).getUTCDay();
    for (let i = 0; i < firstDow; i++) week.push({ date: "", answers: 0, level: 0, future: false });
    for (let d = 1; d <= daysInMonth(year, m); d++) {
      const date = iso(year, m, d);
      const answers = counts.get(date) ?? 0;
      week.push({ date, answers, level: activityLevel(answers), future: date > today });
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length) weeks.push(week);
    months.push(weeks);
  }
  return months;
}

export function yearSummary(counts: ReadonlyMap<string, number>, year: number) {
  let days = 0;
  let answers = 0;
  for (const [d, n] of counts) {
    if (!d.startsWith(`${year}-`) || n <= 0) continue;
    days++;
    answers += n;
  }
  return { days, answers };
}

/** Data de hoje (aaaa-mm-dd) no fuso de Brasília. */
export function todayBr(now = new Date()): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  return p;
}
