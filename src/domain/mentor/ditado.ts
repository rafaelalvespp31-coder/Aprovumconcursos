import { ehConversa } from "./lousa";
import { comandoEnsino, conversaEnsino, fimEnsino, ENSINO, type Cena, type Frase, type Mmc } from "./ditado-ensino";
import { linhaSchema, type ItemDesenho, type LinhaLousa } from "./lousa";

/**
 * Diagrama por DITADO: o Mentor narra o que desenha com palavras-chave ("Título: …", "Linha do tempo: de A até B",
 * "Caixa um: …", "Item: …", "Resumo: …") e cada comando vira traços no quadro, no mesmo instante e na mesma ordem.
 * Layout em colunas (tela larga, W=1000) ou em coluna única (celular, W=460), como num quadro de aula.
 */
type Cor = "grafite" | "vermelho" | "azul" | "verde" | "laranja" | "roxo" | "rosa";
const CICLO: Cor[] = ["azul", "vermelho", "verde", "laranja", "roxo"];
const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export interface EstadoDitado {
  W: number; ncols: number; colW: number; margem: number;
  y: number; // cursor vertical do cabeçalho
  colY: number[]; rowTop: number; col: number; caixas: number; temCaixa: boolean;
  mmc?: Mmc; frase?: Frase; cenas: Record<number, Cena>; camadas: number; pirY: number; so: boolean; yL: number; yR: number; ym: number; linhasTab: { y: number; a: string; b: string }[]; corConta: number; marcos: number; resumo: boolean; resumoY: number; yTempo?: number; itens: ItemDesenho[];
}

/** `so`: copia só os traços, sem letras. Padrão: o quadro mostra o que foi DITADO como desenho (rótulos, números, contas), nunca a conversa do professor. */
export function novoDitado(largo: boolean, so = false): EstadoDitado {
  const W = largo ? 1000 : 460;
  const ncols = largo ? 3 : 1, margem = 24;
  const colW = (W - margem * 2 - (ncols - 1) * 18) / ncols;
  return { W, ncols, colW, margem, y: 8, colY: Array(ncols).fill(0), rowTop: 0, col: -1, caixas: 0, temCaixa: false, cenas: {}, camadas: 0, pirY: 0, so, yL: -1, yR: -1, ym: 0, linhasTab: [], corConta: 0, marcos: 0, resumo: false, resumoY: 0, itens: [] };
}

const cw = (tam: number) => tam * 0.56;
const tx = (x: number, y: number, s: string, cor: Cor, tam: number, d: number): ItemDesenho => ({ t: "texto", x: Math.max(0, Math.round(x)), y: Math.round(y), s: s.slice(0, 40), cor, tam, d });
const lin = (x1: number, y1: number, x2: number, y2: number, cor: Cor, d: number, seta?: boolean): ItemDesenho => ({ t: "linha", x1: Math.max(0, Math.round(x1)), y1: Math.round(y1), x2: Math.max(0, Math.round(x2)), y2: Math.round(y2), cor, d, seta });

function quebra(s: string, max: number): string[] {
  const out: string[] = [];
  let atual = "";
  for (const w of s.split(/\s+/)) {
    if (!atual) atual = w;
    else if ((atual + " " + w).length <= max) atual += " " + w;
    else { out.push(atual); atual = w; }
  }
  if (atual) out.push(atual);
  return out.flatMap((l) => (l.length > max + 6 ? [l.slice(0, max), l.slice(max)] : [l])).slice(0, 4);
}

const ondinha = (x0: number, x1: number, y: number, cor: Cor, d: number): ItemDesenho => {
  const pts: [number, number][] = [];
  const passo = Math.max(10, (x1 - x0) / 36);
  for (let x = x0, k = 0; x <= x1; x += passo, k++) pts.push([Math.round(x), y + (k % 2 ? 3 : -3)]);
  return { t: "curva", pts: pts.slice(0, 40), cor, d };
};

const NUM_PALAVRA = /^(?:(?:n[ºo°]\s*)?\d+(?!\d|\.\d)|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis)\b[\s:,.\-–]*/i;

/** Aplica um comando ditado. Devolve false se a frase não for um comando (conversa do professor: ignorada). `atraso` = segundos até o áudio chegar nela. */
export function comandoDitado(e: EstadoDitado, frase: string, atraso: number): boolean {
  const f = frase.replace(/\s+/g, " ").replace(/[*_`]/g, "").trim();
  const m = /^(t[ií]tulo|subt[ií]tulo|linha do tempo|marco|caixa|item|ponto|t[oó]pico|exemplo|destaque|aten[cç][aã]o|cuidado|resumo|seta|tabela|linha|cruzar|conta|passo|resposta|mmc|mdc|arma(?:da|r)|divis[aã]o|frase|sujeito|predicado|verbo|n[uú]cleo|complemento|adjunto|camada|cadeia|coluna|pessoa|v[ií]tima|arma|objeto)\b[\s:,.\-–]*(.*)$/i.exec(f);
  if (!m) {
    const it0: ItemDesenho[] = []; const ok = conversaEnsino(e, f, Math.max(0, atraso), it0); e.itens.push(...it0);
    return ok || naturalDitado(e, f, atraso);
  }
  let cmd = norm(m[1]!);
  if (cmd === "coluna") cmd = "caixa";
  const resto = m[2]!.replace(/[.!]+$/, "").trim();
  const it: ItemDesenho[] = [];
  let d = Math.max(0, atraso);
  const passo = 0.12;
  const largo = e.ncols > 1;
  const push = (...xs: ItemDesenho[]) => { it.push(...xs); };
  const centro = (s: string, tam: number) => Math.max(e.margem, (e.W - s.length * cw(tam)) / 2);

  if (ENSINO.has(cmd)) { if (comandoEnsino(e, cmd, resto, d, it)) { e.itens.push(...it); return true; } }
  if ((cmd === "conta" || cmd === "passo") && mmcFalado(e, resto, d)) return true; // "Conta: 12 dividido por 2 dá 6…" vira a tabela do MMC, não frase solta
  if (MATEMATICA.has(cmd)) { if (!matematica(e, cmd, resto, d, it)) return true; e.itens.push(...it); e.ym = Math.max(e.ym, e.yL, e.yR); return true; }
  if (e.so && (cmd === "titulo" || cmd === "subtitulo" || cmd === "item" || cmd === "ponto" || cmd === "topico" || cmd === "exemplo" || cmd === "destaque" || cmd === "atencao" || cmd === "cuidado")) return true; // só letras: não entra no quadro
  if (cmd === "titulo") {
    if (!resto) return true;
    const tam = largo ? 40 : 28;
    const ls = quebra(resto.toUpperCase(), Math.floor((e.W - 40) / cw(tam)));
    ls.forEach((l, i) => push(tx(centro(l, tam), e.y + 36 + i * (tam + 6), l, "azul", tam, d + i * passo)));
    const yb = e.y + 36 + ls.length * (tam + 6);
    push(ondinha(centro(ls[0]!, tam), centro(ls[0]!, tam) + ls[0]!.length * cw(tam), yb - 6, "vermelho", d + 0.4));
    e.y = yb + 6;
  } else if (cmd === "subtitulo") {
    if (!resto) return true;
    const tam = largo ? 24 : 20;
    const ls = quebra(resto, Math.floor((e.W - 40) / cw(tam)));
    ls.forEach((l, i) => { push(tx(centro(l, tam), e.y + 26 + i * (tam + 6), l, "grafite", tam, d + i * passo)); push(lin(centro(l, tam), e.y + 31 + i * (tam + 6), centro(l, tam) + l.length * cw(tam), e.y + 31 + i * (tam + 6), "grafite", d + 0.2 + i * passo)); });
    e.y += 26 + ls.length * (tam + 6) + 6;
  } else if (cmd === "linha do tempo") {
    const ex = /^(?:de|do|da|desde)\s+(.+?)\s+(?:at[ée]|a|ao|para)\s+(.+)$/i.exec(resto);
    const a = (ex?.[1] ?? "").trim(), b = (ex?.[2] ?? "").trim();
    const y = e.y + 56;
    e.yTempo = y;
    if (a) push(tx(e.margem, y - 22, a.toUpperCase(), "azul", largo ? 20 : 15, d));
    push(lin(e.margem, y, e.W - e.margem, y, "grafite", d + 0.1, true));
    if (b) { const bb = b.toUpperCase(); push(tx(Math.max(e.margem, e.W - e.margem - bb.length * cw(largo ? 20 : 15)), y - 22, bb, "vermelho", largo ? 20 : 15, d + 0.3)); }
    e.marcos = 0;
    e.y = y + 14;
  } else if (cmd === "marco") {
    if (!resto || e.yTempo === undefined) return true;
    const k = e.marcos++;
    const x = e.margem + 80 + (k + 1) * ((e.W - e.margem * 2 - 160) / 5);
    push({ t: "circ", cx: Math.round(x), cy: e.yTempo, r: 6, cor: "vermelho", d }, tx(Math.max(e.margem, x - resto.length * cw(14) / 2), e.yTempo + 28, resto.slice(0, 30), CICLO[k % 5]!, 14, d + 0.15));
    e.y = Math.max(e.y, e.yTempo + 40);
  } else if (cmd === "caixa") {
    const titulo = resto.replace(NUM_PALAVRA, "").trim() || "Caixa";
    if (e.col + 1 >= e.ncols) { e.rowTop = (e.col >= 0 ? Math.max(...e.colY) + 22 : Math.max(e.y, e.ym, e.resumo ? e.resumoY : 0) + 10); e.col = -1; e.colY = Array(e.ncols).fill(e.rowTop); }
    else if (e.col < 0) { e.rowTop = Math.max(e.y, e.ym) + 10; e.colY = Array(e.ncols).fill(e.rowTop); }
    e.col++;
    const x = e.margem + e.col * (e.colW + 18), y = e.rowTop;
    const cor = CICLO[e.caixas++ % 5]!;
    const tam = largo ? 25 : 22;
    const ls = quebra(titulo.toUpperCase(), Math.floor((e.colW - 24) / cw(tam)));
    const w = Math.min(e.colW, Math.max(...ls.map((l) => l.length)) * cw(tam) + 24), h = ls.length * (tam + 6) + 12;
    push({ t: "ret", x, y, w: Math.round(w), h, cor, d });
    ls.forEach((l, i) => push(tx(x + 12, y + 8 + tam + i * (tam + 6) - 3, l, cor, tam, d + 0.15 + i * passo)));
    e.colY[e.col] = y + h + (e.so ? 26 : 12);
    e.temCaixa = true;
    e.resumo = false;
  } else if (cmd === "item" || cmd === "ponto" || cmd === "topico" || cmd === "exemplo" || cmd === "destaque" || cmd === "atencao" || cmd === "cuidado") {
    if (!resto) return true;
    const tam = largo ? 19 : 19;
    const ehEx = cmd === "exemplo", ehDest = cmd === "destaque" || cmd === "atencao" || cmd === "cuidado";
    const cor: Cor = ehDest ? "vermelho" : ehEx ? "verde" : "grafite";
    const pref = ehEx ? "Ex.: " : ehDest ? "* " : "- ";
    let x: number, y: number, larg: number;
    if (e.resumo) { x = e.margem + (largo ? 130 : 0); y = e.resumoY; larg = e.W - x - e.margem; }
    else if (e.temCaixa && e.col >= 0) { x = e.margem + e.col * (e.colW + 18) + 6; y = e.colY[e.col]!; larg = e.colW - 12; }
    else { x = e.margem; y = e.y + 8; larg = e.W - e.margem * 2; }
    const ls = quebra(pref + resto, Math.floor(larg / cw(tam)));
    ls.forEach((l, i) => push(tx(x + (i ? 14 : 0), y + tam + i * (tam + 7), l, cor, tam, d + i * passo)));
    const nova = y + ls.length * (tam + 7) + 4;
    if (e.resumo) e.resumoY = nova;
    else if (e.temCaixa && e.col >= 0) e.colY[e.col] = nova;
    else e.y = nova;
  } else if (cmd === "resumo") {
    const base = Math.max(e.temCaixa ? Math.max(...e.colY) : e.y, e.ym);
    const y = Math.max(base, e.resumo ? e.resumoY : 0) + 26;
    const tam = largo ? 24 : 21;
    push({ t: "ret", x: e.margem, y, w: Math.round("RESUMO".length * cw(tam) + 28), h: tam + 16, cor: "laranja", d }, tx(e.margem + 14, y + tam + 4, "RESUMO", "laranja", tam, d + 0.15));
    e.resumo = true;
    e.resumoY = largo ? y + 4 : y + tam + 24;
    e.col = e.ncols;
    if (resto) { const t2 = quebra("- " + resto, Math.floor((e.W - e.margem * 2 - (largo ? 130 : 0)) / cw(largo ? 19 : 19))); t2.forEach((l, i) => push(tx(e.margem + (largo ? 130 : 0) + (i ? 14 : 0), e.resumoY + 19 + i * 27, l, "grafite", 19, d + 0.3 + i * passo))); e.resumoY += t2.length * 27 + 4; }
  } else if (cmd === "seta") {
    const x = e.temCaixa && e.col >= 0 ? e.margem + e.col * (e.colW + 18) + e.colW / 2 : e.W / 2;
    const y = e.temCaixa && e.col >= 0 ? e.colY[e.col]! : e.y;
    push(lin(x, y, x, y + 26, "vermelho", d, true));
    if (e.temCaixa && e.col >= 0) e.colY[e.col] = y + 32; else e.y = y + 32;
  }
  e.itens.push(...(e.so ? it.filter((x) => x.t !== "texto") : it));
  return true;
}

/** Linha única do quadro com tudo que foi ditado até agora. */
export function linhaDitado(e: EstadoDitado): LinhaLousa {
  return linhaSchema.parse({ tipo: "desenho", texto: "", nivel: 0, rabisco: e.itens.slice(0, 200), larg: e.W });
}

/** Separa frases sem quebrar "Art. 5º", "inc.", "nº" etc.; os dois-pontos ficam dentro da frase. */
export function frasesDe(buf: string): { frases: string[]; resto: string } {
  const partes = buf.split(/(?<=[.!?;])(?<!\b(?:art|arts|inc|par|n|nº|dr|sr)\.)\s+/i);
  const resto = partes.pop() ?? "";
  return { frases: partes, resto };
}

// ── Conta ditada, como um professor resolvendo no quadro ───────────────────────────────────────────
const MATEMATICA = new Set(["tabela", "linha", "cruzar", "conta", "passo", "resposta", "mmc", "mdc", "armada", "armar", "divisao"]);
const NUMS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, quatorze: 14, quinze: 15, dezesseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100 };
const algarismos = (s: string) => s.replace(/\b(?:ent[aã]o|agora|ai|aí|bom|ent[aã]o,)\b[\s,]*/gi, "").replace(/\b[a-zê]+\b/gi, (w) => { const n = NUMS[norm(w)]; return n === undefined ? w : String(n); });
const sim = (s: string) => algarismos(s)
  .replace(/\s+(?:é|e|fica|dá)?\s*igual\s+a\s+/gi, " = ").replace(/\s+dividido\s+por\s+/gi, " ÷ ").replace(/\s+vezes\s+/gi, " · ")
  .replace(/\s+mais\s+/gi, " + ").replace(/\s+menos\s+/gi, " − ").replace(/\s+ao quadrado\b/gi, "²").replace(/\s+por\s+cento\b/gi, "%");
const parte = (s: string) => s.split(/\s*(?:,|;|\be\b|\bpor\b|\bpara\b)\s*/i).map((x) => x.trim()).filter(Boolean);

/** Cabeça de bloco matemático: à esquerda tabelas/fatorações/contas armadas; à direita (ou embaixo, no celular) os passos da conta. */
function cursor(e: EstadoDitado) {
  const larg = e.ncols > 1;
  if (e.yL < 0) { e.yL = Math.max(e.y, e.ym) + 14; e.yR = e.yL; }
  return { larg, xL: e.margem, xR: larg ? Math.round(e.W * 0.52) : e.margem };
}
const ints = (s: string) => [...new Set([...s.matchAll(/\d{1,6}/g)].map((m) => Number(m[0])))];

function matematica(e: EstadoDitado, cmd: string, resto: string, d0: number, it: ItemDesenho[]): boolean {
  const { larg, xL, xR } = cursor(e);
  const empilha = !larg; // celular: tudo na mesma coluna
  const yR = () => (empilha ? e.yL : e.yR);
  const setR = (v: number) => { if (empilha) e.yL = v; else e.yR = v; };
  const tam = larg ? 28 : 22;
  const d = Math.max(0, d0);
  const fim = () => { e.ym = Math.max(e.ym, e.yL, e.yR); };

  if ((cmd === "conta" || cmd === "passo") && e.mmc?.feito) return false; // o MMC já mostrou o resultado: não repete
  if (e.mmc && (cmd === "conta" || cmd === "passo" || cmd === "resposta")) setR(Math.max(yR(), e.ym));
  if (cmd === "tabela") {
    const [a, b] = parte(resto);
    if (!a) return false;
    const x2 = xL + (larg ? 230 : 200);
    it.push(tx(xL + 8, e.yL + 28, a.slice(0, 14), "azul", tam, d), tx(x2 + 8, e.yL + 28, (b ?? "").slice(0, 14) || " ", "verde", tam, d + 0.15));
    it.push(lin(xL, e.yL + 40, x2 + 170, e.yL + 40, "grafite", d + 0.3), lin(x2 - 8, e.yL + 2, x2 - 8, e.yL + 44, "grafite", d + 0.3));
    e.yL += 46; e.linhasTab = []; if (empilha) e.yR = e.yL;
  } else if (cmd === "linha") {
    const [a, b] = parte(resto);
    if (!a) return false;
    const x2 = xL + (larg ? 190 : 200);
    const y = e.yL + 36;
    it.push(tx(xL + 8, y, a.slice(0, 14), "grafite", tam + 2, d), tx(x2 + 8, y, (b ?? "").slice(0, 14) || " ", "grafite", tam + 2, d + 0.15));
    if (/^x$/i.test(b ?? "") || /^x$/i.test(a)) it.push({ t: "circ", cx: (/^x$/i.test(a) ? xL + 14 : x2 + 14), cy: y - 8, r: 17, cor: "vermelho", d: d + 0.3 });
    e.linhasTab.push({ y, a, b: b ?? "" });
    e.yL += 62; if (empilha) e.yR = e.yL;
  } else if (cmd === "cruzar") {
    const L = e.linhasTab.slice(-2);
    if (L.length < 2) return false;
    const x2 = xL + (larg ? 230 : 200);
    const [r1, r2] = [L[0]!, L[1]!];
    it.push(lin(xL + 30, r1.y + 10, x2 - 4, r2.y - 32, "laranja", d, true), lin(x2 + 30, r1.y + 10, xL + 24, r2.y - 32, "roxo", d + 0.3, true));
  } else if (cmd === "conta" || cmd === "passo") {
    if (!resto) return false;
    const cor: Cor = (["azul", "vermelho", "roxo", "laranja"] as Cor[])[e.corConta++ % 4]!;
    let txt = sim(resto.includes(":") ? resto.split(":").pop()! : resto).trim();
    if (txt.split(/\s+/).length > 9 && (txt.match(/\d/g) ?? []).length < 3) return false; // explicação em palavras não é conta: fica só na voz
    const cols = Math.max(10, Math.floor((e.W - xR - e.margem) / cw(tam + 2)));
    const ls = quebra(txt, cols).slice(0, 3);
    ls.forEach((l, i) => it.push(tx(xR, yR() + 28 + i * (tam + 8), l, cor, tam + 2, d + i * 0.1)));
    setR(yR() + 16 + ls.length * (tam + 8));
  } else if (cmd === "resposta") {
    if (!resto) return false;
    const txt = sim(resto.includes(":") ? resto.split(":").pop()! : resto).trim().slice(0, Math.max(10, Math.floor((e.W - xR - e.margem - 60) / cw(tam + 4))));
    const y = yR() + 8;
    it.push({ t: "ret", x: xR - 8, y, w: Math.round(txt.length * cw(tam + 4) + 28), h: tam + 20, cor: "verde", d }, tx(xR + 6, y + tam + 8, txt, "verde", tam + 4, d + 0.2), tx(xR + txt.length * cw(tam + 4) + 24, y + 12, "★", "laranja", 22, d + 0.5));
    setR(y + tam + 34);
  } else if (cmd === "mmc" || cmd === "mdc") {
    const ns = ints(resto).filter((n) => n >= 2 && n <= 999).slice(0, 3);
    if (ns.length < 2) return false;
    let v = [...ns]; const rows: { p: number; vals: number[]; todos: boolean }[] = [];
    while (v.some((x) => x > 1) && rows.length < 6) {
      let p = 2; while (!v.some((x) => x > 1 && x % p === 0)) p++;
      const todos = v.every((x) => x > 1 && x % p === 0);
      v = v.map((x) => (x > 1 && x % p === 0 ? x / p : x)); rows.push({ p, vals: [...v], todos });
    }
    const pitch = 36, colx = (i: number) => xL + 10 + i * 70, barX = xL + ns.length * 70 + 2, y0 = e.yL + 26;
    ns.forEach((n, i) => it.push(tx(colx(i), y0, String(n), "azul", tam + 2, d)));
    it.push(lin(barX, e.yL + 2, barX, y0 + rows.length * pitch + 8, "grafite", d + 0.1));
    const usados: number[] = [];
    rows.forEach((r, k) => {
      const conta = cmd === "mmc" || r.todos; if (conta) usados.push(r.p);
      it.push(tx(barX + 14, y0 + k * pitch, String(r.p), conta ? "vermelho" : "grafite", tam + 2, d + 0.2 + k * 0.15));
      r.vals.forEach((n, i) => it.push(tx(colx(i), y0 + (k + 1) * pitch, String(n), "azul", tam + 2, d + 0.25 + k * 0.15)));
    });
    e.yL = y0 + rows.length * pitch + 24;
    const prod = usados.reduce((a, b) => a * b, 1);
    it.push(tx(xR, yR() + 28, `${cmd.toUpperCase()} = ${usados.join(" · ") || "1"}`.slice(0, 40), "vermelho", tam + 2, d + 0.6), tx(xR, yR() + 70, `${cmd.toUpperCase()} = ${prod}`, "verde", tam + 6, d + 0.9));
    setR(yR() + 84); if (empilha) e.yL = Math.max(e.yL, e.yR);
  } else if (cmd === "armada" || cmd === "armar") {
    const m = /(\d{1,6})\s*(\+|−|-|·|×|mais|menos|vezes)\s*(\d{1,6})/.exec(resto);
    if (!m) return false;
    const a = Number(m[1]), b = Number(m[3]);
    const op = /\+|mais/.test(m[2]!) ? "+" : /−|-|menos/.test(m[2]!) ? "−" : "×";
    const r = op === "+" ? a + b : op === "−" ? a - b : a * b;
    const w = Math.max(String(a).length, String(b).length, String(r).length), dir = xL + 40 + w * 14 + 20, at = (n: number) => dir - String(n).length * 14;
    const y0 = e.yL;
    it.push(tx(at(a), y0 + 30, String(a), "azul", 28, d), tx(xL + 6, y0 + 68, op, "vermelho", 28, d + 0.2), tx(at(b), y0 + 68, String(b), "azul", 28, d + 0.2), lin(xL, y0 + 78, dir + 8, y0 + 78, "grafite", d + 0.4), tx(at(r), y0 + 114, String(r), "verde", 28, d + 0.7));
    e.yL += 130; if (empilha) e.yR = e.yL;
  } else if (cmd === "divisao") {
    const [a, b] = ints(resto);
    if (!a || !b) return false;
    const q = Math.floor(a / b), r = a % b, x0 = xL + 12 + String(a).length * 14 + 12, y0 = e.yL;
    it.push(tx(xL + 4, y0 + 52, String(a), "azul", 28, d), lin(x0, y0 + 20, x0, y0 + 92, "grafite", d + 0.2), lin(x0, y0 + 58, x0 + 26 + Math.max(String(b).length, String(q).length) * 14, y0 + 58, "grafite", d + 0.3), tx(x0 + 10, y0 + 48, String(b), "vermelho", 28, d + 0.4), tx(x0 + 10, y0 + 90, String(q), "verde", 28, d + 0.7));
    if (r) it.push(tx(xL + 4, y0 + 116, `resto ${r}`, "laranja", 18, d + 0.9));
    e.yL += 128; if (empilha) e.yR = e.yL;
  }
  fim();
  return true;
}

/** Fim do turno do Mentor: devolve true se algo novo foi desenhado (ex.: resultado do MMC). */
export function fimDitado(e: EstadoDitado): boolean {
  const it: ItemDesenho[] = [];
  fimEnsino(e, it);
  e.itens.push(...it);
  return it.length > 0;
}

const ORD = /^(?:primeiro|segundo|terceiro|quarto|quinto|depois|em seguida|a seguir|por fim|finalmente|ent[aã]o|logo depois)\b[\s,:]*/i;
const curto = (s: string, n: number) => s.split(/\s+/).slice(0, n).join(" ").replace(/[.,;:!?]+$/, "");

/**
 * Fala natural do professor → desenho, sem ele precisar dizer "linha", "coluna", "título"…:
 * conta de matemática (números + operação falada), anos (linha do tempo), passos ("primeiro… depois…") e assunto ("vamos ver X").
 */
export function naturalDitado(e: EstadoDitado, frase: string, atraso: number): boolean {
  const f = frase.replace(/\s+/g, " ").trim().replace(/[.!]+$/, "");
  if (!f || ehConversa(f)) return false;
  if (mmcFalado(e, f, atraso)) return true;
  const s = norm(f);
  const mm = /\b(mmc|mdc|minimo multiplo comum|maximo divisor comum)\b\D{0,30}?(\d{1,3})\D{1,12}?(\d{1,3})(?:\D{1,12}?(\d{1,3}))?/.exec(s);
  if (mm && !e.mmc) { const nm = mm[1]!.startsWith("mdc") || mm[1]!.startsWith("maximo") ? "MDC" : "MMC"; if (e.itens.length === 0) comandoDitado(e, `Título: ${nm} de ${[mm[2], mm[3], mm[4]].filter(Boolean).join(" e ")}`, atraso); }
  if (mm && !e.mmc) return comandoDitado(e, `${mm[1]!.startsWith("mdc") || mm[1]!.startsWith("maximo") ? "MDC" : "MMC"}: ${[mm[2], mm[3], mm[4]].filter(Boolean).join(" e ")}`, atraso);
  const r3 = /(\d+)\s+([a-zà-ú]+)\s+(?:custam|valem|pesam|levam|rendem|fazem|gastam|produzem)\s+(?:r\$\s*)?(\d+)\s+([a-zà-ú]+)/.exec(f.toLowerCase());
  if (r3 && e.linhasTab.length === 0) { comandoDitado(e, `Tabela: ${r3[2]}, ${r3[4]}`, atraso); return comandoDitado(e, `Linha: ${r3[1]}, ${r3[3]}`, atraso); }
  const r3b = /(\d+)\s+(?:[a-z]+\s+)?(?:custam|valem|pesam|levam|rendem|fazem|gastam|produzem)\s+(?:quanto|x)\b/.exec(s);
  if (r3b && e.linhasTab.length > 0) { comandoDitado(e, `Linha: ${r3b[1]}, x`, atraso); return comandoDitado(e, "Cruzar", atraso); }
  if (f.endsWith("?")) return false;
  const nums = (f.match(/\d+/g) ?? []).length;
  if (e.itens.length === 0) {
    const t = /\b(?:vamos|hoje|agora)\s+(?:falar|ver|estudar|aprender|entender|resolver|calcular|desenhar|fazer)\s+(?:sobre\s+|de\s+|do\s+|da\s+|dos\s+|das\s+|o\s+|a\s+|um\s+|uma\s+)?(.+)$/i.exec(f);
    if (t) return comandoDitado(e, `Título: ${curto(t[1]!, 6)}`, atraso);
  }
  if (/\b(portanto|logo|resposta|resultado)\b.*(\bigual\b|=)/i.test(f) && nums + (/\bx\b/.test(s) ? 1 : 0) >= 1) return comandoDitado(e, `Resposta: ${f.replace(/^.*?\b(?:portanto|logo|resposta|resultado)\b[\s,:]*/i, "")}`, atraso);
  if (nums + (/\bx\b/.test(s) ? 1 : 0) >= 2 && /\b(vezes|dividido|dividimos|mais|menos|igual|multiplic\w*|soma\w*|subtra\w*|=|\+|×|÷)\b|[=+×÷]/.test(s)) return comandoDitado(e, `Conta: ${f}`, atraso);
  const ano = /\b(1[0-9]{3}|20[0-9]{2})\b\s*,?\s*(.*)$/.exec(f);
  if (ano) {
    if (e.yTempo === undefined) comandoDitado(e, "Linha do tempo:", atraso);
    const rot = curto(ano[2]!.replace(/^(?:a|o|foi|era|quando|que|com|em|:|,)\s+/i, ""), 3);
    return comandoDitado(e, `Marco: ${ano[1]}${rot ? " " + rot : ""}`, atraso);
  }
  const o = ORD.exec(f);
  if (o && f.length > o[0].length + 6) {
    const antes = e.itens.length;
    const ok = comandoDitado(e, `Caixa: ${curto(f.slice(o[0].length), 10)}`, atraso);
    if (e.col > 0 && e.col < e.ncols) { // fluxograma: seta ligando a caixa anterior (mesma linha) a esta
      const x = e.margem + e.col * (e.colW + 18), y = e.rowTop + 22;
      e.itens.push({ t: "linha", x1: x - 18, y1: y, x2: x - 2, y2: y, cor: "vermelho", d: Math.max(0, atraso) + 0.3, seta: true });
    }
    return ok && e.itens.length > antes;
  }
  return false;
}

/** "12 dividido por 2 dá 6, e 18 por 2 dá 9" (ou o professor narrando a divisão): abre/avança a tabela do MMC em vez de escrever a frase. */
function mmcFalado(e: EstadoDitado, texto: string, atraso: number): boolean {
  const f = algarismos(texto).replace(/\s+/g, " ");
  const pares = [...f.matchAll(/(\d+)\s*(?:÷|dividido por|por)\s*(\d+)\s*(?:d[aá]|=|igual a|é|fica)\s*(\d+)/gi)].map((m) => ({ a: +m[1]!, p: +m[2]!, r: +m[3]! })).filter((x) => x.p >= 2 && x.a % x.p === 0 && x.r === x.a / x.p && (!e.mmc || e.mmc.vals.includes(x.a)));
  if (!pares.length) return false;
  const p = pares[0]!.p;
  if (!e.mmc) {
    const nums = [...new Set(pares.filter((x) => x.p === p).map((x) => x.a))];
    if (nums.length < 2) return false;
    if (e.itens.length === 0) comandoDitado(e, `Título: MMC de ${nums.join(" e ")}`, atraso);
    comandoDitado(e, `MMC: ${nums.join(" e ")}`, atraso);
  }
  return comandoDitado(e, `Vamos dividir por ${p}`, atraso) || true;
}
