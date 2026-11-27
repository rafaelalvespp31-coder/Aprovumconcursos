/**
 * Reconhecimento de escrita à mão do quadro branco (sem IA, no aparelho): compara os traços do aluno com modelos
 * (algoritmo $P de nuvem de pontos, que ignora a ordem e a direção dos traços) e decide o que "limpar".
 */
import { MODELOS, type Ponto, type Traco } from "./quadro-modelos";
export type { Ponto, Traco };

const N = 32;
type P = { x: number; y: number; id: number };

const dist = (a: Ponto, b: Ponto) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const compr = (t: Traco) => { let s = 0; for (let i = 1; i < t.length; i++) s += dist(t[i - 1]!, t[i]!); return s; };

/** Caixa que envolve todos os traços. */
export function caixa(tracos: Traco[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const t of tracos) for (const p of t) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** Reamostra a nuvem em N pontos igualmente espaçados (o pulo entre traços não conta no comprimento). */
function nuvem(tracos: Traco[]): P[] {
  const total = tracos.reduce((s, t) => s + compr(t), 0);
  if (total === 0) { const p = tracos[0]?.[0] ?? [0, 0]; return Array.from({ length: N }, () => ({ x: p[0], y: p[1], id: 0 })); }
  const passo = total / (N - 1);
  const out: P[] = [];
  let D = 0;
  tracos.forEach((t, id) => {
    if (t.length === 0) return;
    out.push({ x: t[0]![0], y: t[0]![1], id });
    const pts = t.map((p) => ({ x: p[0], y: p[1] }));
    for (let i = 1; i < pts.length; i++) {
      let a = pts[i - 1]!; const b = pts[i]!;
      let d = Math.hypot(b.x - a.x, b.y - a.y);
      while (d > 0 && D + d >= passo) {
        const f = (passo - D) / d;
        const q = { x: a.x + f * (b.x - a.x), y: a.y + f * (b.y - a.y) };
        out.push({ x: q.x, y: q.y, id });
        a = q; d = Math.hypot(b.x - a.x, b.y - a.y); D = 0;
      }
      D += d;
    }
  });
  while (out.length < N) out.push({ ...out[out.length - 1]! });
  return out.slice(0, N);
}

/** Escala (lado maior = 1) e centraliza no centro de massa. */
function normaliza(pts: P[]): P[] {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); }
  const s = Math.max(x1 - x0, y1 - y0) || 1;
  const q = pts.map((p) => ({ x: (p.x - x0) / s, y: (p.y - y0) / s, id: p.id }));
  const cx = q.reduce((a, p) => a + p.x, 0) / q.length, cy = q.reduce((a, p) => a + p.y, 0) / q.length;
  return q.map((p) => ({ x: p.x - cx, y: p.y - cy, id: p.id }));
}

function distNuvem(a: P[], b: P[], inicio: number): number {
  const n = a.length;
  const usado = new Array<boolean>(n).fill(false);
  let soma = 0, i = inicio, w = n;
  do {
    let melhor = Infinity, j2 = -1;
    for (let j = 0; j < n; j++) {
      if (usado[j]) continue;
      const d = Math.hypot(a[i]!.x - b[j]!.x, a[i]!.y - b[j]!.y);
      if (d < melhor) { melhor = d; j2 = j; }
    }
    usado[j2] = true;
    soma += ((w--) / n) * melhor; // pesos decrescentes: os primeiros casamentos valem mais
    i = (i + 1) % n;
  } while (i !== inicio);
  return soma;
}

function cloudDist(a: P[], b: P[]): number {
  const passo = Math.floor(Math.pow(a.length, 0.5));
  let m = Infinity;
  for (let i = 0; i < a.length; i += passo) m = Math.min(m, distNuvem(a, b, i), distNuvem(b, a, i));
  return m;
}

interface Modelo { ch: string; tracos: number; pts: P[] }
let cache: Modelo[] | null = null;
function modelos(): Modelo[] {
  if (cache) return cache;
  cache = [];
  for (const [ch, vars] of Object.entries(MODELOS)) for (const t of vars) cache.push({ ch, tracos: t.length, pts: normaliza(nuvem(t)) });
  return cache;
}

export interface Palpite { ch: string; dist: number }
/** Melhores palpites (um por caractere), do mais para o menos parecido. Menor distância = mais parecido. */
export function reconhecer(tracos: Traco[], quantos = 3, vies: (ch: string) => number = (ch) => (/[0-9]/.test(ch) ? -0.25 : 0)): Palpite[] {
  const limpos = tracos.filter((t) => t.length > 0).map((t) => alisar(densificar(t, 3), 4)); // tira o tremor antes de comparar
  if (!limpos.length) return [];
  const c = normaliza(nuvem(limpos));
  const nt = limpos.length;
  const melhor = new Map<string, number>();
  for (const m of modelos()) {
    // o assunto da aula pesa na escolha (ex.: em contas, algarismo é mais provável que a letra parecida: 0/o, 2/z, 6/b)
    const d = cloudDist(c, m.pts) + 0.03 * Math.abs(nt - m.tracos) + vies(m.ch);
    if (d < (melhor.get(m.ch) ?? Infinity)) melhor.set(m.ch, d);
  }
  return [...melhor.entries()].map(([ch, dist]) => ({ ch, dist })).sort((a, b) => a.dist - b.dist).slice(0, quantos);
}

/** Distância máxima para aceitar o palpite (acima disso o traço é só alisado). Calibrada com escrita tremida simulada e rabiscos. */
export const LIMITE = 1.45;
/** Diferença mínima entre o 1º e o 2º palpite para não ficar em dúvida. */
export const FOLGA = 0.0;
/** Razão mínima entre o 2º e o 1º palpite (acima de MUITO_BOM aceita sem exigir folga). */
export const RAZAO = 1.1;
export const MUITO_BOM = 0.9;

/** Quão reta é a linha (1 = perfeitamente reta). */
export function retidao(t: Traco): number {
  if (t.length < 2) return 1;
  const l = compr(t);
  return l === 0 ? 1 : dist(t[0]!, t[t.length - 1]!) / l;
}

/** Alisa um traço tremido (média móvel + simplificação leve), mantendo as pontas. */
export function alisar(t: Traco, janela = 2): Traco {
  if (t.length < 4) return t;
  const out: Traco = [t[0]!];
  for (let i = 1; i < t.length - 1; i++) {
    let sx = 0, sy = 0, n = 0;
    for (let k = -janela; k <= janela; k++) { const p = t[Math.min(t.length - 1, Math.max(0, i + k))]!; sx += p[0]; sy += p[1]; n++; }
    out.push([sx / n, sy / n]);
  }
  out.push(t[t.length - 1]!);
  return out;
}

/** Pontos equidistantes (passo em pixels) sobre um traço — usado para poder apagar só um pedaço. */
export function densificar(t: Traco, passo = 4): Traco {
  const out: Traco = [];
  if (!t.length) return out;
  out.push(t[0]!);
  for (let i = 1; i < t.length; i++) {
    const a = t[i - 1]!, b = t[i]!;
    const d = dist(a, b);
    const n = Math.max(1, Math.ceil(d / passo));
    for (let k = 1; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]);
  }
  return out;
}
