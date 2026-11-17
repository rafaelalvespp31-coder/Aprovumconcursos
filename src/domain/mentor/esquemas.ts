import { esquemaDe, linhaSchema, novoEsquema, type EsquemaCtx, type ItemDesenho, type LinhaLousa } from "./lousa";

/**
 * Esquemas desenhados do que o Mentor FALA (mini-quadro 400×140, só primitivas): tabela de MMC/MDC, conta armada,
 * chave de divisão, barras de fração/porcentagem, linha do tempo e, por último, quantidades / regra de três.
 */
type Cor = "grafite" | "vermelho" | "azul" | "verde" | "laranja" | "roxo" | "rosa";
const L = (rabisco: ItemDesenho[]): LinhaLousa => linhaSchema.parse({ tipo: "desenho", texto: "", nivel: 1, rabisco });
const tx = (x: number, y: number, s: string, cor: Cor): ItemDesenho => ({ t: "texto", x: Math.max(0, Math.round(x)), y, s: s.slice(0, 40), cor });
const lin = (x1: number, y1: number, x2: number, y2: number, cor: Cor = "grafite", seta?: boolean): ItemDesenho => ({ t: "linha", x1: Math.max(0, x1), y1, x2: Math.max(0, x2), y2, cor, seta });
const CW = 11; // largura média de um dígito na letra do quadro
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const fmt = (n: number) => String(n);

export interface Ctx { q: EsquemaCtx; modo?: "mmc" | "mdc"; feito: boolean; usadas: Set<string>; anos: { ano: string; rot: string }[] }
export function novoCtx(pedido: string): Ctx {
  const s = norm(pedido);
  const modo = /\bm\.?m\.?c\b|minimo multiplo/.test(s) ? "mmc" : /\bm\.?d\.?c\b|maximo divisor/.test(s) ? "mdc" : undefined;
  return { q: novoEsquema(), modo, feito: false, usadas: new Set(), anos: [] };
}

function passos(ns: number[]): { p: number; vals: number[] }[] | null {
  const rows: { p: number; vals: number[] }[] = [];
  let v = [...ns];
  while (v.some((x) => x > 1)) {
    let p = 2;
    while (!v.some((x) => x > 1 && x % p === 0)) p++;
    v = v.map((x) => (x > 1 && x % p === 0 ? x / p : x));
    rows.push({ p, vals: [...v] });
    if (rows.length > 5) return null;
  }
  return rows;
}

function tabelaMmc(modo: "mmc" | "mdc", ns: number[]): LinhaLousa | null {
  const rows = passos(ns);
  if (!rows?.length) return null;
  const pitch = Math.min(26, 120 / (rows.length + 1));
  const y0 = 24;
  const colx = (i: number) => 24 + i * 66;
  const barX = 24 + ns.length * 66 - 12;
  const it: ItemDesenho[] = [];
  ns.forEach((n, i) => it.push(tx(colx(i), y0, fmt(n), "azul")));
  it.push(lin(barX, 6, barX, y0 + rows.length * pitch + 6));
  let ant = [...ns];
  const usados: number[] = [];
  rows.forEach((r, k) => {
    const todos = ant.every((x) => x > 1 && x % r.p === 0);
    const conta = modo === "mmc" || todos;
    if (conta) usados.push(r.p);
    it.push(tx(barX + 14, y0 + k * pitch, fmt(r.p), conta ? "vermelho" : "grafite"));
    r.vals.forEach((n, i) => it.push(tx(colx(i), y0 + (k + 1) * pitch, fmt(n), "azul")));
    ant = r.vals;
  });
  const prod = usados.reduce((a, b) => a * b, 1);
  const rx = barX + 70;
  it.push(tx(rx, 34, modo === "mmc" ? "MMC =" : "MDC =", "laranja"));
  if (usados.length && usados.length <= 5) it.push(tx(rx, 66, usados.join(" · "), "vermelho"));
  it.push(tx(rx, 98, `= ${prod}`, "verde"));
  return L(it);
}

function contaArmada(a: number, op: "+" | "−" | "×", b: number): LinhaLousa {
  const r = op === "+" ? a + b : op === "−" ? a - b : a * b;
  const w = Math.max(fmt(a).length, fmt(b).length, fmt(r).length);
  const dir = 60 + w * CW + 30;
  const at = (n: number) => dir - fmt(n).length * CW;
  return L([
    tx(at(a), 36, fmt(a), "azul"),
    tx(40, 74, op, "vermelho"), tx(at(b), 74, fmt(b), "azul"),
    lin(34, 84, dir + 6, 84, "grafite"),
    tx(at(r), 122, fmt(r), "verde"),
  ]);
}

function chaveDivisao(a: number, b: number): LinhaLousa {
  const q = Math.floor(a / b), r = a % b;
  const x0 = 24 + fmt(a).length * CW + 14;
  const it: ItemDesenho[] = [
    tx(24, 66, fmt(a), "azul"),
    lin(x0, 34, x0, 100),
    lin(x0, 72, x0 + 20 + Math.max(fmt(b).length, fmt(q).length) * CW + 14, 72),
    tx(x0 + 12, 62, fmt(b), "vermelho"),
    tx(x0 + 12, 100, fmt(q), "verde"),
  ];
  if (r > 0) it.push(tx(24, 122, `resto ${r}`, "laranja"));
  return L(it);
}

function barra(k: number, n: number, rotulo: string): LinhaLousa {
  const w = Math.min(34, 340 / n);
  const it: ItemDesenho[] = [];
  for (let i = 0; i < n; i++) it.push({ t: "ret", x: 24 + i * w, y: 44, w: w - 2, h: 34, cor: i < k ? "vermelho" : "grafite" });
  it.push(tx(24, 112, rotulo, "vermelho"));
  return L(it);
}

function eventosTempo(ev: { ano: string; rot: string }[]): LinhaLousa {
  const n = ev.length;
  const it: ItemDesenho[] = [lin(14, 76, 388, 76, "grafite", true)];
  ev.forEach((e, i) => {
    const x = n === 1 ? 200 : 44 + (i * 312) / (n - 1);
    it.push({ t: "circ", cx: Math.round(x), cy: 76, r: 6, cor: "vermelho" });
    it.push(tx(x - 22, 52, e.ano, "azul"));
    it.push(tx(Math.max(0, Math.min(x - 30, 392 - e.rot.length * 11)), 106, e.rot, i % 2 ? "roxo" : "verde"));
  });
  return L(it);
}

/** Fecha a linha do tempo que ficou pendente (chame quando o Mentor termina o turno). */
export function fimTempo(ctx: Ctx): LinhaLousa[] {
  if (ctx.anos.length < 2) { ctx.anos = []; return []; }
  const d = eventosTempo(ctx.anos);
  ctx.anos = [];
  return [d];
}

const ints = (s: string, min: number, max: number) => [...new Set([...s.matchAll(/\d{1,6}/g)].map((m) => Number(m[0])).filter((n) => n >= min && n <= max))];

export function esquemasDe(frase: string, ctx: Ctx): LinhaLousa[] {
  const s = norm(frase);
  // MMC / MDC
  const modo = /\bm\.?m\.?c\b|minimo multiplo/.test(s) ? "mmc" : /\bm\.?d\.?c\b|maximo divisor/.test(s) ? "mdc" : null;
  if (modo) ctx.modo = modo;
  if (ctx.modo && !ctx.feito) {
    const ns = ints(frase, 2, 999).slice(0, 3);
    if (ns.length >= 2) { const d = tabelaMmc(ctx.modo, ns); if (d) { ctx.feito = true; return [d]; } }
  }
  // fração e porcentagem
  const fr = /(\d{1,2})\s*\/\s*(\d{1,2})/.exec(frase);
  if (fr && Number(fr[2]) >= 2 && Number(fr[2]) <= 12 && Number(fr[1]) <= Number(fr[2]) && !ctx.usadas.has(`f${fr[0]}`)) { ctx.usadas.add(`f${fr[0]}`); return [barra(Number(fr[1]), Number(fr[2]), `${fr[1]}/${fr[2]}`)]; }
  const pc = /(\d{1,3})\s*(?:%|por cento)/.exec(frase);
  if (pc && Number(pc[1]) <= 100 && Number(pc[1]) % 10 === 0 && !ctx.usadas.has(`p${pc[1]}`)) { ctx.usadas.add(`p${pc[1]}`); return [barra(Number(pc[1]) / 10, 10, `${pc[1]}%`)]; }
  // divisão e contas armadas (não dentro de equações com incógnita)
  if (!/\bx\b/.test(s) && !/=|igual/.test(s)) {
    const dv = /(\d{1,6})\s*(?:÷|\/|dividido por|dividida por)\s*(\d{1,4})/.exec(frase);
    if (dv && Number(dv[2]) > 0 && !ctx.usadas.has(dv[0])) { ctx.usadas.add(dv[0]); return [chaveDivisao(Number(dv[1]), Number(dv[2]))]; }
    const op = /(\d{1,6})\s*(\+|−|-|·|×|mais|menos|vezes)\s*(\d{1,6})/.exec(frase);
    if (op && !ctx.usadas.has(op[0])) {
      const o = op[2] === "+" || op[2] === "mais" ? "+" : op[2] === "−" || op[2] === "-" || op[2] === "menos" ? "−" : "×";
      ctx.usadas.add(op[0]);
      return [contaArmada(Number(op[1]), o, Number(op[3]))];
    }
  }
  // linha do tempo (anos citados)
  const an = /(?:\bem|\bno ano de|\bano de|\bdesde|\bate)\s+(1\d{3}|20\d{2})\b/.exec(s);
  if (an) {
    const rot = frase.replace(/\b(1\d{3}|20\d{2})\b/, "").replace(/^(?:\s*(?:em|no|ano|de|desde|até|a|o|foi|ocorreu)\b[,\s]*)+/i, "").trim().split(/\s+/).slice(0, 3).join(" ").replace(/[,.;:!?]+$/, "");
    ctx.anos.push({ ano: an[1]!, rot: rot.slice(0, 14) || "marco" });
    if (ctx.anos.length >= 4) { const d = eventosTempo(ctx.anos); ctx.anos = []; return [d]; }
    return [];
  }
  // quantidades / regra de três
  const q = esquemaDe(frase, ctx.q);
  return q ? [q] : [];
}
