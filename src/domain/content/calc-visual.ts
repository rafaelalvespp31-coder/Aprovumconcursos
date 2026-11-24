/**
 * Cálculos visuais passo a passo das aulas de Matemática. A aula escreve só os NÚMEROS num bloco ```conta, ```fracao,
 * ```regra3, ```potencia ou ```porcentagem; o app faz toda a conta (o resultado nunca sai errado) e monta o passo a
 * passo em português simples. Puro e sem dependência de tela.
 *
 *   ```conta            ```fracao          ```regra3          ```potencia   ```porcentagem
 *   mmc 12 18           3/4                direta 6 24 9      2 5           20 150 R$
 *   divisao 432 12      1/2 + 1/3          inversa 4 6 8
 */
import { contaCaderno } from "./caderno-conta";
import { equacao1, equacao2, expressao, raiz } from "./calc-algebra";
import { financeira, geometria, proporcao, reduzir, regra3Composta, unidade } from "./calc-medidas";
import type { CadernoLinhas, Figura, LinhaCaderno } from "./calc-tipos";
import type { Operation, Worked } from "./hand-math";

export const LINGUAGENS_CALCULO = [
  "conta", "fracao", "regra3", "potencia", "porcentagem", "expressao", "equacao", "equacao2", "raiz", "razao", "simplificar",
  "proporcao", "regra3c", "unidade", "geometria", "financeira",
] as const;
export type LinguagemCalculo = (typeof LINGUAGENS_CALCULO)[number];

export type TermoFracao = { n: number; d: number; rotulo: string };
export type VisualCalculo =
  | { k: "armada"; w: Worked }
  | { k: "linhas"; linhas: LinhaCaderno[]; fig?: Figura }
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

const doLinhas = (tipo: LinguagemCalculo, c: CadernoLinhas | null): Calculo | null =>
  c ? { tipo, titulo: c.titulo, passos: c.passos, resultado: c.resultado, visual: { k: "linhas", linhas: c.linhas, fig: c.fig } } : null;
const semAcento = (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const numPt = (t: string | undefined) => (t !== undefined && /^\d+(?:[.,]\d+)?$/.test(t) ? Number(t.replace(",", ".")) : NaN);

export function parseCalculo(linguagem: string, corpo: string): Calculo | null {
  const linhas = corpo.split("\n").map((l) => l.trim()).filter(Boolean);
  if (!linhas.length) return null;
  try {
    const t = linhas[0]!.split(/\s+/);
    switch (linguagem) {
      case "conta": return conta(linhas[0]!);
      case "fracao": return fracao(linhas[0]!);
      case "regra3": return regra3(linhas);
      case "potencia": return potencia(linhas[0]!);
      case "porcentagem": return porcentagem(linhas[0]!);
      case "expressao": return doLinhas("expressao", expressao(linhas.join(" ")));
      case "equacao": return doLinhas("equacao", equacao1(linhas[0]!));
      case "equacao2": { const n = t.map((x) => Number(x.replace("−", "-").replace(",", "."))); return n.length === 3 ? doLinhas("equacao2", equacao2(n[0]!, n[1]!, n[2]!)) : null; }
      case "raiz": { const n = t.map(Number); return n.length === 1 ? doLinhas("raiz", raiz(2, n[0]!)) : n.length === 2 ? doLinhas("raiz", raiz(n[0]!, n[1]!)) : null; }
      case "razao": case "simplificar": {
        const n = linhas[0]!.split(/[\s:/]+/).map(Number);
        return n.length === 2 ? doLinhas(linguagem, reduzir(n[0]!, n[1]!, linguagem === "razao" ? "razao" : "fracao")) : null;
      }
      case "proporcao": { const n = t.map(numPt); return n.length === 3 ? doLinhas("proporcao", proporcao(n[0]!, n[1]!, n[2]!)) : null; }
      case "regra3c": return regra3c(linhas);
      case "unidade": { const v = numPt(t[0]); return t.length === 3 ? doLinhas("unidade", unidade(v, t[1]!, t[2]!)) : null; }
      case "geometria": {
        const forma = semAcento(t[0] ?? "");
        const n: number[] = [];
        let un = "";
        for (const x of t.slice(1)) { const v = numPt(x); if (Number.isNaN(v)) un = x; else n.push(v); }
        return doLinhas("geometria", geometria(forma, n, un));
      }
      case "financeira": {
        const modo = semAcento(t[0] ?? "");
        const n = t.slice(1).map(numPt);
        return (modo === "simples" || modo === "composto") && n.length === 3 ? doLinhas("financeira", financeira(modo, n[0]!, n[1]!, n[2]!)) : null;
      }
      default: return null;
    }
  } catch { return null; }
}

/** Regra de três composta: nomes | valores da situação 1 | valores da situação 2 (com x) | relações. */
function regra3c(linhas: string[]): Calculo | null {
  if (linhas.length < 4) return null;
  const nomes = linhas[0]!.split("|").map((x) => x.trim()).filter(Boolean);
  const v1 = linhas[1]!.split(/\s+/).map(numPt);
  const v2txt = linhas[2]!.split(/\s+/);
  if (v2txt[v2txt.length - 1]?.toLowerCase() !== "x") return null;
  const v2 = v2txt.slice(0, -1).map(numPt);
  const rel = linhas[3]!.split("|").map((x) => semAcento(x.trim())).map((x) => (x === "direta" ? "direta" : x === "inversa" ? "inversa" : null));
  if (rel.some((r) => !r) || [...v1, ...v2].some(Number.isNaN)) return null;
  return doLinhas("regra3c", regra3Composta(nomes, v1, v2, rel as ("direta" | "inversa")[]));
}

/** Aceita inteiros e decimais (vírgula ou ponto). Com decimais, só soma e subtração (vírgula alinhada). */
function conta(linha: string): Calculo | null {
  const [op, ...resto] = linha.toLowerCase().split(/\s+/);
  const nomes = ["soma", "subtracao", "multiplicacao", "divisao", "mmc", "mdc", "fatoracao"] as const;
  if (!op || !(nomes as readonly string[]).includes(op)) return null;
  if (!resto.every((x) => /^\d{1,9}(?:[.,]\d{1,3})?$/.test(x))) return null;
  const casas = Math.max(0, ...resto.map((x) => (x.split(/[.,]/)[1] ?? "").length));
  const nums = resto.map((x) => { const [i, d = ""] = x.split(/[.,]/); return Number(i + d.padEnd(casas, "0")); });
  const w = contaCaderno(op as Operation, nums, casas);
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
  const m = linha.toLowerCase().match(/^(?:(desconto|aumento|quanto|de)\s+)?(\d+(?:[.,]\d+)?)\s+(\d+(?:[.,]\d+)?)(?:\s+(r\$))?$/);
  if (!m) return null;
  const modo = m[1] ?? "de";
  const A = Number(m[2]!.replace(",", ".")), B = Number(m[3]!.replace(",", "."));
  const dinheiro = m[4] === "r$";
  const fm = (n: number) => (dinheiro ? `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : nf(n, 2));
  if (modo === "quanto") {
    if (!B) return null;
    const razao = A / B;
    return { tipo: "porcentagem", titulo: `${fm(A)} é quantos % de ${fm(B)}?`,
      passos: [`Porcentagem é uma fração de denominador 100. Para saber quantos % ${fm(A)} é de ${fm(B)}, dividimos a parte pelo todo.`, `Dividimos: ${fm(A)} ÷ ${fm(B)} = ${nf(razao, 4)}.`, `Para transformar em porcentagem, multiplicamos por 100: ${nf(razao, 4)} × 100 = ${nf(razao * 100, 2)}.`, `Então ${fm(A)} é ${nf(razao * 100, 2)}% de ${fm(B)}.`],
      resultado: `${fm(A)} é ${nf(razao * 100, 2)}% de ${fm(B)}`, visual: { k: "percentual", pct: Math.min(100, razao * 100), total: fm(B), parte: fm(A) } };
  }
  const pct = A, total = B;
  const parte = (pct * total) / 100;
  const passos = [
    `${nf(pct)}% quer dizer "${nf(pct)} em cada 100". Como fração: ${nf(pct)}/100.`,
    `Transforme em decimal dividindo por 100: ${nf(pct)} ÷ 100 = ${nf(pct / 100, 4)}.`,
    `Multiplique pelo total: ${nf(pct / 100, 4)} × ${fm(total)} = ${fm(parte)}.`,
  ];
  if (pct % 10 === 0 && pct > 0 && pct < 100) passos.splice(2, 0, `Atalho: 10% de ${fm(total)} é ${fm(total / 10)}; então ${nf(pct)}% são ${pct / 10} × ${fm(total / 10)}.`);
  let titulo = `${nf(pct)}% de ${fm(total)}`;
  let resultado = `${titulo} = ${fm(parte)}`;
  if (modo === "desconto" || modo === "aumento") {
    const final = modo === "desconto" ? total - parte : total + parte;
    passos.push(`${modo === "desconto" ? "Desconto" : "Aumento"} é ${fm(parte)}. ${modo === "desconto" ? `O preço final é o preço menos o desconto: ${fm(total)} − ${fm(parte)}` : `O valor final é o valor mais o aumento: ${fm(total)} + ${fm(parte)}`} = ${fm(final)}.`);
    titulo = `${modo === "desconto" ? "Desconto" : "Aumento"} de ${nf(pct)}% sobre ${fm(total)}`;
    resultado = `${titulo}: ${fm(parte)}; valor final ${fm(final)}`;
  } else passos.push(`Resultado: ${fm(parte)}.`);
  return { tipo: "porcentagem", titulo, passos, resultado, visual: { k: "percentual", pct: Math.min(100, pct), total: fm(total), parte: fm(parte) } };
}
