/** Cálculos do painel do Raio-X (puros e testáveis). Só usam dados reais catalogados; nada é inventado. */

export interface CutoffLike { id: string; editionYear: number; position: string | null; modality: string; kind: string; score: number; maxScore: number | null }
export interface SeriesPoint { year: number; value: number; score: number; maxScore: number | null; id: string }
export interface CutoffSeries { kind: string; position: string | null; unit: "%" | "pts"; points: SeriesPoint[] }

/**
 * Série comparável: entre as notas filtradas, usa o par (tipo, cargo) mais frequente (empate: o mais recente) e um ponto por ano.
 * Tipos diferentes de nota de corte não são equivalentes, por isso nunca são misturados na mesma linha.
 */
export function cutoffSeries(all: CutoffLike[], modality: string): CutoffSeries | null {
  const list = all.filter((c) => (modality === "todas" || c.modality === modality) && c.editionYear > 0);
  if (!list.length) return null;
  const groups = new Map<string, CutoffLike[]>();
  for (const c of list) groups.set(`${c.kind}|${c.position ?? ""}`, [...(groups.get(`${c.kind}|${c.position ?? ""}`) ?? []), c]);
  const best = [...groups.values()].sort((a, b) => b.length - a.length || Math.max(...b.map((x) => x.editionYear)) - Math.max(...a.map((x) => x.editionYear)))[0]!;
  const byYear = new Map<number, CutoffLike>();
  for (const c of best) if (!byYear.has(c.editionYear)) byYear.set(c.editionYear, c);
  const rows = [...byYear.values()].sort((a, b) => a.editionYear - b.editionYear);
  const pct = rows.every((r) => r.maxScore && r.maxScore > 0);
  return {
    kind: best[0]!.kind, position: best[0]!.position, unit: pct ? "%" : "pts",
    points: rows.map((r) => ({ year: r.editionYear, value: pct ? (r.score / r.maxScore!) * 100 : r.score, score: r.score, maxScore: r.maxScore, id: r.id })),
  };
}

export interface Projection { value: number; year: number; confidence: "baixa" | "media" | "alta"; r2: number }

/** Tendência linear (mínimos quadrados) sobre os anos da série. Exige 3+ edições em anos distintos; é estimativa, nunca resultado. */
export function projectNext(points: SeriesPoint[], cap?: number): Projection | null {
  const n = points.length;
  if (n < 3) return null;
  const mx = points.reduce((s, p) => s + p.year, 0) / n;
  const my = points.reduce((s, p) => s + p.value, 0) / n;
  const sxx = points.reduce((s, p) => s + (p.year - mx) ** 2, 0);
  if (sxx === 0) return null;
  const slope = points.reduce((s, p) => s + (p.year - mx) * (p.value - my), 0) / sxx;
  const icpt = my - slope * mx;
  const ssTot = points.reduce((s, p) => s + (p.value - my) ** 2, 0);
  const ssRes = points.reduce((s, p) => s + (p.value - (icpt + slope * p.year)) ** 2, 0);
  const r2 = ssTot === 0 ? 1 : Math.max(0, 1 - ssRes / ssTot);
  const last = points[n - 1]!.year;
  const step = Math.max(1, Math.round((last - points[0]!.year) / (n - 1)));
  const year = last + step;
  let value = icpt + slope * year;
  if (cap !== undefined) value = Math.min(value, cap);
  const confidence = n >= 5 && r2 >= 0.7 ? "alta" : n >= 4 && r2 >= 0.5 ? "media" : "baixa";
  return { value: Math.max(0, value), year, confidence, r2 };
}

export interface IncRow { name: string; questions: number; pct: number }
export interface IncEdition { year: number; board: string | null; denominator: number; rows: Array<{ name: string; questions: number }> }

/** "todas" soma as questões de cada disciplina em todas as provas catalogadas; senão, só a prova do ano. */
export function aggregateIncidence(eds: IncEdition[], year: number | "todas"): { total: number; rows: IncRow[] } {
  const use = year === "todas" ? eds : eds.filter((e) => e.year === year);
  const map = new Map<string, number>();
  for (const e of use) for (const r of e.rows) map.set(r.name, (map.get(r.name) ?? 0) + r.questions);
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  const rows = [...map].map(([name, questions]) => ({ name, questions, pct: total ? (questions / total) * 100 : 0 })).sort((a, b) => b.questions - a.questions || a.name.localeCompare(b.name));
  return { total, rows };
}

export function insightText(rows: IncRow[]): { name: string; pct: number } | null {
  const top = rows[0];
  return top && top.questions > 0 ? { name: top.name, pct: top.pct } : null;
}

/** Escala "bonita" para eixos. */
export function niceScale(lo: number, hi: number, count = 4): { min: number; max: number; ticks: number[] } {
  if (hi === lo) { hi = lo + 1; }
  const raw = (hi - lo) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10) * mag;
  const min = Math.floor(lo / step) * step;
  const max = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = min; v <= max + step / 1e6; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { min, max, ticks };
}
