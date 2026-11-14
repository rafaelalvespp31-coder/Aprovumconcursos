/**
 * "Meu PDF de Revisão": os post-its ativos de uma aula, na ordem da aula, com a identidade editorial do
 * APROVUM (capa com o olho, faixas numeradas, cartões independentes, moldura e rodapé em todas as páginas).
 * Nada é resumido nem reescrito — o trecho e a anotação saem exatamente como o aluno guardou (acentos preservados).
 * Entrada: o retrato congelado; saída: bytes do PDF. Conteúdo (esta função recebe os dados) e apresentação (o desenho) ficam separados.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type Color } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { LOGO_ESCURA_PNG } from "./logos";
import { parseExplanation } from "@/domain/study/explanation-format";
import type { PostitPdfSnapshot } from "./postit-types";

const A4: [number, number] = [595.28, 841.89];
const [W, H] = A4;
const M = { left: 38, right: 38 };
const BOTTOM = 66;
const TOP_NEXT = H - 86;
const INK = rgb(0.09, 0.09, 0.11);
const GRAY = rgb(0.38, 0.38, 0.42);
const BLACK = rgb(0.03, 0.03, 0.04);
const RED = rgb(0.8, 0.07, 0.07);
const RED_D = rgb(0.55, 0.03, 0.04);
const LINE = rgb(0.78, 0.8, 0.83);
const PAGE_BG = rgb(0.925, 0.93, 0.94);
const WHITE = rgb(1, 1, 1);
const YELLOW = rgb(1, 0.9, 0.28);
const AMBER = rgb(0.82, 0.5, 0.04);

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const b64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64"));

function wrap(font: PDFFont, text: string, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) { out.push(""); continue; }
    let line = "";
    for (const word of para.split(" ")) {
      // Palavra maior que a linha: quebra por caractere.
      const pieces: string[] = [];
      let w = word;
      while (font.widthOfTextAtSize(w, size) > maxW && w.length > 1) {
        let k = w.length - 1;
        while (k > 1 && font.widthOfTextAtSize(w.slice(0, k), size) > maxW) k--;
        pieces.push(w.slice(0, k));
        w = w.slice(k);
      }
      pieces.push(w);
      for (const piece of pieces) {
        const t = line ? `${line} ${piece}` : piece;
        if (font.widthOfTextAtSize(t, size) <= maxW) line = t;
        else { if (line) out.push(line); line = piece; }
      }
    }
    out.push(line);
  }
  return out;
}


type Pt = [number, number];
/** Retângulo com cantos recortados na diagonal (tl, tr, br, bl). */
function chamf(x: number, y: number, w: number, h: number, c: { tl?: number; tr?: number; br?: number; bl?: number }): Pt[] {
  const tl = c.tl ?? 0, tr = c.tr ?? 0, br = c.br ?? 0, bl = c.bl ?? 0;
  const top = y + h;
  const pts: Pt[] = [];
  pts.push([x + bl, y]);
  pts.push([x + w - br, y]);
  if (br) pts.push([x + w, y + br]);
  if (tr) { pts.push([x + w, top - tr]); pts.push([x + w - tr, top]); } else pts.push([x + w, top]);
  pts.push([x + tl, top]);
  if (tl) pts.push([x, top - tl]);
  if (bl) pts.push([x, y + bl]);
  return pts;
}

type Row = { h: number; draw: (p: PDFPage, x: number, top: number, w: number) => void; head?: Row; isHead?: boolean };
type CardSpec = { label: string; glyph: string; tone: Color; fill: Color; rows: Row[]; border?: Color; postit?: boolean };

export async function renderPostitPdf(s: PostitPdfSnapshot, meta: { pdfVersion: number }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Meu PDF de Revisão — ${s.lesson.title}`);
  doc.setAuthor("APROVUM");
  doc.setCreator("APROVUM");
  doc.setProducer("APROVUM");
  doc.setCreationDate(new Date(s.generatedAt));
  doc.setLanguage("pt-BR");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const boldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);
  const logoEscura = await doc.embedPng(b64(LOGO_ESCURA_PNG));
  const pub = (f: string) => path.join(process.cwd(), "public", "pdf", f);
  const logoClara = await readFile(pub("logo-clara.png")).then((b) => doc.embedPng(b)).catch(() => null);
  const olho: PDFImage | null = await readFile(pub("hero-olho.jpg")).then((b) => doc.embedJpg(b)).catch(() => null);
  const soldado: PDFImage | null = await readFile(pub("soldado.jpg")).then((b) => doc.embedJpg(b)).catch(() => null);
  const charset = new Set(regular.getCharacterSet());

  /** Mantém o texto como está; só troca o que a fonte padrão não consegue desenhar. */
  const clean = (t: string) =>
    [...t.replace(/%u([0-9a-fA-F]{4})/g, (_, h: string) => String.fromCharCode(parseInt(h, 16))).normalize("NFC").replace(/[→⇒]/g, "->").replace(/[←⇐]/g, "<-").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/≠/g, "!=").replace(/[−‐‑]/g, "-").replace(/ /g, " ")]
      .map((ch) => (ch === "\n" || charset.has(ch.codePointAt(0)!) ? ch : "?"))
      .join("");
  const fit = (f: PDFFont, t: string, size: number, maxW: number) => {
    if (f.widthOfTextAtSize(t, size) <= maxW) return t;
    let r = t;
    while (r.length > 2 && f.widthOfTextAtSize(`${r}…`, size) > maxW) r = r.slice(0, -1);
    return `${r.trimEnd()}…`;
  };

  const poly = (p: PDFPage, pts: Pt[], o: { color?: Color; opacity?: number; border?: Color; bw?: number }) => {
    const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)},${(H - y).toFixed(2)}`).join(" ") + " Z";
    p.drawSvgPath(d, { x: 0, y: H, color: o.color, opacity: o.opacity, borderColor: o.border, borderWidth: o.bw ?? 0 });
  };

  // ---------- Moldura da página (todas as páginas) ----------
  const frame = (p: PDFPage) => {
    p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: PAGE_BG });
    const inner = chamf(14, 14, W - 28, H - 28, { tl: 16, br: 16 });
    poly(p, inner, { color: rgb(0.995, 0.995, 1), border: RED, bw: 1.6 });
    // linha fina interna + cantos pretos
    poly(p, chamf(19, 19, W - 38, H - 38, { tl: 13, br: 13 }), { border: rgb(0.86, 0.87, 0.9), bw: 0.5 });
    p.drawRectangle({ x: 14, y: H - 14 - 3, width: 46, height: 3, color: BLACK });
    p.drawRectangle({ x: W - 14 - 46, y: 14, width: 46, height: 3, color: BLACK });
    p.drawRectangle({ x: W - 14 - 3, y: H - 14 - 46, width: 3, height: 46, color: BLACK });
  };

  let page: PDFPage = doc.addPage(A4);
  frame(page);
  let y = TOP_NEXT;
  const newPage = () => { page = doc.addPage(A4); frame(page); y = TOP_NEXT; };
  const innerW = W - M.left - M.right;

  // ---------- Capa (só na página 1) ----------
  {
    const hx = 14, hTop = H - 14, hH = 232, hW = W - 28;
    poly(page, chamf(hx, hTop - hH, hW, hH, { tl: 16 }), { color: BLACK });
    if (olho) {
      const ih = hH, iw = (ih * olho.width) / olho.height;
      page.drawImage(olho, { x: W - 14 - iw, y: hTop - ih, width: iw, height: ih });
    }
    // véu vermelho inferior (transição para a faixa de dados)
    for (let i = 0; i < 8; i++) page.drawRectangle({ x: hx, y: hTop - hH, width: hW, height: 3 * (8 - i), color: BLACK, opacity: 0.08 });
    // cantos fora do recorte
    page.drawRectangle({ x: W - 14 - 16, y: hTop - 16, width: 16, height: 16, color: PAGE_BG, opacity: 0 });
    poly(page, [[W - 14, hTop], [W - 14 - 16, hTop], [W - 14, hTop - 16]], { color: PAGE_BG });
    poly(page, chamf(14, 14, W - 28, H - 28, { tl: 16, br: 16 }), { border: RED, bw: 1.6 });
    // logo + etiqueta
    if (logoClara) {
      const lh = 30, lw = (lh * logoClara.width) / logoClara.height;
      page.drawImage(logoClara, { x: 32, y: hTop - 14 - lh, width: lw, height: lh });
    }
    const pillW = bold.widthOfTextAtSize("MEU PDF DE REVISÃO", 10) + 44;
    poly(page, [[32, hTop - 72], [32 + pillW, hTop - 72], [32 + pillW - 10, hTop - 94], [32, hTop - 94]], { color: RED_D, border: RED, bw: 1 });
    page.drawCircle({ x: 46, y: hTop - 83, size: 6, borderColor: WHITE, borderWidth: 1.3 });
    page.drawCircle({ x: 46, y: hTop - 83, size: 1.6, color: WHITE });
    page.drawText("MEU PDF DE REVISÃO", { x: 58, y: hTop - 86.5, size: 10, font: boldItalic, color: WHITE });
    // título da aula: grande, branco e vermelho (última linha)
    const T = clean(s.lesson.title).toUpperCase();
    const maxW = 292;
    let size = 40;
    let lines = wrap(boldItalic, T, size, maxW);
    while ((lines.length > 4 || lines.length * size * 1.04 > 96 || lines.some((l) => boldItalic.widthOfTextAtSize(l, size) > maxW)) && size > 15) { size -= 1.5; lines = wrap(boldItalic, T, size, maxW); }
    lines = lines.slice(0, 4);
    const lhT = size * 1.04;
    let ty = hTop - 104 - size;
    lines.forEach((l, i) => {
      const last = i === lines.length - 1 && lines.length > 1;
      page.drawText(l, { x: 33, y: ty - 1.5, size, font: boldItalic, color: BLACK, opacity: 0.6 });
      page.drawText(l, { x: 32, y: ty, size, font: boldItalic, color: last ? rgb(0.95, 0.12, 0.1) : WHITE });
      ty -= lhT;
    });
    // detalhes: barras vermelhas
    for (let i = 0; i < 3; i++) poly(page, [[32 + i * 9, hTop - hH + 8], [32 + i * 9 + 5, hTop - hH + 8], [32 + i * 9 + 11, hTop - hH + 20], [32 + i * 9 + 6, hTop - hH + 20]], { color: RED });
  }

  // ---------- Painel de identificação ----------
  {
    const px = 26, pw = W - 52, ph = 54, py = H - 14 - 232 - ph / 2 - 8;
    poly(page, chamf(px, py, pw, ph, { tl: 10, br: 10 }), { color: WHITE, border: RED, bw: 1.3 });
    poly(page, chamf(px + 3, py + 3, pw - 6, ph - 6, { tl: 8, br: 8 }), { border: LINE, bw: 0.4 });
    type Cell = { k: string; v: string; icon: (p: PDFPage, cx: number, cy: number) => void };
    const ico = {
      book: (p: PDFPage, cx: number, cy: number) => { p.drawRectangle({ x: cx - 10, y: cy - 7, width: 9, height: 14, color: INK }); p.drawRectangle({ x: cx + 1, y: cy - 7, width: 9, height: 14, color: INK }); p.drawLine({ start: { x: cx, y: cy - 7 }, end: { x: cx, y: cy + 7 }, thickness: 1, color: WHITE }); },
      screen: (p: PDFPage, cx: number, cy: number) => { p.drawRectangle({ x: cx - 10, y: cy - 6, width: 20, height: 13, color: INK }); poly(p, [[cx - 3, cy - 3], [cx + 4, cy + 0.5], [cx - 3, cy + 4]], { color: RED }); p.drawRectangle({ x: cx - 5, y: cy - 9, width: 10, height: 2, color: INK }); },
      user: (p: PDFPage, cx: number, cy: number) => { p.drawCircle({ x: cx, y: cy + 3.5, size: 4.5, color: INK }); p.drawEllipse({ x: cx, y: cy - 6, xScale: 8, yScale: 5, color: INK }); },
      cal: (p: PDFPage, cx: number, cy: number) => { p.drawRectangle({ x: cx - 9, y: cy - 8, width: 18, height: 16, color: INK }); p.drawRectangle({ x: cx - 9, y: cy + 3, width: 18, height: 5, color: RED }); for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) p.drawRectangle({ x: cx - 6 + i * 4.5, y: cy - 6 + j * 4.5, width: 2.6, height: 2.6, color: WHITE }); },
      ver: (p: PDFPage, cx: number, cy: number) => { p.drawCircle({ x: cx, y: cy, size: 8, borderColor: INK, borderWidth: 2.2 }); poly(p, [[cx + 3, cy + 9], [cx + 11, cy + 8], [cx + 6, cy + 1]], { color: WHITE }); poly(p, [[cx + 4, cy + 10], [cx + 12, cy + 7], [cx + 7, cy + 3]], { color: INK }); },
    };
    const cells: Cell[] = [];
    if (s.lesson.subject) cells.push({ k: "MATÉRIA", v: s.lesson.subject, icon: ico.book });
    cells.push({ k: "AULA", v: s.lesson.title, icon: ico.screen });
    if (s.student.name) cells.push({ k: "ALUNO(A)", v: s.student.name, icon: ico.user });
    cells.push({ k: "DATA", v: fmtDate(s.generatedAt), icon: ico.cal });
    cells.push({ k: "VERSÃO", v: `v${meta.pdfVersion} · ${s.items.length} post-it${s.items.length === 1 ? "" : "s"}`, icon: ico.ver });
    const cw = (pw - 24) / cells.length;
    cells.forEach((c, i) => {
      const cx = px + 12 + i * cw;
      if (i > 0) page.drawLine({ start: { x: cx - 2, y: py + 9 }, end: { x: cx - 2, y: py + ph - 9 }, thickness: 0.9, color: RED });
      c.icon(page, cx + 14, py + ph / 2);
      const tx = cx + 30, tw = cw - 36;
      page.drawText(c.k, { x: tx, y: py + ph - 18, size: 6.8, font: bold, color: INK });
      const ls = wrap(regular, clean(c.v), 7.6, tw).slice(0, 2);
      if ((wrap(regular, clean(c.v), 7.6, tw)).length > 2) ls[1] = fit(regular, ls[1] ?? "", 7.6, tw);
      ls.forEach((l, k) => page.drawText(l, { x: tx, y: py + ph - 28.5 - k * 9, size: 7.6, font: regular, color: INK }));
    });
    y = py - 20;
  }

  // ---------- Peças de desenho ----------
  const LH = 1.38;
  const textRows = (txt: string, font: PDFFont, size: number, w: number, o: { color?: Color; x0?: number; marker?: (p: PDFPage, x: number, top: number) => void; hl?: boolean; gapTop?: number } = {}): Row[] => {
    const x0 = o.x0 ?? 0;
    const lines = wrap(font, clean(txt), size, w - x0);
    return lines.map((l, i) => ({
      h: size * LH + (i === 0 ? (o.gapTop ?? 0) : 0),
      draw: (p, x, top) => {
        const t0 = top - (i === 0 ? (o.gapTop ?? 0) : 0);
        if (o.marker && i === 0) o.marker(p, x, t0);
        if (o.hl) p.drawRectangle({ x: x + x0 - 1.5, y: t0 - size - 2.2, width: font.widthOfTextAtSize(l, size) + 3, height: size + 3.4, color: YELLOW });
        p.drawText(l, { x: x + x0, y: t0 - size - 1, size, font, color: o.color ?? INK });
      },
    }));
  };
  const redDot = (p: PDFPage, x: number, top: number, size: number, glyph?: string) => {
    p.drawCircle({ x: x + 6, y: top - size / 2 - 1.2, size: 5.4, color: RED });
    if (glyph) p.drawText(glyph, { x: x + 6 - bold.widthOfTextAtSize(glyph, 7.5) / 2, y: top - size / 2 - 3.8, size: 7.5, font: bold, color: WHITE });
  };
  const bulletSq = (p: PDFPage, x: number, top: number, size: number, ind: number) => p.drawRectangle({ x: x + ind, y: top - size / 2 - 3, width: 4, height: 4, color: RED });

  const QS = 10;
  const quoteRows = (it: PostitPdfSnapshot["items"][number], w: number): Row[] => {
    if (!it.structure?.length) return textRows(it.quote, regular, QS, w);
    const out: Row[] = [];
    for (const b of it.structure) {
      if (b.k === "table") out.push(...tableRows(b.rows, w));
      else if (b.k === "li") {
        const ind = 4 + (b.d ?? 0) * 12;
        out.push(...textRows(b.t, regular, QS, w, { x0: ind + 14, marker: (p, x, top) => { if (b.n != null) p.drawText(`${b.n}.`, { x: x + ind, y: top - QS - 1, size: QS, font: bold, color: RED }); else bulletSq(p, x, top, QS, ind) } }));
      } else if (b.k === "h") out.push(...textRows(b.t, bold, QS + 0.5, w, { gapTop: 3 }));
      else out.push(...textRows(b.t, regular, QS, w));
    }
    return out;
  };
  /** Tabela com as mesmas linhas e colunas do texto; larguras proporcionais; cabeçalho repetido ao mudar de página. */
  const tableRows = (rows: Array<{ h?: boolean; c: string[] }>, avail: number): Row[] => {
    const TS = 8.4, TLH = TS * 1.3, PAD = 3.5;
    const cols = Math.max(...rows.map((r) => r.c.length));
    const fnt = (r: { h?: boolean }) => (r.h ? bold : regular);
    const cell = (r: { h?: boolean; c: string[] }, ci: number) => clean(r.c[ci] ?? "");
    const natural = Array.from({ length: cols }, (_, ci) => Math.max(...rows.map((r) => fnt(r).widthOfTextAtSize(cell(r, ci).replace(/\n/g, " "), TS))) + 2 * PAD);
    const minW = Array.from({ length: cols }, (_, ci) => Math.min(natural[ci]!, Math.max(...rows.map((r) => Math.max(0, ...cell(r, ci).split(/\s+/).map((w) => fnt(r).widthOfTextAtSize(w, TS))))) + 2 * PAD));
    const sum = (a: number[]) => a.reduce((x, z) => x + z, 0);
    let widths: number[];
    if (sum(natural) <= avail) widths = natural.map((w) => w + (avail - sum(natural)) / cols);
    else if (sum(minW) >= avail) widths = minW.map((w) => (w * avail) / sum(minW));
    else {
      const wt = natural.map((w, i) => Math.max(0, w - minW[i]!));
      widths = minW.map((w, i) => w + ((avail - sum(minW)) * wt[i]!) / (sum(wt) || 1));
    }
    const mk = (r: { h?: boolean; c: string[] }, zebra: boolean): Row => {
      const lines = widths.map((w, ci) => wrap(fnt(r), cell(r, ci), TS, Math.max(8, w - 2 * PAD)));
      const h = Math.max(...lines.map((l) => l.length), 1) * TLH + 2 * PAD;
      return {
        h, isHead: !!r.h,
        draw: (p, x, top) => {
          let cx = x;
          widths.forEach((w, ci) => {
            p.drawRectangle({ x: cx, y: top - h, width: w, height: h, color: r.h ? BLACK : zebra ? rgb(0.955, 0.957, 0.965) : WHITE, borderColor: r.h ? RED : LINE, borderWidth: 0.6 });
            lines[ci]!.forEach((ln, k) => p.drawText(ln, { x: cx + PAD, y: top - PAD - TS - k * TLH + 1, size: TS, font: fnt(r), color: r.h ? WHITE : INK }));
            cx += w;
          });
        },
      };
    };
    const headRow = rows[0]?.h ? mk(rows[0], false) : undefined;
    return rows.map((r, i) => { const row = mk(r, i % 2 === 0); if (headRow && !r.h) row.head = headRow; return row; });
  };

  const NS = 9.4;
  const explanationRows = (text: string, w: number): Row[] => {
    const out: Row[] = [];
    let n = 0;
    for (const pt of parseExplanation(clean(text))) {
      if (pt.kind === "item") n += 1;
      if (pt.kind === "p") out.push(...textRows(pt.text, regular, NS, w, { x0: 18, marker: (p, x, top) => redDot(p, x, top, NS, "!") }));
      else if (pt.kind === "sub") {
        out.push(...textRows(pt.term, bold, NS + 0.5, w, { x0: 22, gapTop: 3, marker: (p, x, top) => bulletSq(p, x, top, NS, 12) }));
        if (pt.text.trim()) out.push(...textRows(pt.text, regular, NS, w, { x0: 22 }));
      } else if (pt.term) {
        const nn = n;
        out.push(...textRows(pt.term, bold, NS + 1.5, w, { x0: 18, hl: true, gapTop: 4, marker: (p, x, top) => redDot(p, x, top, NS + 1.5, String(nn)) }));
        if (pt.text.trim()) out.push(...textRows(pt.text, regular, NS, w, { x0: 18 }));
      } else out.push(...textRows(pt.text, regular, NS, w, { x0: 18 }));
    }
    return out;
  };

  const sumH = (rows: Row[]) => rows.reduce((a, r) => a + r.h, 0);

  /** Cartão (moldura, etiqueta e linhas) numa posição; devolve a altura usada. */
  const drawCard = (c: CardSpec, chunk: Row[], x: number, w: number, first: boolean, hOverride?: number): number => {
    const headH = first ? 30 : 14;
    const h = Math.max(hOverride ?? headH + sumH(chunk) + 12, c.postit ? 84 : 0);
    const top = y;
    const xo = c.postit ? 58 : 12;
    const tabX = c.postit ? x + 40 : x + 8;
    if (c.postit) {
      const yb = top - h;
      // sombra + papel amarelo com canto dobrado (post-it colado)
      poly(page, [[x + 4, top - 4], [x + w + 3, top - 7], [x + w + 3, yb + 10], [x + w - 14, yb - 3], [x + 5, yb - 2]], { color: BLACK, opacity: 0.16 });
      poly(page, [[x, top - 3], [x + w, top], [x + w, yb + 16], [x + w - 16, yb], [x + 2, yb + 1]], { color: rgb(1, 0.87, 0.36), border: rgb(0.9, 0.7, 0.2), bw: 0.6 });
      poly(page, [[x + w, yb + 16], [x + w - 16, yb], [x + w - 13, yb + 14]], { color: rgb(0.93, 0.72, 0.22) });
      for (let i = 0; i < 6; i++) page.drawRectangle({ x: x + 3, y: yb + 2 + i * 3, width: w - 22, height: 3, color: rgb(1, 0.78, 0.2), opacity: 0.05 * (6 - i) });
      // lâmpada + filete vertical
      const bx = x + 26, by = top - 58;
      page.drawCircle({ x: bx, y: by + 6, size: 9, borderColor: INK, borderWidth: 1.6 });
      page.drawRectangle({ x: bx - 4.5, y: by - 7, width: 9, height: 3, color: INK });
      page.drawRectangle({ x: bx - 3.5, y: by - 11, width: 7, height: 2.4, color: INK });
      page.drawLine({ start: { x: bx - 2, y: by - 2 }, end: { x: bx - 2, y: by + 6 }, thickness: 1, color: INK });
      page.drawLine({ start: { x: bx + 2, y: by - 2 }, end: { x: bx + 2, y: by + 6 }, thickness: 1, color: INK });
      for (const [dx, dy] of [[-15, 8], [15, 8], [-13, 16], [13, 16], [0, 20]] as const) page.drawLine({ start: { x: bx + dx * 0.78, y: by + 6 + dy * 0.6 }, end: { x: bx + dx, y: by + 6 + dy }, thickness: 1, color: INK });
      page.drawLine({ start: { x: x + 46, y: top - 14 }, end: { x: x + 46, y: top - h + 14 }, thickness: 1, color: INK });
      // clipe vermelho
      page.drawSvgPath("M10,34 L10,8 A6,6 0 0 1 22,8 L22,36 A9,9 0 0 1 4,36 L4,12", { x: x + 4, y: top + 22, borderColor: RED, borderWidth: 2.1 });
    } else {
      poly(page, chamf(x, top - h, w, h, { tr: 10, bl: 10 }), { color: c.fill, border: c.border ?? rgb(0.8, 0.22, 0.2), bw: 1.1 });
      poly(page, chamf(x + 4, top - h + 4, w - 8, h - 8, { tr: 8, bl: 8 }), { border: rgb(0.82, 0.83, 0.87), bw: 0.5 });
      page.drawRectangle({ x: x + 0.45, y: top - h + 10, width: 2.2, height: Math.max(0, h - 20), color: c.tone });
    }
    if (first) {
      const lw = boldItalic.widthOfTextAtSize(c.label, 9.5);
      const tw = 34 + lw + 16, ty = top + 5;
      poly(page, [[tabX, ty], [tabX + tw, ty], [tabX + tw - 10, ty - 19], [tabX, ty - 19]], { color: c.tone === RED ? RED_D : c.tone, border: c.tone, bw: 0.8 });
      page.drawCircle({ x: tabX + 14, y: ty - 9.5, size: 8, color: WHITE });
      page.drawText(c.glyph, { x: tabX + 14 - bold.widthOfTextAtSize(c.glyph, 10) / 2, y: ty - 13, size: 10, font: bold, color: c.tone });
      page.drawText(c.label, { x: tabX + 30, y: ty - 13, size: 9.5, font: boldItalic, color: WHITE });
    } else {
      page.drawText("continuação", { x: x + w - 14 - italic.widthOfTextAtSize("continuação", 7), y: top - 10, size: 7, font: italic, color: GRAY });
    }
    let ry = top - headH;
    for (const r of chunk) { r.draw(page, x + xo, ry, w - xo - 12); ry -= r.h; }
    return h;
  };

  /** Cartão de largura total, dividindo-se entre páginas só quando é maior que a página. */
  const pageRoom = TOP_NEXT - BOTTOM;
  const flowCard = (c: CardSpec, x = M.left, w = innerW) => {
    const rows = c.rows;
    if (!rows.length) return;
    let i = 0;
    let first = true;
    while (i < rows.length) {
      let headH = first ? 30 : 14;
      const whole = headH + sumH(rows.slice(i)) + 12;
      if (first && whole > y - BOTTOM && whole <= pageRoom) newPage(); // cartão que cabe numa página nunca é partido
      let room = y - BOTTOM - headH - 12;
      let take: Row[] = [];
      let used = 0;
      const pre = i > 0 && rows[i]!.head && !rows[i]!.isHead ? rows[i]!.head! : null;
      if (pre) used += pre.h;
      while (i + take.length < rows.length && (used + rows[i + take.length]!.h <= room || take.length === 0 && used + rows[i]!.h <= room)) {
        used += rows[i + take.length]!.h;
        take.push(rows[i + take.length]!);
      }
      if (!take.length) {
        if (y < TOP_NEXT - 4) { newPage(); continue; }
        take = [rows[i]!];
        room = 1e9;
      }
      // evita deixar uma linha órfã no pé da página
      if (take.length === 1 && i + 1 < rows.length && y < TOP_NEXT - 4 && first) { newPage(); continue; }
      const chunk = pre ? [pre, ...take] : take;
      const h = drawCard(c, chunk, x, w, first);
      y -= h + 10;
      i += take.length;
      first = false;
      if (i < rows.length) newPage();
    }
  };

  // ---------- Faixa numerada do assunto ----------
  const bandH = 22;
  const band = (n: number, t: string) => {
    const x = M.left - 6, w = innerW + 12, top = y;
    poly(page, chamf(x, top - bandH, w, bandH, { tl: 5, br: 10 }), { color: BLACK });
    poly(page, [[x, top], [x + 40, top], [x + 32, top - bandH], [x, top - bandH]], { color: RED });
    poly(page, [[x + 40, top], [x + 43, top], [x + 35, top - bandH], [x + 32, top - bandH]], { color: rgb(0.95, 0.3, 0.28) });
    const ns = String(n).padStart(2, "0");
    page.drawText(ns, { x: x + 16 - boldItalic.widthOfTextAtSize(ns, 13) / 2, y: top - 16, size: 13, font: boldItalic, color: WHITE });
    page.drawText(fit(boldItalic, clean(t), 11, w - 130), { x: x + 52, y: top - 15, size: 11, font: boldItalic, color: WHITE });
    for (let i = 0; i < 3; i++) poly(page, [[x + w - 46 + i * 8, top], [x + w - 41 + i * 8, top], [x + w - 51 + i * 8, top - bandH], [x + w - 56 + i * 8, top - bandH]], { color: RED });
    y -= bandH + 14;
  };

  // ---------- Conteúdo ----------
  const GAP = 26;
  const halfW = (innerW - GAP) / 2;
  const minRows = 2 * QS * LH;
  for (const it of s.items) {
    const sec = it.sectionTitle ? clean(it.sectionTitle) : clean(s.lesson.title);
    const hasExp = !!it.explanation?.trim();
    // lado a lado quando o trecho é texto corrido e há explicação, e os dois cabem juntos numa página
    const qHalf = !it.structure?.length ? quoteRows(it, halfW - 70) : [];
    const eHalf = hasExp ? explanationRows(it.explanation!, halfW - 24) : [];
    const sideBySide = qHalf.length > 0 && eHalf.length > 0 && Math.max(sumH(qHalf), sumH(eHalf)) + 44 + bandH + 24 <= pageRoom && Math.max(sumH(qHalf), sumH(eHalf)) < 330;
    if (sideBySide) {
      const hh = Math.max(sumH(qHalf), sumH(eHalf)) + 46, hh2 = Math.max(hh, 84);
      if (y - (bandH + 10 + hh + 12) < BOTTOM) newPage();
      band(it.n, sec);
      const conceito: CardSpec = { label: "CONCEITO", glyph: "§", tone: RED, fill: WHITE, rows: qHalf, postit: true };
      const expl: CardSpec = { label: "EXPLICAÇÃO", glyph: "!", tone: RED, fill: WHITE, rows: eHalf };
      const y0 = y - 8;
      y = y0;
      drawCard(conceito, qHalf, M.left, halfW, true, hh2);
      y = y0;
      drawCard(expl, eHalf, M.left + halfW + GAP, halfW, true, hh2);
      // setas vermelhas entre o post-it e a explicação
      const cxm = M.left + halfW + GAP / 2, cym = y0 - hh2 / 2;
      for (let i = 0; i < 2; i++) poly(page, [[cxm - 9 + i * 8, cym + 11], [cxm - 3 + i * 8, cym + 11], [cxm + 5 + i * 8, cym], [cxm - 3 + i * 8, cym - 11], [cxm - 9 + i * 8, cym - 11], [cxm - 1 + i * 8, cym]], { color: i ? RED_D : RED });
      y = y0 - hh2 - 12;
    } else {
      const qRows = quoteRows(it, it.structure?.length ? innerW - 24 : innerW - 70);
      const wholeQ = 30 + sumH(qRows) + 12;
      const firstNeed = bandH + 22 + (wholeQ <= pageRoom - bandH - 22 ? wholeQ : Math.min(sumH(qRows), minRows + 6) + 30) + 6;
      if (y - firstNeed < BOTTOM) newPage();
      band(it.n, sec);
      y -= 8;
      flowCard({ label: "CONCEITO", glyph: "§", tone: RED, fill: WHITE, rows: qRows, postit: !it.structure?.length });
      if (hasExp) flowCard({ label: "EXPLICAÇÃO", glyph: "!", tone: RED, fill: WHITE, rows: explanationRows(it.explanation!, innerW - 24) });
    }
    if (it.note?.trim()) {
      const nRows = textRows(it.note, boldItalic, 9.6, innerW - 24);
      if (y - 60 < BOTTOM) newPage();
      y -= sideBySide ? 0 : 0;
      flowCard({ label: "MINHA ANOTAÇÃO", glyph: "+", tone: AMBER, fill: rgb(1, 0.975, 0.86), border: rgb(0.88, 0.66, 0.2), rows: nRows });
    }
    y -= 6;
  }

  // ---------- Resumo e dicas (assuntos revisados + anotações do aluno) ----------
  if (s.items.length) {
    const lines: Array<{ t: string; note: boolean }> = [];
    s.items.slice(0, 7).forEach((it) => lines.push({ t: `${String(it.n).padStart(2, "0")} — ${it.sectionTitle ? clean(it.sectionTitle) : clean(s.lesson.title)}`, note: false }));
    const notes = s.items.filter((it) => it.note?.trim());
    if (notes.length) lines.push({ t: `${notes.length} anotação(ões) sua(s) neste material: releia antes da prova.`, note: true });
    const bh = Math.max(112, 52 + lines.length * 17);
    if (y - bh - 16 < BOTTOM) newPage();
    const x = M.left - 6, w = innerW + 12, top = y;
    poly(page, chamf(x, top - bh, w, bh, { tl: 12, br: 12 }), { color: BLACK });
    if (soldado) {
      const sh = bh - 4, sw = (sh * soldado.width) / soldado.height;
      page.drawImage(soldado, { x: x + 2, y: top - bh + 2, width: Math.min(sw, 120), height: sh, opacity: 0.95 });
      for (let i = 0; i < 20; i++) page.drawRectangle({ x: x + 2 + Math.min(sw, 120) - 20 + i, y: top - bh + 2, width: 1.2, height: sh, color: BLACK, opacity: i / 20 });
    }
    poly(page, chamf(x, top - bh, w, bh, { tl: 12, br: 12 }), { border: RED, bw: 1.2 });
    const tx = x + 132;
    poly(page, [[tx - 6, top - 10], [tx + 150, top - 10], [tx + 138, top - 32], [tx - 6, top - 32]], { color: RED_D, border: RED, bw: 0.8 });
    page.drawText("RESUMO E DICAS", { x: tx + 6, y: top - 26, size: 12, font: boldItalic, color: WHITE });
    lines.forEach((l, i) => {
      const ly = top - 52 - i * 17;
      poly(page, [[tx, ly + 3], [tx + 8, ly + 3], [tx + 12, ly - 1.5], [tx + 8, ly - 6], [tx, ly - 6], [tx + 4, ly - 1.5]], { color: RED });
      page.drawText(fit(l.note ? italic : bold, l.t, 9.3, w - 132 - 40), { x: tx + 20, y: ly - 4, size: 9.3, font: l.note ? italic : bold, color: l.note ? rgb(1, 0.9, 0.4) : WHITE });
    });
    y -= bh + 10;
  }

  // ---------- Cabeçalho (páginas 2+), rodapé e paginação (todas) ----------
  const pages = doc.getPages();
  pages.forEach((p, idx) => {
    if (idx > 0) {
      const lh = 30, lw = (lh * logoEscura.width) / logoEscura.height;
      p.drawImage(logoEscura, { x: 32, y: H - 28 - lh, width: lw, height: lh });
      const bx = W - 38 - 214, by = H - 62, bw = 214, bh = 34;
      poly(p, chamf(bx, by, bw, bh, { tl: 10 }), { color: BLACK, border: RED, bw: 1 });
      p.drawText("REVISÃO ESTRATÉGICA", { x: bx + 14, y: by + bh - 13, size: 8, font: boldItalic, color: rgb(0.96, 0.2, 0.18) });
      p.drawText(fit(boldItalic, clean(s.lesson.title), 9, bw - 26), { x: bx + 14, y: by + 8, size: 9, font: boldItalic, color: WHITE });
      p.drawRectangle({ x: 32, y: H - 71, width: 60, height: 2.4, color: RED });
      p.drawLine({ start: { x: 96, y: H - 70 }, end: { x: W - 32, y: H - 70 }, thickness: 0.6, color: LINE });
    }
    // rodapé
    const fx = 26, fw = W - 52, fy = 22, fh = 28;
    poly(p, chamf(fx, fy, fw, fh, { tl: 8, br: 8 }), { color: BLACK, border: RED, bw: 1 });
    if (logoClara) {
      const lh = 17, lw = (lh * logoClara.width) / logoClara.height;
      p.drawImage(logoClara, { x: fx + 10, y: fy + (fh - lh) / 2, width: lw, height: lh });
    }
    p.drawText("MEU PDF DE REVISÃO", { x: fx + 160, y: fy + 10, size: 8, font: bold, color: rgb(0.85, 0.86, 0.9) });
    const num = `${String(idx + 1).padStart(2, "0")} / ${String(pages.length).padStart(2, "0")}`;
    p.drawText(num, { x: fx + fw - 16 - boldItalic.widthOfTextAtSize(num, 13), y: fy + 8.5, size: 13, font: boldItalic, color: WHITE });
    p.drawText("///", { x: fx + fw - 16 - boldItalic.widthOfTextAtSize(num, 13) - 30, y: fy + 9, size: 11, font: boldItalic, color: RED });
  });
  return doc.save();
}
