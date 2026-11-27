/**
 * Motor do quadro branco do aluno: transforma o que ele escreveu à mão (traços) em "letra de máquina" —
 * algarismos, letras e sinais viram caracteres limpos; traços retos ficam retos; círculos ficam redondos.
 * O que não for reconhecido continua como traço, só que alisado (nunca se perde o que o aluno fez).
 */
import { alisar, caixa, densificar, LIMITE, MUITO_BOM, RAZAO, reconhecer, retidao, type Palpite } from "./quadro-reconhecer";
import type { Ponto, Traco } from "./quadro-modelos";

export type Cor = "preto" | "azul" | "vermelho";
export const CORES: Record<Cor, string> = { preto: "#15151a", azul: "#1d4ed8", vermelho: "#dc2626" };

export interface ItemTraco { t: "tr"; cor: Cor; w: number; segs: Traco[]; /** Sinal que este desenho representa (+, =, ÷…), quando veio do reconhecimento. */ sim?: string }
export interface ItemGlifo { t: "gl"; cor: Cor; ch: string; cx: number; base: number; size: number; caixa: { x0: number; y0: number; x1: number; y1: number } }
export type Item = ItemTraco | ItemGlifo;

/** Medidas de um caractere por 1 de tamanho de fonte (subida/descida reais do desenho e largura). */
export type Medidor = (ch: string) => { asc: number; desc: number; w: number };

const ESPESSURA = 3.2;
const LINHA_LONGA = 90;
/** Caracteres desenhados em vetor (nítidos em qualquer tamanho); os demais saem em fonte de máquina de escrever. */
const VETOR = new Set(["-", "=", "+", "÷", "/", "(", ")", ".", ":", "<", ">", "√"]);
const ALTOS = /[0-9A-Zbdfhkt!?%]/;

const tr = (cor: Cor, ...segs: Traco[]): ItemTraco => ({ t: "tr", cor, w: ESPESSURA, segs: segs.map((s) => densificar(s, 4)) });
const comSim = (itens: Item[], ch: string): Item[] => itens.map((i) => (i.t === "tr" ? { ...i, sim: ch } : i));
const arco = (a: Ponto, b: Ponto, c: Ponto, n = 14): Traco => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, u = 1 - t; return [u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]] as Ponto; });
const ponto = (x: number, y: number, r: number): Traco => Array.from({ length: 9 }, (_, i) => [x + r * Math.cos((i / 8) * 2 * Math.PI), y + r * Math.sin((i / 8) * 2 * Math.PI)] as Ponto);

export function elipse(cx: number, cy: number, rx: number, ry: number): Traco {
  return Array.from({ length: 49 }, (_, i) => { const a = (i / 48) * 2 * Math.PI - Math.PI / 2; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)] as Ponto; });
}

function glifo(ch: string, b: ReturnType<typeof caixa>, cor: Cor, med: Medidor, vizinhos: Item[]): ItemGlifo {
  const m = med(ch);
  const alturaDesenho = m.asc + m.desc || 0.7;
  const h = Math.max(b.h, 18);
  let size = h / alturaDesenho;
  let base = b.y1 - m.desc * size;
  // alinha na linha do caractere vizinho (mesmo tamanho aproximado), como numa máquina de escrever
  if (ALTOS.test(ch)) {
    let viz: ItemGlifo | null = null;
    for (const v of vizinhos) {
      if (v.t !== "gl" || !ALTOS.test(v.ch)) continue;
      if (Math.abs(v.cx - b.cx) > v.size * 2.4 || Math.abs((v.base - v.size * 0.3) - b.cy) > v.size * 0.55) continue;
      if (!viz || Math.abs(v.cx - b.cx) < Math.abs(viz.cx - b.cx)) viz = v;
    }
    if (viz && Math.abs(viz.size / size - 1) < 0.4) { size = (size + viz.size) / 2; base = viz.base; }
  }
  const larg = m.w * size;
  return { t: "gl", cor, ch, cx: b.cx, base, size, caixa: { x0: b.cx - larg / 2, y0: base - m.asc * size, x1: b.cx + larg / 2, y1: base + m.desc * size } };
}

function vetor(ch: string, b: ReturnType<typeof caixa>, cor: Cor): Item[] {
  const { x0, y0, x1, y1, cx, cy, w, h } = b;
  const L = Math.max(w, h, 16);
  switch (ch) {
    case "-": return [tr(cor, [[cx - Math.max(w, 18) / 2, cy], [cx + Math.max(w, 18) / 2, cy]])];
    case "=": { const g = Math.max(h, 12) / 2; const lw = Math.max(w, 20) / 2; return [tr(cor, [[cx - lw, cy - g], [cx + lw, cy - g]], [[cx - lw, cy + g], [cx + lw, cy + g]])]; }
    case "+": { const r = L / 2; return [tr(cor, [[cx - r, cy], [cx + r, cy]], [[cx, cy - r], [cx, cy + r]])]; }
    case "÷": { const r = Math.max(w, 20) / 2; const g = Math.max(h, 18) / 2.2; return [tr(cor, [[cx - r, cy], [cx + r, cy]], ponto(cx, cy - g, 2.4), ponto(cx, cy + g, 2.4))]; }
    case "/": return [tr(cor, [[x1, y0], [x0, y1]])];
    case "(": return [tr(cor, arco([x1, y0], [x0 - h * 0.08, cy], [x1, y1]))];
    case ")": return [tr(cor, arco([x0, y0], [x1 + h * 0.08, cy], [x0, y1]))];
    case ".": return [tr(cor, ponto(cx, cy, Math.max(2.6, Math.min(5, L / 3))))];
    case ":": return [tr(cor, ponto(cx, y0 + 2.6, 2.6), ponto(cx, y1 - 2.6, 2.6))];
    case "<": return [tr(cor, [[x1, y0], [x0, cy], [x1, y1]])];
    case ">": return [tr(cor, [[x0, y0], [x1, cy], [x0, y1]])];
    case "√": return [tr(cor, [[x0, y0 + h * 0.55], [x0 + w * 0.1, y0 + h * 0.45], [x0 + w * 0.27, y1], [x0 + w * 0.6, y0], [x1, y0]])];
    default: return [];
  }
}

/** Caixa de um item do quadro. */
export function caixaItem(it: Item) {
  if (it.t === "gl") return { x0: it.caixa.x0, y0: it.caixa.y0, x1: it.caixa.x1, y1: it.caixa.y1 };
  const c = caixa(it.segs);
  return { x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1 };
}
const tamanhoItem = (it: Item) => { const c = caixaItem(it); return Math.max(c.x1 - c.x0, c.y1 - c.y0); };
/** Há, ao lado do traço, um caractere ou sinal de tamanho parecido (o que o torna parte de uma conta)? */
function temVizinho(b: { cx: number; cy: number; h: number }, itens: Item[]): boolean {
  return itens.some((v) => {
    if (!(v.t === "gl" || v.sim)) return false;
    const c = caixaItem(v), t = tamanhoItem(v);
    const vx = (c.x0 + c.x1) / 2, vy = (c.y0 + c.y1) / 2;
    return Math.abs(vx - b.cx) < Math.max(t, b.h) * 2.4 && Math.abs(vy - b.cy) < Math.max(t, b.h) * 0.7 && t > b.h * 0.45 && t < b.h * 2.4;
  });
}

/**
 * Depois de escrever um caractere, um traço vertical curto que estava ao lado dele (e foi deixado como linha por estar
 * sozinho) passa a ser o algarismo 1 — como em "1 + 2". Linhas compridas ou isoladas nunca mudam.
 */
export function promoverUns(itens: Item[], novos: Item[], med: Medidor): Item[] {
  const novosSet = new Set(novos);
  return itens.map((it) => {
    if (novosSet.has(it) || it.t !== "tr" || it.sim || it.segs.length !== 1) return it;
    const seg = it.segs[0]!;
    const b = caixa([seg]);
    if (b.w > 6 || b.h < 14 || b.h > 110) return it; // não é um traço vertical curto
    if (!temVizinho(b, itens.filter((x) => x !== it))) return it;
    return glifo("1", b, it.cor, med, itens.filter((x) => x !== it));
  });
}

export interface Resultado { itens: Item[]; palpites?: Palpite[]; reconhecido: boolean }

/** Interpreta o que o aluno acabou de escrever (um ou mais traços que formam um único "símbolo"). */
export function interpretar(tracos: Traco[], cor: Cor, med: Medidor, vizinhos: Item[] = []): Resultado {
  const limpos = tracos.filter((t) => t.length > 0);
  if (!limpos.length) return { itens: [], reconhecido: false };
  const b = caixa(limpos);
  const comp = (t: Traco) => { let s = 0; for (let i = 1; i < t.length; i++) s += Math.hypot(t[i]![0] - t[i - 1]![0], t[i]![1] - t[i - 1]![1]); return s; };

  if (limpos.length === 1) {
    const t = limpos[0]!;
    const len = comp(t);
    // ponto
    if (Math.max(b.w, b.h) < 9) return { itens: vetor(".", b, cor), reconhecido: true };
    const reta = retidao(t);
    if (reta > 0.9 && len >= 14) {
      const a = t[0]!, z = t[t.length - 1]!;
      const ang = Math.abs((Math.atan2(z[1] - a[1], z[0] - a[0]) * 180) / Math.PI);
      const horiz = ang < 14 || ang > 166, vert = ang > 76 && ang < 104;
      if (len >= LINHA_LONGA) {
        // traço longo: linha reta (na horizontal/vertical quando está quase)
        const p0: Ponto = [...a], p1: Ponto = [...z];
        if (horiz) { const y = (p0[1] + p1[1]) / 2; p0[1] = y; p1[1] = y; }
        else if (vert) { const x = (p0[0] + p1[0]) / 2; p0[0] = x; p1[0] = x; }
        return { itens: [tr(cor, [p0, p1])], reconhecido: true };
      }
      if (horiz) return { itens: comSim(vetor("-", b, cor), "-"), reconhecido: true };
      if (vert) {
        // traço vertical: é o algarismo 1 se estiver escrito junto de outros caracteres; sozinho, é uma linha reta
        if (temVizinho(b, vizinhos)) return { itens: [glifo("1", b, cor, med, vizinhos)], reconhecido: true };
        const x = (a[0] + z[0]) / 2;
        return { itens: [tr(cor, [[x, a[1]], [x, z[1]]])], reconhecido: true };
      }
      return { itens: comSim(vetor("/", b, cor), "/"), reconhecido: true };
    }
    // círculo/elipse grandes
    const fechada = Math.hypot(t[0]![0] - t[t.length - 1]![0], t[0]![1] - t[t.length - 1]![1]) < len * 0.22;
    if (fechada && b.w > 80 && b.h > 80 && len > 2 * (b.w + b.h) * 0.62 && b.w / b.h > 0.55 && b.w / b.h < 1.8) {
      const redonda = Math.abs(b.w / b.h - 1) < 0.2;
      const rr = redonda ? (b.w + b.h) / 4 : 0;
      return { itens: [tr(cor, redonda ? elipse(b.cx, b.cy, rr, rr) : elipse(b.cx, b.cy, b.w / 2, b.h / 2))], reconhecido: true };
    }
  }

  const palpites = reconhecer(limpos, 3);
  const [p1, p2] = palpites;
  if (p1 && (p1.dist < MUITO_BOM || (p1.dist < LIMITE && (!p2 || p2.dist / p1.dist >= RAZAO)))) {
    const itens = VETOR.has(p1.ch) ? comSim(vetor(p1.ch, b, cor), p1.ch) : [glifo(p1.ch, b, cor, med, vizinhos)];
    return { itens, palpites, reconhecido: true };
  }
  // não reconhecido: mantém o desenho, só que sem tremor
  return { itens: [{ t: "tr", cor, w: ESPESSURA, segs: limpos.map((s) => alisar(densificar(s, 4), 3)) }], palpites, reconhecido: false };
}

/** Apaga o que estiver sob a borracha (círculo): traços são cortados só no pedaço tocado; caracteres saem inteiros. */
export function apagar(itens: Item[], x: number, y: number, r: number): { itens: Item[]; mudou: boolean } {
  let mudou = false;
  const out: Item[] = [];
  for (const it of itens) {
    if (it.t === "gl") {
      const c = it.caixa;
      const dx = Math.max(c.x0 - x, 0, x - c.x1), dy = Math.max(c.y0 - y, 0, y - c.y1);
      if (Math.hypot(dx, dy) <= r) { mudou = true; continue; }
      out.push(it);
      continue;
    }
    const rr = r + it.w / 2;
    const novas: Traco[] = [];
    let tocou = false;
    for (const s of it.segs) {
      let atual: Traco = [];
      for (const p of s) {
        if (Math.hypot(p[0] - x, p[1] - y) <= rr) { tocou = true; if (atual.length > 1) novas.push(atual); atual = []; } else atual.push(p);
      }
      if (atual.length > 1) novas.push(atual);
    }
    if (!tocou) { out.push(it); continue; }
    mudou = true;
    if (novas.length) out.push({ ...it, segs: novas });
  }
  return { itens: out, mudou };
}

/**
 * O traço novo faz parte do mesmo símbolo que os traços já escritos (=, +, 4, x…)? Só junta se, com ele, o conjunto
 * passa a ser reconhecido com folga como UM caractere; dois algarismos lado a lado nunca passam nesse teste.
 */
export function mesmaForma(anteriores: Traco[], novo: Traco): boolean {
  const p = reconhecer([...anteriores, novo], 2);
  const [a, b] = p;
  if (!a) return false;
  const sozinho = reconhecer(anteriores, 1)[0];
  // se o conjunto não casa melhor do que o traço anterior sozinho (ou casa mal), são símbolos diferentes
  return a.dist < 1.05 && (!b || b.dist / a.dist >= 1.15) && (!sozinho || a.dist < sozinho.dist + 0.35 || anteriores.length === 1);
}
