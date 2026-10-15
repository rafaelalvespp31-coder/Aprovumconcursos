/**
 * Renderização do PDF de um conteúdo estudado, com a identidade visual do APROVUM
 * (preto, branco e vermelho; logo oficial na capa e no cabeçalho de cada página).
 * pdf-lib com fontes padrão e logos embutidas no código — nada lido do disco, funciona em
 * ambiente serverless. Entrada: o retrato congelado (PdfSnapshot). Saída: bytes do PDF.
 *
 * Estrutura: capa → sumário → escopo → teoria (por unidade) → questões respondidas →
 * pontos de revisão → referências → conteúdo informado.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type { PhrasingContent, RootContent, Table } from "mdast";
import type { PdfSnapshot } from "./types";
import { CAPA_JPG, LOGO_ESCURA_PNG } from "./logos";

const A4: [number, number] = [595.28, 841.89];
const M = { top: 96, bottom: 72, left: 54, right: 54 };

// Paleta APROVUM
const INK = rgb(0.04, 0.04, 0.04);
const WHITE = rgb(1, 1, 1);
const MUTED = rgb(0.36, 0.36, 0.38);
const FAINT = rgb(0.55, 0.55, 0.57);
const RED = rgb(0.882, 0.024, 0);
const RED_SOFT = rgb(0.995, 0.93, 0.925);
const LINE = rgb(0.85, 0.85, 0.86);
const SOFT = rgb(0.958, 0.958, 0.962);
const ZEBRA = rgb(0.975, 0.975, 0.978);
const DARK2 = rgb(0.11, 0.11, 0.12);

const LEVEL_LABEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" } as const;
const TYPE_LABEL: Record<string, string> = { multipla_escolha: "Múltipla escolha", certo_errado: "Certo ou errado", situacional: "Situacional", discursiva: "Discursiva" };

interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  color?: RGB;
}
type Word = { text: string; run: Run; w: number; space: number };

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const b64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64"));

/**
 * Largura sem kerning: o pdf-lib mede com kerning, mas desenha sem — medir caractere
 * a caractere evita palavras "coladas".
 */
const widthCache = new WeakMap<PDFFont, Map<string, number>>();
function measure(font: PDFFont, text: string, size: number): number {
  let cache = widthCache.get(font);
  if (!cache) widthCache.set(font, (cache = new Map()));
  let total = 0;
  for (const ch of text) {
    let w = cache.get(ch);
    if (w === undefined) cache.set(ch, (w = font.widthOfTextAtSize(ch, 1000)));
    total += w;
  }
  return (total * size) / 1000;
}

interface TocEntry {
  title: string;
  level: 1 | 2;
  page: PDFPage;
}

/** Escreve páginas com quebra automática de linha e de página. */
class Writer {
  doc: PDFDocument;
  page!: PDFPage;
  y = 0;
  left = M.left;
  right = A4[0] - M.right;
  /** Modo de medição: calcula alturas sem desenhar nem quebrar página. */
  dry = false;
  toc: TocEntry[] = [];
  fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont; mono: PDFFont };
  private charset: Set<number>;

  constructor(doc: PDFDocument, fonts: Writer["fonts"]) {
    this.doc = doc;
    this.fonts = fonts;
    this.charset = new Set(fonts.regular.getCharacterSet());
    this.newPage();
  }

  get width() {
    return this.right - this.left;
  }

  newPage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - M.top;
  }

  ensure(h: number) {
    if (!this.dry && this.y - h < M.bottom) this.newPage();
  }

  /** Espaço livre até o rodapé. */
  get room() {
    return this.y - M.bottom;
  }

  // Desenho (ignorado no modo de medição)
  drawText(t: string, o: Parameters<PDFPage["drawText"]>[1]) {
    if (!this.dry) this.page.drawText(t, o);
  }
  drawRect(o: Parameters<PDFPage["drawRectangle"]>[0]) {
    if (!this.dry) this.page.drawRectangle(o);
  }
  drawLine(o: Parameters<PDFPage["drawLine"]>[0]) {
    if (!this.dry) this.page.drawLine(o);
  }
  drawCircle(o: Parameters<PDFPage["drawCircle"]>[0]) {
    if (!this.dry) this.page.drawCircle(o);
  }

  /** Converte o texto para o que as fontes padrão (WinAnsi) conseguem desenhar. */
  clean(s: string): string {
    const mapped = s
      .normalize("NFC")
      .replace(/\t/g, "    ")
      .replace(/[→⇒]/g, "->")
      .replace(/[←⇐]/g, "<-")
      .replace(/≥/g, ">=")
      .replace(/≤/g, "<=")
      .replace(/≠/g, "!=")
      .replace(/[✓✔]/g, "(ok)")
      .replace(/[✗✘]/g, "(x)")
      .replace(/[−‐‑]/g, "-")
      .replace(/[​-‍﻿]/g, "");
    let out = "";
    for (const ch of mapped) {
      const cp = ch.codePointAt(0)!;
      out += cp === 10 || this.charset.has(cp) ? ch : "?";
    }
    return out;
  }

  font(r: Run) {
    if (r.bold && r.italic) return this.fonts.boldItalic;
    if (r.bold) return this.fonts.bold;
    if (r.italic) return this.fonts.italic;
    return this.fonts.regular;
  }

  /** Quebra trechos em linhas que cabem em `maxW`. */
  layout(runs: Run[], size: number, maxW: number): Word[][] {
    const words: Word[] = [];
    const lines: Word[][] = [[]];
    for (const r of runs) {
      for (const p of this.clean(r.text).split(/(\s+)/)) {
        if (!p) continue;
        if (/^\s+$/.test(p)) {
          if (p.includes("\n")) words.push({ text: "\n", run: r, w: 0, space: 0 });
          else if (words.length) words[words.length - 1]!.space = measure(this.font(r), " ", size);
          continue;
        }
        words.push({ text: p, run: r, w: measure(this.font(r), p, size), space: 0 });
      }
    }
    let lineW = 0;
    for (const w of words) {
      const cur = lines[lines.length - 1]!;
      if (w.text === "\n") {
        lines.push([]);
        lineW = 0;
        continue;
      }
      if (cur.length && lineW + w.w > maxW) {
        if (w.w > maxW) {
          lines.push([]);
          lineW = this.split(w, size, maxW, lines);
        } else {
          lines.push([w]);
          lineW = w.w + w.space;
        }
      } else if (!cur.length && w.w > maxW) {
        lineW = this.split(w, size, maxW, lines);
      } else {
        cur.push(w);
        lineW += w.w + w.space;
      }
    }
    return lines;
  }

  /** Palavra maior que a linha: corta em pedaços. */
  private split(w: Word, size: number, maxW: number, lines: Word[][]): number {
    const f = this.font(w.run);
    let chunk = "";
    for (const ch of w.text) {
      if (chunk && measure(f, chunk + ch, size) > maxW) {
        lines[lines.length - 1]!.push({ ...w, text: chunk, w: measure(f, chunk, size), space: 0 });
        lines.push([]);
        chunk = "";
      }
      chunk += ch;
    }
    const last = { ...w, text: chunk, w: measure(f, chunk, size) };
    lines[lines.length - 1]!.push(last);
    return last.w + w.space;
  }

  /** Parágrafo com trechos em negrito/itálico, quebrando por palavra e por página. */
  rich(runs: Run[], opts: { size?: number; indent?: number; color?: RGB; gap?: number; lineHeight?: number; align?: "left" | "center" } = {}) {
    const size = opts.size ?? 10.5;
    const lh = opts.lineHeight ?? size * 1.5;
    const indent = opts.indent ?? 0;
    const maxW = this.width - indent;
    for (const line of this.layout(runs, size, maxW)) {
      this.ensure(lh);
      const lw = line.reduce((a, w, i) => a + w.w + (i < line.length - 1 ? w.space : 0), 0);
      let x = this.left + indent + (opts.align === "center" ? (maxW - lw) / 2 : 0);
      for (const w of line) {
        this.drawText(w.text, { x, y: this.y - size, size, font: this.font(w.run), color: w.run.color ?? opts.color ?? INK });
        x += w.w + w.space;
      }
      this.y -= lh;
    }
    this.y -= opts.gap ?? 4;
  }

  text(s: string, opts: Parameters<Writer["rich"]>[1] & { bold?: boolean; italic?: boolean } = {}) {
    this.rich([{ text: s, bold: opts.bold, italic: opts.italic }], opts);
  }

  /** Texto em caixa alta com espaçamento entre letras (rótulos, chips, faixas). */
  spaced(s: string, x: number, y: number, size: number, font: PDFFont, color: RGB, tracking = 0.12) {
    const t = this.clean(s.toLocaleUpperCase("pt-BR"));
    let cx = x;
    for (const ch of t) {
      this.drawText(ch, { x: cx, y, size, font, color });
      cx += measure(font, ch, size) + size * tracking;
    }
    return cx - x - size * tracking;
  }
  spacedWidth(s: string, size: number, font: PDFFont, tracking = 0.12) {
    const t = this.clean(s.toLocaleUpperCase("pt-BR"));
    return measure(font, t, size) + Math.max(0, [...t].length - 1) * size * tracking;
  }

  /** Mede a altura de um bloco sem desenhar. */
  measureBlock(draw: () => void): number {
    const save = { y: this.y, dry: this.dry };
    this.dry = true;
    this.y = 1e6;
    draw();
    const h = 1e6 - this.y;
    this.y = save.y;
    this.dry = save.dry;
    return h;
  }

  /**
   * Cartão: fundo, borda e faixa lateral desenhados antes do conteúdo (medido antes).
   * Se não couber numa página, o conteúdo segue sem o fundo (nada é cortado).
   */
  card(draw: () => void, o: { bg?: RGB; border?: RGB; accent?: RGB; pad?: number; padX?: number; gap?: number } = {}) {
    const pad = o.pad ?? 12;
    const padX = o.padX ?? pad;
    const inner = () => {
      const l = this.left;
      const r = this.right;
      this.left += padX + (o.accent ? 3 : 0);
      this.right -= padX;
      draw();
      this.left = l;
      this.right = r;
    };
    const h = this.measureBlock(inner) + pad * 2;
    const fits = h <= A4[1] - M.top - M.bottom;
    if (fits) this.ensure(h);
    if (fits && !this.dry) {
      const y0 = this.y - h;
      if (o.bg || o.border) this.drawRect({ x: this.left, y: y0, width: this.width, height: h, color: o.bg, borderColor: o.border, borderWidth: o.border ? 0.8 : 0 });
      if (o.accent) this.drawRect({ x: this.left, y: y0, width: 3, height: h, color: o.accent });
    }
    this.y -= pad;
    inner();
    this.y -= pad - 4;
    this.y -= o.gap ?? 8;
  }

  /** Faixa de seção (nível 1): barra preta com marcador vermelho e título em caixa alta. */
  section(title: string, opts: { newPage?: boolean } = {}) {
    if (opts.newPage) this.newPage();
    this.ensure(70);
    const h = 34;
    const y0 = this.y - h;
    this.drawRect({ x: this.left, y: y0, width: this.width, height: h, color: INK });
    this.drawRect({ x: this.left, y: y0, width: 6, height: h, color: RED });
    const slash = this.spaced("///", this.left + 16, y0 + 12, 11, this.fonts.boldItalic, RED, 0);
    this.spaced(title, this.left + 22 + slash, y0 + 12.5, 12, this.fonts.bold, WHITE, 0.1);
    this.y = y0 - 18;
    if (!this.dry) this.toc.push({ title, level: 1, page: this.page });
  }

  /** Título de unidade (nível 2): rótulo vermelho, título forte e sublinhado vermelho. */
  unit(kicker: string, title: string) {
    this.ensure(90);
    this.y -= 6;
    this.spaced(kicker, this.left, this.y - 8, 7.5, this.fonts.bold, RED, 0.22);
    this.y -= 16;
    if (!this.dry) this.toc.push({ title, level: 2, page: this.page });
    this.rich([{ text: title, bold: true }], { size: 15, lineHeight: 19, gap: 4 });
    this.drawRect({ x: this.left, y: this.y, width: 38, height: 2.2, color: RED });
    this.drawLine({ start: { x: this.left + 42, y: this.y + 1.1 }, end: { x: this.right, y: this.y + 1.1 }, thickness: 0.6, color: LINE });
    this.y -= 14;
  }

  /** Subtítulo (nível 3): quadradinho vermelho + texto em negrito. */
  subheading(s: string, suffix?: string) {
    this.ensure(40);
    this.y -= 4;
    this.drawRect({ x: this.left, y: this.y - 9.5, width: 5, height: 5, color: RED });
    this.rich([{ text: s, bold: true }, ...(suffix ? [{ text: `  ${suffix}`, italic: true, color: RED }] : [])], { size: 11.5, indent: 11, gap: 3 });
  }

  /** Chip arredondado; devolve a largura. */
  chip(label: string, x: number, yTop: number, o: { bg: RGB; fg: RGB; border?: RGB; size?: number }) {
    const size = o.size ?? 7;
    const w = this.spacedWidth(label, size, this.fonts.bold, 0.1) + 12;
    const h = size + 8;
    if (!this.dry) {
      const r = h / 2;
      const path = `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
      this.page.drawSvgPath(path, { x, y: yTop, color: o.bg, borderColor: o.border, borderWidth: o.border ? 0.7 : 0 });
    }
    this.spaced(label, x + 6, yTop - h + 4.6, size, this.fonts.bold, o.fg, 0.1);
    return w;
  }
}

/** Trechos inline de um parágrafo Markdown. */
function inlineRuns(nodes: PhrasingContent[], style: Omit<Run, "text"> = {}): Run[] {
  const out: Run[] = [];
  for (const n of nodes) {
    switch (n.type) {
      case "text":
        out.push({ text: n.value, ...style });
        break;
      case "strong":
        out.push(...inlineRuns(n.children, { ...style, bold: true }));
        break;
      case "emphasis":
        out.push(...inlineRuns(n.children, { ...style, italic: true }));
        break;
      case "inlineCode":
        out.push({ text: n.value, ...style });
        break;
      case "break":
        out.push({ text: "\n", ...style });
        break;
      case "link":
      case "delete":
        out.push(...inlineRuns(n.children, style));
        break;
      default:
        if ("children" in n) out.push(...inlineRuns((n as { children: PhrasingContent[] }).children, style));
        else if ("value" in n) out.push({ text: String((n as { value: string }).value), ...style });
    }
  }
  return out;
}

/**
 * Tabela: larguras pelo conteúdo, cabeçalho preto repetido a cada página, linhas zebradas,
 * texto quebrado dentro da célula (a altura da linha é a da maior célula).
 */
function drawTable(w: Writer, rows: Run[][][], opts: { size?: number; header?: boolean; align?: Array<"left" | "right" | "center"> } = {}) {
  if (!rows.length) return;
  const size = opts.size ?? 9;
  const lh = size * 1.42;
  const padX = 6;
  const padY = 5;
  const cols = Math.max(...rows.map((r) => r.length));
  const avail = w.width;
  const fontOf = (r: Run) => w.font(r);
  const cellText = (cell: Run[] | undefined) => cell ?? [];
  // Larguras: natural (texto numa linha) e mínima (maior palavra).
  const natural = Array(cols).fill(0) as number[];
  const minimum = Array(cols).fill(0) as number[];
  rows.forEach((r, ri) =>
    r.forEach((cell, ci) => {
      const runs = ri === 0 && opts.header !== false ? cell.map((c) => ({ ...c, bold: true })) : cell;
      const flat = runs.map((c) => measure(fontOf(c), w.clean(c.text), size)).reduce((a, b) => a + b, 0);
      natural[ci] = Math.max(natural[ci]!, flat + padX * 2);
      for (const c of runs) for (const word of w.clean(c.text).split(/\s+/)) minimum[ci] = Math.max(minimum[ci]!, measure(fontOf(c), word, size) + padX * 2);
    }),
  );
  const minCap = avail / cols;
  const mins = minimum.map((m) => Math.min(m, Math.max(minCap, 48)));
  let widths: number[];
  const totalNat = natural.reduce((a, b) => a + b, 0);
  if (totalNat <= avail) {
    widths = natural.map((n) => n + (avail - totalNat) * (n / totalNat));
  } else {
    const extra = avail - mins.reduce((a, b) => a + b, 0);
    const want = natural.map((n, i) => Math.max(0, n - mins[i]!));
    const wantSum = want.reduce((a, b) => a + b, 0) || 1;
    widths = mins.map((m, i) => m + Math.max(0, extra) * (want[i]! / wantSum));
    const sum = widths.reduce((a, b) => a + b, 0);
    widths = widths.map((x) => (x * avail) / sum);
  }

  const layoutRow = (r: Run[][], header: boolean) =>
    Array.from({ length: cols }, (_, ci) => {
      const runs = cellText(r[ci]).map((c) => (header ? { ...c, bold: true, color: WHITE } : c));
      return w.layout(runs, size, widths[ci]! - padX * 2);
    });
  const heightOf = (cells: Word[][][]) => Math.max(...cells.map((ls) => ls.length)) * lh + padY * 2;

  const drawRow = (cells: Word[][][], kind: "header" | "even" | "odd") => {
    const h = heightOf(cells);
    const top = w.y;
    const bg = kind === "header" ? INK : kind === "odd" ? ZEBRA : WHITE;
    w.drawRect({ x: w.left, y: top - h, width: avail, height: h, color: bg });
    if (kind === "header") w.drawRect({ x: w.left, y: top - h, width: avail, height: 1.6, color: RED });
    let x = w.left;
    cells.forEach((lines, ci) => {
      let y = top - padY;
      for (const line of lines) {
        const lw = line.reduce((a, wd, i) => a + wd.w + (i < line.length - 1 ? wd.space : 0), 0);
        const al = opts.align?.[ci] ?? "left";
        let cx = x + padX + (al === "right" ? widths[ci]! - padX * 2 - lw : al === "center" ? (widths[ci]! - padX * 2 - lw) / 2 : 0);
        for (const wd of line) {
          w.drawText(wd.text, { x: cx, y: y - size, size, font: w.font(wd.run), color: wd.run.color ?? INK });
          cx += wd.w + wd.space;
        }
        y -= lh;
      }
      if (ci > 0 && kind !== "header") w.drawLine({ start: { x, y: top }, end: { x, y: top - h }, thickness: 0.4, color: LINE });
      x += widths[ci]!;
    });
    if (kind !== "header") w.drawLine({ start: { x: w.left, y: top - h }, end: { x: w.left + avail, y: top - h }, thickness: 0.5, color: LINE });
    w.y = top - h;
  };

  const header = opts.header !== false ? layoutRow(rows[0]!, true) : null;
  const body = (header ? rows.slice(1) : rows).map((r) => layoutRow(r, false));
  w.y -= 2;
  if (header) {
    w.ensure(heightOf(header) + (body[0] ? heightOf(body[0]) : 0));
    drawRow(header, "header");
  }
  body.forEach((cells, i) => {
    const h = heightOf(cells);
    if (!w.dry && w.y - h < M.bottom) {
      w.newPage();
      if (header) drawRow(header, "header");
    }
    drawRow(cells, i % 2 ? "odd" : "even");
  });
  // Contorno
  w.y -= 12;
}

/** Desenha Markdown (títulos, parágrafos, listas, citações, tabelas, código) no Writer. */
export function drawMarkdown(w: Writer, md: string, indent = 0) {
  const tree = fromMarkdown(md, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  const block = (node: RootContent, ind: number, bullet?: { kind: "dot" | "num"; label: string }) => {
    switch (node.type) {
      case "heading":
        w.y -= 3;
        w.rich(inlineRuns(node.children, { bold: true }), { size: node.depth <= 2 ? 12 : 11, indent: ind, gap: 3 });
        break;
      case "paragraph":
        if (bullet) {
          w.ensure(16);
          if (bullet.kind === "dot") w.drawRect({ x: w.left + ind - 10, y: w.y - 8.2, width: 3.6, height: 3.6, color: RED });
          else w.drawText(w.clean(bullet.label), { x: w.left + ind - 14, y: w.y - 10.5, size: 10, font: w.fonts.bold, color: RED });
        }
        w.rich(inlineRuns(node.children), { indent: ind, gap: bullet ? 2 : 6 });
        break;
      case "list": {
        let n = node.start ?? 1;
        for (const item of node.children) {
          item.children.forEach((c, i) => block(c, ind + 16, i === 0 ? { kind: node.ordered ? "num" : "dot", label: `${n}.` } : undefined));
          n++;
        }
        w.y -= 4;
        break;
      }
      case "blockquote":
        w.card(() => node.children.forEach((c) => block(c, 0)), { bg: SOFT, accent: RED, pad: 9, padX: 12 });
        break;
      case "table": {
        const t = node as Table;
        const rows = t.children.map((r) => r.children.map((c) => inlineRuns(c.children as PhrasingContent[])));
        const save = w.left;
        w.left += ind;
        drawTable(w, rows, { align: t.align?.map((a) => (a === "right" ? "right" : a === "center" ? "center" : "left")) });
        w.left = save;
        break;
      }
      case "code":
        w.card(
          () => {
            for (const line of w.clean(node.value).split("\n")) w.rich([{ text: line || " " }], { size: 9, gap: 0, lineHeight: 12.5 });
          },
          { bg: SOFT, pad: 8 },
        );
        break;
      case "thematicBreak":
        w.ensure(14);
        w.drawLine({ start: { x: w.left, y: w.y - 5 }, end: { x: w.right, y: w.y - 5 }, thickness: 0.6, color: LINE });
        w.y -= 14;
        break;
      default:
        if ("children" in node) (node as { children: RootContent[] }).children.forEach((c) => block(c, ind));
    }
  };
  tree.children.forEach((c) => block(c, indent));
}

/**
 * Capa: arte em página inteira (operador caveira + escrita APROVUM do banner) e, por cima,
 * o rótulo, o título do conteúdo e o quadro do estudante, na parte escurecida da arte.
 */
function drawCover(w: Writer, s: PdfSnapshot, art: PDFImage) {
  const p = w.page;
  const [W, H] = A4;
  p.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(0, 0, 0) });
  p.drawImage(art, { x: 0, y: 0, width: W, height: H });

  // Rótulo + título, logo abaixo da escrita APROVUM da arte
  w.y = 236;
  const kicker = "Material de estudo";
  const kw = w.spacedWidth(kicker, 8, w.fonts.bold, 0.32);
  w.spaced(kicker, (W - kw) / 2, w.y - 8, 8, w.fonts.bold, RED, 0.32);
  w.y -= 20;
  const save = { l: w.left, r: w.right };
  w.left = 60;
  w.right = W - 60;
  // Títulos longos diminuem para caber em até 2 linhas.
  let size = 22;
  while (size > 14 && w.layout([{ text: s.content.title, bold: true }], size, w.width).length > 2) size -= 1;
  w.rich([{ text: s.content.title, bold: true }], { size, lineHeight: size * 1.2, color: WHITE, align: "center", gap: 1 });
  if (s.content.subject && s.content.subject !== s.content.title) w.rich([{ text: s.content.subject }], { size: 10, color: rgb(0.78, 0.78, 0.8), align: "center", gap: 0 });
  w.left = save.l;
  w.right = save.r;

  // Quadro do estudante (4 colunas, fundo escuro translúcido)
  const lvl = Math.min(...s.units.map((u) => u.levelsPassed));
  const info: Array<[string, string]> = [
    ["Estudante", s.student.name ?? "—"],
    ["Banca", s.content.board],
    ["Tipo de conteúdo", s.content.contentTypeLabel],
    ["Níveis concluídos", lvl >= 3 ? "Fácil, médio e difícil" : `${Math.max(0, lvl)} de 3`],
  ];
  const x0 = 40;
  const cw = (W - 2 * x0) / 4;
  const ch = 44;
  const yb = 40;
  p.drawRectangle({ x: x0, y: yb, width: W - 2 * x0, height: ch, color: rgb(0.06, 0.06, 0.07), opacity: 0.85, borderColor: rgb(0.25, 0.25, 0.27), borderWidth: 0.6 });
  p.drawRectangle({ x: x0, y: yb + ch - 2, width: W - 2 * x0, height: 2, color: RED });
  info.forEach(([k, v], i) => {
    const x = x0 + i * cw;
    if (i > 0) p.drawLine({ start: { x, y: yb + 8 }, end: { x, y: yb + ch - 10 }, thickness: 0.5, color: rgb(0.3, 0.3, 0.32) });
    w.spaced(k, x + 10, yb + ch - 16, 6, w.fonts.bold, RED, 0.18);
    let val = w.clean(v);
    let vs = 9.5;
    while (vs > 7 && measure(w.fonts.bold, val, vs) > cw - 20) vs -= 0.5;
    while (measure(w.fonts.bold, val, vs) > cw - 20 && val.length > 4) val = val.slice(0, -2);
    if (val !== w.clean(v)) val = val.trimEnd() + "…";
    p.drawText(val, { x: x + 10, y: yb + 11, size: vs, font: w.fonts.bold, color: WHITE });
  });
  p.drawRectangle({ x: 0, y: 0, width: W, height: 4, color: RED });
}

/** Resumo do estudo: números reais do retrato e controle de versão do PDF. */
function drawSummary(w: Writer, s: PdfSnapshot, meta: { pdfVersion: number; contentHash: string }) {
  const total = s.questions.length;
  const hits = s.questions.filter((q) => q.answer.correct).length;
  const stats: Array<[string, string]> = [
    [String(total), total === 1 ? "questão respondida" : "questões respondidas"],
    [total ? `${Math.round((hits / total) * 100)}%` : "—", "acerto na última resposta"],
    [String(s.units.length), s.units.length === 1 ? "unidade estudada" : "unidades estudadas"],
    [String(s.review.length), s.review.length === 1 ? "ponto de revisão" : "pontos de revisão"],
  ];
  const gap = 8;
  const sw = (w.width - 3 * gap) / 4;
  const top = w.y;
  stats.forEach(([n, label], i) => {
    const x = w.left + i * (sw + gap);
    w.drawRect({ x, y: top - 58, width: sw, height: 58, color: INK });
    w.drawRect({ x, y: top - 58, width: sw, height: 2.5, color: RED });
    const nw = measure(w.fonts.bold, n, 19);
    w.drawText(n, { x: x + (sw - nw) / 2, y: top - 28, size: 19, font: w.fonts.bold, color: WHITE });
    const lt = w.clean(label);
    const lw = measure(w.fonts.regular, lt, 7.3);
    w.drawText(lt, { x: x + (sw - lw) / 2, y: top - 44, size: 7.3, font: w.fonts.regular, color: rgb(0.75, 0.75, 0.78) });
  });
  w.y = top - 58 - 14;
  drawTable(
    w,
    [
      [[{ text: "Versão do PDF", bold: true }], [{ text: String(meta.pdfVersion) }], [{ text: "Gerado em", bold: true }], [{ text: fmtDateTime(s.generatedAt) }]],
      [[{ text: "Conteúdo informado", bold: true }], [{ text: `versão ${s.content.sourceVersion}, de ${fmtDate(s.content.sourceCreatedAt)}` }], [{ text: "Aulas atualizadas em", bold: true }], [{ text: [...new Set(s.units.map((u) => (u.generatedAt ? fmtDate(u.generatedAt) : "—")))].join(", ") }]],
      [[{ text: "Identificador (SHA-256)", bold: true }], [{ text: meta.contentHash.slice(0, 40) + "…" }], [{ text: "" }], [{ text: "" }]],
    ],
    { size: 8, header: false },
  );
  w.y -= 6;
}

/** Sumário: inserido depois da capa, com os números de página finais. */
function drawToc(doc: PDFDocument, w: Writer) {
  const perPage = 30;
  const entries = w.toc;
  const n = Math.max(1, Math.ceil(entries.length / perPage));
  const pages = Array.from({ length: n }, (_, i) => doc.insertPage(1 + i, A4));
  const all = doc.getPages();
  pages.forEach((page, pi) => {
    w.page = page;
    w.y = A4[1] - M.top;
    w.section(pi === 0 ? "Sumário" : "Sumário (continuação)");
    w.toc.pop(); // o próprio sumário não entra na lista
    for (const e of entries.slice(pi * perPage, (pi + 1) * perPage)) {
      const num = String(all.indexOf(e.page) + 1);
      const size = e.level === 1 ? 10.5 : 9.5;
      const font = e.level === 1 ? w.fonts.bold : w.fonts.regular;
      const x = w.left + (e.level === 1 ? 0 : 16);
      if (e.level === 1) w.y -= 6;
      let t = w.clean(e.level === 1 ? e.title.toLocaleUpperCase("pt-BR") : e.title);
      const maxT = w.right - x - 40;
      while (measure(font, t, size) > maxT && t.length > 4) t = t.slice(0, -2);
      if (t !== w.clean(e.level === 1 ? e.title.toLocaleUpperCase("pt-BR") : e.title)) t = t.trimEnd() + "…";
      page.drawText(t, { x, y: w.y - size, size, font, color: INK });
      const tw = measure(font, t, size);
      const nw = measure(w.fonts.bold, num, size);
      // Pontilhado até o número
      for (let dx = x + tw + 6; dx < w.right - nw - 6; dx += 4) page.drawCircle({ x: dx, y: w.y - size + 2.5, size: 0.45, color: FAINT });
      page.drawText(num, { x: w.right - nw, y: w.y - size, size, font: w.fonts.bold, color: e.level === 1 ? RED : INK });
      w.y -= size * 1.9;
    }
  });
  return n;
}

/** Cabeçalho (logo) e rodapé (marca + paginação) em todas as páginas, menos a capa. */
function drawChrome(doc: PDFDocument, w: Writer, s: PdfSnapshot, meta: { pdfVersion: number }, logo: PDFImage) {
  const pages = doc.getPages();
  const [W, H] = A4;
  pages.forEach((p, i) => {
    if (i === 0) return;
    // Cabeçalho
    const lh = 22;
    const lw = (lh * logo.width) / logo.height;
    p.drawImage(logo, { x: M.left, y: H - 34 - lh, width: lw, height: lh });
    w.page = p;
    const tag = "Material de estudo";
    const tw = w.spacedWidth(tag, 6.5, w.fonts.bold, 0.22);
    w.dry = false;
    w.spaced(tag, W - M.right - tw, H - 41, 6.5, w.fonts.bold, RED, 0.22);
    let title = w.clean(s.content.title);
    while (measure(w.fonts.regular, title, 8) > 210 && title.length > 4) title = title.slice(0, -2);
    if (title !== w.clean(s.content.title)) title = title.trimEnd() + "…";
    p.drawText(title, { x: W - M.right - measure(w.fonts.regular, title, 8), y: H - 54, size: 8, font: w.fonts.regular, color: MUTED });
    p.drawRectangle({ x: M.left, y: H - 66, width: 46, height: 2, color: RED });
    p.drawLine({ start: { x: M.left + 50, y: H - 65 }, end: { x: W - M.right, y: H - 65 }, thickness: 0.6, color: LINE });

    // Rodapé
    p.drawLine({ start: { x: M.left, y: 48 }, end: { x: W - M.right, y: 48 }, thickness: 0.6, color: LINE });
    const sl = w.spaced("///", M.left, 32, 8, w.fonts.boldItalic, RED, 0);
    const brand = w.spaced("Aprovum", M.left + sl + 6, 32, 7.5, w.fonts.bold, INK, 0.18);
    w.spaced(`•  Preparação de alto desempenho  •  PDF v${meta.pdfVersion}`, M.left + sl + 12 + brand, 32, 6.5, w.fonts.regular, MUTED, 0.14);
    const num = `${i + 1} / ${pages.length}`;
    const nw = measure(w.fonts.bold, num, 8);
    p.drawRectangle({ x: W - M.right - nw - 14, y: 27, width: nw + 14, height: 15, color: INK });
    p.drawText(num, { x: W - M.right - nw - 7, y: 31.5, size: 8, font: w.fonts.bold, color: WHITE });
  });
}

function drawQuestion(w: Writer, q: PdfSnapshot["questions"][number], n: number) {
  w.card(
    () => {
      // Cabeçalho do cartão: número, chips e resultado
      w.ensure(24);
      const top = w.y;
      const label = `Questão ${String(n).padStart(2, "0")}`;
      const lw = w.spaced(label, w.left, top - 10, 9, w.fonts.bold, INK, 0.12);
      let x = w.left + lw + 10;
      x += w.chip(LEVEL_LABEL[q.level], x, top - 1, { bg: SOFT, fg: INK, border: LINE }) + 5;
      x += w.chip(TYPE_LABEL[q.type] ?? q.type, x, top - 1, { bg: SOFT, fg: INK, border: LINE }) + 5;
      if (q.recovery) x += w.chip("Recuperação", x, top - 1, { bg: RED_SOFT, fg: RED, border: RED }) + 5;
      const res = q.answer.correct ? "Acertou" : "Errou";
      const rw = w.spacedWidth(res, 7, w.fonts.bold, 0.1) + 12;
      w.chip(res, w.right - rw, top - 1, { bg: q.answer.correct ? INK : RED, fg: WHITE });
      w.y = top - 22;
      if (q.topic) w.rich([{ text: q.topic, italic: true }], { size: 8.5, color: MUTED, gap: 2 });
      w.rich([{ text: q.statement }], { size: 10.5, gap: 8 });

      if (q.type === "certo_errado") {
        const gab = q.correctAnswerTrue ? "Certo" : "Errado";
        const mine = q.answer.bool === null ? "—" : q.answer.bool ? "Certo" : "Errado";
        drawTable(
          w,
          [
            [[{ text: "Gabarito" }], [{ text: "Sua resposta" }]],
            [[{ text: gab.toUpperCase(), bold: true }], [{ text: mine.toUpperCase(), bold: true, color: q.answer.correct ? INK : RED }]],
          ],
          { size: 9 },
        );
      } else {
        for (const o of q.options) {
          const mine = q.answer.label === o.label;
          w.ensure(22);
          const cy = w.y - 7;
          const fill = o.correct ? INK : mine ? RED : undefined;
          w.drawCircle({ x: w.left + 8, y: cy, size: 7.5, color: fill ?? WHITE, borderColor: fill ?? FAINT, borderWidth: 0.8 });
          const lt = w.clean(o.label);
          w.drawText(lt, { x: w.left + 8 - measure(w.fonts.bold, lt, 8) / 2, y: cy - 2.8, size: 8, font: w.fonts.bold, color: fill ? WHITE : INK });
          const tags: Run[] = [];
          if (o.correct) tags.push({ text: mine ? "   CORRETA · SUA RESPOSTA" : "   CORRETA", bold: true, color: INK });
          else if (mine) tags.push({ text: "   SUA RESPOSTA", bold: true, color: RED });
          w.rich([{ text: o.text, bold: o.correct }, ...tags], { size: 10, indent: 22, gap: 1 });
          if (o.explanation) w.rich([{ text: o.explanation }], { size: 8.8, indent: 22, color: MUTED, gap: 5, lineHeight: 12.5 });
        }
      }
      w.y -= 2;
      w.card(
        () => {
          w.spaced("Comentário", w.left, w.y - 7, 7, w.fonts.bold, RED, 0.2);
          w.y -= 13;
          w.rich([{ text: q.justification }], { size: 9.5, gap: 0, lineHeight: 13.5 });
        },
        { bg: SOFT, accent: RED, pad: 9, padX: 10, gap: 4 },
      );
      const notes: string[] = [`Tentativas: ${q.attempts}`, `última em ${fmtDateTime(q.answer.at)}`];
      if (q.everWrong && q.answer.correct) notes.push("errou antes e corrigiu depois");
      w.rich([{ text: notes.join("  ·  ") }], { size: 7.8, color: FAINT, gap: 0 });
    },
    { border: LINE, pad: 12, gap: 10 },
  );
}

export async function renderStudyPdf(s: PdfSnapshot, meta: { pdfVersion: number; contentHash: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${s.content.title} — APROVUM`);
  doc.setAuthor("APROVUM");
  doc.setSubject(s.content.subject ?? s.content.title);
  doc.setCreator("APROVUM");
  doc.setProducer("APROVUM");
  doc.setCreationDate(new Date(s.generatedAt));
  doc.setLanguage("pt-BR");
  const w = new Writer(doc, {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
    mono: await doc.embedFont(StandardFonts.Courier),
  });
  const coverArt = await doc.embedJpg(b64(CAPA_JPG));
  const logoHeader = await doc.embedPng(b64(LOGO_ESCURA_PNG));

  // ---- Capa ----
  drawCover(w, s, coverArt);

  // ---- Escopo ----
  w.section("Resumo do estudo", { newPage: true });
  drawSummary(w, s, meta);
  w.section("Escopo deste estudo");
  if (s.content.scopeStatement) w.text(s.content.scopeStatement, { gap: 10 });
  if (s.content.legalReferences.length) {
    w.subheading("Dispositivos e normas");
    drawTable(w, [[[{ text: "Norma" }], [{ text: "Dispositivos" }]], ...s.content.legalReferences.map((r) => [[{ text: r.norm, bold: true }], [{ text: r.provisions }]])]);
  }
  if (s.content.outOfScope.length) {
    w.subheading("Fica de fora (fora do pedido)");
    for (const o of s.content.outOfScope) drawMarkdown(w, `- ${o.replace(/\n/g, " ")}`);
  }
  if (s.content.aiOutline) {
    w.subheading("Subtemas organizados pela IA a partir do seu pedido");
    w.card(() => w.text(s.content.aiOutline!, { size: 9.5, color: MUTED, gap: 0 }), { bg: SOFT, accent: RED, pad: 10 });
  }
  if (!s.content.scopeStatement && !s.content.legalReferences.length && !s.content.outOfScope.length && !s.content.aiOutline) {
    w.text("Estudo do conteúdo informado, conforme o pedido do aluno.", { color: MUTED });
  }

  // ---- Teoria ----
  w.section("Teoria", { newPage: true });
  s.units.forEach((u, i) => {
    if (i > 0) w.y -= 10;
    w.unit(`Unidade ${i + 1} de ${s.units.length}`, u.title);
    w.card(
      () => {
        w.spaced("Objetivo", w.left, w.y - 7, 7, w.fonts.bold, RED, 0.2);
        w.y -= 13;
        w.rich([{ text: u.objective, italic: true }], { size: 10, gap: 0 });
      },
      { bg: SOFT, accent: RED, pad: 9, padX: 10, gap: 10 },
    );
    for (const sec of u.sections) {
      w.subheading(sec.title, sec.verificationStatus === "pendente" ? "[não verificado]" : undefined);
      drawMarkdown(w, sec.body);
      w.y -= 4;
    }
    if (u.unverifiedClaims.length) {
      w.card(
        () => {
          w.spaced("Pendente de verificação na fonte oficial", w.left, w.y - 7, 7, w.fonts.bold, RED, 0.2);
          w.y -= 14;
          for (const c of u.unverifiedClaims) drawMarkdown(w, `- ${c.replace(/\n/g, " ")}`);
        },
        { bg: RED_SOFT, accent: RED, pad: 10 },
      );
    }
  });

  // ---- Questões ----
  w.section("Questões respondidas", { newPage: true });
  w.text(
    `${s.questions.length} ${s.questions.length === 1 ? "questão respondida" : "questões respondidas"} por você, com a sua última resposta, o gabarito e os comentários. Exercícios de recuperação aparecem logo depois do nível a que pertencem. São questões de treino elaboradas pela plataforma, não questões oficiais.`,
    { color: MUTED, size: 9.5, gap: 10 },
  );
  let n = 0;
  for (const level of ["facil", "medio", "dificil"] as const) {
    const qs = s.questions.filter((q) => q.level === level);
    if (!qs.length) continue;
    const ok = qs.filter((q) => q.answer.correct).length;
    // Título do nível nunca fica sozinho no fim da página: precisa caber junto da 1ª questão.
    const firstH = w.measureBlock(() => drawQuestion(w, qs[0]!, n + 1));
    if (w.room < firstH + 80 && firstH + 80 < A4[1] - M.top - M.bottom) w.newPage();
    w.unit(`${qs.length} ${qs.length === 1 ? "questão" : "questões"} · ${ok} ${ok === 1 ? "acerto" : "acertos"}`, `Nível ${LEVEL_LABEL[level]}`);
    for (const q of qs) drawQuestion(w, q, ++n);
  }

  // ---- Revisão ----
  w.section("Pontos de revisão", { newPage: true });
  if (!s.review.length) {
    w.card(() => w.text("Você não errou nenhuma questão deste conteúdo. Mesmo assim, faça as revisões espaçadas para manter o domínio.", { gap: 0 }), { bg: SOFT, accent: INK, pad: 10 });
  } else {
    w.text("Itens em que você errou ao menos uma vez. Releia a teoria correspondente e refaça as questões antes da revisão espaçada.", { color: MUTED, size: 9.5, gap: 8 });
    drawTable(
      w,
      [[[{ text: "Ponto" }], [{ text: "Unidade" }], [{ text: "Erros" }]], ...s.review.map((r) => [[{ text: r.topic, bold: true }], [{ text: r.unitTitle }], [{ text: String(r.wrongAttempts), bold: true, color: RED }]])],
      { align: ["left", "left", "center"] },
    );
  }

  // ---- Referências ----
  w.section("Referências e fontes", { newPage: w.room < 220 });
  const refs = s.units.flatMap((u) => u.references.map((r) => ({ ...r, unit: u.title })));
  if (refs.length) {
    drawTable(
      w,
      [[[{ text: "Nº" }], [{ text: "Referência" }], [{ text: "Situação" }]], ...refs.map((r, i) => [[{ text: String(i + 1), bold: true }], [{ text: r.citation }], [{ text: r.verified ? "Verificada" : "Não verificada", bold: !r.verified, color: r.verified ? INK : RED }]])],
      { align: ["center", "left", "left"] },
    );
  } else {
    w.text("Nenhuma referência externa citada nas aulas.", { color: MUTED });
  }
  w.card(
    () =>
      w.text(
        "Dispositivos legais, doutrina e jurisprudência citados devem ser conferidos na fonte oficial: o texto legal só é transcrito quando foi colado por você.",
        { size: 9, italic: true, color: MUTED, gap: 0 },
      ),
    { bg: SOFT, accent: RED, pad: 9 },
  );
  w.subheading("Conteúdo informado");
  w.rich([{ text: `Versão ${s.content.sourceVersion} (${fmtDate(s.content.sourceCreatedAt)}) · SHA-256 ${s.content.sourceSha256.slice(0, 16)}…`, italic: true }], { size: 8.5, color: FAINT, gap: 6 });
  w.text(s.content.sourceText.slice(0, 20_000) + (s.content.sourceText.length > 20_000 ? "\n[…]" : ""), { size: 9, color: MUTED });

  // ---- Sumário, cabeçalho e rodapé ----
  drawToc(doc, w);
  drawChrome(doc, w, s, meta, logoHeader);
  return doc.save();
}
