/**
 * Esqueletos de conta da lousa: a conta já vem montada (como se fosse feita à mão) e o aluno só preenche as casas
 * tocando nos números. Hoje: MMC (fatoração em dispositivo) e multiplicação armada.
 */
import { CORES, glifoEm, sinalNormalizado, ehSinalVetor, type Cor, type Item, type ItemGlifo, type Medidor } from "./quadro-motor";

export type TipoEsqueleto = "mmc" | "mult";

export interface Casa {
  id: number;
  x0: number; x1: number; y0: number; y1: number; // caixa
  base: number; // linha de base dos algarismos
  slots: number; // quantos caracteres cabem
  cw: number; // largura de cada um
  esperado: string;
  alinha: "dir" | "esq";
}
export interface Esqueleto {
  tipo: TipoEsqueleto;
  nums: number[];
  titulo: string;
  size: number;
  fixos: Item[];
  casas: Casa[];
  /** Resposta final em texto (ex.: "MMC = 36"). */
  resposta: string;
}

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const mmcDe = (nums: number[]): number => nums.reduce((a, b) => (a * b) / gcd(a, b), 1);
const menorPrimoQueDivide = (nums: number[]): number => {
  for (let p = 2; p <= 97; p++) if (nums.some((n) => n > 1 && n % p === 0)) return p;
  return 0;
};

/** Passos da fatoração simultânea: cada linha mostra os números e o primo usado para dividir. */
export function passosMmc(nums: number[]): { linhas: number[][]; primos: number[] } {
  const linhas: number[][] = [nums.slice()];
  const primos: number[] = [];
  let atual = nums.slice();
  for (let guarda = 0; guarda < 30 && atual.some((n) => n > 1); guarda++) {
    const p = menorPrimoQueDivide(atual);
    if (!p) break;
    primos.push(p);
    atual = atual.map((n) => (n > 1 && n % p === 0 ? n / p : n));
    linhas.push(atual.slice());
  }
  return { linhas, primos };
}

/** Exercício automático, no nível de prova (números pequenos e com fatores em comum). */
export function exercicioAleatorio(tipo: TipoEsqueleto, rnd: () => number = Math.random): number[] {
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
  if (tipo === "mmc") {
    const base = pick([[12, 18], [8, 12], [15, 20], [6, 8, 9], [12, 15, 20], [10, 25], [9, 12, 18], [14, 21], [16, 24], [6, 10, 15]]);
    return base;
  }
  return [pick([23, 47, 58, 126, 214, 305, 138, 412]), pick([12, 24, 35, 46, 57, 63])];
}

const COR: Cor = "preto";

/** Linha reta com um leve balanço, para parecer feita a mão. */
function linhaManual(x0: number, y0: number, x1: number, y1: number, seed: number): Item {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 10));
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const q = Math.sin((i + seed) * 1.7) * 0.7;
    return [x0 + (x1 - x0) * t + (x1 === x0 ? q : 0), y0 + (y1 - y0) * t + (y1 === y0 ? q : 0)] as [number, number];
  });
  return { t: "tr", cor: COR, w: 3, segs: [pts] };
}

function escrever(texto: string, x0: number, base: number, cw: number, size: number, med: Medidor, cor: Cor = COR): Item[] {
  const out: Item[] = [];
  [...texto].forEach((ch, i) => {
    const cx = x0 + (i + 0.5) * cw;
    if (ehSinalVetor(ch)) out.push(...sinalNormalizado(ch, cx, base - med("0").asc * size * 0.5, med("0").asc * size, cor));
    else out.push(glifoEm(ch, cx, base, size, cor, med));
  });
  return out;
}

const digitos = (n: number) => String(n).length;

/** Monta o esqueleto no tamanho certo para a largura da lousa. */
export function montarEsqueleto(tipo: TipoEsqueleto, nums: number[], larg: number, med: Medidor, alt = 100000): Esqueleto {
  const m0 = med("0");
  const casas: Casa[] = [];
  const fixos: Item[] = [];
  let id = 0;
  const mk = (x0: number, base: number, slots: number, cw: number, size: number, esperado: string, alinha: "dir" | "esq"): Casa => ({
    id: id++, x0, x1: x0 + slots * cw, y0: base - m0.asc * size - 8, y1: base + 10, base, slots, cw, esperado, alinha,
  });

  if (tipo === "mmc") {
    const { linhas, primos } = passosMmc(nums);
    const d = Math.max(...nums.map(digitos));
    // largura em "células": números e vírgulas + barra + coluna dos primos
    const celulas = nums.length * d + (nums.length - 1) * 1.1 + 1.2 + 2.6;
    const tamLarg = Math.floor((larg - 48) / (celulas * m0.w * 1.15));
    const tamAlt = Math.floor((alt - 36) / (1.3 + (linhas.length - 1 + 1.6) * 1.55));
    const size = Math.max(18, Math.min(44, tamLarg, tamAlt));
    const cw = m0.w * size * 1.15;
    const total = celulas * cw;
    const ox = Math.max(16, (larg - total) / 2);
    const top = size * 1.3, lh = size * 1.55;
    let x = ox;
    const xs: number[] = [];
    nums.forEach((n, k) => {
      xs.push(x);
      fixos.push(...escrever(String(n).padStart(d, " ").trim().padStart(d, " "), x, top, cw, size, med).filter((i) => !(i.t === "gl" && i.ch === " ")));
      x += d * cw;
      if (k < nums.length - 1) { fixos.push(...escrever(",", x, top, cw * 1.1, size, med)); x += cw * 1.1; }
    });
    const xBarra = x + cw * 0.5;
    const xPrimo = xBarra + cw * 0.7;
    const ultima = linhas.length - 1;
    fixos.push(linhaManual(xBarra, top - m0.asc * size - 6, xBarra, top + ultima * lh + 10, 1));
    // ordem de preenchimento: primo da linha, depois a linha seguinte (como se resolve no papel)
    for (let i = 1; i < linhas.length; i++) {
      const base = top + i * lh;
      casas.push(mk(xPrimo, top + (i - 1) * lh, 2, cw, size, String(primos[i - 1]), "esq"));
      linhas[i]!.forEach((v, k) => {
        casas.push(mk(xs[k]!, base, d, cw, size, String(v), "dir"));
        if (k < nums.length - 1) fixos.push(...escrever(",", xs[k]! + d * cw, base, cw * 1.1, size, med));
      });
    }
    const yRes = top + (ultima + 1.35) * lh;
    const rotulo = "MMC =";
    fixos.push(...escrever(rotulo, ox, yRes, cw, size, med).map((it) => it));
    const r = mmcDe(nums);
    casas.push(mk(ox + (rotulo.length + 0.6) * cw, yRes, 4, cw, size, String(r), "esq"));
    return { tipo, nums, titulo: `MMC (${nums.join(", ")})`, size, fixos, casas, resposta: `MMC = ${r}` };
  }

  // multiplicação armada
  const [a, b] = [nums[0]!, nums[1]!];
  const prod = a * b;
  const W = digitos(prod) + 1; // a coluna 0 fica livre para ×  e +
  const linhasMult = 2 + (String(b).length > 1 ? String(b).length : 0) + 1;
  const tamAlt = Math.floor((alt - 36) / (1.3 + linhasMult * 1.6));
  const size = Math.max(18, Math.min(46, Math.floor((larg - 48) / (W * m0.w * 1.2)), tamAlt));
  const cw = m0.w * size * 1.2;
  const ox = Math.max(16, (larg - W * cw) / 2);
  const top = size * 1.3, lh = size * 1.6;
  const col = (j: number) => ox + j * cw;
  const bDig = String(b);
  fixos.push(...escrever(String(a), col(W - digitos(a)), top, cw, size, med));
  fixos.push(...escrever("×", col(0), top + lh, cw, size, med));
  fixos.push(...escrever(bDig, col(W - bDig.length), top + lh, cw, size, med));
  let y = top + lh;
  fixos.push(linhaManual(ox - 6, y + 12, ox + W * cw + 6, y + 12, 2));
  if (bDig.length > 1) {
    [...bDig].reverse().forEach((ch, i) => {
      y += lh;
      const parcial = a * Number(ch);
      casas.push(mk(col(1), y, W - 1 - i, cw, size, String(parcial), "dir"));
      if (i === bDig.length - 1) fixos.push(...escrever("+", col(0), y, cw, size, med));
    });
    fixos.push(linhaManual(ox - 6, y + 12, ox + W * cw + 6, y + 12, 3));
  }
  y += lh;
  casas.push(mk(col(1), y, W - 1, cw, size, String(prod), "dir"));
  return { tipo, nums, titulo: `${a} × ${b}`, size, fixos, casas, resposta: `${a} × ${b} = ${prod}` };
}

/** Texto digitado numa casa (lido da esquerda para a direita). */
export function textoDaCasa(itens: Item[], c: Casa): string {
  return itens
    .filter((i): i is ItemGlifo => i.t === "gl" && i.cx >= c.x0 && i.cx <= c.x1 && i.base >= c.y0 && i.base <= c.y1 + 6)
    .sort((p, q) => p.cx - q.cx)
    .map((i) => i.ch)
    .join("");
}

/** Escreve (substitui) o texto de uma casa, alinhado como o aluno faria. */
export function colocarNaCasa(itens: Item[], c: Casa, texto: string, cor: Cor, med: Medidor, size: number): Item[] {
  const fora = itens.filter((i) => !(i.t === "gl" && i.cx >= c.x0 && i.cx <= c.x1 && i.base >= c.y0 && i.base <= c.y1 + 6));
  const ini = c.alinha === "dir" ? c.slots - texto.length : 0;
  const novos = [...texto].map((ch, i) => glifoEm(ch, c.x0 + (ini + i + 0.5) * c.cw, c.base, size, cor, med));
  return [...fora, ...novos];
}

/** true/false para cada casa: o que o aluno escreveu bate com o esperado? */
export function conferir(itens: Item[], e: Esqueleto): boolean[] {
  return e.casas.map((c) => textoDaCasa(itens, c) === c.esperado);
}

export { CORES };
