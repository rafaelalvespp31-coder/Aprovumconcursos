/**
 * Esqueletos de conta da lousa: a conta já vem montada (como se fosse feita à mão) e o aluno só preenche as casas
 * tocando nos números, PASSO A PASSO: cada passo tem a instrução do que fazer, a explicação do porquê (mostrada ao
 * acertar) e uma dica (mostrada ao errar). Tipos: soma, subtração, multiplicação, divisão, MMC, MDC, soma de frações,
 * porcentagem, regra de três, equação do 1º grau e média.
 */
import { CORES, glifoEm, sinalNormalizado, ehSinalVetor, type Cor, type Item, type ItemGlifo, type Medidor } from "./quadro-motor";

/** Tipos de conta de Matemática (um conjunto para cada assunto do catálogo). */
export type TipoMat =
  | "soma" | "sub" | "mult" | "div" | "pot" | "raiz" | "fat" | "expr" | "ordem" | "classnum" | "propr" | "convfd" | "decimal"
  | "classfrac" | "fraceq" | "frac" | "fracs" | "fracm" | "fracd" | "fracde" | "divisib" | "divisores" | "primo" | "mmc" | "mdc"
  | "pct" | "pctqto" | "aumdesc" | "sucessivas" | "juros" | "jurosc" | "taxa"
  | "proporcao" | "razao" | "regra3" | "regra3i" | "regra3c" | "variacao"
  | "eq1" | "eq2" | "sistema" | "media" | "mediap" | "mediana" | "area" | "circ" | "vol" | "pit" | "vel" | "conv" | "pa" | "pg" | "conj" | "prob" | "pfc" | "perm" | "arr" | "comb";
/** Tipos de Raciocínio Lógico (proposições). */
export type TipoLog = "proposicao" | "principios" | "simcomp" | "tabela" | "valor" | "negacao" | "equiv" | "argumento" | "quant";
export type TipoEsqueleto = TipoMat | TipoLog;

export const ROTULOS: Record<TipoEsqueleto, string> = {
  soma: "Soma", sub: "Subtração", mult: "Multiplicação", div: "Divisão", pot: "Potência", raiz: "Raiz", fat: "Fatoração", expr: "Expressão", ordem: "Ordenar números", classnum: "Conjuntos numéricos",
  propr: "Propriedades", convfd: "Fração ⇄ decimal", decimal: "Decimais", classfrac: "Tipos de fração", fraceq: "Equivalentes", frac: "Frações +", fracs: "Frações −", fracm: "Frações ×", fracd: "Frações ÷",
  fracde: "Fração de número", divisib: "Divisibilidade", divisores: "Múltiplos/divisores", primo: "Número primo", mmc: "MMC", mdc: "MDC", pct: "Porcentagem", pctqto: "Quantos %", aumdesc: "Desc./Acréscimo",
  sucessivas: "Variações sucessivas", juros: "Juros simples", jurosc: "Juros compostos", taxa: "Taxa de juros", proporcao: "Razão e proporção", razao: "Divisão proporcional", regra3: "Regra de três",
  regra3i: "Regra de três inversa", regra3c: "Regra de três composta", variacao: "Taxa de variação", eq1: "Equação 1º grau", eq2: "Equação 2º grau", sistema: "Sistema", media: "Média", mediap: "Média ponderada",
  mediana: "Mediana", area: "Área", circ: "Círculo", vol: "Volume", pit: "Pitágoras", vel: "Velocidade", conv: "Unidades", pa: "PA", pg: "PG", conj: "Conjuntos", prob: "Probabilidade", pfc: "Contagem",
  perm: "Permutação", arr: "Arranjo", comb: "Combinação",
  proposicao: "É proposição?", principios: "Princípios da lógica", simcomp: "Simples ou composta", tabela: "Tabela-verdade", valor: "Valor lógico", negacao: "Negação", equiv: "Equivalência", argumento: "Argumento", quant: "Todo/Algum/Nenhum",
};
export const TIPOS_MAT = Object.keys(ROTULOS).filter((k) => !["proposicao", "principios", "simcomp", "tabela", "valor", "negacao", "equiv", "argumento", "quant"].includes(k)) as TipoMat[];
export const TIPOS_LOG: TipoEsqueleto[] = ["proposicao", "principios", "simcomp", "tabela", "valor", "negacao", "equiv", "argumento", "quant", "conj", "pfc", "comb", "arr", "perm", "prob", "pa", "pg"];
/** Tipos cujo enunciado é um texto (e não números separados por vírgula). */
export const TIPOS_TEXTO: TipoEsqueleto[] = ["proposicao", "principios", "simcomp", "tabela", "valor", "negacao", "equiv", "argumento", "quant", "decimal", "classnum"];
export const ehLogica = (t: TipoEsqueleto): boolean => (["proposicao", "principios", "simcomp", "tabela", "valor", "negacao", "equiv", "argumento", "quant"] as TipoEsqueleto[]).includes(t);

export interface Casa {
  id: number;
  passo: number;
  x0: number; x1: number; y0: number; y1: number; // caixa
  base: number; // linha de base dos caracteres
  slots: number; // quantos caracteres cabem
  cw: number; // largura de cada um
  /** Comentário que aparece quando o aluno acerta esta casa (o que ele acabou de fazer e por quê). */
  nota?: string;
  esperado: string;
  /** Casa de escolha: em vez de digitar, o aluno toca numa das opções. */
  opcoes?: string[];
  /** Outra forma aceita (ex.: "05" no lugar de "5" na divisão). */
  alt?: string;
  alinha: "dir" | "esq";
}
export interface Passo {
  titulo: string;
  /** O que fazer (sem dar a resposta). */
  texto: string;
  /** Explicação mostrada ao acertar o passo. */
  porque: string;
  /** Dica mostrada ao errar. */
  dica: string;
  casas: number[];
}
export interface Esqueleto {
  tipo: TipoEsqueleto;
  nums: number[];
  titulo: string;
  size: number;
  fixos: Item[];
  /** Desenho que só aparece quando o passo chega (ex.: a multiplicação que o MMC pede no fim). */
  fixosPasso?: { passo: number; itens: Item[] }[];
  casas: Casa[];
  passos: Passo[];
  /** Resposta final em texto (ex.: "MMC = 36"). */
  resposta: string;
  /** Para exercícios de lógica: o enunciado digitado (ex.: "p→q"). */
  entrada?: string;
}

export const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
export const mmcDe = (nums: number[]): number => nums.reduce((a, b) => (a * b) / gcd(a, b), 1);
export const mdcDe = (nums: number[]): number => nums.reduce((a, b) => gcd(a, b));
const menorPrimoQue = (nums: number[], todos: boolean): number => {
  for (let p = 2; p <= 97; p++) if (todos ? nums.every((n) => n % p === 0) : nums.some((n) => n > 1 && n % p === 0)) return p;
  return 0;
};

/** Passos da fatoração simultânea (MMC): cada linha mostra os números e o primo usado para dividir. */
export function passosMmc(nums: number[]): { linhas: number[][]; primos: number[] } {
  const linhas: number[][] = [nums.slice()];
  const primos: number[] = [];
  let atual = nums.slice();
  for (let guarda = 0; guarda < 30 && atual.some((n) => n > 1); guarda++) {
    const p = menorPrimoQue(atual, false);
    if (!p) break;
    primos.push(p);
    atual = atual.map((n) => (n > 1 && n % p === 0 ? n / p : n));
    linhas.push(atual.slice());
  }
  return { linhas, primos };
}
/** Passos do MDC: só entram os primos que dividem TODOS os números. */
export function passosMdc(nums: number[]): { linhas: number[][]; primos: number[] } {
  const linhas: number[][] = [nums.slice()];
  const primos: number[] = [];
  let atual = nums.slice();
  for (let guarda = 0; guarda < 30; guarda++) {
    const p = menorPrimoQue(atual, true);
    if (!p) break;
    primos.push(p);
    atual = atual.map((n) => n / p);
    linhas.push(atual.slice());
  }
  return { linhas, primos };
}

export const fmt = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(4).replace(/0+$/, "").replace(".", ","));
export const digitos = (n: number) => String(n).length;
const NOME_POS = ["das unidades", "das dezenas", "das centenas", "das unidades de milhar", "das dezenas de milhar"];
const NOME_DIG = ["das unidades", "das dezenas", "das centenas", "dos milhares"];

/** Exercício automático, no nível de prova (números pequenos e com resposta exata). */
export function aleatorioBasico(tipo: TipoEsqueleto, rnd: () => number = Math.random): number[] | null {
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;
  const ent = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  switch (tipo) {
    case "mmc": return pick([[12, 18], [8, 12], [15, 20], [6, 8, 9], [12, 15, 20], [10, 25], [9, 12, 18], [14, 21], [16, 24], [6, 10, 15]]);
    case "mdc": return pick([[12, 18], [24, 36], [30, 45], [20, 50], [18, 27, 36], [48, 60], [42, 56], [16, 40]]);
    case "soma": return pick([[478, 356], [1259, 783], [645, 297, 118], [3846, 1275], [59, 87, 46]]);
    case "sub": return pick([[532, 187], [1000, 468], [4205, 1678], [903, 456], [7134, 2865]]);
    case "mult": return [pick([23, 47, 58, 126, 214, 305, 138, 412]), pick([12, 24, 35, 46, 57, 63])];
    case "div": return pick([[756, 6], [2184, 12], [945, 7], [1536, 8], [3250, 25], [868, 14], [2105, 5]]);
    case "frac": return pick([[1, 2, 1, 3], [2, 3, 1, 4], [3, 4, 1, 6], [1, 4, 3, 8], [5, 6, 1, 4], [2, 5, 1, 2], [3, 8, 1, 6]]);
    case "pct": return [ent(1, 20) * 20, ent(1, 10) * 5];
    case "regra3": { const a = ent(2, 6), u = pick([4, 5, 8, 10, 12, 15]); return [a, a * u, pick([7, 9, 11, 12, 15])]; }
    case "eq1": { const a = ent(2, 9), x = ent(2, 12), b = ent(1, 20); return [a, b, a * x + b]; }
    case "media": { const n = ent(3, 5); const v = Array.from({ length: n }, () => ent(4, 10)); const r = v.reduce((s, y) => s + y, 0) % n; v[0] = v[0]! + (r ? n - r : 0); return v; }
    default: return null;
  }
}

/** Confere os números digitados para montar a conta; devolve a mensagem de erro (ou null se estiver certo). */
export function validarBasico(tipo: TipoEsqueleto, n: number[]): string | null | undefined {
  const todos = (min: number, max: number) => n.every((v) => v >= min && v <= max);
  switch (tipo) {
    case "mmc": case "mdc": return n.length >= 2 && n.length <= 3 && todos(2, 999) ? null : "Digite 2 ou 3 números, ex.: 12, 18";
    case "soma": return n.length >= 2 && n.length <= 3 && todos(1, 99999) ? null : "Digite 2 ou 3 parcelas, ex.: 478, 356";
    case "sub": return n.length === 2 && n[0]! > n[1]! && todos(1, 99999) ? null : "Digite 2 números, o primeiro maior, ex.: 532, 187";
    case "mult": return n.length === 2 && n[0]! <= 9999 && n[1]! <= 99 && todos(1, 9999) ? null : "Digite 2 números (o segundo até 99), ex.: 23, 45";
    case "div": return n.length === 2 && n[1]! >= 2 && n[1]! <= 99 && n[0]! >= n[1]! && n[0]! <= 99999 ? null : "Digite dividendo e divisor (2 a 99), ex.: 756, 6";
    case "frac": return n.length === 4 && n.every((v) => v >= 1 && v <= 99) && n[1]! >= 2 && n[3]! >= 2 ? null : "Digite a, b, c, d para a/b + c/d, ex.: 1, 2, 1, 3";
    case "pct": return n.length === 2 && (n[0]! * n[1]!) % 100 === 0 && n[1]! <= 100 ? null : "Digite o número e a porcentagem (conta exata), ex.: 80, 15";
    case "regra3": return n.length === 3 && todos(1, 999) && (n[1]! * n[2]!) % n[0]! === 0 ? null : "Digite a, b, c com resposta exata, ex.: 3, 12, 7";
    case "eq1": return n.length === 3 && n[0]! >= 2 && n[2]! > n[1]! && (n[2]! - n[1]!) % n[0]! === 0 ? null : "Digite a, b, c para ax + b = c (resposta inteira), ex.: 3, 5, 20";
    case "media": return n.length >= 2 && n.length <= 6 && todos(0, 999) ? null : "Digite de 2 a 6 números, ex.: 5, 8, 7, 10";
    default: return undefined;
  }
}

export const COR: Cor = "preto";

/** Linha reta com um leve balanço, para parecer feita a mão. */
export function linhaManual(x0: number, y0: number, x1: number, y1: number, seed: number): Item {
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 10));
  const pts = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const q = Math.sin((i + seed) * 1.7) * 0.7;
    return [x0 + (x1 - x0) * t + (x1 === x0 ? q : 0), y0 + (y1 - y0) * t + (y1 === y0 ? q : 0)] as [number, number];
  });
  return { t: "tr", cor: COR, w: 3, segs: [pts] };
}

/** Construtor: guarda casas, passos e desenho fixo. */
export class Montador {
  casas: Casa[] = [];
  fixos: Item[] = [];
  fixosPasso: { passo: number; itens: Item[] }[] = [];
  /** Enquanto definido, o que for escrito entra só a partir deste passo. */
  grupo: number | null = null;
  passos: Passo[] = [];
  private alvo(): Item[] {
    if (this.grupo === null) return this.fixos;
    let g = this.fixosPasso.find((f) => f.passo === this.grupo);
    if (!g) { g = { passo: this.grupo, itens: [] }; this.fixosPasso.push(g); }
    return g.itens;
  }
  m0: ReturnType<Medidor>;
  constructor(public med: Medidor, public size: number, public cw: number) { this.m0 = med("0"); }
  passo(titulo: string, texto: string, porque: string, dica: string): number {
    this.passos.push({ titulo, texto, porque, dica, casas: [] });
    return this.passos.length - 1;
  }
  casa(p: number, x0: number, base: number, slots: number, esperado: string, alinha: "dir" | "esq", alt?: string): Casa {
    const c: Casa = { id: this.casas.length, passo: p, x0, x1: x0 + slots * this.cw, y0: base - this.m0.asc * this.size - 8, y1: base + 10, base, slots, cw: this.cw, esperado, alt, alinha };
    this.casas.push(c);
    this.passos[p]!.casas.push(c.id);
    return c;
  }
  txt(texto: string, x0: number, base: number, cw = this.cw): void {
    [...texto].forEach((ch, i) => {
      if (ch === " ") return;
      const cx = x0 + (i + 0.5) * cw;
      if (ehSinalVetor(ch)) this.alvo().push(...sinalNormalizado(ch, cx, base - this.m0.asc * this.size * 0.5, this.m0.asc * this.size, COR));
      else this.alvo().push(glifoEm(ch, cx, base, this.size, COR, this.med));
    });
  }
  linha(x0: number, y0: number, x1: number, y1: number, seed = 1): void { this.alvo().push(linhaManual(x0, y0, x1, y1, seed)); }
  pronto(tipo: TipoEsqueleto, nums: number[], titulo: string, resposta: string): Esqueleto {
    return { tipo, nums, titulo, size: this.size, fixos: this.fixos, ...(this.fixosPasso.length ? { fixosPasso: this.fixosPasso } : {}), casas: this.casas, passos: this.passos, resposta };
  }
}

/** Tamanho da letra: o maior que cabe na largura e na altura da lousa. */
export function tamanhoPara(med: Medidor, larg: number, alt: number, unidLarg: number, unidAlt: number, fator: number, max = 44): number {
  const m0 = med("0");
  return Math.max(18, Math.min(max, Math.floor((larg - 40) / (unidLarg * m0.w * fator)), Math.floor((alt - 36) / unidAlt)));
}

// ---------------------------------------------------------------- contas armadas (colunas)

function montarSoma(nums: number[], larg: number, med: Medidor, alt: number): Esqueleto {
  const soma = nums.reduce((s, v) => s + v, 0);
  const W = digitos(soma) + 1;
  const size = tamanhoPara(med, larg, alt, W, 1.3 + (nums.length + 2) * 1.6, 1.2, 46);
  const b = new Montador(med, size, med("0").w * size * 1.2);
  const { cw } = b, lh = size * 1.6, ox = Math.max(16, (larg - W * cw) / 2), top = size * 1.3;
  const col = (j: number) => ox + j * cw;
  const baseNum = (i: number) => top + lh * (i + 1);
  nums.forEach((n, i) => { b.txt(String(n), col(W - digitos(n)), baseNum(i)); });
  b.txt("+", col(0), baseNum(nums.length - 1));
  const yLinha = baseNum(nums.length - 1) + 12;
  b.linha(ox - 6, yLinha, ox + W * cw + 6, yLinha, 2);
  const baseRes = baseNum(nums.length - 1) + lh;
  const maxD = Math.max(...nums.map(digitos));
  let vaiUm = 0;
  for (let pos = 0; pos < maxD; pos++) {
    const c = W - 1 - pos;
    const ds = nums.filter((n) => digitos(n) > pos).map((n) => Number(String(n)[digitos(n) - 1 - pos]));
    const total = ds.reduce((s, v) => s + v, 0) + vaiUm;
    const out = total % 10, nc = Math.floor(total / 10);
    const conta = `${ds.join(" + ")}${vaiUm ? ` + ${vaiUm} (vai-um)` : ""}`;
    const p = b.passo(`Coluna ${NOME_POS[pos] ?? pos + 1}`, `Some os algarismos da coluna ${NOME_POS[pos] ?? ""}${vaiUm ? " e o vai-um que veio da direita" : ""}. Escreva embaixo o algarismo da direita do resultado${pos < maxD - 1 ? ' e o "vai-um" (se houver) em cima da próxima coluna' : ""}.`,
      `${conta} = ${total}. ${nc ? `Escreva ${out} embaixo e "vai ${nc}" para a coluna da esquerda.` : `Escreva ${out} embaixo.`}`, `Some de novo: ${conta}. Se passar de 9, só o algarismo da direita fica embaixo.`);
    b.casa(p, col(c), baseRes, 1, String(out), "dir");
    if (nc > 0 && pos < maxD - 1) b.casa(p, col(c - 1), top, 1, String(nc), "dir");
    vaiUm = nc;
  }
  if (vaiUm > 0) {
    const p = b.passo("Desça o vai-um", "Sobrou um vai-um sem coluna para somar: ele desce para o resultado.", `O ${vaiUm} desce e vira o primeiro algarismo do resultado.`, "Desça o vai-um que sobrou.");
    b.casa(p, col(W - 1 - maxD), baseRes, 1, String(vaiUm), "dir");
  }
  return b.pronto("soma", nums, nums.join(" + "), `${nums.join(" + ")} = ${soma}`);
}

function montarSub(nums: number[], larg: number, med: Medidor, alt: number): Esqueleto {
  const [a, bn] = [nums[0]!, nums[1]!];
  const res = a - bn;
  const W = digitos(a) + 1;
  const size = tamanhoPara(med, larg, alt, W, 1.3 + 4 * 1.6, 1.2, 46);
  const b = new Montador(med, size, med("0").w * size * 1.2);
  const { cw } = b, lh = size * 1.6, ox = Math.max(16, (larg - W * cw) / 2), top = size * 1.3;
  const col = (j: number) => ox + j * cw;
  b.txt(String(a), col(W - digitos(a)), top);
  b.txt("-", col(0), top + lh);
  b.txt(String(bn), col(W - digitos(bn)), top + lh);
  b.linha(ox - 6, top + lh + 12, ox + W * cw + 6, top + lh + 12, 2);
  let emprestou = 0;
  for (let pos = 0; pos < digitos(res) || (pos === 0); pos++) {
    const ta = Number(String(a)[digitos(a) - 1 - pos] ?? 0), ub = Number(String(bn)[digitos(bn) - 1 - pos] ?? 0);
    const topo = ta - emprestou;
    let t = topo, emp = 0;
    if (t < ub) { t += 10; emp = 1; }
    const out = t - ub;
    const p = b.passo(`Coluna ${NOME_POS[pos] ?? pos + 1}`,
      `Subtraia na coluna ${NOME_POS[pos] ?? ""}: ${emprestou ? `o ${ta} ficou ${topo} porque emprestou 1 para a coluna da direita; ` : ""}${topo} − ${ub}. Se o de cima for menor, empreste 1 da coluna da esquerda (vale 10).`,
      emp ? `${topo} é menor que ${ub}: empresta 1 da esquerda, ${topo} vira ${t}. ${t} − ${ub} = ${out}.` : `${topo} − ${ub} = ${out}.`,
      `Refaça ${topo} − ${ub}. Se não der, some 10 ao de cima e lembre de tirar 1 da coluna ao lado.`);
    b.casa(p, col(W - 1 - pos), top + lh * 2, 1, String(out), "dir");
    emprestou = emp;
  }
  return b.pronto("sub", nums, `${a} − ${bn}`, `${a} − ${bn} = ${res}`);
}

function montarMult(nums: number[], larg: number, med: Medidor, alt: number): Esqueleto {
  const [a, bn] = [nums[0]!, nums[1]!];
  const prod = a * bn, bDig = String(bn);
  const W = digitos(prod) + 1; // a coluna 0 fica livre para × e +
  const linhasMult = 2 + (bDig.length > 1 ? bDig.length : 0) + 1;
  const size = tamanhoPara(med, larg, alt, W, 1.3 + linhasMult * 1.6, 1.2, 46);
  const b = new Montador(med, size, med("0").w * size * 1.2);
  const { cw } = b, lh = size * 1.6, ox = Math.max(16, (larg - W * cw) / 2), top = size * 1.3;
  const col = (j: number) => ox + j * cw;
  b.txt(String(a), col(W - digitos(a)), top);
  b.txt("×", col(0), top + lh);
  b.txt(bDig, col(W - bDig.length), top + lh);
  let y = top + lh;
  b.linha(ox - 6, y + 12, ox + W * cw + 6, y + 12, 2);
  if (bDig.length > 1) {
    [...bDig].reverse().forEach((ch, i) => {
      y += lh;
      const parcial = a * Number(ch);
      const p = b.passo(`Multiplicar pelo algarismo ${NOME_DIG[i] ?? i + 1}`,
        `Multiplique ${a} pelo algarismo ${NOME_DIG[i] ?? ""} de ${bn} (o ${ch}).${i > 0 ? ` Como é a casa ${NOME_DIG[i]}, esta linha começa ${i} casa${i > 1 ? "s" : ""} mais à esquerda (o ${ch} vale ${Number(ch) * 10 ** i}).` : ""}`,
        `${a} × ${ch} = ${parcial}${i > 0 ? ` (na verdade ${a} × ${Number(ch) * 10 ** i} = ${parcial * 10 ** i}; o zero final fica subentendido pelo deslocamento)` : ""}.`,
        `Use a tabuada do ${ch}: multiplique cada algarismo de ${a} da direita para a esquerda, lembrando do vai-um.`);
      b.casa(p, col(1), y, W - 1 - i, String(parcial), "dir");
      if (i === bDig.length - 1) b.txt("+", col(0), y);
    });
    b.linha(ox - 6, y + 12, ox + W * cw + 6, y + 12, 3);
  }
  y += lh;
  const p = b.passo(bDig.length > 1 ? "Somar as linhas" : `Multiplicar ${a} por ${bn}`,
    bDig.length > 1 ? "Some as linhas de cima (cada uma no seu lugar, alinhadas à direita)." : `Multiplique ${a} por ${bn}, da direita para a esquerda, lembrando do vai-um.`,
    bDig.length > 1 ? `Somando as linhas: ${[...bDig].reverse().map((ch, i) => a * Number(ch) * 10 ** i).join(" + ")} = ${prod}.` : `${a} × ${bn} = ${prod}.`,
    "Confira a soma coluna por coluna (ou refaça a multiplicação).");
  b.casa(p, col(1), y, W - 1, String(prod), "dir");
  return b.pronto("mult", nums, `${a} × ${bn}`, `${a} × ${bn} = ${prod}`);
}

function montarDiv(nums: number[], larg: number, med: Medidor, alt: number): Esqueleto {
  const [a, dv] = [nums[0]!, nums[1]!];
  const ds = String(a).split("").map(Number), n = ds.length;
  let k = 1, cur = ds[0]!;
  while (cur < dv && k < n) { cur = cur * 10 + ds[k]!; k++; }
  const passosQtd = n - k + 1;
  const unid = 1 + n + 0.5 + digitos(dv) + 1 + Math.max(1, passosQtd);
  const size = tamanhoPara(med, larg, alt, unid, 1.3 + (2 * passosQtd + 1) * 1.6, 1.15, 44);
  const b = new Montador(med, size, med("0").w * size * 1.15);
  const { cw } = b, lh = size * 1.6, ox = Math.max(14, (larg - unid * cw) / 2), top = size * 1.3;
  const col = (j: number) => ox + (j + 1) * cw; // uma coluna livre à esquerda para o sinal de menos
  b.txt(String(a), col(0), top);
  const xBar = col(n) + cw * 0.35, xDiv = xBar + cw * 0.6;
  b.linha(xBar, top - b.m0.asc * size - 6, xBar, top + 14, 1);
  b.txt(String(dv), xDiv, top);
  b.linha(xBar, top + 14, xDiv + Math.max(digitos(dv), passosQtd) * cw + 4, top + 14, 2);
  let i = k - 1;
  for (let s = 0; s < passosQtd; s++) {
    const q = Math.floor(cur / dv), prod = q * dv, rem = cur - prod;
    const prox = i + 1 < n ? ds[i + 1]! : null;
    const work = prox !== null ? rem * 10 + prox : rem;
    const rP = top + lh * (2 * s + 1), rW = top + lh * (2 * s + 2);
    const p = b.passo(s === 0 ? "Primeira divisão" : prox === null ? "Última divisão" : "Baixar e dividir",
      `① Quantas vezes ${dv} cabe em ${cur}? Escreva o número no quociente (embaixo do ${dv}). ② Multiplique esse número por ${dv} e escreva embaixo de ${cur}. ③ Subtraia${prox !== null ? ` e baixe o próximo algarismo (o ${prox})` : " para achar o resto"}.`,
      `${dv} cabe ${q} vez${q === 1 ? "" : "es"} em ${cur} (${q} × ${dv} = ${prod}). ${cur} − ${prod} = ${rem}.${prox !== null ? ` Baixando o ${prox}, fica ${work}.` : ` Resto ${rem}${rem === 0 ? ": divisão exata!" : "."}`}`,
      `Procure o maior número que, multiplicado por ${dv}, não passa de ${cur}. Depois subtraia.`);
    b.casa(p, xDiv + s * cw, top + lh * 0.95, 1, String(q), "esq");
    const slP = Math.min(i + 1, digitos(dv) + 1);
    b.casa(p, col(i + 1 - slP), rP, slP, String(prod), "dir");
    b.txt("-", col(i - slP), rP);
    b.linha(col(i + 1 - slP), rP + 9, col(i + 1), rP + 9, s + 3);
    const fimW = prox !== null ? i + 2 : i + 1;
    const slW = Math.max(1, Math.min(fimW, digitos(work) + 1));
    b.casa(p, col(fimW - slW), rW, slW, String(work), "dir", prox !== null ? `${rem}${prox}` : undefined);
    cur = work; i += 1;
  }
  const q = Math.floor(a / dv), r = a % dv;
  return b.pronto("div", nums, `${a} ÷ ${dv}`, `${a} ÷ ${dv} = ${q}${r ? `, resto ${r}` : ""}`);
}

function montarMmcMdc(tipo: "mmc" | "mdc", nums: number[], larg: number, med: Medidor, alt: number): Esqueleto {
  const { linhas, primos } = tipo === "mmc" ? passosMmc(nums) : passosMdc(nums);
  const d = Math.max(...nums.map(digitos));
  const celulas = nums.length * d + (nums.length - 1) * 1.1 + 1.2 + 2.6;
  const ultima = linhas.length - 1;
  const r = tipo === "mmc" ? mmcDe(nums) : mdcDe(nums);
  // multiplicações dos primos: cada uma é uma conta armada (como na multiplicação), que só aparece no passo dela
  const mults: { a: number; f: number; res: number }[] = [];
  { let acc = primos[0] ?? 1; for (let j = 1; j < primos.length; j++) { mults.push({ a: acc, f: primos[j]!, res: acc * primos[j]! }); acc *= primos[j]!; } }
  const nMult = mults.length;
  const larguraBloco = (m: { res: number }) => digitos(m.res) + 1; // coluna do × + algarismos
  /** Encaixa as contas armadas lado a lado, quebrando linha quando não cabem. */
  const empacotar = (cwx: number) => {
    const disp = Math.floor((larg - 28) / cwx), pos: { col: number; lin: number }[] = [];
    let col = 0, lin = 0;
    for (const m of mults) { const w = larguraBloco(m); if (col > 0 && col + w > disp) { col = 0; lin++; } pos.push({ col, lin }); col += w + 1.4; }
    return { pos, linhas: nMult ? lin + 1 : 0 };
  };
  let size = Math.min(44, Math.floor((larg - 40) / (Math.max(celulas, 10) * med("0").w * 1.15)));
  for (; size > 18; size--) {
    const cwx = med("0").w * size * 1.15, lhx = size * 1.55;
    if (size * 1.3 + (ultima + 1.25) * lhx + empacotar(cwx).linhas * 3.1 * lhx + 1.3 * lhx <= alt - 12) break;
  }
  size = Math.max(18, size);
  const b = new Montador(med, size, med("0").w * size * 1.15);
  const { cw } = b, ox = Math.max(16, (larg - celulas * cw) / 2), ox0 = 16, top = size * 1.3, lh = size * 1.55;
  let x = ox;
  const xs: number[] = [];
  nums.forEach((n, k) => {
    xs.push(x);
    b.txt(String(n), x + (d - digitos(n)) * cw, top);
    x += d * cw;
    if (k < nums.length - 1) { b.txt(",", x, top, cw * 1.1); x += cw * 1.1; }
  });
  const xBarra = x + cw * 0.5, xPrimo = xBarra + cw * 0.7;
  b.linha(xBarra, top - b.m0.asc * size - 6, xBarra, top + Math.max(0, ultima) * lh + 10, 1);
  const nome = tipo === "mmc" ? "menor número primo que divide algum dos números" : "menor número primo que divide TODOS os números";
  for (let i = 1; i < linhas.length; i++) {
    const base = top + i * lh;
    const p = b.passo(`Dividir por ${primos[i - 1]}`,
      `Procure o ${nome} da linha de cima (${linhas[i - 1]!.join(", ")}). Escreva o primo à direita da barra e depois a nova linha: o que for divisível é dividido, o que não for desce igual.`,
      `${primos[i - 1]} é o ${nome.replace("número primo", "primo")}. ${linhas[i - 1]!.join(", ")} ÷ ${primos[i - 1]} → ${linhas[i]!.join(", ")}.`,
      tipo === "mmc" ? "Teste os primos 2, 3, 5, 7… nessa ordem: o primeiro que dividir algum número é o certo." : "Só vale o primo que divide todos os números da linha ao mesmo tempo.");
    b.casa(p, xPrimo, top + (i - 1) * lh, 2, String(primos[i - 1]), "esq").nota = `${primos[i - 1]} divide ${tipo === "mmc" ? "algum" : "todos"} dos números da linha de cima.`;
    linhas[i]!.forEach((v, k) => {
      const ant = linhas[i - 1]![k]!, pr = primos[i - 1]!;
      b.casa(p, xs[k]!, base, d, String(v), "dir").nota = ant % pr === 0 ? `${ant} ÷ ${pr} = ${v}.` : `${ant} não é divisível por ${pr}, então desce igual (${v}).`;
      if (k < nums.length - 1) b.txt(",", xs[k]! + d * cw, base, cw * 1.1);
    });
  }
  const rot = tipo === "mmc" ? "MMC =" : "MDC =";
  // cada multiplicação: conta armada com espaço em branco, só no passo dela
  const yCad = top + (ultima + 1.25) * lh;
  const emp = empacotar(cw);
  mults.forEach((m, j) => {
    const w = larguraBloco(m), bx = ox0 + emp.pos[j]!.col * cw, by = yCad + emp.pos[j]!.lin * 3.1 * lh, dir = bx + w * cw;
    const ds = String(m.a).split("").map(Number).reverse(); // unidade primeiro
    const desenho = (p: number) => {
      b.grupo = p;
      b.txt(String(m.a), bx + (w - digitos(m.a)) * cw, by);
      b.txt("×", bx, by + lh);
      b.txt(String(m.f), bx + (w - digitos(m.f)) * cw, by + lh);
      b.linha(bx - 4, by + lh + 12, bx + w * cw + 4, by + lh + 12, 2 + j);
      b.grupo = null;
    };
    if (ds.length === 1) {
      const p = b.passo(`Multiplicar ${j === 0 ? "os primos" : "pelo próximo primo"}`,
        j === 0 ? `Hora de multiplicar os primos da coluna da direita (${primos.join(", ")}). Na conta armada, multiplique ${m.a} por ${m.f}.` : `Continue: multiplique o resultado anterior (${m.a}) pelo próximo primo (${m.f}) na conta armada.`,
        `${m.a} × ${m.f} = ${m.res}.`, `Use a tabuada do ${m.f}.`);
      desenho(p);
      b.casa(p, dir - digitos(m.res) * cw, by + 2.05 * lh, digitos(m.res), String(m.res), "esq").nota = `${m.a} × ${m.f} = ${m.res}.`;
      return;
    }
    // vários algarismos: uma coluna por passo, da direita para a esquerda, com o vai-um
    let vai = 0;
    ds.forEach((d, k) => {
      const total = d * m.f + vai, ultimo = k === ds.length - 1, saida = ultimo ? String(total) : String(total % 10), nc = ultimo ? 0 : Math.floor(total / 10);
      const nome = NOME_POS[k] ?? `${k + 1}ª casa`;
      const p = b.passo(`${m.a} × ${m.f}: coluna ${nome}`,
        `${k === 0 ? `Multiplicando ${m.a} por ${m.f}, comece pela direita. ` : "Agora a coluna seguinte. "}Multiplique o algarismo ${d} (${nome}) por ${m.f}${vai ? ` e some o vai-um ${vai}` : ""}. ${ultimo ? "Como é a última coluna, escreva o número inteiro." : 'Escreva só o algarismo da direita (o resto é o "vai-um").'}`,
        `${d} × ${m.f}${vai ? ` + ${vai}` : ""} = ${total}. ${ultimo ? `Escreva ${total}.` : nc ? `Escreva ${total % 10} e vai ${nc} para a próxima coluna.` : `Escreva ${total % 10}; não sobra vai-um.`}`,
        `Tabuada do ${m.f}: ${d} × ${m.f} = ${d * m.f}${vai ? `, mais o vai-um ${vai}` : ""}.`);
      if (k === 0) desenho(p);
      const n = saida.length;
      b.casa(p, dir - (k + n) * cw, by + 2.05 * lh, n, saida, "dir").nota = `${d} × ${m.f}${vai ? ` + ${vai}` : ""} = ${total}${ultimo ? "" : `: escreve ${total % 10}, vai ${nc}`}.`;
      vai = nc;
    });
  });
  const yRes = yCad + emp.linhas * 3.1 * lh + (nMult ? 0.1 * lh : 0);
  b.txt(rot, ox, yRes);
  const p = b.passo("Resultado", tipo === "mmc" ? (nMult ? "Escreva o resultado da última multiplicação: é o MMC." : "Escreva o primo da coluna da direita: é o MMC.") : primos.length ? (nMult ? "Escreva o resultado da última multiplicação: é o MDC." : "Escreva o primo usado: é o MDC.") : "Nenhum primo divide todos os números, então o MDC é 1.",
    primos.length ? `${primos.join(" × ")} = ${r}.` : "Não há primo comum: MDC = 1.", "Use o resultado da última multiplicação.");
  b.casa(p, ox + (rot.length + 0.6) * cw, yRes, 4, String(r), "esq");
  return b.pronto(tipo, nums, `${tipo === "mmc" ? "MMC" : "MDC"} (${nums.join(", ")})`, `${tipo === "mmc" ? "MMC" : "MDC"} = ${r}`);
}

// ---------------------------------------------------------------- contas em linhas (frações, %, regra de três, equação, média)

export type Tok = string | { c: string; alt?: string; opcoes?: string[] } | { f: [Tok[], Tok[]] };
export interface Bloco { passo?: { titulo: string; texto: string; porque: string; dica: string }; linhas: Tok[][] }

export const larguraTok = (t: Tok): number => (typeof t === "string" ? t.length : "c" in t ? Math.max(1, t.c.length, ...(t.opcoes ?? []).map((o) => o.length)) : Math.max(larguraSeq(t.f[0]), larguraSeq(t.f[1])) + 0.7);
export const larguraSeq = (s: Tok[]): number => s.reduce((a, t) => a + larguraTok(t), 0);
export const temFrac = (l: Tok[]): boolean => l.some((t) => typeof t !== "string" && "f" in t);

export function montarLinhas(tipo: TipoEsqueleto, nums: number[], titulo: string, resposta: string, blocos: Bloco[], larg: number, med: Medidor, alt: number, entrada?: string): Esqueleto {
  const maxW = Math.max(...blocos.flatMap((b) => b.linhas.map(larguraSeq)));
  const unidAlt = 0.6 + blocos.reduce((a, b) => a + b.linhas.reduce((s, l) => s + (temFrac(l) ? 2.3 : 1.6), 0), 0);
  const size = tamanhoPara(med, larg, alt, maxW + 0.5, unidAlt, 1.15, 40);
  const b = new Montador(med, size, med("0").w * size * 1.15);
  const { cw } = b, asc = b.m0.asc * size;
  const ox = Math.max(14, (larg - maxW * cw) / 2);
  let rowTop = size * 0.5;
  const colocar = (seq: Tok[], x: number, y: number, p: number, base: number): number => {
    for (const t of seq) {
      if (typeof t === "string") { b.txt(t, x, y); x += t.length * cw; }
      else if ("c" in t) { const sl = larguraTok(t); const ca = b.casa(p, x, y, sl, t.c, "esq", t.alt); if (t.opcoes) ca.opcoes = t.opcoes; x += sl * cw; }
      else {
        const w = larguraTok(t) * cw, axis = y - asc * 0.5;
        const wn = larguraSeq(t.f[0]) * cw, wd = larguraSeq(t.f[1]) * cw;
        b.linha(x, axis, x + w, axis, Math.round(x));
        colocar(t.f[0], x + (w - wn) / 2, axis - 6, p, base);
        colocar(t.f[1], x + (w - wd) / 2, axis + 6 + asc, p, base);
        x += w;
      }
    }
    return x;
  };
  for (const bl of blocos) {
    const p = bl.passo ? b.passo(bl.passo.titulo, bl.passo.texto, bl.passo.porque, bl.passo.dica) : -1;
    for (const l of bl.linhas) {
      const f = temFrac(l);
      const y = rowTop + (f ? 1.25 : 1.0) * size;
      colocar(l, ox, y, p, y);
      rowTop += (f ? 2.3 : 1.6) * size;
    }
  }
  const e = b.pronto(tipo, nums, titulo, resposta);
  if (entrada !== undefined) e.entrada = entrada;
  return e;
}

export const c = (v: string | number): Tok => ({ c: String(v) });
export const fr = (n: Tok[], d: Tok[]): Tok => ({ f: [n, d] });

function montarFrac(nums: number[], larg: number, med: Medidor, alt: number): Esqueleto {
  const [a, bb, cc, dd] = nums as [number, number, number, number];
  const m = mmcDe([bb, dd]), k1 = m / bb, k2 = m / dd, na = a * k1, nc = cc * k2, sn = na + nc, g = gcd(sn, m), rn = sn / g, rd = m / g;
  const blocos: Bloco[] = [
    { linhas: [[fr([String(a)], [String(bb)]), " + ", fr([String(cc)], [String(dd)]), " = ?"]] },
    { passo: { titulo: "Denominador comum", texto: `Os denominadores (${bb} e ${dd}) são diferentes, então não dá para somar direto. Calcule o MMC deles: será o novo denominador.`, porque: `MMC(${bb}, ${dd}) = ${m}. Os dois denominadores vão virar ${m}.`, dica: `Liste os múltiplos de ${bb} e de ${dd} até achar o primeiro em comum.` }, linhas: [[`MMC(${bb},${dd}) = `, c(m)]] },
    { passo: { titulo: "Frações equivalentes", texto: `Transforme cada fração em outra de mesmo valor com denominador ${m}: divida ${m} pelo denominador antigo e multiplique o numerador pelo resultado.`, porque: `${m} ÷ ${bb} = ${k1}, então ${a} × ${k1} = ${na}. ${m} ÷ ${dd} = ${k2}, então ${cc} × ${k2} = ${nc}.`, dica: `O que você faz embaixo (×${k1} e ×${k2}) tem que fazer em cima também.` },
      linhas: [[fr([String(a)], [String(bb)]), " = ", fr([c(na)], [c(m)])], [fr([String(cc)], [String(dd)]), " = ", fr([c(nc)], [c(m)])]] },
    { passo: { titulo: "Some os numeradores", texto: "Com denominadores iguais, some só os numeradores e mantenha o denominador.", porque: `${na} + ${nc} = ${sn}. O denominador ${m} continua.`, dica: "Some apenas os números de cima; o de baixo não muda." },
      linhas: [[fr([String(na)], [String(m)]), " + ", fr([String(nc)], [String(m)]), " = ", fr([c(sn)], [c(m)])]] },
    { passo: { titulo: "Simplifique", texto: "Veja se dá para simplificar: divida numerador e denominador pelo MAIOR número que divide os dois. Se não der, repita a fração.", porque: g > 1 ? `${sn} e ${m} são divisíveis por ${g}: ${sn} ÷ ${g} = ${rn} e ${m} ÷ ${g} = ${rd}.` : `${sn} e ${m} não têm divisor comum além do 1: a fração já está simplificada.`, dica: `Procure o maior número que divide ${sn} e ${m} ao mesmo tempo (o MDC).` },
      linhas: [[fr([String(sn)], [String(m)]), " = ", fr([c(rn)], [c(rd)])]] },
  ];
  return montarLinhas("frac", nums, `${a}/${bb} + ${cc}/${dd}`, `${a}/${bb} + ${cc}/${dd} = ${rn}/${rd}`, blocos, larg, med, alt);
}

function montarPct(nums: number[], larg: number, med: Medidor, alt: number): Esqueleto {
  const [n, x] = [nums[0]!, nums[1]!];
  const prod = n * x, res = prod / 100;
  const blocos: Bloco[] = [
    { linhas: [[`${x}% de ${n} = ?`]] },
    { passo: { titulo: "Porcentagem vira fração", texto: "Por cento quer dizer \"por cem\": escreva a porcentagem como uma fração com denominador 100.", porque: `${x}% = ${x}/100.`, dica: "O número da porcentagem vai em cima e 100 embaixo." }, linhas: [[`${x}% = `, fr([c(x)], [c(100)])]] },
    { passo: { titulo: "Multiplique", texto: `"De" significa multiplicar: multiplique o número (${n}) pelo numerador da fração. O denominador continua 100.`, porque: `${n} × ${x} = ${prod}, então ${n} × ${x}/100 = ${prod}/100.`, dica: `Calcule ${n} × ${x} (dá para fazer na multiplicação armada).` }, linhas: [[`${n} × `, fr([String(x)], ["100"]), " = ", fr([c(prod)], ["100"])]] },
    { passo: { titulo: "Divida por 100", texto: "Agora divida o numerador por 100: corte dois zeros (ou ande com a vírgula duas casas).", porque: `${prod} ÷ 100 = ${res}. Logo ${x}% de ${n} é ${res}.`, dica: "Dividir por 100 é cortar dois zeros do final." }, linhas: [[fr([String(prod)], ["100"]), " = ", c(res)]] },
  ];
  return montarLinhas("pct", nums, `${x}% de ${n}`, `${x}% de ${n} = ${res}`, blocos, larg, med, alt);
}

function montarRegra3(nums: number[], larg: number, med: Medidor, alt: number): Esqueleto {
  const [a, bb, cc] = nums as [number, number, number];
  const cruz = bb * cc, xv = cruz / a;
  const blocos: Bloco[] = [
    { linhas: [[`Grandeza A    Grandeza B`], [`   ${a}    →    ${bb}`], [`   ${cc}    →    x`]] },
    { passo: { titulo: "Monte a proporção", texto: "Monte duas frações iguais: em cada uma, a grandeza A fica em cima e a B embaixo. Primeira linha da tabela de um lado, segunda do outro (use x na incógnita).", porque: `${a}/${bb} = ${cc}/x. Cada fração compara A com B.`, dica: "Em cima: os valores de A; embaixo: os de B (e o x no lugar do que não sabemos). Digite x no teclado." },
      linhas: [[fr([c(a)], [c(bb)]), " = ", fr([c(cc)], [c("x")])]] },
    { passo: { titulo: "Multiplique em cruz", texto: "Multiplique em cruz (de cima de um lado com o de baixo do outro) e iguale os produtos.", porque: `${a} × x = ${bb} × ${cc} = ${cruz}.`, dica: `Um lado fica ${a} × x e o outro é ${bb} × ${cc}.` },
      linhas: [[c(a), " × x = ", c(cruz)]] },
    { passo: { titulo: "Isole o x", texto: "Para isolar o x, passe o número que o multiplica para o outro lado dividindo.", porque: `x = ${cruz} ÷ ${a}.`, dica: `O ${a} que multiplica o x passa dividindo.` },
      linhas: [["x = ", fr([c(cruz)], [c(a)])]] },
    { passo: { titulo: "Resultado", texto: "Faça a divisão para achar o valor de x.", porque: `${cruz} ÷ ${a} = ${xv}. Então x = ${xv}.`, dica: `Calcule ${cruz} ÷ ${a} (dá para usar a divisão em chave).` }, linhas: [["x = ", c(xv)]] },
  ];
  return montarLinhas("regra3", nums, `${a} → ${bb}, ${cc} → x`, `x = ${xv}`, blocos, larg, med, alt);
}

function montarEq1(nums: number[], larg: number, med: Medidor, alt: number): Esqueleto {
  const [a, bb, cc] = nums as [number, number, number];
  const dif = cc - bb, xv = dif / a;
  const blocos: Bloco[] = [
    { linhas: [[`${a}x + ${bb} = ${cc}`]] },
    { passo: { titulo: "Isole o termo com x", texto: `Passe o ${bb} para o outro lado do igual. Quando muda de lado, troca o sinal: o + vira −.`, porque: `${a}x = ${cc} − ${bb}. O ${bb} passou para o outro lado com o sinal trocado.`, dica: "Quem está somando passa subtraindo." }, linhas: [[`${a}x = `, c(cc), " - ", c(bb)]] },
    { passo: { titulo: "Calcule a subtração", texto: "Faça a conta do lado direito.", porque: `${cc} − ${bb} = ${dif}. Agora a equação é ${a}x = ${dif}.`, dica: `Calcule ${cc} − ${bb}.` }, linhas: [[`${a}x = `, c(dif)]] },
    { passo: { titulo: "Divida pelo número do x", texto: `O ${a} está multiplicando o x: passe-o para o outro lado dividindo.`, porque: `x = ${dif} ÷ ${a}.`, dica: `Quem multiplica passa dividindo: ${dif} dividido por ${a}.` }, linhas: [["x = ", fr([c(dif)], [c(a)])]] },
    { passo: { titulo: "Resultado", texto: "Faça a divisão. Esse é o valor de x.", porque: `${dif} ÷ ${a} = ${xv}. Teste: ${a} × ${xv} + ${bb} = ${a * xv + bb} ✓.`, dica: `Calcule ${dif} ÷ ${a}.` }, linhas: [["x = ", c(xv)]] },
  ];
  return montarLinhas("eq1", nums, `${a}x + ${bb} = ${cc}`, `x = ${xv}`, blocos, larg, med, alt);
}

function montarMedia(nums: number[], larg: number, med: Medidor, alt: number): Esqueleto {
  const n = nums.length, soma = nums.reduce((s, v) => s + v, 0), m = soma / n;
  const blocos: Bloco[] = [
    { linhas: [[`Valores: ${nums.join(", ")}`]] },
    { passo: { titulo: "Some todos os valores", texto: "A média aritmética começa somando todos os valores.", porque: `${nums.join(" + ")} = ${soma}.`, dica: "Some um por um, sem esquecer nenhum." }, linhas: [[`${nums.join(" + ")} = `, c(soma)]] },
    { passo: { titulo: "Divida pela quantidade", texto: `Divida a soma pela quantidade de valores (são ${n}).`, porque: `${soma} ÷ ${n} = ${fmt(m)}. A média é ${fmt(m)}.`, dica: `Conte quantos valores existem (${n}) e divida a soma por esse número.` }, linhas: [[fr([c(soma)], [String(n)]), " = ", c(fmt(m))]] },
  ];
  return montarLinhas("media", nums, `Média de ${nums.join(", ")}`, `Média = ${fmt(m)}`, blocos, larg, med, alt);
}

/** Monta o esqueleto no tamanho certo para a lousa (largura x altura disponíveis). */
export function montarBasico(tipo: TipoEsqueleto, nums: number[], larg: number, med: Medidor, alt = 100000): Esqueleto | null {
  switch (tipo) {
    case "soma": return montarSoma(nums, larg, med, alt);
    case "sub": return montarSub(nums, larg, med, alt);
    case "mult": return montarMult(nums, larg, med, alt);
    case "div": return montarDiv(nums, larg, med, alt);
    case "mmc": case "mdc": return montarMmcMdc(tipo, nums, larg, med, alt);
    case "frac": return montarFrac(nums, larg, med, alt);
    case "pct": return montarPct(nums, larg, med, alt);
    case "regra3": return montarRegra3(nums, larg, med, alt);
    case "eq1": return montarEq1(nums, larg, med, alt);
    case "media": return montarMedia(nums, larg, med, alt);
    default: return null;
  }
}

const dentro = (i: Item, c: Casa): i is ItemGlifo => i.t === "gl" && i.cx >= c.x0 && i.cx <= c.x1 && Math.abs(i.base - c.base) <= 3; // a linha de base é exata: casas vizinhas não se confundem

/** Texto digitado numa casa (lido da esquerda para a direita). */
export function textoDaCasa(itens: Item[], c: Casa): string {
  return itens.filter((i): i is ItemGlifo => dentro(i, c)).sort((p, q) => p.cx - q.cx).map((i) => i.ch).join("");
}

/** Escreve (substitui) o texto de uma casa, alinhado como o aluno faria. */
export function colocarNaCasa(itens: Item[], c: Casa, texto: string, cor: Cor, med: Medidor, size: number): Item[] {
  const fora = itens.filter((i) => !dentro(i, c));
  const ini = c.alinha === "dir" ? c.slots - texto.length : 0;
  const novos = [...texto].map((ch, i) => glifoEm(ch, c.x0 + (ini + i + 0.5) * c.cw, c.base, size, cor, med));
  return [...fora, ...novos];
}

export const casaCerta = (itens: Item[], c: Casa): boolean => { const t = textoDaCasa(itens, c); return t === c.esperado || (!!c.alt && t === c.alt); };
/** A casa já tem o número de caracteres esperado (pode ser conferida)? */
export const casaCompleta = (itens: Item[], c: Casa): boolean => { const t = textoDaCasa(itens, c); return c.opcoes ? c.opcoes.includes(t) : t.length >= (c.alt ? Math.min(c.esperado.length, c.alt.length) : c.esperado.length); };

/** true/false para cada casa: o que o aluno escreveu bate com o esperado? */
export function conferir(itens: Item[], e: Esqueleto): boolean[] {
  return e.casas.map((c) => casaCerta(itens, c));
}

export { CORES };
