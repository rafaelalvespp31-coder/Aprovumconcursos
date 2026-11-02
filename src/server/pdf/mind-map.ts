/**
 * PDF do MAPA MENTAL — fiel ao modelo oficial (1536 x 1024): o fundo É o próprio modelo, com os
 * textos apagados; o PDF escreve por cima, nas mesmas posições, com fontes condensadas em
 * negrito itálico como no original. Página 1 = o mapa. Páginas seguintes = a matéria inteira
 * da aula (módulo por módulo, mnemônicos, pegadinhas, esquema e resumo) no mesmo estilo.
 */
import { PDFDocument, rgb, PDFName, pushGraphicsState, popGraphicsState, beginText, endText, setFontAndSize, setTextRenderingMode, TextRenderingMode, showText, setTextMatrix, drawObject, concatTransformationMatrix, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { MindMap, MindMapBlock, MindMapMnemonic } from "@/domain/content/mind-map";
import { FONTE_TEXTO, FONTE_TEXTO_B, FONTE_TEXTO_I, FONTE_TITULO, FONTE_TITULO_B, METAL_PNG, MODELO_CONTINUACAO_JPG, MODELO_JPG } from "./mind-map-assets";

/** Coordenadas do modelo (px) → página (pt). */
const PX_W = 1536;
const PX_H = 1024;
const K = 0.5625;
const W = PX_W * K;
const H = PX_H * K;

const WHITE = rgb(1, 1, 1);
const SOFT = rgb(0.9, 0.9, 0.92);
const RED = rgb(0.93, 0.08, 0.1);
const RED_TEXT = rgb(1, 0.16, 0.16);
const GOLD = rgb(1, 0.8, 0.2);
const INK = rgb(0.06, 0.06, 0.06);
const PURPLE = rgb(0.73, 0.45, 1);

interface Fonts {
  title: PDFFont;
  titleB: PDFFont;
  text: PDFFont;
  textB: PDFFont;
  textI: PDFFont;
}
type Box = [number, number, number, number]; // x0, y0, x1, y1 em px

const b64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64"));

function clean(font: PDFFont, s: string): string {
  const set = new Set(font.getCharacterSet());
  let out = "";
  for (const ch of s.normalize("NFC").replace(/[→⇒]/g, "→").replace(/\s+/g, " ")) {
    const cp = ch.codePointAt(0)!;
    out += set.has(cp) ? ch : ch === "→" ? "->" : "";
  }
  return out.trim();
}

function wrap(font: PDFFont, text: string, size: number, width: number): string[] {
  const words = clean(font, text).split(" ").filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(next, size) <= width) line = next;
    else {
      if (line) lines.push(line);
      let rest = w;
      while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
        // maior prefixo que cabe (busca binária)
        let lo = 1;
        let hi = rest.length - 1;
        while (lo < hi) {
          const mid = Math.ceil((lo + hi) / 2);
          if (font.widthOfTextAtSize(rest.slice(0, mid), size) <= width) lo = mid;
          else hi = mid - 1;
        }
        lines.push(rest.slice(0, lo));
        rest = rest.slice(lo);
      }
      line = rest;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function ellipsize(font: PDFFont, lines: string[], size: number, width: number, max: number): string[] {
  if (lines.length <= max) return lines;
  const out = lines.slice(0, max);
  let last = out[max - 1]!;
  while (last && font.widthOfTextAtSize(`${last}…`, size) > width) last = last.replace(/\s*\S+$/, "");
  out[max - 1] = `${last}…`;
  return out;
}

class Canvas {
  constructor(
    readonly doc: PDFDocument,
    readonly page: PDFPage,
    readonly f: Fonts,
  ) {}
  /** Texto com o topo da caixa em `y` (px). */
  text(s: string, x: number, y: number, size: number, font: PDFFont, color: RGB) {
    const t = clean(font, s);
    if (t) this.page.drawText(t, { x: x * K, y: H - (y + size * 0.82) * K, size: size * K, font, color });
  }
  width(s: string, size: number, font: PDFFont) {
    return font.widthOfTextAtSize(clean(font, s), size);
  }
  path(d: string, o: { fill?: RGB; stroke?: RGB; width?: number; opacity?: number }) {
    this.page.drawSvgPath(d, { x: 0, y: H, scale: K, color: o.fill, borderColor: o.stroke, borderWidth: o.stroke ? (o.width ?? 1) : 0, opacity: o.opacity, borderOpacity: o.opacity });
  }
  /** Visto vermelho do modelo. */
  check(x: number, y: number, s: number, color: RGB = RED) {
    this.path(`M ${x} ${y + s * 0.5} L ${x + s * 0.38} ${y + s * 0.88} L ${x + s} ${y + s * 0.05} L ${x + s * 0.86} ${y - s * 0.08} L ${x + s * 0.36} ${y + s * 0.6} L ${x + s * 0.14} ${y + s * 0.36} Z`, { fill: color });
  }
  /** Seta dupla vermelha (»). */
  chevrons(x: number, y: number, s: number) {
    for (const dx of [0, s * 0.5]) this.path(`M ${x + dx} ${y} L ${x + dx + s * 0.32} ${y} L ${x + dx + s * 0.62} ${y + s * 0.5} L ${x + dx + s * 0.32} ${y + s} L ${x + dx} ${y + s} L ${x + dx + s * 0.3} ${y + s * 0.5} Z`, { fill: RED });
  }
}

interface Span {
  text: string;
  color?: RGB;
}
/** Parágrafo que cabe na caixa: reduz a fonte até caber; o que sobrar ganha reticências. */
function paragraph(c: Canvas, box: Box, text: string | Span[], o: { font: PDFFont; color: RGB; max: number; min?: number; align?: "left" | "center"; lh?: number; vcenter?: boolean }) {
  const spans: Span[] = typeof text === "string" ? [{ text }] : text;
  const whole = spans.map((s) => s.text).join("");
  const [x0, y0, x1, y1] = box;
  const w = x1 - x0;
  const h = y1 - y0;
  const lhK = o.lh ?? 1.12;
  let size = o.max;
  let lines = wrap(o.font, whole, size, w);
  while (size > (o.min ?? o.max * 0.55) && lines.length * size * lhK > h) {
    size -= 0.5;
    lines = wrap(o.font, whole, size, w);
  }
  const max = Math.max(1, Math.floor(h / (size * lhK)));
  lines = ellipsize(o.font, lines, size, w, max);
  const total = lines.length * size * lhK;
  let y = o.vcenter === false ? y0 : y0 + Math.max(0, (h - total) / 2);
  // Cores por trecho: acompanha o índice de caractere de cada linha.
  const colored = spans.length > 1;
  let charPos = 0;
  const cleanWhole = clean(o.font, whole);
  for (const ln of lines) {
    const lw = c.width(ln, size, o.font);
    let x = o.align === "left" ? x0 : x0 + (w - lw) / 2;
    if (!colored) c.text(ln, x, y, size, o.font, o.color);
    else {
      const start = cleanWhole.indexOf(ln.replace(/…$/, ""), charPos);
      let pos = start < 0 ? charPos : start;
      // desenha palavra a palavra com a cor do trecho em que ela começa
      const bounds: Array<{ end: number; color: RGB }> = [];
      let e = 0;
      for (const s of spans) {
        e += s.text.length;
        bounds.push({ end: e, color: s.color ?? o.color });
      }
      for (const word of ln.split(" ")) {
        const at = cleanWhole.indexOf(word.replace(/…$/, ""), pos);
        const p = at < 0 ? pos : at;
        const col = bounds.find((b) => p < b.end)?.color ?? o.color;
        c.text(word, x, y, size, o.font, col);
        x += c.width(word, size, o.font) + o.font.widthOfTextAtSize(" ", size);
        pos = p + word.length;
      }
      charPos = pos;
    }
    y += size * lhK;
  }
}

type Bullet = "check" | "chevron" | "triangle" | "none";
/** Lista com marcador: reduz a fonte até caber. */
function bullets(c: Canvas, box: Box, items: string[], o: { font: PDFFont; color: RGB; max: number; min?: number; bullet: Bullet; gap?: number; vcenter?: boolean; markColor?: RGB }) {
  const [x0, y0, x1, y1] = box;
  const h = y1 - y0;
  for (let size = o.max; size >= (o.min ?? 13); size -= 0.5) {
    const ind = o.bullet === "none" ? 0 : size * (o.bullet === "chevron" ? 1.45 : 1.25);
    const lh = size * 1.1;
    const gap = o.gap ?? size * 0.28;
    const laid = items.map((t) => wrap(o.font, t, size, x1 - x0 - ind));
    const total = laid.reduce((a, l) => a + l.length * lh + gap, -gap);
    if (total <= h || size - 0.5 < (o.min ?? 13)) {
      let y = o.vcenter === false ? y0 : y0 + Math.max(0, (h - total) / 2);
      let left = Math.floor((h + gap) / lh);
      for (let i = 0; i < laid.length && left > 0; i++) {
        const show = ellipsize(o.font, laid[i]!, size, x1 - x0 - ind, Math.max(1, left));
        const ms = size * 0.82;
        if (o.bullet === "check") c.check(x0, y + size * 0.12, ms, o.markColor);
        else if (o.bullet === "chevron") c.chevrons(x0, y + size * 0.1, ms);
        else if (o.bullet === "triangle") c.path(`M ${x0} ${y + size * 0.15} L ${x0 + ms * 0.8} ${y + size * 0.5} L ${x0} ${y + size * 0.85} Z`, { fill: o.markColor ?? INK });
        show.forEach((ln, k) => c.text(ln, x0 + ind, y + k * lh, size, o.font, o.color));
        y += show.length * lh + gap;
        left -= show.length;
      }
      return;
    }
  }
}

/** Texto prateado (recorte do texto sobre o degradê), com sombra escura — o título do modelo. */
function metalText(c: Canvas, s: string, x: number, y: number, size: number, font: PDFFont, metal: PDFImage) {
  const t = clean(font, s);
  const tw = font.widthOfTextAtSize(t, size);
  // sombra/contorno
  for (const [dx, dy] of [[3, 4], [2, 2], [-1, 1]] as const) c.text(t, x + dx, y + dy, size, font, rgb(0.04, 0.04, 0.05));
  const page = c.page;
  const fontKey = page.node.newFontDictionary(font.name, font.ref);
  const imgKey = page.node.newXObject("Image", metal.ref);
  const bx = x * K;
  const by = H - (y + size * 0.82) * K;
  page.pushOperators(
    pushGraphicsState(),
    beginText(),
    setFontAndSize(fontKey, size * K),
    setTextRenderingMode(TextRenderingMode.Clip),
    setTextMatrix(1, 0, 0, 1, bx, by),
    showText(font.encodeText(t)),
    endText(),
    // degradê do topo (claro) à base (mais escuro), do tamanho do texto
    concatTransformationMatrix(tw * K, 0, 0, size * 1.25 * K, bx, by - size * 0.22 * K),
    drawObject(imgKey as unknown as PDFName),
    popGraphicsState(),
  );
}

const upperFirst = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lawArticle = (map: MindMap) => {
  const m = /art\.?\s*([\w-]+)/i.exec(map.subtitle ?? "");
  return m ? `Art. ${m[1]}` : null;
};

/** Nome curto do bloco (ex.: "Homicídio simples") e a referência "(Art. 121, caput)". */
function blockHeading(map: MindMap, b: MindMapBlock): { title: string; sub: string | null } {
  const art = lawArticle(map);
  const bt = /^caput$/i.test(b.title) ? "caput" : b.title;
  const ref = art ? `(${art}, ${bt})` : `(${bt})`;
  const paren = /\(([^()]{3,40})\)\s*$/.exec(b.detail);
  if (paren && !/^(lei|art|incisos?)\b/i.test(paren[1]!)) return { title: upperFirst(paren[1]!), sub: ref };
  const head = b.detail.split(/\s*[(:;]\s*/)[0]!.trim();
  if (head.length >= 3) return { title: upperFirst(head), sub: ref };
  return { title: b.title, sub: b.detail || null };
}

/** Três blocos principais (como simples / qualificado / culposo no modelo): os de pena, os mais diretos. */
function pickTypeBlocks(map: MindMap): MindMapBlock[] {
  const strong = map.blocks.filter((b) => b.value && /reclus|deten|\d+\s*(a|até)\s*\d+\s*anos|multa/i.test(b.value));
  const pool = strong.length >= 3 ? strong : [...strong, ...map.blocks.filter((b) => !strong.includes(b))];
  const chosen = [...pool].sort((a, b) => a.detail.length - b.detail.length).slice(0, 3);
  return map.blocks.filter((b) => chosen.includes(b));
}

function acronymRun(c: Canvas, box: Box, acr: string, o: { max: number; style: "purple" | "red" | "gold"; metal: PDFImage }) {
  const [x0, y0, x1, y1] = box;
  const font = c.f.title;
  const q = `“${acr}”`;
  let size = o.max;
  while (size > 18 && c.width(q, size, font) > x1 - x0) size -= 1;
  const tw = c.width(q, size, font);
  const x = x0 + (x1 - x0 - tw) / 2;
  const y = y0 + (y1 - y0 - size * 0.86) / 2;
  if (o.style === "gold") {
    c.text(q, x, y, size, font, INK);
    return;
  }
  if (o.style === "red") {
    c.text(q, x + 2, y + 2, size, font, rgb(0.15, 0, 0));
    c.text(q, x, y, size, font, RED_TEXT);
    return;
  }
  // roxo do modelo: metade vermelha, metade prateada
  const half = Math.ceil(acr.length / 2);
  const a = `“${acr.slice(0, half)}`;
  c.text(a, x + 2, y + 2, size, font, rgb(0.15, 0, 0));
  c.text(a, x, y, size, font, RED_TEXT);
  metalText(c, `${acr.slice(half)}”`, x + c.width(a, size, font), y, size, font, o.metal);
}

function termsLine(m: MindMapMnemonic) {
  return m.terms.map(upperFirst).join(", ");
}

/** Página 1 — o mapa, exatamente no desenho do modelo. */
function drawMapPage(doc: PDFDocument, f: Fonts, map: MindMap, bg: PDFImage, metal: PDFImage) {
  const page = doc.addPage([W, H]);
  page.drawImage(bg, { x: 0, y: 0, width: W, height: H });
  const c = new Canvas(doc, page, f);

  // Título prateado + faixa vermelha
  const title = map.title.toUpperCase();
  let ts = 112;
  while (ts > 40 && c.width(title, ts, f.title) > 585) ts -= 2;
  if (c.width(title, ts, f.title) > 585) {
    // título muito longo: duas linhas
    let s2 = 60;
    let lines = wrap(f.title, title, s2, 585);
    while (s2 > 30 && (lines.length > 2 || c.width(lines[0] ?? "", s2, f.title) > 585)) {
      s2 -= 2;
      lines = wrap(f.title, title, s2, 585);
    }
    lines = ellipsize(f.title, lines, s2, 585, 2);
    lines.forEach((ln, i) => metalText(c, ln, 1085 - c.width(ln, s2, f.title) / 2, 100 + i * s2 * 0.95 + (2 - lines.length) * s2 * 0.45, s2, f.title, metal));
  } else metalText(c, title, 1085 - c.width(title, ts, f.title) / 2, 100 + (105 - ts * 0.86) / 2, ts, f.title, metal);
  const rib = (map.subtitle ?? map.subject ?? "").toUpperCase();
  if (rib) paragraph(c, [930, 208, 1212, 246], rib, { font: f.title, color: WHITE, max: 38, min: 18 });

  const blocks = pickTypeBlocks(map);
  const mn = map.mnemonics;
  const valueLabel = map.valueLabel ? upperFirst(map.valueLabel.split(/\s+(ou|e)\s+/i)[0]!.toLowerCase()) : null;
  const typeCard = (b: MindMapBlock | undefined, head: Box, pena: Box, twoLine: boolean) => {
    if (!b) return;
    const { title: t, sub } = blockHeading(map, b);
    const [x0, y0, x1, y1] = head;
    const tSize = 31;
    let tl = wrap(f.title, t.toUpperCase(), tSize, x1 - x0);
    tl = ellipsize(f.title, tl, tSize, x1 - x0, twoLine ? 2 : 1);
    const subH = sub ? 24 : 0;
    const total = tl.length * tSize * 0.95 + subH;
    let y = y0 + (y1 - y0 - total) / 2;
    for (const ln of tl) {
      c.text(ln, twoLine ? x0 : x0 + (x1 - x0 - c.width(ln, tSize, f.title)) / 2, y, tSize, f.title, WHITE);
      y += tSize * 0.95;
    }
    if (sub) {
      const s = ellipsize(f.textB, wrap(f.textB, sub, 22, x1 - x0), 22, x1 - x0, 1)[0] ?? "";
      c.text(s, twoLine ? x0 + 12 : x0 + (x1 - x0 - c.width(s, 22, f.textB)) / 2, y + 1, 22, f.textB, SOFT);
    }
    if (b.value) paragraph(c, pena, valueLabel ? `${valueLabel}: ${b.value.charAt(0).toLowerCase()}${b.value.slice(1)}` : b.value, { font: f.text, color: WHITE, max: 24, min: 15 });
  };

  // Coluna 1
  typeCard(blocks[0], [150, 210, 420, 282], [80, 293, 402, 327], false);
  c.text("O QUE É?", 143, 374, 33, f.title, RED_TEXT);
  paragraph(c, [102, 424, 372, 562], map.intro ?? `${map.title}: os pontos principais estão nos cartões ao lado e na matéria completa, nas próximas páginas.`, { font: f.text, color: WHITE, max: 25, min: 14 });
  if (mn[0]) {
    acronymRun(c, [138, 633, 378, 688], mn[0].acronym, { max: 54, style: "purple", metal });
    paragraph(c, [112, 686, 386, 716], termsLine(mn[0]), { font: f.text, color: WHITE, max: 21, min: 13 });
  }

  // Coluna 2
  typeCard(blocks[1], [568, 280, 805, 364], [490, 369, 806, 401], true);
  const m1 = mn[1];
  const list2 = m1 ? m1.items : map.summary.map((r) => `${r.q} ${r.a}`);
  c.text(clean(f.titleB, m1 ? upperFirst(m1.label) : "Resumo").slice(0, 26) + (m1 && m1.label.length > 26 ? "…" : ""), 570, 430, 26, f.titleB, RED_TEXT);
  bullets(c, [500, 470, 815, 650], list2.slice(0, 7), { font: f.text, color: WHITE, max: 22, min: 13, bullet: "check" });
  if (m1) {
    acronymRun(c, [580, 699, 772, 749], m1.acronym, { max: 54, style: "red", metal });
    paragraph(c, [542, 746, 790, 792], termsLine(m1), { font: f.textI, color: WHITE, max: 20, min: 12 });
  }

  // Coluna 3 (amarela)
  typeCard(blocks[2], [952, 280, 1150, 364], [878, 369, 1150, 401], true);
  const m2 = mn[2];
  c.text(clean(f.titleB, m2 ? upperFirst(m2.label) : "Atenção").slice(0, 22) + (m2 && m2.label.length > 22 ? "…" : ""), 957, 433, 25, f.titleB, GOLD);
  bullets(c, [886, 478, 1146, 534], [m2 ? m2.items.slice(0, 2).join("; ") : (map.traps[0]?.truth ?? map.tip ?? "")], { font: f.textB, color: INK, max: 21, min: 14, bullet: "triangle" });
  if (m2) {
    acronymRun(c, [945, 612, 1112, 670], m2.acronym, { max: 58, style: "gold", metal });
    paragraph(c, [896, 668, 1152, 715], termsLine(m2), { font: f.textB, color: INK, max: 21, min: 12 });
  }

  // Coluna 4: outros blocos do esquema + pegadinha
  const others = map.blocks.filter((b) => !blocks.includes(b));
  c.text(others.length ? "Mais do esquema" : "Pegadinhas", 1305, 288, 27, f.titleB, WHITE);
  if (map.subtitle) c.text(`(${map.subtitle})`, 1305, 320, 21, f.textB, SOFT);
  const col4 = others.length ? others.map((b) => `${b.title}: ${b.detail}${b.value ? ` (${b.value})` : ""}`) : map.traps.map((t) => `${t.claim} ${t.truth}`);
  bullets(c, [1220, 372, 1498, 620], col4.slice(0, 4), { font: f.text, color: WHITE, max: 21, min: 12.5, bullet: "chevron" });
  const trap = others.length ? map.traps[0] : map.traps[1];
  c.text("Pegadinha de prova", 1293, 655, 26, f.titleB, WHITE);
  c.text("(atenção!)", 1293, 686, 21, f.textB, SOFT);
  paragraph(c, [1228, 722, 1498, 792], trap ? `${trap.claim} ${trap.truth}` : (map.tip ?? ""), { font: f.textB, color: INK, max: 20, min: 11.5, align: "left" });

  // Linha de baixo
  c.text("Dica de Prova", 403, 815, 29, f.titleB, WHITE);
  const tip = map.tip ?? "Revise os mnemônicos e o esquema antes da prova.";
  const cut = tip.lastIndexOf(": ");
  paragraph(c, [352, 858, 632, 943], cut > 10 && tip.length - cut < 48 ? [{ text: tip.slice(0, cut + 2) }, { text: tip.slice(cut + 2), color: RED_TEXT }] : tip, { font: f.text, color: WHITE, max: 22, min: 12 });
  c.text("Resumo Estratégico", 785, 815, 29, f.titleB, WHITE);
  const short = (q: string) => q.replace(/\?$/, "").replace(/^(qual\s+[ée]\s+a\s+|qual\s+a\s+|quais\s+s[ãa]o\s+)/i, "").replace(/^pena d[oa]s?\s+/i, "").trim();
  const summary = map.summary.length ? map.summary.slice(0, 3).map((r) => `${upperFirst(short(r.q))} = ${r.a}`) : blocks.map((b) => `${blockHeading(map, b).title} = ${b.value ?? b.detail}`);
  bullets(c, [742, 857, 1030, 946], summary, { font: f.text, color: WHITE, max: 22, min: 12, bullet: "check" });
  c.text("O que lembrar?", 1212, 815, 29, f.titleB, WHITE);
  const remember = mn.length ? mn.slice(0, 3).map((m) => `${upperFirst(m.label)} = ${m.acronym}`) : map.remember.slice(0, 3);
  bullets(c, [1170, 857, 1450, 946], remember, { font: f.text, color: WHITE, max: 22, min: 12, bullet: "check" });
}

/** Cartão das páginas seguintes: cantos cortados, borda vermelha com brilho, como no modelo. */
function chamferCard(c: Canvas, x: number, y: number, w: number, h: number, accent: RGB) {
  const k = 16;
  const d = `M ${x + k} ${y} L ${x + w} ${y} L ${x + w} ${y + h - k} L ${x + w - k} ${y + h} L ${x} ${y + h} L ${x} ${y + k} Z`;
  for (const [wd, op] of [[14, 0.06], [9, 0.1], [5, 0.18]] as const) c.path(d, { stroke: accent, width: wd, opacity: op });
  c.path(d, { fill: rgb(0.035, 0.035, 0.04), opacity: 0.94 });
  c.path(d, { stroke: accent, width: 2.4 });
  // faixa do cabeçalho
  c.path(`M ${x + k} ${y + 2} L ${x + w - 2} ${y + 2} L ${x + w - 2} ${y + 44} L ${x + 2} ${y + 44} L ${x + 2} ${y + k} Z`, { fill: rgb(0.1, 0.1, 0.11), opacity: 0.9 });
  c.path(`M ${x + 2} ${y + 44} L ${x + w - 2} ${y + 44}`, { stroke: accent, width: 1.2, opacity: 0.8 });
}

type FlowCard = { title: string; sub?: string | null; accent: RGB; items: string[]; bullet: Bullet; big?: string };

function drawFullPages(doc: PDFDocument, f: Fonts, map: MindMap, bg: PDFImage, metal: PDFImage) {
  const cards: FlowCard[] = [];
  map.modules.forEach((m, i) => cards.push({ title: m.title, sub: `Módulo ${i + 1}`, accent: RED, items: m.points, bullet: "chevron" }));
  map.mnemonics.forEach((m, i) => cards.push({ title: "Mnemônico", sub: upperFirst(m.label), accent: [PURPLE, RED, GOLD][i % 3]!, big: m.acronym, items: m.items.length ? m.items : m.terms, bullet: "check" }));
  if (map.blocks.length) cards.push({ title: "Esquema completo", sub: map.valueLabel, accent: RED, items: map.blocks.map((b) => `${b.title}: ${b.detail}${b.value ? ` → ${b.value}` : ""}`), bullet: "check" });
  if (map.traps.length) cards.push({ title: "Pegadinhas de prova", accent: RED, items: map.traps.map((t) => `${t.claim} ${t.truth}`), bullet: "chevron" });
  if (map.comparisons.length) cards.push({ title: "Não confunda", accent: GOLD, items: map.comparisons.map((r) => `${r.title}: ${r.detail}${r.value ? ` (${r.value})` : ""}`), bullet: "chevron" });
  if (map.summary.length) cards.push({ title: "Resumo estratégico", accent: RED, items: map.summary.map((r) => `${r.q} ${r.a}`), bullet: "check" });
  if (map.remember.length) cards.push({ title: "O que lembrar?", accent: GOLD, items: map.remember, bullet: "check" });
  if (!cards.length) return;

  const gap = 18;
  const top = 262;
  const bottom = 944;
  const colW = (PX_W - 60 - gap * 2) / 3;
  const size = 18;
  const lh = size * 1.1;
  const measure = (cd: FlowCard) => {
    const ind = size * 1.45;
    let hgt = 44 + 14 + (cd.big ? 58 : 0);
    for (const it of cd.items) hgt += wrap(f.text, it, size, colW - 36 - ind).length * lh + size * 0.28;
    return Math.min(hgt + 10, bottom - top);
  };
  let c!: Canvas;
  let cols = [top, top, top];
  const newPage = () => {
    const page = doc.addPage([W, H]);
    page.drawImage(bg, { x: 0, y: 0, width: W, height: H });
    c = new Canvas(doc, page, f);
    const title = map.title.toUpperCase();
    let ts = 96;
    while (ts > 30 && c.width(title, ts, f.title) > 585) ts -= 2;
    metalText(c, ellipsize(f.title, wrap(f.title, title, ts, 585), ts, 585, 1)[0] ?? "", 1085 - Math.min(585, c.width(title, ts, f.title)) / 2, 100 + (105 - ts * 0.86) / 2, ts, f.title, metal);
    paragraph(c, [930, 208, 1212, 246], "MATÉRIA COMPLETA", { font: f.title, color: WHITE, max: 34, min: 18 });
    cols = [top, top, top];
  };
  newPage();
  for (const cd of cards) {
    const hgt = measure(cd);
    let col = cols.indexOf(Math.min(...cols));
    if (cols[col]! + hgt > bottom) {
      newPage();
      col = 0;
    }
    const x = 30 + col * (colW + gap);
    const y = cols[col]!;
    chamferCard(c, x, y, colW, hgt, cd.accent);
    c.text(ellipsize(f.titleB, wrap(f.titleB, cd.title, 25, colW - 40), 25, colW - 40, 1)[0] ?? "", x + 20, y + 6, 25, f.titleB, cd.accent === GOLD ? GOLD : WHITE);
    if (cd.sub) c.text(ellipsize(f.textB, wrap(f.textB, cd.sub, 15, colW - 40), 15, colW - 40, 1)[0] ?? "", x + 20, y + 28, 15, f.textB, rgb(0.72, 0.72, 0.75));
    let by = y + 56;
    if (cd.big) {
      acronymRun(c, [x + 18, by, x + colW - 18, by + 52], cd.big, { max: 50, style: cd.accent === PURPLE ? "purple" : "red", metal });
      by += 58;
    }
    bullets(c, [x + 18, by, x + colW - 18, y + hgt - 10], cd.items, { font: f.text, color: WHITE, max: size, min: 12, bullet: cd.bullet, vcenter: false });
    cols[col] = y + hgt + gap;
  }
}

export async function renderMindMapPdf(map: MindMap): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(`Mapa mental — ${map.title}`);
  doc.setAuthor("APROVUM");
  doc.setCreator("APROVUM");
  const f: Fonts = {
    title: await doc.embedFont(b64(FONTE_TITULO), { subset: true }),
    titleB: await doc.embedFont(b64(FONTE_TITULO_B), { subset: true }),
    text: await doc.embedFont(b64(FONTE_TEXTO), { subset: true }),
    textB: await doc.embedFont(b64(FONTE_TEXTO_B), { subset: true }),
    textI: await doc.embedFont(b64(FONTE_TEXTO_I), { subset: true }),
  };
  const bg = await doc.embedJpg(b64(MODELO_JPG));
  const bg2 = await doc.embedJpg(b64(MODELO_CONTINUACAO_JPG));
  const metal = await doc.embedPng(b64(METAL_PNG));
  drawMapPage(doc, f, map, bg, metal);
  drawFullPages(doc, f, map, bg2, metal);
  return doc.save();
}
