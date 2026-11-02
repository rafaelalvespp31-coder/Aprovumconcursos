/**
 * PDF do MAPA MENTAL (modelo padrão APROVUM): A4 deitado, fundo preto, arte do operador,
 * cartões com borda vermelha. Página 1 = o mapa (blocos, mnemônicos, dica, resumo, o que
 * lembrar). Páginas seguintes = a matéria inteira da aula, módulo por módulo, com todos os
 * mnemônicos, pegadinhas e comparações — tudo no mesmo PDF.
 * pdf-lib com fontes padrão e imagens embutidas (nada lido do disco).
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import type { MindMap } from "@/domain/content/mind-map";
import { LOGO_CLARA_PNG, OPERADOR_JPG } from "./mind-map-assets";

const W = 841.89;
const H = 595.28;
const BG = rgb(0.035, 0.035, 0.04);
const CARD = rgb(0.075, 0.075, 0.085);
const CARD_HEAD = rgb(0.11, 0.11, 0.125);
const WHITE = rgb(1, 1, 1);
const SOFT = rgb(0.84, 0.84, 0.86);
const MUTED = rgb(0.6, 0.6, 0.63);
const RED = rgb(0.9, 0.04, 0.05);
const RED_DARK = rgb(0.55, 0.02, 0.03);
const GOLD = rgb(0.98, 0.76, 0.18);
const PURPLE = rgb(0.66, 0.36, 0.95);
const ACCENTS = [PURPLE, GOLD, RED] as const;

interface Fonts {
  r: PDFFont;
  b: PDFFont;
  bi: PDFFont;
  i: PDFFont;
}

const b64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64"));

/** Só o que a fonte padrão (WinAnsi) desenha. */
function clean(font: PDFFont, s: string): string {
  const set = new Set(font.getCharacterSet());
  const mapped = s
    .normalize("NFC")
    .replace(/[→⇒]/g, "->")
    .replace(/[≥]/g, ">=")
    .replace(/[≤]/g, "<=")
    .replace(/[✓✔]/g, "")
    .replace(/[−‐‑]/g, "-")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, " ");
  let out = "";
  for (const ch of mapped) out += set.has(ch.codePointAt(0)!) ? ch : "";
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
      // Palavra maior que a linha: quebra à força.
      let rest = w;
      while (font.widthOfTextAtSize(rest, size) > width && rest.length > 1) {
        let k = rest.length - 1;
        while (k > 1 && font.widthOfTextAtSize(rest.slice(0, k), size) > width) k--;
        lines.push(rest.slice(0, k));
        rest = rest.slice(k);
      }
      line = rest;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Linhas que cabem em `maxLines`; a última ganha reticências se sobrar texto. */
function clamp(font: PDFFont, text: string, size: number, width: number, maxLines: number): string[] {
  const lines = wrap(font, text, size, width);
  if (lines.length <= maxLines) return lines;
  const out = lines.slice(0, Math.max(1, maxLines));
  let last = out[out.length - 1]!;
  while (last && font.widthOfTextAtSize(`${last}…`, size) > width) last = last.replace(/\s*\S+$/, "");
  out[out.length - 1] = `${last}…`;
  return out;
}

/** Coordenadas "de cima para baixo" (y a partir do topo da página). */
class Canvas {
  constructor(
    readonly page: PDFPage,
    readonly f: Fonts,
  ) {}
  rect(x: number, y: number, w: number, h: number, o: { color?: RGB; border?: RGB; bw?: number; opacity?: number } = {}) {
    this.page.drawRectangle({ x, y: H - y - h, width: w, height: h, color: o.color, borderColor: o.border, borderWidth: o.border ? (o.bw ?? 1) : 0, opacity: o.opacity, borderOpacity: o.opacity });
  }
  text(s: string, x: number, y: number, size: number, font: PDFFont, color: RGB = WHITE, o: { spacing?: number } = {}) {
    const t = clean(font, s);
    if (!t) return;
    if (o.spacing) {
      let cx = x;
      for (const ch of t) {
        this.page.drawText(ch, { x: cx, y: H - y - size * 0.8, size, font, color });
        cx += font.widthOfTextAtSize(ch, size) + o.spacing;
      }
      return;
    }
    this.page.drawText(t, { x, y: H - y - size * 0.8, size, font, color });
  }
  width(s: string, size: number, font: PDFFont, spacing = 0) {
    const t = clean(font, s);
    return font.widthOfTextAtSize(t, size) + spacing * Math.max(0, [...t].length - 1);
  }
  poly(points: Array<[number, number]>, color: RGB, opacity = 1) {
    const path = points.map(([x, y], i) => `${i ? "L" : "M"} ${x} ${y}`).join(" ") + " Z";
    this.page.drawSvgPath(path, { x: 0, y: H, color, opacity, borderWidth: 0 });
  }
  check(x: number, y: number, s = 6, color: RGB = RED) {
    this.page.drawLine({ start: { x, y: H - y - s * 0.55 }, end: { x: x + s * 0.38, y: H - y - s }, thickness: 1.6, color });
    this.page.drawLine({ start: { x: x + s * 0.38, y: H - y - s }, end: { x: x + s, y: H - y - s * 0.05 }, thickness: 1.6, color });
  }
}

function background(c: Canvas, art: PDFImage | null) {
  c.rect(0, 0, W, H, { color: BG });
  if (art) c.page.drawImage(art, { x: 250, y: H - 300, width: 264, height: 300, opacity: 0.42 });
  // Faixas diagonais vermelhas (cantos), como no modelo.
  for (let k = 0; k < 3; k++) {
    const o = k * 9;
    c.poly([[W - 120 + o, 0], [W - 112 + o, 0], [W - 152 + o, 40], [W - 160 + o, 40]], RED, 0.85 - k * 0.2);
    c.poly([[o, H - 8], [o + 8, H - 8], [o + 30, H - 36], [o + 22, H - 36]], RED, 0.7 - k * 0.2);
  }
}

function footer(c: Canvas, label: string) {
  c.rect(0, H - 34, W, 34, { color: rgb(0.02, 0.02, 0.025) });
  c.rect(0, H - 34, W, 1.2, { color: RED });
  const word = "APROVUM";
  let x = 290;
  for (const ch of word) {
    c.text(ch, x, H - 25, 15, c.f.b, ch === "V" ? RED : WHITE);
    x += c.width(ch, 15, c.f.b) + 9;
  }
  c.text(label, 520, H - 21, 8, c.f.b, SOFT, { spacing: 2.2 });
  for (let k = 0; k < 3; k++) c.poly([[470 + k * 8, H - 8], [476 + k * 8, H - 8], [490 + k * 8, H - 28], [484 + k * 8, H - 28]], RED, 0.9);
}

/** Cartão com cabeçalho (título + selo colorido) e corpo; devolve a área interna. */
function card(c: Canvas, x: number, y: number, w: number, h: number, title: string, o: { accent?: RGB; sub?: string | null; filled?: boolean } = {}) {
  const accent = o.accent ?? RED;
  c.rect(x, y, w, h, { color: o.filled ? accent : CARD, border: accent, bw: 1.1, opacity: 0.96 });
  const headH = o.sub ? 30 : 20;
  if (!o.filled) c.rect(x + 0.6, y + 0.6, w - 1.2, headH, { color: CARD_HEAD });
  // selo
  c.rect(x + 7, y + 6, 3, headH - 12 > 6 ? headH - 12 : 8, { color: accent });
  const titleColor = o.filled ? rgb(0.05, 0.05, 0.05) : accent === GOLD ? GOLD : WHITE;
  const tl = clamp(c.f.bi, title.toUpperCase(), 9.5, w - 22, 1);
  c.text(tl[0] ?? "", x + 15, y + 6, 9.5, c.f.bi, titleColor);
  if (o.sub) c.text(clamp(c.f.r, o.sub, 7.5, w - 22, 1)[0] ?? "", x + 15, y + 18, 7.5, c.f.r, o.filled ? rgb(0.1, 0.1, 0.1) : MUTED);
  return { x: x + 9, y: y + headH + 5, w: w - 18, h: h - headH - 9 };
}

type Item = { text: string; bold?: string; bullet?: "check" | "arrow" | "none" };

/** Lista dentro de uma área: reduz a fonte até caber; o que sobrar ganha reticências. */
function list(c: Canvas, area: { x: number; y: number; w: number; h: number }, items: Item[], o: { color?: RGB; max?: number; min?: number; center?: boolean } = {}) {
  const color = o.color ?? SOFT;
  for (let size = o.max ?? 8.4; size >= (o.min ?? 5.6); size -= 0.4) {
    const lh = size * 1.22;
    const layout: Array<{ lines: string[]; item: Item; bw: number }> = [];
    let used = 0;
    for (const it of items) {
      const indent = it.bullet === "none" ? 0 : size + 3;
      const full = it.bold ? `${it.bold} ${it.text}` : it.text;
      const lines = wrap(c.f.r, full, size, area.w - indent);
      layout.push({ lines, item: it, bw: indent });
      used += lines.length * lh + size * 0.35;
    }
    if (used <= area.h || size - 0.4 < (o.min ?? 5.6)) {
      let y = area.y;
      const maxLines = Math.floor(area.h / lh);
      let left = maxLines;
      for (const { lines, item, bw } of layout) {
        if (left <= 0) break;
        const show = lines.length > left ? clamp(c.f.r, item.bold ? `${item.bold} ${item.text}` : item.text, size, area.w - bw, left) : lines;
        if (item.bullet === "check") c.check(area.x, y + 1, size * 0.8);
        else if (item.bullet === "arrow") c.text("»", area.x, y - 0.5, size + 1, c.f.b, RED);
        show.forEach((ln, i) => {
          let x = area.x + bw;
          if (o.center) x = area.x + (area.w - c.width(ln, size, c.f.r)) / 2;
          if (i === 0 && item.bold && ln.startsWith(clean(c.f.b, item.bold))) {
            const bold = clean(c.f.b, item.bold);
            c.text(bold, x, y, size, c.f.b, WHITE);
            c.text(ln.slice(bold.length), x + c.width(bold, size, c.f.b) + c.width("n", size, c.f.r) * 0.5, y, size, c.f.r, color);
          } else c.text(ln, x, y, size, c.f.r, color);
          y += lh;
        });
        left -= show.length;
        y += size * 0.35;
      }
      return;
    }
  }
}

function mnemonicCard(c: Canvas, x: number, y: number, w: number, h: number, m: MindMap["mnemonics"][number], accent: RGB) {
  const a = card(c, x, y, w, h, "Mnemônico", { accent, sub: m.label });
  let size = 26;
  while (size > 12 && c.width(`“${m.acronym}”`, size, c.f.bi) > a.w) size -= 1;
  c.text(`“${m.acronym}”`, a.x + (a.w - c.width(`“${m.acronym}”`, size, c.f.bi)) / 2, a.y, size, c.f.bi, accent === GOLD ? GOLD : accent === PURPLE ? rgb(0.86, 0.72, 1) : RED);
  list(c, { x: a.x, y: a.y + size + 3, w: a.w, h: a.h - size - 3 }, [{ text: m.terms.map((t) => t.charAt(0).toUpperCase() + t.slice(1)).join(", "), bullet: "none" }], { center: true, max: 7.6, min: 5.4 });
}

function header(c: Canvas, map: MindMap, logo: PDFImage | null, compact = false) {
  if (logo) c.page.drawImage(logo, { x: 20, y: H - 18 - 41, width: 200, height: 41 });
  // "MAPA MENTAL"
  const mm = compact ? "MATÉRIA COMPLETA" : "MAPA MENTAL";
  const ms = compact ? 16 : 24;
  c.text(mm, W - 22 - c.width(mm, ms, c.f.bi), 16, ms, c.f.bi, WHITE);
  const tag = "ESTUDE • FIXE • EVOLUA";
  c.text(tag, W - 22 - c.width(tag, 7.5, c.f.b, 1.6), 16 + ms + 3, 7.5, c.f.b, SOFT, { spacing: 1.6 });
  if (compact) {
    const t = clean(c.f.bi, map.title.toUpperCase());
    c.text(clamp(c.f.bi, t, 18, 520, 1)[0] ?? "", 240, 22, 18, c.f.bi, WHITE);
    if (map.subtitle) c.text(map.subtitle.toUpperCase(), 240, 44, 9, c.f.b, RED);
    return;
  }
  // Título grande + faixa vermelha com o dispositivo
  const title = map.title.toUpperCase();
  const area = { x: 430, w: 390 };
  let size = 44;
  let lines = wrap(c.f.bi, title, size, area.w);
  while ((lines.length > 2 || (lines.length === 2 && size > 30)) && size > 18) {
    size -= 2;
    lines = wrap(c.f.bi, title, size, area.w);
  }
  lines = clamp(c.f.bi, title, size, area.w, 2);
  let y = 58;
  for (const ln of lines) {
    const lw = c.width(ln, size, c.f.bi);
    c.text(ln, area.x + (area.w - lw) / 2 + 1.5, y + 1.5, size, c.f.bi, RED_DARK);
    c.text(ln, area.x + (area.w - lw) / 2, y, size, c.f.bi, WHITE);
    y += size * 0.98;
  }
  const rib = (map.subtitle ?? map.subject ?? "").toUpperCase();
  if (rib) {
    const rs = 15;
    const rw = Math.min(area.w, c.width(rib, rs, c.f.bi) + 40);
    const rx = area.x + (area.w - rw) / 2;
    const ry = y + 2;
    c.poly([[rx + 10, ry], [rx + rw, ry], [rx + rw - 10, ry + 24], [rx, ry + 24]], RED);
    c.poly([[rx - 18, ry + 6], [rx - 6, ry + 6], [rx - 12, ry + 18], [rx - 24, ry + 18]], RED, 0.8);
    c.poly([[rx + rw + 6, ry + 6], [rx + rw + 18, ry + 6], [rx + rw + 12, ry + 18], [rx + rw, ry + 18]], RED, 0.8);
    const t = clamp(c.f.bi, rib, rs, rw - 24, 1)[0] ?? "";
    c.text(t, rx + (rw - c.width(t, rs, c.f.bi)) / 2, ry + 5, rs, c.f.bi, WHITE);
  }
}

/** Página 1: o mapa no modelo padrão. */
function drawMapPage(doc: PDFDocument, f: Fonts, map: MindMap, art: PDFImage | null, logo: PDFImage | null) {
  const c = new Canvas(doc.addPage([W, H]), f);
  background(c, art);
  header(c, map, logo);

  const top = 150;
  const gridBottom = 452;
  const gap = 9;
  const colW = (W - 36 - gap * 3) / 4;
  const colX = (i: number) => 18 + i * (colW + gap);

  // Coluna 1: o que é + mnemônico principal
  const mn = map.mnemonics;
  const introH = mn.length ? 160 : gridBottom - top;
  const intro = card(c, colX(0), top, colW, introH, "O que é?", { accent: RED });
  list(c, intro, [{ text: map.intro ?? `${map.title}: veja os blocos ao lado e os módulos nas próximas páginas.`, bullet: "none" }], { max: 9, min: 6 });
  if (mn[0]) mnemonicCard(c, colX(0), top + introH + gap, colW, gridBottom - top - introH - gap, mn[0], PURPLE);

  // Colunas 2 e 3: blocos do esquema (ou módulos, se a aula não tiver esquema)
  const blocks = map.blocks.length
    ? map.blocks.map((b) => ({ title: b.title, sub: b.detail, value: b.value }))
    : map.modules.map((m) => ({ title: m.title, sub: m.points[0] ?? "", value: m.points[1] ?? null }));
  const right = mn.length > 1 ? 1 : 0;
  const perCol = 4;
  const slots = perCol * 2 - right;
  const shown = blocks.slice(0, slots);
  const colA = shown.slice(0, Math.ceil(shown.length / 2));
  const colB = shown.slice(colA.length);
  const drawBlocks = (items: typeof shown, x: number, height: number) => {
    if (!items.length) return;
    const bh = (height - gap * (items.length - 1)) / items.length;
    items.forEach((b, i) => {
      const y = top + i * (bh + gap);
      const a = card(c, x, y, colW, bh, b.title, { accent: RED });
      const valueH = b.value ? (c.width(b.value, 7.6, c.f.r) + 30 > colW - 18 ? 26 : 17) : 0;
      list(c, { x: a.x, y: a.y, w: a.w, h: a.h - valueH - (valueH ? 3 : 0) }, [{ text: b.sub, bullet: "none" }], { max: 8, min: 5.6 });
      if (b.value) {
        c.rect(x + 1, y + bh - valueH - 1, colW - 2, valueH, { color: rgb(0.02, 0.02, 0.025) });
        const label = map.blocks.length && map.valueLabel ? `${map.valueLabel.split(/\s+ou\s+/i)[0]}: ` : "";
        list(c, { x: a.x, y: y + bh - valueH + 3, w: a.w, h: valueH - 4 }, [{ text: b.value, bold: label || undefined, bullet: "none" }], { max: 8, min: 5.6, color: WHITE });
      }
    });
  };
  const bHeight = gridBottom - top;
  drawBlocks(colA, colX(1), bHeight);
  const colBHeight = right ? bHeight - 132 - gap : bHeight;
  drawBlocks(colB, colX(2), colBHeight);
  if (right && mn[1]) mnemonicCard(c, colX(2), top + colBHeight + gap, colW, 132, mn[1], GOLD);

  // Coluna 4: atenção (pegadinhas) + 3º mnemônico ou comparação
  const traps = map.traps.slice(0, 6);
  const col4Second = mn[2] ? "mn" : map.comparisons.length ? "cmp" : null;
  const trapsH = col4Second ? 230 : gridBottom - top;
  const ta = card(c, colX(3), top, colW, trapsH, "Atenção: pegadinhas", { accent: RED });
  list(c, ta, traps.length ? traps.map((t) => ({ text: t.truth, bold: t.claim, bullet: "arrow" as const })) : [{ text: "Releia os pontos de cada módulo nas próximas páginas.", bullet: "none" }], { max: 7.8, min: 5.4 });
  const y4 = top + trapsH + gap;
  const h4 = gridBottom - y4;
  if (col4Second === "mn" && mn[2]) mnemonicCard(c, colX(3), y4, colW, h4, mn[2], RED);
  else if (col4Second === "cmp") {
    const a = card(c, colX(3), y4, colW, h4, "Não confunda", { accent: GOLD });
    list(c, a, map.comparisons.slice(0, 5).map((r) => ({ text: r.detail, bold: `${r.title}:`, bullet: "arrow" as const })), { max: 7.6, min: 5.4 });
  }

  // Linha de baixo: dica | resumo | o que lembrar
  const by = gridBottom + gap;
  const bh = H - 40 - by;
  const bw = (W - 36 - gap * 2) / 3;
  const dica = card(c, 18, by, bw, bh, "Dica de prova", { accent: RED });
  list(c, dica, [{ text: map.tip ?? "Revise os blocos e os mnemônicos antes da prova.", bullet: "none" }], { max: 8.4, min: 5.6 });
  const res = card(c, 18 + bw + gap, by, bw, bh, "Resumo estratégico", { accent: RED });
  list(c, res, (map.summary.length ? map.summary.slice(0, 4).map((r) => ({ text: r.a, bold: r.q.replace(/\?$/, ":"), bullet: "check" as const })) : map.blocks.slice(0, 4).map((b) => ({ text: b.value ?? b.detail, bold: `${b.title}:`, bullet: "check" as const }))), { max: 8, min: 5.6 });
  const lem = card(c, 18 + (bw + gap) * 2, by, bw, bh, "O que lembrar?", { accent: GOLD });
  const remember = [...mn.map((m) => ({ text: m.label, bold: `${m.acronym} =`, bullet: "check" as const })), ...map.remember.slice(0, 3).map((r) => ({ text: r, bullet: "check" as const }))];
  list(c, lem, remember.length ? remember.slice(0, 4) : [{ text: "Os pontos de cada módulo estão nas próximas páginas.", bullet: "none" }], { max: 8, min: 5.6 });

  footer(c, "FOCO • DISCIPLINA • APROVAÇÃO");
}

type FlowCard = { title: string; accent: RGB; sub?: string | null; items: Item[]; big?: string };

/** Páginas seguintes: toda a matéria da aula em cartões (3 colunas, quantas páginas precisar). */
function drawFullPages(doc: PDFDocument, f: Fonts, map: MindMap, logo: PDFImage | null) {
  const cards: FlowCard[] = [];
  map.modules.forEach((m, i) => cards.push({ title: m.title, sub: `Módulo ${i + 1}`, accent: RED, items: m.points.map((p) => ({ text: p, bullet: "arrow" })) }));
  map.mnemonics.forEach((m, i) => cards.push({ title: "Mnemônico", sub: m.label, accent: ACCENTS[i % 3]!, big: m.acronym, items: m.terms.map((t) => ({ text: t, bold: `${t.charAt(0).toUpperCase()} —`, bullet: "none" })) }));
  if (map.blocks.length) cards.push({ title: "Esquema completo", sub: map.valueLabel, accent: RED, items: map.blocks.map((b) => ({ text: `${b.detail}${b.value ? ` → ${b.value}` : ""}`, bold: `${b.title}:`, bullet: "check" })) });
  if (map.traps.length) cards.push({ title: "Pegadinhas", accent: RED, items: map.traps.map((t) => ({ text: t.truth, bold: t.claim, bullet: "arrow" })) });
  if (map.comparisons.length) cards.push({ title: "Não confunda", accent: GOLD, items: map.comparisons.map((r) => ({ text: `${r.detail}${r.value ? ` (${r.value})` : ""}`, bold: `${r.title}:`, bullet: "arrow" })) });
  if (map.summary.length) cards.push({ title: "Resumo estratégico", accent: RED, items: map.summary.map((r) => ({ text: r.a, bold: r.q, bullet: "check" })) });
  if (map.remember.length) cards.push({ title: "Você consegue…", accent: GOLD, items: map.remember.map((r) => ({ text: r, bullet: "check" })) });
  if (!cards.length) return;

  const gap = 9;
  const top = 66;
  const bottom = H - 42;
  const colW = (W - 36 - gap * 2) / 3;
  const size = 7.6;
  const lh = size * 1.22;
  const measureCard = (cd: FlowCard) => {
    const headH = cd.sub ? 30 : 20;
    let h = headH + 10 + (cd.big ? 26 : 0);
    for (const it of cd.items) {
      const indent = it.bullet === "none" ? 0 : size + 3;
      h += wrap(f.r, it.bold ? `${it.bold} ${it.text}` : it.text, size, colW - 18 - indent).length * lh + size * 0.35;
    }
    return Math.min(h, bottom - top);
  };

  let c: Canvas | null = null;
  let cols = [top, top, top];
  const newPage = () => {
    c = new Canvas(doc.addPage([W, H]), f);
    background(c, null);
    header(c, map, logo, true);
    footer(c, "FOCO • DISCIPLINA • APROVAÇÃO");
    cols = [top, top, top];
  };
  newPage();
  for (const cd of cards) {
    const h = measureCard(cd);
    let col = cols.indexOf(Math.min(...cols));
    if (cols[col]! + h > bottom) {
      newPage();
      col = 0;
    }
    const x = 18 + col * (colW + gap);
    const y = cols[col]!;
    const cv = c as unknown as Canvas;
    const a = card(cv, x, y, colW, h, cd.title, { accent: cd.accent, sub: cd.sub });
    let ay = a.y;
    if (cd.big) {
      const t = `“${cd.big}”`;
      cv.text(t, a.x + (a.w - cv.width(t, 22, f.bi)) / 2, ay, 22, f.bi, cd.accent === GOLD ? GOLD : cd.accent === PURPLE ? rgb(0.86, 0.72, 1) : RED);
      ay += 26;
    }
    list(cv, { x: a.x, y: ay, w: a.w, h: y + h - ay - 4 }, cd.items, { max: size, min: 5.4 });
    cols[col] = y + h + gap;
  }
}

export async function renderMindMapPdf(map: MindMap): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Mapa mental — ${map.title}`);
  doc.setAuthor("APROVUM");
  doc.setCreator("APROVUM");
  const f: Fonts = {
    r: await doc.embedFont(StandardFonts.Helvetica),
    b: await doc.embedFont(StandardFonts.HelveticaBold),
    bi: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
    i: await doc.embedFont(StandardFonts.HelveticaOblique),
  };
  const art = await doc.embedJpg(b64(OPERADOR_JPG)).catch(() => null);
  const logo = await doc.embedPng(b64(LOGO_CLARA_PNG)).catch(() => null);
  drawMapPage(doc, f, map, art, logo);
  drawFullPages(doc, f, map, logo);
  return doc.save();
}
