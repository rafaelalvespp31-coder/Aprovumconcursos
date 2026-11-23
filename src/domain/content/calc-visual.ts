/**
 * Cálculos visuais passo a passo das aulas de Matemática. A aula escreve só os NÚMEROS num bloco ```conta, ```fracao,
 * ```regra3, ```potencia ou ```porcentagem; o app faz toda a conta (o resultado nunca sai errado) e monta o passo a
 * passo em português simples. Puro e sem dependência de tela.
 *
 *   ```conta            ```fracao          ```regra3          ```potencia   ```porcentagem
 *   mmc 12 18           3/4                direta 6 24 9      2 5           20 150 R$
 *   divisao 432 12      1/2 + 1/3          inversa 4 6 8
 */
import { worked, type Worked } from "./hand-math";

export const LINGUAGENS_CALCULO = ["conta", "fracao", "regra3", "potencia", "porcentagem"] as const;
export type LinguagemCalculo = (typeof LINGUAGENS_CALCULO)[number];

export type TermoFracao = { n: number; d: number; rotulo: string };
export type VisualCalculo =
  | { k: "armada"; w: Worked }
  | { k: "fracao"; termos: TermoFracao[]; resultado: { n: number; d: number } | null }
  | { k: "regra3"; direta: boolean; a: string; b: string; c: string; x: string; rotuloA: string; rotuloB: string }
  | { k: "potencia"; base: number; exp: number; produtos: number[] }
  | { k: "percentual"; pct: number; total: string; parte: string };

export type Calculo = { tipo: LinguagemCalculo; titulo: string; passos: string[]; resultado: string; visual: VisualCalculo };

const nf = (n: number, casas = 2) => n.toLocaleString("pt-BR", { maximumFractionDigits: casas });
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const mmc2 = (a: number, b: number) => (a / gcd(a, b)) * b;
const inteiro = (s: string | undefined) => (s !== undefined && /^\d{1,9}$/.test(s) ? Number(s) : NaN);
const sup = (n: number) => String(n).replace(/\d/g, (d) => "⁰¹²³⁴⁵⁶⁷⁸⁹"[Number(d)]!);

export function parseCalculo(linguagem: string, corpo: string): Calculo | null {
  const linhas = corpo.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!linhas.length) return null;
  try {
    switch (linguagem) {
      case "conta": return conta(linhas[0]!);
      case "fracao": return fracao(linhas[0]!);
      case "regra3": return regra3(linhas);
      case "potencia": return potencia(linhas[0]!);
      case "porcentagem": return porcentagem(linhas[0]!);
      default: return null;
    }
  } catch { return null; }
}

function conta(linha: string): Calculo | null {
  const [op, ...resto] = linha.toLowerCase().split(/\s+/);
  const nomes = ["soma", "subtracao", "multiplicacao", "divisao", "mmc", "mdc"] as const;
  if (!op || !(nomes as readonly string[]).includes(op)) return null;
  const nums = resto.map(inteiro);
  if (nums.some(Number.isNaN)) return null;
  const w = worked(op as (typeof nomes)[number], nums);
  return w ? { tipo: "conta", titulo: w.title, passos: w.steps, resultado: w.result, visual: { k: "armada", w } } : null;
}

const fr = (n: number, d: number) => `${n}/${d}`;
function simplificar(n: number, d: number) { const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; }

function fracao(linha: string): Calculo | null {
  const m = linha.match(/^(\d{1,3})\s*\/\s*(\d{1,3})(?:\s*([+\-−x×*:÷])\s*(\d{1,3})\s*\/\s*(\d{1,3}))?$/);
  if (!m) return null;
  const n1 = Number(m[1]), d1 = Number(m[2]);
  if (!d1) return null;
  if (!m[3]) {
    if (n1 > d1) return null;
    const dec = n1 / d1;
    return { tipo: "fracao", titulo: `A fração ${fr(n1, d1)}`, resultado: `${fr(n1, d1)} = ${nf(dec, 3)} = ${nf(dec * 100, 1)}%`,
      passos: [`O inteiro foi dividido em ${d1} partes iguais. O número de baixo (${d1}) é o denominador.`, `Pegamos ${n1} dessas partes. O número de cima (${n1}) é o numerador.`, `Pintamos ${n1} de ${d1} partes: ${fr(n1, d1)}.`],
      visual: { k: "fracao", termos: [{ n: n1, d: d1, rotulo: fr(n1, d1) }], resultado: null } };
  }
  const n2 = Number(m[4]), d2 = Number(m[5]);
  if (!d2) return null;
  const op = m[3] === "−" ? "-" : m[3] === "×" || m[3] === "*" ? "x" : m[3] === "÷" ? ":" : m[3]!;
  const titulo = `${fr(n1, d1)} ${op === "x" ? "×" : op === ":" ? "÷" : op === "-" ? "−" : "+"} ${fr(n2, d2)}`;
  const finalizar = (rn: number, rd: number, passos: string[], termos: TermoFracao[]): Calculo => {
    const s = simplificar(rn, rd);
    const txt = s.d === 1 ? String(s.n) : fr(s.n, s.d);
    if (s.d !== rd) passos.push(`Simplificar: divida em cima e embaixo por ${gcd(rn, rd)} → ${txt}.`);
    else passos.push(`${fr(rn, rd)} já está na forma mais simples (não dá para simplificar).`);
    return { tipo: "fracao", titulo, passos, resultado: `${titulo} = ${txt}`, visual: { k: "fracao", termos, resultado: s.n <= s.d && s.d <= 60 ? s : null } };
  };
  if (op === "+" || op === "-") {
    const m2 = mmc2(d1, d2), a = n1 * (m2 / d1), b = n2 * (m2 / d2);
    const r = op === "+" ? a + b : a - b;
    if (r < 0) return null;
    const passos: string[] = [];
    if (d1 === d2) passos.push(`Os denominadores são iguais (${d1}). Dá para ${op === "+" ? "somar" : "subtrair"} direto os numeradores.`);
    else {
      passos.push(`Denominadores diferentes (${d1} e ${d2}): precisamos de um denominador comum. Usamos o MMC(${d1}, ${d2}) = ${m2}.`);
      passos.push(`Converter ${fr(n1, d1)}: ${m2} ÷ ${d1} = ${m2 / d1}; ${m2 / d1} × ${n1} = ${a} → ${fr(a, m2)}.`);
      passos.push(`Converter ${fr(n2, d2)}: ${m2} ÷ ${d2} = ${m2 / d2}; ${m2 / d2} × ${n2} = ${b} → ${fr(b, m2)}.`);
    }
    passos.push(`${op === "+" ? "Somar" : "Subtrair"} só os numeradores e manter o denominador ${m2}: ${a} ${op === "+" ? "+" : "−"} ${b} = ${r} → ${fr(r, m2)}.`);
    if (r > m2) return { ...finalizar(r, m2, passos, []), visual: { k: "fracao", termos: [], resultado: null } };
    return finalizar(r, m2, passos, [{ n: a, d: m2, rotulo: fr(a, m2) }, { n: b, d: m2, rotulo: fr(b, m2) }]);
  }
  if (op === "x") {
    const passos = [`Multiplicar os numeradores: ${n1} × ${n2} = ${n1 * n2}.`, `Multiplicar os denominadores: ${d1} × ${d2} = ${d1 * d2}.`, `Montar a fração: ${fr(n1 * n2, d1 * d2)}.`];
    return finalizar(n1 * n2, d1 * d2, passos, [{ n: n1, d: d1, rotulo: fr(n1, d1) }, { n: n2, d: d2, rotulo: fr(n2, d2) }].filter((t) => t.n <= t.d));
  }
  if (!n2) return null;
  const passos = [`Na divisão de frações, mantemos a primeira e invertemos a segunda: ${fr(n2, d2)} vira ${fr(d2, n2)}.`, `Trocar ÷ por ×: ${fr(n1, d1)} × ${fr(d2, n2)}.`, `Multiplicar em cima: ${n1} × ${d2} = ${n1 * d2}. Embaixo: ${d1} × ${n2} = ${d1 * n2}.`];
  return finalizar(n1 * d2, d1 * n2, passos, []);
}

function regra3(linhas: string[]): Calculo | null {
  const m = linhas[0]!.toLowerCase().match(/^(direta|inversa)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)$/);
  if (!m) return null;
  const num = (s: string) => Number(s.replace(",", "."));
  const direta = m[1] === "direta";
  const a = num(m[2]!), b = num(m[3]!), c = num(m[4]!);
  if (!a || !c) return null;
  const [rotuloA, rotuloB] = (linhas[1] ?? "Grandeza 1 | Grandeza 2").split("|").map((s) => s.trim());
  const x = direta ? (b * c) / a : (a * b) / c;
  if (!Number.isFinite(x)) return null;
  const f = (n: number) => nf(n, 4);
  const passos = [
    `Monte a tabela, colocando valores da mesma grandeza na mesma coluna: ${f(a)} ↔ ${f(b)} e ${f(c)} ↔ x.`,
    direta
      ? `Pergunte: se uma grandeza AUMENTA, a outra também aumenta? Sim → são DIRETAMENTE proporcionais (as setas vão no mesmo sentido).`
      : `Pergunte: se uma grandeza AUMENTA, a outra DIMINUI? Sim → são INVERSAMENTE proporcionais (as setas vão em sentidos contrários).`,
    direta ? `Multiplique em cruz: ${f(a)} · x = ${f(b)} · ${f(c)}.` : `Na inversa, multiplique em linha: ${f(a)} · ${f(b)} = ${f(c)} · x.`,
    direta ? `Calcule o produto: ${f(b)} × ${f(c)} = ${f(b * c)}. Então ${f(a)} · x = ${f(b * c)}.` : `Calcule o produto: ${f(a)} × ${f(b)} = ${f(a * b)}. Então ${f(c)} · x = ${f(a * b)}.`,
    direta ? `Isole o x dividindo por ${f(a)}: x = ${f(b * c)} ÷ ${f(a)} = ${f(x)}.` : `Isole o x dividindo por ${f(c)}: x = ${f(a * b)} ÷ ${f(c)} = ${f(x)}.`,
  ];
  return { tipo: "regra3", titulo: `Regra de três ${direta ? "direta" : "inversa"}`, passos, resultado: `x = ${f(x)}`, visual: { k: "regra3", direta, a: f(a), b: f(b), c: f(c), x: f(x), rotuloA: rotuloA || "Grandeza 1", rotuloB: rotuloB || "Grandeza 2" } };
}

function potencia(linha: string): Calculo | null {
  const [bs, es] = linha.split(/\s+/);
  const base = inteiro(bs), exp = inteiro(es);
  if (Number.isNaN(base) || Number.isNaN(exp) || base > 999 || exp > 12) return null;
  const produtos: number[] = [];
  let p = 1;
  for (let i = 0; i < exp; i++) { p *= base; produtos.push(p); }
  if (!Number.isSafeInteger(p)) return null;
  const titulo = `${base}${sup(exp)}`;
  const passos = [`O número de baixo (${base}) é a base: é o que vai se repetir. O pequeno em cima (${exp}) é o expoente: diz quantas vezes.`];
  if (exp === 0) passos.push("Todo número diferente de zero elevado a 0 vale 1.");
  else if (exp === 1) passos.push(`Expoente 1: o número aparece uma vez só, então ${base}¹ = ${base}.`);
  else {
    passos.push(`Escreva ${base} multiplicado ${exp} vezes: ${Array(exp).fill(base).join(" × ")}.`);
    produtos.forEach((v, i) => { if (i > 0) passos.push(`${i === 1 ? "Primeiro" : "Depois"}: ${produtos[i - 1]} × ${base} = ${v}.`); });
  }
  return { tipo: "potencia", titulo, passos, resultado: `${titulo} = ${nf(exp === 0 ? 1 : p, 0)}`, visual: { k: "potencia", base, exp, produtos } };
}

function porcentagem(linha: string): Calculo | null {
  const m = linha.match(/^(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)(?:\s+(R\$))?$/);
  if (!m) return null;
  const pct = Number(m[1]!.replace(",", ".")), total = Number(m[2]!.replace(",", "."));
  const dinheiro = m[3] === "R$";
  const fm = (n: number) => (dinheiro ? `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : nf(n, 2));
  const parte = (pct * total) / 100;
  const passos = [
    `${nf(pct)}% quer dizer "${nf(pct)} em cada 100". Como fração: ${nf(pct)}/100.`,
    `Transforme em decimal dividindo por 100: ${nf(pct)} ÷ 100 = ${nf(pct / 100, 4)}.`,
    `Multiplique pelo total: ${nf(pct / 100, 4)} × ${fm(total)}.`,
    `Resultado: ${fm(parte)}.`,
  ];
  if (pct % 10 === 0 && pct > 0 && pct < 100) passos.splice(3, 0, `Atalho: 10% de ${fm(total)} é ${fm(total / 10)}; então ${nf(pct)}% são ${pct / 10} × ${fm(total / 10)}.`);
  return { tipo: "porcentagem", titulo: `${nf(pct)}% de ${fm(total)}`, passos, resultado: `${nf(pct)}% de ${fm(total)} = ${fm(parte)}`, visual: { k: "percentual", pct: Math.min(100, pct), total: fm(total), parte: fm(parte) } };
}
