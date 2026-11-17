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
  marcos: number; resumo: boolean; resumoY: number; yTempo?: number; itens: ItemDesenho[];
}

export function novoDitado(largo: boolean): EstadoDitado {
  const W = largo ? 1000 : 460;
  const ncols = largo ? 3 : 1, margem = 24;
  const colW = (W - margem * 2 - (ncols - 1) * 18) / ncols;
  return { W, ncols, colW, margem, y: 8, colY: Array(ncols).fill(0), rowTop: 0, col: -1, caixas: 0, temCaixa: false, marcos: 0, resumo: false, resumoY: 0, itens: [] };
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

const NUM_PALAVRA = /^(?:(?:n[ºo°]\s*)?\d+|um|uma|dois|duas|tr[eê]s|quatro|cinco|seis)\b[\s:,.\-–]*/i;

/** Aplica um comando ditado. Devolve false se a frase não for um comando (conversa do professor: ignorada). `atraso` = segundos até o áudio chegar nela. */
export function comandoDitado(e: EstadoDitado, frase: string, atraso: number): boolean {
  const f = frase.replace(/\s+/g, " ").replace(/[*_`]/g, "").trim();
  const m = /^(t[ií]tulo|subt[ií]tulo|linha do tempo|marco|caixa|item|ponto|t[oó]pico|exemplo|destaque|aten[cç][aã]o|cuidado|resumo|seta)\b[\s:,.\-–]*(.*)$/i.exec(f);
  if (!m) return false;
  const cmd = norm(m[1]!);
  const resto = m[2]!.replace(/[.!]+$/, "").trim();
  const it: ItemDesenho[] = [];
  let d = Math.max(0, atraso);
  const passo = 0.12;
  const largo = e.ncols > 1;
  const push = (...xs: ItemDesenho[]) => { it.push(...xs); };
  const centro = (s: string, tam: number) => Math.max(e.margem, (e.W - s.length * cw(tam)) / 2);

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
    push({ t: "circ", cx: Math.round(x), cy: e.yTempo, r: 6, cor: "vermelho", d }, tx(Math.max(e.margem, x - resto.length * cw(14) / 2), e.yTempo + 28, resto.slice(0, 22), CICLO[k % 5]!, 14, d + 0.15));
    e.y = Math.max(e.y, e.yTempo + 40);
  } else if (cmd === "caixa") {
    const titulo = resto.replace(NUM_PALAVRA, "").trim() || "Caixa";
    if (e.col + 1 >= e.ncols) { e.rowTop = (e.col >= 0 ? Math.max(...e.colY) + 22 : Math.max(e.y, e.resumo ? e.resumoY : 0) + 10); e.col = -1; e.colY = Array(e.ncols).fill(e.rowTop); }
    else if (e.col < 0) { e.rowTop = e.y + 10; e.colY = Array(e.ncols).fill(e.rowTop); }
    e.col++;
    const x = e.margem + e.col * (e.colW + 18), y = e.rowTop;
    const cor = CICLO[e.caixas++ % 5]!;
    const tam = largo ? 25 : 22;
    const ls = quebra(titulo.toUpperCase(), Math.floor((e.colW - 24) / cw(tam)));
    const w = Math.min(e.colW, Math.max(...ls.map((l) => l.length)) * cw(tam) + 24), h = ls.length * (tam + 6) + 12;
    push({ t: "ret", x, y, w: Math.round(w), h, cor, d });
    ls.forEach((l, i) => push(tx(x + 12, y + 8 + tam + i * (tam + 6) - 3, l, cor, tam, d + 0.15 + i * passo)));
    e.colY[e.col] = y + h + 12;
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
    const base = e.temCaixa ? Math.max(...e.colY) : e.y;
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
  e.itens.push(...it);
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
