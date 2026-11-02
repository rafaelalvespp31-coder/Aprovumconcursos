/** Agregações dos gráficos do APROVUM BUSINESS (a partir da série diária devolvida pelo banco). */
export interface DayPoint {
  dia: string;
  valor: number;
}

/** Soma por semana (segunda a domingo), rotulada pelo primeiro dia da semana. */
export function byWeek(days: readonly DayPoint[]): DayPoint[] {
  const out = new Map<string, number>();
  for (const d of days) {
    const dt = new Date(`${d.dia}T12:00:00Z`);
    const dow = (dt.getUTCDay() + 6) % 7;
    dt.setUTCDate(dt.getUTCDate() - dow);
    const k = dt.toISOString().slice(0, 10);
    out.set(k, (out.get(k) ?? 0) + d.valor);
  }
  return [...out].map(([dia, valor]) => ({ dia, valor }));
}

/** Soma por mês (AAAA-MM). */
export function byMonth(days: readonly DayPoint[]): DayPoint[] {
  const out = new Map<string, number>();
  for (const d of days)
    out.set(d.dia.slice(0, 7), (out.get(d.dia.slice(0, 7)) ?? 0) + d.valor);
  return [...out].map(([dia, valor]) => ({ dia, valor }));
}

/** Variação percentual entre dois períodos (null quando o anterior é zero). */
export function changePct(current: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export const PERIODS = [
  { key: "7", days: 7, label: "7 dias" },
  { key: "30", days: 30, label: "30 dias" },
  { key: "90", days: 90, label: "90 dias" },
  { key: "180", days: 180, label: "6 meses" },
  { key: "365", days: 365, label: "12 meses" },
] as const;

export function periodDays(raw: string | undefined): number {
  return PERIODS.find((p) => p.key === raw)?.days ?? 30;
}
