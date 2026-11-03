/**
 * PDF do MAPA MENTAL — fiel ao modelo oficial (1536 x 1024): o fundo É o próprio modelo, com os
 * textos apagados; o PDF escreve por cima, nas mesmas posições, com fontes condensadas em
 * negrito itálico como no original. Uma página só, objetiva: o que mais cai em prova
 * (penas e números do esquema, mnemônicos, pegadinhas, dica e resumo), em frases curtas.
 */
import { PDFDocument, rgb, PDFName, pushGraphicsState, popGraphicsState, beginText, endText, setFontAndSize, setTextRenderingMode, TextRenderingMode, showText, setTextMatrix, drawObject, concatTransformationMatrix, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { MindMap, MindMapMnemonic } from "@/domain/content/mind-map";
import { FONTE_TEXTO, FONTE_TEXTO_B, FONTE_TEXTO_I, FONTE_TITULO, FONTE_TITULO_B, METAL_PNG, MODELO_MAPA_JPG } from "./mind-map-assets";

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
const PURPLE = rgb(0.66, 0.36, 0.95);

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
/** Versão curta para o mapa: sem parênteses, até a primeira pausa, no máximo `max` caracteres. */
export function brief(s: string, max: number): string {
  let t = s.replace(/\s*\([^)]*\)/g, "").replace(/\s+/g, " ").trim();
  const stop = t.search(/((?<!\b(?:art|arts|inc|al|n|p|ex|Lei|nº))\.\s|;\s|\s—\s|\s–\s)/i);
  if (stop > 12) t = t.slice(0, stop);
  t = t.replace(/[.;:,]+$/, "");
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/\s+\S*$/, "").replace(/[.;:,]+$/, "") + "…";
}

function termsLine(m: MindMapMnemonic) {
  return m.terms.map((t) => upperFirst(brief(t, 22))).join(", ");
}

type Tok = { w: string; bold: boolean };
/** Quebra "termo: texto" com o termo em negrito. */
function richWrap(f: Fonts, lead: string | null, text: string, size: number, width: number): Tok[][] {
  const toks: Tok[] = [
    ...(lead ? clean(f.textB, /[?!:]$/.test(lead) ? lead : `${lead}:`).split(" ").filter(Boolean).map((w) => ({ w, bold: true })) : []),
    ...clean(f.text, text).split(" ").filter(Boolean).map((w) => ({ w, bold: false })),
  ];
  const sp = f.text.widthOfTextAtSize(" ", size);
  const lines: Tok[][] = [];
  let line: Tok[] = [];
  let lw = 0;
  for (const t of toks) {
    const tw = (t.bold ? f.textB : f.text).widthOfTextAtSize(t.w, size);
    if (line.length && lw + sp + tw > width) {
      lines.push(line);
      line = [];
      lw = 0;
    }
    lw += (line.length ? sp : 0) + tw;
    line.push(t);
  }
  if (line.length) lines.push(line);
  return lines;
}

/** Cartão do modelo: cantos cortados, borda com brilho, faixa de título e selo numerado. */
function moduleCard(c: Canvas, x: number, y: number, w: number, h: number, accent: RGB) {
  const k = 20;
  const d = `M ${x + k} ${y} L ${x + w} ${y} L ${x + w} ${y + h - k} L ${x + w - k} ${y + h} L ${x} ${y + h} L ${x} ${y + k} Z`;
  for (const [wd, op] of [[16, 0.05], [10, 0.09], [6, 0.16]] as const) c.path(d, { stroke: accent, width: wd, opacity: op });
  c.path(d, { fill: rgb(0.03, 0.03, 0.035), opacity: 0.93 });
  c.path(`M ${x + k} ${y + 2} L ${x + w - 2} ${y + 2} L ${x + w - 2} ${y + 46} L ${x + 2} ${y + 46} L ${x + 2} ${y + k} Z`, { fill: rgb(0.09, 0.09, 0.1), opacity: 0.95 });
  c.path(`M ${x + 2} ${y + 46} L ${x + w - 2} ${y + 46}`, { stroke: accent, width: 1.4, opacity: 0.85 });
  c.path(d, { stroke: accent, width: 2.6 });
}

const ACCENT_TEXT = (a: RGB) => (a === GOLD ? GOLD : a === PURPLE ? rgb(0.84, 0.68, 1) : RED_TEXT);

/** O mapa: uma página, um cartão por módulo com os pontos que mais caem em prova. */
function drawModuleMap(doc: PDFDocument, f: Fonts, map: MindMap, bg: PDFImage, metal: PDFImage) {
  const page = doc.addPage([W, H]);
  page.drawImage(bg, { x: 0, y: 0, width: W, height: H });
  const c = new Canvas(doc, page, f);

  // Título prateado + faixa vermelha (como no modelo)
  const title = map.title.toUpperCase();
  let ts = 112;
  while (ts > 40 && c.width(title, ts, f.title) > 585) ts -= 2;
  if (c.width(title, ts, f.title) > 585) {
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

  const mods = map.modules.filter((m) => m.keys.length).slice(0, 12);
  if (!mods.length) return;
  const n = mods.length;
  const cols = n <= 2 ? n : n <= 4 ? 2 : n <= 9 ? 3 : 4;
  const rows = Math.ceil(n / cols);
  const X0 = 26;
  const X1 = 1510;
  const Y0 = 262;
  const Y1 = 946;
  const gap = 16;
  const ch = (Y1 - Y0 - gap * (rows - 1)) / rows;
  // Mesmo tamanho de letra em todos os cartões (cabem os pontos de maior peso).
  const SIZE = rows >= 4 ? 14 : rows === 3 ? 16 : rows === 2 ? 19 : 22;
  const mnemonicByModule = new Map(map.mnemonics.filter((m) => m.module).map((m) => [m.module!, m]));
  mods.forEach((m, i) => {
    const r = Math.floor(i / cols);
    const inRow = r === rows - 1 ? n - r * cols : cols;
    const cw = (X1 - X0 - gap * (inRow - 1)) / inRow;
    const x = X0 + (i - r * cols) * (cw + gap);
    const y = Y0 + r * (ch + gap);
    const isTrap = /pegadinha|armadilha/i.test(m.title) || m.keys.some((k) => k.text.startsWith("“"));
    const accent = isTrap ? GOLD : /revis|resumo/i.test(m.title) ? PURPLE : RED;
    moduleCard(c, x, y, cw, ch, accent);
    // selo numerado + título
    const num = String(i + 1).padStart(2, "0");
    c.path(`M ${x + 16} ${y + 9} L ${x + 62} ${y + 9} L ${x + 54} ${y + 39} L ${x + 8} ${y + 39} Z`, { fill: accent === GOLD ? GOLD : accent === PURPLE ? rgb(0.55, 0.3, 0.85) : RED });
    c.text(num, x + 35 - c.width(num, 24, f.title) / 2, y + 12, 24, f.title, accent === GOLD ? INK : WHITE);
    const tw = cw - 90;
    let tsz = 25;
    while (tsz > 16 && c.width(m.title.toUpperCase(), tsz, f.title) > tw) tsz -= 0.5;
    const tl = ellipsize(f.title, wrap(f.title, m.title.toUpperCase(), tsz, tw), tsz, tw, 1)[0] ?? "";
    c.text(tl, x + 74, y + 24 - tsz * 0.43, tsz, f.title, accent === GOLD ? GOLD : WHITE);

    // mnemônico do módulo (faixa no pé do cartão)
    const mn = mnemonicByModule.get(m.title);
    const mnH = mn ? 50 : 0;
    const bx0 = x + 18;
    const bx1 = x + cw - 18;
    const by0 = y + 56;
    const by1 = y + ch - 12 - mnH;
    if (mn) {
      const my = y + ch - 12 - mnH + 4;
      c.path(`M ${bx0} ${my} L ${bx1} ${my}`, { stroke: accent, width: 1, opacity: 0.5 });
      c.text("MNEMÔNICO", bx0, my + 8, 15, f.title, ACCENT_TEXT(accent));
      const q = `“${mn.acronym}”`;
      c.text(q, bx0 + c.width("MNEMÔNICO", 15, f.title) + 10, my + 3, 34, f.title, ACCENT_TEXT(accent === RED ? RED : accent));
      const tx = bx0 + c.width("MNEMÔNICO", 15, f.title) + 22 + c.width(q, 34, f.title);
      paragraph(c, [tx, my + 6, bx1, my + 44], termsLine(mn), { font: f.textI, color: SOFT, max: 16, min: 11, align: "left" });
    }

    // pontos: os de maior peso que couberem, na ordem da aula
    const order = m.keys.map((k, idx) => ({ k, idx })).sort((a, b) => b.k.score - a.k.score || a.idx - b.idx);
    const avail = by1 - by0;
    const size = SIZE;
    const chosen: Array<{ k: (typeof m.keys)[number]; idx: number; lines: Tok[][]; cut: boolean }> = [];
    {
      const lh = size * 1.12;
      const ind = size * 1.35;
      let used = 0;
      for (const o of order) {
        const full = richWrap(f, o.k.lead, o.k.text, size, bx1 - bx0 - ind);
        const lines = full.slice(0, 3);
        const hh = lines.length * lh + (chosen.length ? size * 0.32 : 0);
        if (used + hh > avail) continue;
        used += hh;
        chosen.push({ ...o, lines, cut: full.length > 3 });
      }
    }
    const lh = size * 1.12;
    const ind = size * 1.35;
    let yy = by0;
    for (const o of chosen.sort((a, b) => a.idx - b.idx)) {
      c.chevrons(bx0, yy + size * 0.12, size * 0.8);
      o.lines.forEach((ln, li) => {
        let xx = bx0 + ind;
        const last = o.cut && li === o.lines.length - 1;
        ln.forEach((t, ti) => {
          const font = t.bold ? f.textB : f.text;
          const word = last && ti === ln.length - 1 ? `${t.w}…` : t.w;
          c.text(word, xx, yy + li * lh, size, font, t.bold ? ACCENT_TEXT(accent) : WHITE);
          xx += font.widthOfTextAtSize(word, size) + f.text.widthOfTextAtSize(" ", size);
        });
      });
      yy += o.lines.length * lh + size * 0.32;
    }
  });
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
  const bg = await doc.embedJpg(b64(MODELO_MAPA_JPG));
  const metal = await doc.embedPng(b64(METAL_PNG));
  drawModuleMap(doc, f, map, bg, metal);
  return doc.save();
}
