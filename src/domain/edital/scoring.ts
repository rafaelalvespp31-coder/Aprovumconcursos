import { fold } from "./text";

/** Quanto uma disciplina vale na prova, como está escrito no edital (nunca estimado). */
export interface ScoringRaw {
  name: string;
  questions: number | null;
  /** Peso/valor de CADA questão. */
  weight: number | null;
  /** Pontuação total da disciplina, quando o edital a informa. */
  points: number | null;
  page: number | null;
}

export type Priority = "maxima" | "alta" | "moderada" | "complementar";
export type Basis = "questoes_x_peso" | "so_questoes" | "nao_disponivel";

export interface PriorityRow {
  name: string;
  questions: number | null;
  weight: number | null;
  /** Pontuação potencial = questões × peso (ou só as questões, quando o peso não consta). */
  points: number | null;
  /** Participação na pontuação total, em %. */
  pct: number | null;
  priority: Priority | null;
}
export interface Priorities {
  rows: PriorityRow[];
  basis: Basis;
  total: number | null;
  /** true quando a prioridade usa só as questões (peso ausente) ou nem existe. */
  estimated: boolean;
  note: string;
}

const NUM = /\d+(?:[.,]\d+)?/g;
const toNum = (s: string) => Number(s.replace(",", "."));

type Col = "questions" | "weight" | "points";
/** Ordem das colunas pelo cabeçalho da tabela ("Disciplina | Nº de questões | Peso | Pontos"). */
function columnsFrom(header: string): Col[] | null {
  const f = fold(header);
  const at: Array<[Col, number]> = [];
  for (const [col, re] of [["questions", /quest/], ["weight", /peso|valor/], ["points", /pontos?|total/]] as Array<[Col, RegExp]>) {
    const i = f.search(re);
    if (i >= 0) at.push([col, i]);
  }
  if (at.length === 1 && at[0]![0] === "questions") return ["questions"];
  if (at.length < 2) return null;
  return at.sort((a, b) => a[1] - b[1]).map((x) => x[0]);
}

const okQ = (n: number) => Number.isInteger(n) && n >= 1 && n <= 200;
const okW = (n: number) => n > 0 && n <= 20;

/**
 * Lê, no texto do edital, quantas questões e que peso cada disciplina tem. Só devolve o que está escrito:
 * frases ("10 questões", "peso 2") ou linhas de tabela ao lado do nome da disciplina.
 */
export function extractScoring(pages: readonly string[], disciplines: readonly string[]): ScoringRaw[] {
  const lines: Array<{ text: string; page: number }> = [];
  pages.forEach((p, i) => p.split("\n").forEach((l) => lines.push({ text: l.replace(/\s+/g, " ").trim(), page: i + 1 })));
  const out: ScoringRaw[] = [];
  for (const name of disciplines) {
    const key = fold(name);
    if (key.length < 4) continue;
    let best: ScoringRaw | null = null;
    for (let i = 0; i < lines.length && !(best?.questions && best.weight); i++) {
      const { text, page } = lines[i]!;
      if (!text || text.length > 220) continue;
      const f = fold(text);
      const at = f.indexOf(key);
      if (at < 0) continue;
      const rest = text.slice(Math.min(text.length, at + name.length)).replace(/^[\s|:;,.–—-]+/, "");
      // Item de conteúdo ("1.2 Direito Penal …") e título de seção não são linha de pontuação.
      const raw: ScoringRaw = { name, questions: null, weight: null, points: null, page };
      const q = rest.match(/(\d{1,3})\s*(?:\(\s*[a-zà-ú ]+\s*\)\s*)?quest(?:oes|ões|ao|ão)/i);
      const w = rest.match(/peso\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/i);
      if (q || w) {
        if (q && okQ(toNum(q[1]!))) raw.questions = toNum(q[1]!);
        if (w && okW(toNum(w[1]!))) raw.weight = toNum(w[1]!);
      } else {
        const nums = (rest.match(NUM) ?? []).map(toNum);
        if (nums.length < 1 || nums.length > 4) continue;
        let order: Col[] = ["questions", "weight", "points"];
        let header = false;
        for (let k = i - 1; k >= Math.max(0, i - 10); k--) {
          const cols = columnsFrom(lines[k]!.text);
          if (cols) {
            order = cols;
            header = true;
            break;
          }
        }
        // Um número só (sem peso) só vale com um cabeçalho de tabela que diga que é a coluna de questões.
        if (nums.length === 1 && !(header && order[0] === "questions")) continue;
        const pick = new Map<Col, number>();
        order.forEach((col, idx) => {
          if (nums[idx] !== undefined) pick.set(col, nums[idx]!);
        });
        const qn = pick.get("questions");
        const wn = pick.get("weight");
        const pn = pick.get("points");
        if (qn === undefined || !okQ(qn)) continue;
        raw.questions = qn;
        if (wn !== undefined && okW(wn)) raw.weight = wn;
        if (pn !== undefined && pn > 0) raw.points = pn;
        // Conferência: se o edital informa os três números, questões × peso tem de bater com o total.
        if (raw.weight && raw.points && Math.abs(raw.questions * raw.weight - raw.points) > 0.011) {
          raw.weight = raw.points / raw.questions <= 20 ? Math.round((raw.points / raw.questions) * 100) / 100 : null;
        }
      }
      if (raw.questions || raw.weight) best = !best || (!best.questions && raw.questions) ? raw : best;
    }
    if (best) out.push(best);
  }
  return out;
}

/**
 * Prioridade pela participação na pontuação: pontuação potencial = questões × peso.
 * Só questões (peso ausente): participação pelas questões, marcada como estimada. Sem dados: não classifica.
 * Faixas pela participação relativa à média das disciplinas (r = participação ÷ média):
 * máxima r ≥ 1,5 · alta r ≥ 1,0 · moderada r ≥ 0,6 · complementar abaixo disso.
 */
export function computePriorities(disciplines: readonly string[], raws: readonly ScoringRaw[]): Priorities {
  const by = new Map(raws.map((r) => [fold(r.name), r]));
  const withQ = disciplines.map((n) => by.get(fold(n))).filter((r): r is ScoringRaw => !!r && !!r.questions);
  if (withQ.length < 2) {
    return {
      rows: disciplines.map((name) => ({ name, questions: by.get(fold(name))?.questions ?? null, weight: by.get(fold(name))?.weight ?? null, points: null, pct: null, priority: null })),
      basis: "nao_disponivel",
      total: null,
      estimated: true,
      note: "O edital não informa a quantidade de questões (ou o peso) por disciplina. A prioridade quantitativa não está disponível; estude todo o conteúdo programático.",
    };
  }
  const full = withQ.every((r) => !!r.weight);
  const basis: Basis = full ? "questoes_x_peso" : "so_questoes";
  const pts = (r: ScoringRaw | undefined) => (!r || !r.questions ? null : full ? r.questions * r.weight! : r.questions);
  const total = disciplines.reduce((t, n) => t + (pts(by.get(fold(n))) ?? 0), 0);
  const covered = disciplines.filter((n) => pts(by.get(fold(n))) !== null).length;
  const mean = 100 / covered;
  const rows: PriorityRow[] = disciplines.map((name) => {
    const r = by.get(fold(name));
    const points = pts(r);
    if (points === null) return { name, questions: r?.questions ?? null, weight: r?.weight ?? null, points: null, pct: null, priority: null };
    const pct = Math.round((points / total) * 1000) / 10;
    const ratio = pct / mean;
    const priority: Priority = ratio >= 1.5 ? "maxima" : ratio >= 1 ? "alta" : ratio >= 0.6 ? "moderada" : "complementar";
    return { name, questions: r!.questions, weight: r!.weight, points, pct, priority };
  });
  return {
    rows,
    basis,
    total,
    estimated: !full,
    note: full
      ? "Pontuação potencial = questões × peso, como consta no edital. Disciplinas sem esses números no edital ficam sem classificação."
      : "O edital informa as questões, mas não os pesos de todas as disciplinas. A prioridade foi estimada só pela quantidade de questões e não é uma conta exata de pontos.",
  };
}
