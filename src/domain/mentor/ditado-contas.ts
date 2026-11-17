import type { ItemDesenho } from "./lousa";

type Cor = "azul" | "vermelho" | "verde" | "grafite" | "laranja" | "roxo";
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

const num = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace(".", ","));

export interface RegraDeTres { a: string; b: string; c: string; nomeA: string; nomeB: string; inversa: boolean; conclusao: string }
/** Regra de três como no quadro do professor: oito faixas numeradas (problema, dados, proporcionalidade, proporção, cruzada, isolar x, conferir, resumo + resposta). */
export function regraDeTresDesenhada(r: RegraDeTres, x0: number, y0: number, d0: number, W: number): ContaDesenhada | null {
  const a = num(r.a), b = num(r.b), c = num(r.c);
  if (![a, b, c].every((v) => Number.isFinite(v) && v > 0)) return null;
  const k = r.inversa ? c : a, P = r.inversa ? a * b : b * c, x = P / k;
  const it: ItemDesenho[] = [];
  const uA = /\(([^)]+)\)/.exec(r.nomeA)?.[1] ?? "", nA = r.nomeA.replace(/\s*\(.*\)\s*$/, "").slice(0, 14), nB = r.nomeB.replace(/\s*\(.*\)\s*$/, "").slice(0, 14), unid = /\(([^)]+)\)/.exec(r.nomeB)?.[1] ?? nB.toLowerCase();
  const cw = 410, dois = W >= 800; // tela larga: etapas 1-4 à esquerda e 5-8 à direita, como no quadro de referência
  let ini = x0 + 12, y = y0, d = d0, hEsq = 0;
  const X0 = x0;
  const colunaDireita = () => { if (!dois) return; hEsq = y - y0; y = y0; ini = X0 + 440 + 12; x0 = X0 + 440; };
  /** Faixa colorida numerada, como o professor escreve o título de cada etapa. */
  const faixa = (n: number, titulo: string, cor: Cor) => {
    it.push({ t: "ret", x: x0, y, w: cw, h: 30, cor, bg: true, d }, tx(x0 + 12, y + 21, `${n}. ${titulo}`, cor, 18, d + 0.1));
    y += 42; d += 0.5;
  };
  const fracao = (xf: number, yf: number, nu: string, de: string, cor: Cor, dd: number) => {
    const w = Math.max(nu.length, de.length) * 13 + 10;
    it.push(tx(xf + (w - nu.length * 13) / 2, yf - 6, nu, cor, 24, dd), lin(xf, yf, xf + w, yf, "grafite", dd + 0.1), tx(xf + (w - de.length * 13) / 2, yf + 26, de, cor, 24, dd + 0.2));
    return xf + w;
  };
  // 1. problema
  faixa(1, "Problema", "azul");
  it.push(tx(ini, y + 10, `${r.a} ${uA || nA} → ${r.b} ${nB}`.slice(0, 36), "grafite", 20, d), tx(ini, y + 40, `${r.c} ${uA || nA} → x ${nB}?`.slice(0, 36), "grafite", 20, d + 0.3));
  y += 60; d += 0.8;
  // 2. dados em tabela
  faixa(2, "Organize os dados", "verde");
  const cwT = 150, hT = 34;
  [[nA, nB, "azul"], [r.a, r.b, "grafite"], [r.c, "x", "grafite"]].forEach((lin3, i) => {
    const cor = lin3[2] as Cor;
    [0, 1].forEach((j) => {
      const xx = ini + 20 + j * cwT, tt = String(lin3[j]);
      it.push({ t: "ret", x: xx, y: y + i * hT, w: cwT, h: hT, cor: i === 0 ? "azul" : "grafite", bg: i === 0, d: d + i * 0.3 }, tx(xx + 12, y + i * hT + 24, tt, i === 2 && j === 1 ? "vermelho" : cor, i === 0 ? 17 : 22, d + i * 0.3 + 0.1));
    });
  });
  y += 3 * hT + 16; d += 1.2;
  // 3. proporcionalidade
  faixa(3, "Identifique a proporcionalidade", "roxo");
  it.push(tx(ini, y + 12, (r.inversa ? `Mais ${nA} → menos ${nB}` : `Mais ${nA} → mais ${nB}`).slice(0, 36), "grafite", 20, d));
  it.push({ t: "ret", x: ini, y: y + 24, w: 360, h: 34, cor: "verde", d: d + 0.4 }, tx(ini + 12, y + 47, `✔ Grandezas ${r.inversa ? "inversamente" : "diretamente"} proporcionais`.slice(0, 40), "verde", 15, d + 0.5));
  y += 76; d += 1;
  // 4. proporção
  faixa(4, "Monte a proporção", "vermelho");
  const yf = y + 22;
  let xf = fracao(ini + 10, yf, r.inversa ? r.c : r.a, r.inversa ? r.a : r.c, "grafite", d);
  it.push(tx(xf + 8, yf + 10, "=", "grafite", 26, d + 0.4));
  fracao(xf + 34, yf, r.b, "x", "vermelho", d + 0.5);
  y += 62; d += 1;
  colunaDireita();
  // 5. multiplicação cruzada
  faixa(5, "Faça a multiplicação cruzada", "verde");
  it.push(tx(ini, y + 14, (r.inversa ? `${r.c} · x = ${r.a} · ${r.b}` : `${r.a} · x = ${r.c} · ${r.b}`).slice(0, 34), "grafite", 24, d));
  it.push({ t: "ret", x: ini, y: y + 28, w: 200, h: 36, cor: "laranja", bg: true, d: d + 0.5 }, tx(ini + 12, y + 53, `${fmt(k)}x = ${fmt(P)}`.slice(0, 20), "laranja", 24, d + 0.6));
  y += 78; d += 1.2;
  // 6. isolar x
  faixa(6, "Isole o X", "azul");
  it.push(tx(ini + 10, y + 26, "x =", "grafite", 26, d));
  fracao(ini + 60, y + 20, fmt(P), fmt(k), "grafite", d + 0.2);
  it.push({ t: "linha", x1: ini + 150, y1: y + 20, x2: ini + 190, y2: y + 20, cor: "vermelho", seta: true, d: d + 0.6 });
  it.push({ t: "ret", x: ini + 200, y: y, w: 160, h: 44, cor: "laranja", bg: true, d: d + 0.8 }, tx(ini + 214, y + 32, `x = ${fmt(x)}`.slice(0, 14), "laranja", 28, d + 0.9));
  y += 70; d += 1.6;
  // 7. conferir
  faixa(7, "Confira o resultado", "roxo");
  const conf = r.inversa ? [`${r.a} × ${r.b} = ${fmt(a * b)}`, `${r.c} × ${fmt(x)} = ${fmt(c * x)}`] : [`Por ${nA.toLowerCase()}: ${r.b} ÷ ${r.a} = ${fmt(b / a)}`, `Em ${r.c}: ${fmt(b / a)} × ${r.c} = ${fmt(x)}`];
  conf.forEach((l, i) => it.push(tx(ini, y + 14 + i * 30, l.slice(0, 36), "grafite", 20, d + i * 0.4)));
  it.push({ t: "ret", x: ini, y: y + 70, w: 240, h: 32, cor: "verde", d: d + 1 }, tx(ini + 12, y + 93, "✔ Resultado confirmado!", "verde", 17, d + 1.1));
  y += 120; d += 1.6;
  // 8. resumo e resposta
  faixa(8, "Resumo da aula", "verde");
  ["Identifique as grandezas", "Descubra a proporcionalidade", "Monte a proporção", "Resolva a equação", "Confira o resultado"].forEach((l, i) => it.push(tx(ini, y + 12 + i * 26, `✔ ${l}`, "verde", 17, d + i * 0.3)));
  y += 140; d += 1.6;
  const resp = `${fmt(x)} ${unid}`.slice(0, 22);
  it.push({ t: "ret", x: x0, y, w: cw, h: 62, cor: "laranja", bg: true, d }, tx(x0 + 14, y + 24, "Resposta:", "grafite", 16, d + 0.2), tx(x0 + 14, y + 52, resp, "laranja", 30, d + 0.4));
  return { it, h: Math.max(hEsq, y + 74 - y0) };
}

/** Cálculo resolvido linha a linha, como no caderno: frações empilhadas, setas entre os passos, X na multiplicação em cruz e o resultado numa caixa. */
export function passosDesenhados(linhas: string[], x0: number, y0: number, d0: number): ContaDesenhada | null {
  const ls = linhas.map((l) => l.trim().replace(/^(?:resultado|resposta)\s*:\s*/i, "").replace(/([A-Za-z])_\{?(\d)\}?/g, "$1$2").replace(/\s+/g, " ").replace(/[.;]$/, "").trim()).filter(Boolean).slice(0, 7);
  if (ls.length < 1) return null;
  const TAM = 26, CW = 15, it: ItemDesenho[] = [];
  let y = y0, d = d0;
  ls.forEach((linha, i) => {
    const ultima = i === ls.length - 1;
    const partes = linha.split(/([A-Za-z]\d?|\d+(?:,\d+)?)\s*\/\s*([A-Za-z]\d?|\d+(?:,\d+)?)/g);
    const temFrac = partes.length > 1, alt = temFrac ? 78 : 50, yb = y + (temFrac ? 44 : 32);
    const cor: Cor = ultima ? "verde" : i === 0 ? "azul" : "grafite";
    let x = x0 + 26;
    const fr: Array<{ x1: number; x2: number }> = [];
    for (let k = 0; k < partes.length; k += 3) {
      const t = partes[k] ?? "";
      const vis = t.trim();
      if (vis) { it.push(tx(x + (t.length - t.trimStart().length) * CW * 0.6, yb, vis, cor, TAM, d)); }
      x += t.length * CW * (vis.length === t.length ? 1 : 0.85);
      if (k + 2 < partes.length) {
        const n = partes[k + 1]!, dn = partes[k + 2]!, w = Math.max(n.length, dn.length) * CW + 12;
        it.push(tx(x + (w - n.length * CW) / 2, yb - 16, n, cor, TAM, d + 0.1), lin(x, yb - 8, x + w, yb - 8, "grafite", d + 0.2), tx(x + (w - dn.length * CW) / 2, yb + 22, dn, cor, TAM, d + 0.3));
        fr.push({ x1: x, x2: x + w });
        x += w + 4;
      }
    }
    if (i === 0 && fr.length === 2 && /=/.test(linha)) {
      const a = fr[0]!, b = fr[1]!;
      it.push(lin(a.x2 - 2, yb - 24, b.x1 + 2, yb + 24, "vermelho", d + 0.6), lin(a.x2 - 2, yb + 24, b.x1 + 2, yb - 24, "vermelho", d + 0.8));
    }
    if (ultima) it.push({ t: "ret", x: x0 + 12, y: y + 2, w: Math.round(x - x0 - 4), h: alt - 8, cor: "verde", bg: true, d: d + 0.4 });
    y += alt + 4;
    if (!ultima) { it.push({ t: "linha", x1: x0 + 14, y1: y, x2: x0 + 14, y2: y + 14, cor: "vermelho", seta: true, d: d + 0.5 }); y += 18; }
    d += 1;
  });
  return { it, h: y - y0 + 8 };
}
