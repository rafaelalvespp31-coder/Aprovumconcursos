import type { ItemDesenho } from "./lousa";

type Cor = "azul" | "vermelho" | "verde" | "grafite" | "laranja";
const tx = (x: number, y: number, s: string, cor: Cor, tam: number, d: number): ItemDesenho => ({ t: "texto", x: Math.max(0, Math.round(x)), y: Math.round(y), s: s.slice(0, 40), cor, tam, d }) as ItemDesenho;
const lin = (x1: number, y1: number, x2: number, y2: number, cor: Cor, d: number): ItemDesenho => ({ t: "linha", x1: Math.max(0, Math.round(x1)), y1: Math.round(y1), x2: Math.max(0, Math.round(x2)), y2: Math.round(y2), cor, d }) as ItemDesenho;

const COL = 22, TAM = 28, PEQ = 15;
export interface ContaDesenhada { it: ItemDesenho[]; h: number }
const dg = (n: number) => String(n).split("").map(Number);

/** Escreve um número alinhado à direita na coluna `fim` (índice de coluna, 0 = primeira). */
function numero(it: ItemDesenho[], x0: number, y: number, s: string, fim: number, cor: Cor, d: number, tam = TAM, passo = 0) {
  s.split("").forEach((c, i) => it.push(tx(x0 + (fim - s.length + 1 + i) * COL, y, c, cor, tam, d + i * passo)));
}

/** Adição armada com "vai um": unidade com unidade, dezena com dezena, da direita para a esquerda. */
function soma(a: number, b: number, x0: number, y0: number, d0: number): ContaDesenhada {
  const r = a + b, W = Math.max(String(a).length, String(b).length, String(r).length), fim = W - 1;
  const it: ItemDesenho[] = [], A = dg(a), B = dg(b);
  const yc = y0 + 16, ya = y0 + 50, yb = y0 + 88, yl = y0 + 98, yr = y0 + 136;
  numero(it, x0 + 26, ya, String(a), fim, "azul", d0);
  it.push(tx(x0, yb, "+", "vermelho", TAM, d0 + 0.1));
  numero(it, x0 + 26, yb, String(b), fim, "azul", d0 + 0.1);
  it.push(lin(x0, yl, x0 + 26 + W * COL + 4, yl, "grafite", d0 + 0.2));
  let vai = 0, d = d0 + 0.4;
  for (let k = 0; k < W; k++) {
    const col = fim - k, da = A[A.length - 1 - k] ?? 0, db = B[B.length - 1 - k] ?? 0, s = da + db + vai;
    const dig = s % 10;
    const ultimo = k === W - 1;
    it.push(tx(x0 + 26 + col * COL, yr, (ultimo && s >= 10 ? String(s) : String(dig)).slice(0, 2), "verde", TAM, d));
    vai = s >= 10 && !ultimo ? 1 : 0;
    if (vai) it.push(tx(x0 + 26 + (col - 1) * COL + 2, yc, "1", "laranja", PEQ + 3, d + 0.1));
    d += 0.5;
  }
  return { it, h: 150 };
}

/** Subtração armada com "empréstimo": a dezena vizinha empresta 10 (risca e escreve o novo valor). */
function subtracao(a: number, b: number, x0: number, y0: number, d0: number): ContaDesenhada | null {
  if (a < b) return null;
  const r = a - b, W = String(a).length, fim = W - 1, A = dg(a), B = dg(b);
  const it: ItemDesenho[] = [];
  const yc = y0 + 18, ya = y0 + 52, yb = y0 + 90, yl = y0 + 100, yr = y0 + 138;
  numero(it, x0 + 26, ya, String(a), fim, "azul", d0);
  it.push(tx(x0, yb, "−", "vermelho", TAM, d0 + 0.1));
  numero(it, x0 + 26, yb, String(b), fim, "azul", d0 + 0.1);
  it.push(lin(x0, yl, x0 + 26 + W * COL + 4, yl, "grafite", d0 + 0.2));
  const cur = [...A].reverse(); // unidade primeiro
  const riscado = new Set<number>();
  let d = d0 + 0.4;
  for (let k = 0; k < W; k++) {
    const db = B[B.length - 1 - k] ?? 0, col = fim - k;
    if (cur[k]! < db) {
      let j = k + 1;
      while (j < W && cur[j] === 0) j++;
      if (j >= W) return null;
      cur[j] = cur[j]! - 1;
      for (let m = j - 1; m > k; m--) cur[m] = 9;
      cur[k] = cur[k]! + 10;
      for (let m = j; m > k; m--) {
        const cm = fim - m, x = x0 + 26 + cm * COL;
        if (!riscado.has(m)) { riscado.add(m); it.push(lin(x - 1, ya - 22, x + 15, ya + 2, "vermelho", d)); }
        it.push(tx(x + 1, yc, String(cur[m]), "laranja", PEQ + 3, d + 0.1));
      }
      it.push(tx(x0 + 26 + col * COL - 12, ya - 14, "1", "laranja", PEQ, d + 0.2));
      d += 0.4;
    }
    const dig = cur[k]! - db;
    const ultimo = k === W - 1;
    if (!(ultimo && dig === 0 && W > 1 && String(r).length < W)) it.push(tx(x0 + 26 + col * COL, yr, String(dig), "verde", TAM, d));
    d += 0.5;
  }
  return { it, h: 152 };
}

/** Multiplicação armada: por um algarismo (com "vai") ou por vários (produtos parciais deslocados e soma final). */
function produto(a: number, b: number, x0: number, y0: number, d0: number): ContaDesenhada {
  const r = a * b, A = dg(a), B = dg(b), W = Math.max(String(r).length, String(a).length + 1), fim = W - 1;
  const it: ItemDesenho[] = [];
  const yc = y0 + 16, ya = y0 + 50, yb = y0 + 88, yl = y0 + 98;
  numero(it, x0 + 26, ya, String(a), fim, "azul", d0);
  it.push(tx(x0, yb, "×", "vermelho", TAM, d0 + 0.1));
  numero(it, x0 + 26, yb, String(b), fim, "azul", d0 + 0.1);
  it.push(lin(x0, yl, x0 + 26 + W * COL + 4, yl, "grafite", d0 + 0.2));
  let d = d0 + 0.4;
  if (B.length === 1) {
    let vai = 0;
    for (let k = 0; k < A.length; k++) {
      const p = A[A.length - 1 - k]! * b + vai, col = fim - k;
      const ultimo = k === A.length - 1;
      it.push(tx(x0 + 26 + col * COL - (ultimo && p >= 10 ? COL : 0), y0 + 136, ultimo ? String(p) : String(p % 10), "verde", TAM, d));
      vai = Math.floor(p / 10);
      if (vai && !ultimo) it.push(tx(x0 + 26 + (col - 1) * COL + 2, yc, String(vai), "laranja", PEQ + 3, d + 0.1));
      d += 0.5;
    }
    return { it, h: 150 };
  }
  let y = yl + 38;
  const parciais: number[] = [];
  for (let k = 0; k < B.length; k++) {
    const dk = B[B.length - 1 - k]!, p = a * dk;
    parciais.push(p * 10 ** k);
    numero(it, x0 + 26, y, String(p), fim - k, "azul", d, TAM, 0.15);
    for (let z = 0; z < k; z++) it.push(tx(x0 + 26 + (fim - z) * COL, y, "0", "laranja", TAM, d + 0.1));
    d += 0.7; y += 38;
  }
  it.push(lin(x0, y - 26, x0 + 26 + W * COL + 4, y - 26, "grafite", d));
  numero(it, x0 + 26, y + 12, String(r), fim, "verde", d + 0.2, TAM, 0.1);
  return { it, h: y + 30 - y0 };
}

/** Divisão com chave, passo a passo: quanto cabe, multiplica, subtrai, "baixa" o próximo algarismo; no fim, a prova real. */
function divisao(a: number, b: number, x0: number, y0: number, d0: number): ContaDesenhada | null {
  if (!b || a < b || String(a).length > 6) return null;
  const A = dg(a), n = A.length, xD = x0, xChave = xD + n * COL + 8;
  const it: ItemDesenho[] = [], yTop = y0 + 34;
  numero(it, xD, yTop, String(a), n - 1, "azul", d0);
  it.push(lin(xChave, yTop - 26, xChave, yTop + 12, "grafite", d0 + 0.2), lin(xChave, yTop + 10, xChave + 16 + Math.max(String(b).length, 2) * COL + 40, yTop + 10, "grafite", d0 + 0.3));
  it.push(tx(xChave + 12, yTop, String(b), "vermelho", TAM, d0 + 0.4));
  let k = 1, cur = A.slice(0, 1).reduce((s, x) => s * 10 + x, 0);
  while (cur < b && k < n) { cur = cur * 10 + A[k]!; k++; }
  let y = yTop, d = d0 + 0.8, q = "";
  const yq = yTop + 42;
  for (;;) {
    const qd = Math.floor(cur / b), prod = qd * b, resto = cur - prod, col = k - 1;
    q += String(qd);
    it.push(tx(xChave + 12 + (q.length - 1) * COL, yq, String(qd), "verde", TAM, d));
    y += 36;
    numero(it, xD, y, `−${prod}`, col, "vermelho", d + 0.2);
    y += 6; it.push(lin(xD + Math.max(0, col - String(prod).length) * COL, y, xD + (col + 1) * COL + 2, y, "grafite", d + 0.3));
    y += 32;
    if (k >= n) { numero(it, xD, y, String(resto), col, "laranja", d + 0.5); y += 8; break; }
    numero(it, xD, y, String(resto), col, "grafite", d + 0.5);
    it.push(tx(xD + (col + 1) * COL, y, String(A[k]), "laranja", TAM, d + 0.7)); // baixa o próximo algarismo
    it.push(tx(xD + (col + 1) * COL + 2, y + 18, "↓", "laranja", 12, d + 0.7));
    cur = resto * 10 + A[k]!; k++; d += 1.1;
  }
  const r = a % b;
  it.push(tx(x0, y + 34, r ? `Prova: ${q} × ${b} + ${r} = ${a}` : `Prova: ${q} × ${b} = ${a}`, "verde", 17, d + 0.6));
  return { it, h: y + 50 - y0 };
}

export type OpConta = "+" | "−" | "×" | "÷";
/** Conta armada de professor. Devolve null quando a conta não cabe no método (decimais, resultado negativo…). */
export function contaDesenhada(a: number, op: OpConta, b: number, x0: number, y0: number, d0: number): ContaDesenhada | null {
  if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0 || a > 999999 || b > 999999) return null;
  if (op === "+") return soma(a, b, x0, y0, d0);
  if (op === "−") return subtracao(a, b, x0, y0, d0);
  if (op === "×") return String(b).length <= 3 && String(a).length <= 5 ? produto(a, b, x0, y0, d0) : null;
  return divisao(a, b, x0, y0, d0);
}
