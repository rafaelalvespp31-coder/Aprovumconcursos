/**
 * PDF do Raio-X do edital, com a identidade APROVUM (preto, vermelho e branco) e gráficos
 * desenhados em vetor (linha, rosca, barras, mapa de calor). pdf-lib com fontes padrão e logos
 * embutidas: nada lido do disco, funciona em ambiente serverless.
 * Só usa dados reais catalogados (os mesmos da tela); nada é inventado.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { buildPlano } from "@/domain/strategic/plano";
import { orgImageFor } from "@/domain/edital/org-images";
import type { RaioX } from "@/server/services/strategic";
import { HEAT_LABEL, type Heat } from "@/domain/strategic/analysis";
import { aggregateIncidence, cutoffSeries, niceScale, projectNext } from "@/domain/strategic/painel";
import { CAPA_JPG, LOGO_ESCURA_PNG } from "./logos";

const W = 595.28;
const H = 841.89;
const MX = 40;
const TOP = 92;
const BOTTOM = 64;
const CW = W - MX * 2;

const INK = rgb(0.04, 0.04, 0.05);
const GRAPHITE = rgb(0.17, 0.17, 0.19);
const MUTED = rgb(0.39, 0.39, 0.42);
const FAINT = rgb(0.62, 0.62, 0.65);
const LINE = rgb(0.88, 0.88, 0.9);
const SOFT = rgb(0.962, 0.962, 0.968);
const WHITE = rgb(1, 1, 1);
const RED = rgb(0.882, 0.024, 0);
const RED_DARK = rgb(0.55, 0.02, 0.04);
const RED_SOFT = rgb(0.995, 0.93, 0.925);
const AMBER = rgb(0.96, 0.6, 0.06);
const GREEN = rgb(0.13, 0.6, 0.38);

const HEAT_COLOR: Record<Heat, RGB> = { muito_alta: RED, alta: rgb(0.95, 0.38, 0.12), moderada: AMBER, baixa: rgb(0.66, 0.66, 0.7), sem_dados: rgb(0.85, 0.85, 0.88) };
const PALETTE = [RED, GRAPHITE, AMBER, rgb(0.45, 0.45, 0.5), RED_DARK, rgb(0.93, 0.5, 0.45), rgb(0.7, 0.7, 0.74), rgb(0.26, 0.26, 0.31)];
const LIGHT_TEXT = new Set<RGB>([AMBER, rgb(0.7, 0.7, 0.74), rgb(0.93, 0.5, 0.45)]);

const KIND: Record<string, string> = { minima_aprovacao: "Nota mínima de aprovação", corte_primeira_fase: "Corte da 1ª fase", ultimo_classificado: "Último classificado", ultimo_convocado: "Último convocado", ultimo_dentro_vagas: "Último dentro das vagas" };
const MODALITY: Record<string, string> = { ampla: "Ampla concorrência", pcd: "PcD", negros: "Cotas raciais", indigenas: "Indígenas", quilombolas: "Quilombolas", outra: "Outra" };
const PRIO = { maxima: "Prioridade máxima", alta: "Prioridade alta", complementar: "Prioridade complementar" } as const;

const b64 = (s: string) => Uint8Array.from(Buffer.from(s, "base64"));
const num = (n: number, d = 1) => n.toLocaleString("pt-BR", { maximumFractionDigits: d });
const dateBr = (d: string | null) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("pt-BR") : "—");

interface Fonts { regular: PDFFont; bold: PDFFont; italic: PDFFont }

class Doc {
  pdf!: PDFDocument;
  f!: Fonts;
  page!: PDFPage;
  /** Imagem do órgão: fundo translúcido que preenche a página inteira. */
  bg: PDFImage | null = null;
  y = 0;
  private set = new Set<number>();

  static async create() {
    const d = new Doc();
    d.pdf = await PDFDocument.create();
    d.f = { regular: await d.pdf.embedFont(StandardFonts.Helvetica), bold: await d.pdf.embedFont(StandardFonts.HelveticaBold), italic: await d.pdf.embedFont(StandardFonts.HelveticaOblique) };
    d.set = new Set(d.f.regular.getCharacterSet());
    return d;
  }

  /** Só o que as fontes padrão (WinAnsi) conseguem desenhar. */
  clean(s: string): string {
    let out = "";
    for (const ch of s.normalize("NFC").replace(/[→⇒]/g, "->").replace(/[–—]/g, "-").replace(/\s+/g, " ")) {
      const cp = ch.codePointAt(0)!;
      if (this.set.has(cp) || ch === "-" || ch === ">") out += ch;
    }
    return out.trim();
  }
  w(s: string, size: number, font: PDFFont = this.f.regular) {
    let t = 0;
    for (const ch of this.clean(s)) t += font.widthOfTextAtSize(ch, 1000);
    return (t * size) / 1000;
  }
  wrap(s: string, size: number, width: number, font: PDFFont = this.f.regular, max = 99): string[] {
    const words = this.clean(s).split(" ").filter(Boolean);
    const lines: string[] = [];
    let cur = "";
    for (const word of words) {
      const next = cur ? `${cur} ${word}` : word;
      if (this.w(next, size, font) <= width || !cur) cur = next;
      else { lines.push(cur); cur = word; }
    }
    if (cur) lines.push(cur);
    if (lines.length > max) {
      const keep = lines.slice(0, max);
      let last = keep[max - 1]!;
      while (last.length > 1 && this.w(`${last}...`, size, font) > width) last = last.slice(0, -1);
      keep[max - 1] = `${last.trimEnd()}...`;
      return keep;
    }
    return lines;
  }
  fit(s: string, size: number, width: number, font: PDFFont = this.f.regular) {
    return this.wrap(s, size, width, font, 1)[0] ?? "";
  }
  text(s: string, x: number, y: number, size: number, font: PDFFont, color: RGB, p: PDFPage = this.page) {
    const t = this.clean(s);
    if (t) p.drawText(t, { x, y, size, font, color });
  }
  right(s: string, xr: number, y: number, size: number, font: PDFFont, color: RGB) {
    this.text(s, xr - this.w(s, size, font), y, size, font, color);
  }
  center(s: string, xc: number, y: number, size: number, font: PDFFont, color: RGB) {
    this.text(s, xc - this.w(s, size, font) / 2, y, size, font, color);
  }
  spaced(s: string, x: number, y: number, size: number, font: PDFFont, color: RGB, sp: number, p: PDFPage = this.page) {
    let cx = x;
    for (const ch of this.clean(s)) {
      p.drawText(ch, { x: cx, y, size, font, color });
      cx += font.widthOfTextAtSize(ch, size) + sp;
    }
    return cx - x;
  }
  rect(x: number, y: number, w: number, h: number, color: RGB, o: { border?: RGB; bw?: number; opacity?: number } = {}) {
    this.page.drawRectangle({ x, y, width: Math.max(0, w), height: Math.max(0, h), color, borderColor: o.border, borderWidth: o.border ? (o.bw ?? 0.6) : 0, opacity: o.opacity });
  }
  /** Retângulo com cantos arredondados (aproximado por SVG). */
  card(x: number, y: number, w: number, h: number, color: RGB, r = 8, border?: RGB) {
    const rr = Math.min(r, w / 2, h / 2);
    const d = `M ${rr} 0 H ${w - rr} Q ${w} 0 ${w} ${rr} V ${h - rr} Q ${w} ${h} ${w - rr} ${h} H ${rr} Q 0 ${h} 0 ${h - rr} V ${rr} Q 0 0 ${rr} 0 Z`;
    this.page.drawSvgPath(d, { x, y: y + h, color, borderColor: border, borderWidth: border ? 0.6 : 0 });
  }
  line(x1: number, y1: number, x2: number, y2: number, color: RGB, t = 0.6, dash?: number[]) {
    this.page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: t, color, dashArray: dash });
  }
  newPage() {
    this.page = this.pdf.addPage([W, H]);
    this.paintBg(this.page, 0.2);
    this.y = H - TOP;
  }
  /** Preenche a página toda (corte central, sem distorcer) com a imagem do órgão, translúcida. */
  paintBg(p: PDFPage, opacity: number) {
    if (!this.bg) return;
    const k = Math.max(W / this.bg.width, H / this.bg.height);
    const w = this.bg.width * k, h = this.bg.height * k;
    p.drawImage(this.bg, { x: (W - w) / 2, y: (H - h) / 2, width: w, height: h, opacity });
  }
  ensure(h: number) {
    if (this.y - h < BOTTOM) this.newPage();
  }
}

// ---------------------------------------------------------------------------
// Componentes

interface TocItem { n: number; title: string; what: string; page: number }

/** Abre uma seção em página própria: faixa de título, pergunta que ela responde e "leitura rápida". */
function sectionPage(d: Doc, toc: TocItem[], n: number, title: string, question: string, insight: string | null) {
  d.newPage();
  toc.push({ n, title, what: question, page: d.pdf.getPageCount() });
  const y = d.y;
  const h = 60;
  d.card(MX, y - h, CW, h, INK, 12);
  d.card(MX, y - h, 62, h, RED, 12);
  d.rect(MX + 40, y - h, 22, h, RED);
  d.center(String(n).padStart(2, "0"), MX + 31, y - 38, 24, d.f.bold, WHITE);
  d.spaced(title.toUpperCase(), MX + 78, y - 26, 14, d.f.bold, WHITE, 1.4);
  d.text(d.fit(question, 9, CW - 96), MX + 78, y - 45, 9, d.f.regular, rgb(0.78, 0.78, 0.82));
  d.y = y - h - 14;
  if (insight) insightBox(d, "Leitura rápida", insight);
}

function insightBox(d: Doc, label: string, text: string, color: RGB = RED) {
  const lines = d.wrap(text, 9.5, CW - 34, d.f.bold, 4);
  const h = 28 + lines.length * 13;
  d.ensure(h + 10);
  d.card(MX, d.y - h, CW, h, color === RED ? RED_SOFT : SOFT, 9);
  d.rect(MX, d.y - h + 8, 3.5, h - 16, color);
  d.spaced(label.toUpperCase(), MX + 16, d.y - 16, 7, d.f.bold, color, 1.2);
  lines.forEach((l, i) => d.text(l, MX + 16, d.y - 30 - i * 13, 9.5, d.f.bold, INK));
  d.y -= h + 14;
}

function note(d: Doc, s: string, o: { size?: number; color?: RGB } = {}) {
  const size = o.size ?? 8.5;
  for (const l of d.wrap(s, size, CW, d.f.regular)) {
    d.ensure(size + 4);
    d.text(l, MX, d.y - size, size, d.f.regular, o.color ?? MUTED);
    d.y -= size + 3.5;
  }
  d.y -= 4;
}

/** Título de gráfico: o que é + como ler. */
function chartTitle(d: Doc, title: string, how?: string, need = 90) {
  d.ensure(need);
  d.rect(MX, d.y - 11, 3, 11, RED);
  d.text(title.toUpperCase(), MX + 9, d.y - 9, 9, d.f.bold, INK);
  d.y -= 18;
  if (how) { for (const l of d.wrap(how, 8, CW - 9, d.f.regular, 2)) { d.text(l, MX + 9, d.y - 7, 8, d.f.regular, MUTED); d.y -= 10.5; } d.y -= 4; }
  d.y -= 2;
}

function kpis(d: Doc, items: Array<{ v: string; l: string }>) {
  const gap = 10;
  const w = (CW - gap * (items.length - 1)) / items.length;
  const h = 64;
  d.ensure(h + 8);
  items.forEach((it, i) => {
    const x = MX + i * (w + gap);
    d.card(x, d.y - h, w, h, i === 0 ? INK : SOFT, 10);
    d.rect(x + 14, d.y - 9, 18, 2.4, RED);
    d.text(d.fit(it.v, 21, w - 24, d.f.bold), x + 14, d.y - 39, 21, d.f.bold, i === 0 ? WHITE : INK);
    d.text(d.fit(it.l.toUpperCase(), 7, w - 24, d.f.bold), x + 14, d.y - 53, 7, d.f.bold, i === 0 ? rgb(0.75, 0.75, 0.78) : MUTED);
  });
  d.y -= h + 16;
}

/** Barras horizontais ranqueadas. */
function hBars(d: Doc, rows: Array<{ label: string; value: number; right: string; color?: RGB }>, o: { labelW?: number } = {}) {
  const labelW = o.labelW ?? 168;
  const barH = 12;
  const max = Math.max(1, ...rows.map((r) => r.value));
  const trackW = CW - labelW - 78;
  rows.forEach((r, i) => {
    d.ensure(barH + 10);
    const y = d.y - barH;
    d.text(String(i + 1).padStart(2, "0"), MX, y + 3, 7, d.f.bold, FAINT);
    d.text(d.fit(r.label, 9, labelW - 26, d.f.bold), MX + 18, y + 3, 9, d.f.bold, GRAPHITE);
    d.card(MX + labelW, y, trackW, barH, SOFT, barH / 2);
    if (r.value > 0) d.card(MX + labelW, y, Math.max(barH, (r.value / max) * trackW), barH, r.color ?? RED, barH / 2);
    d.right(r.right, W - MX, y + 3, 9, d.f.bold, INK);
    d.y -= barH + 9;
  });
  d.y -= 4;
}

/** Treemap (squarified): área = número de questões. */
function treemap(d: Doc, items: Array<{ name: string; value: number; pct: number; color: RGB }>, h = 160) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (!total) return;
  d.ensure(h + 14);
  const top = d.y;
  const rem = { x: 0, y: 0, w: CW, h };
  const areas = items.map((i) => (i.value / total) * CW * h);
  const place: Array<{ i: number; x: number; y: number; w: number; h: number }> = [];
  let row: number[] = [];
  const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
  const worst = (r: number[], side: number) => { const sm = sum(r); return Math.max((side * side * Math.max(...r)) / (sm * sm), (sm * sm) / (side * side * Math.min(...r))); };
  const flush = () => {
    if (!row.length) return;
    const sm = sum(row.map((k) => areas[k]!));
    if (rem.w >= rem.h) {
      const cw = sm / rem.h; let yy = rem.y;
      for (const k of row) { const hh = areas[k]! / cw; place.push({ i: k, x: rem.x, y: yy, w: cw, h: hh }); yy += hh; }
      rem.x += cw; rem.w -= cw;
    } else {
      const rh = sm / rem.w; let xx = rem.x;
      for (const k of row) { const ww = areas[k]! / rh; place.push({ i: k, x: xx, y: rem.y, w: ww, h: rh }); xx += ww; }
      rem.y += rh; rem.h -= rh;
    }
    row = [];
  };
  areas.forEach((a, k) => {
    const side = Math.min(rem.w, rem.h);
    if (!row.length || worst([...row.map((q) => areas[q]!), a], side) <= worst(row.map((q) => areas[q]!), side)) row.push(k);
    else { flush(); row.push(k); }
  });
  flush();
  for (const t of place) {
    const it = items[t.i]!;
    const x = MX + t.x + 1.5, w = t.w - 3, hh = t.h - 3;
    const y = top - t.y - t.h + 1.5;
    d.card(x, y, w, hh, it.color, 8);
    const fg = LIGHT_TEXT.has(it.color) ? INK : WHITE;
    if (w > 54 && hh > 30) {
      const lines = d.wrap(it.name, w > 120 ? 10 : 8.5, w - 16, d.f.bold, hh > 70 ? 3 : 2);
      const fs = w > 120 ? 10 : 8.5;
      lines.forEach((l, k) => d.text(l, x + 8, y + hh - 16 - k * (fs + 2), fs, d.f.bold, fg));
      d.text(`${it.value}q · ${num(it.pct)}%`, x + 8, y + 8, 8, d.f.regular, fg);
    } else if (w > 26 && hh > 16) d.text(`${num(it.pct, 0)}%`, x + 5, y + hh / 2 - 3, 7.5, d.f.bold, fg);
  }
  d.y -= h + 14;
}

/** Composição de cada prova (100%) por disciplina. */
function composition(d: Doc, rows: Array<{ label: string; parts: Array<{ name: string; pct: number }> }>, colorOf: (n: string) => RGB) {
  const barH = 22;
  const labelW = 58;
  const trackW = CW - labelW;
  for (const r of rows) {
    d.ensure(barH + 12);
    const y = d.y - barH;
    d.text(r.label, MX, y + 7, 9, d.f.bold, GRAPHITE);
    let x = MX + labelW;
    for (const p of r.parts) {
      const w = (p.pct / 100) * trackW;
      if (w <= 0) continue;
      d.rect(x, y, w, barH, colorOf(p.name), { border: WHITE, bw: 1 });
      if (w > 28) d.center(`${num(p.pct, 0)}%`, x + w / 2, y + 7, 8, d.f.bold, LIGHT_TEXT.has(colorOf(p.name)) ? INK : WHITE);
      x += w;
    }
    d.y -= barH + 9;
  }
  d.y -= 2;
}

function legend(d: Doc, items: Array<{ label: string; color: RGB }>) {
  let x = MX;
  d.ensure(22);
  let y = d.y;
  for (const it of items) {
    const label = d.fit(it.label, 8, 150, d.f.bold);
    const w = d.w(label, 8, d.f.bold) + 22;
    if (x + w > W - MX) { x = MX; y -= 15; }
    d.card(x, y - 10, 9, 9, it.color, 2.5);
    d.text(label, x + 14, y - 8, 8, d.f.bold, GRAPHITE);
    x += w + 8;
  }
  d.y = y - 22;
}

/** Gráfico de linha com área, rótulos e projeção tracejada. */
function lineChart(d: Doc, pts: Array<{ x: number; y: number; label: string }>, o: { unit: string; projection?: { x: number; y: number; label: string } | null }) {
  const h = 190;
  d.ensure(h + 24);
  const padL = 40, padR = 22, padT = 22, padB = 28;
  const x0 = MX + padL, x1 = W - MX - padR;
  const yTop = d.y - padT, yBot = d.y - h + padB;
  const all = [...pts, ...(o.projection ? [o.projection] : [])];
  const vals = all.map((p) => p.y);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  const pad = (hi - lo) * 0.2 || 5;
  const sc = niceScale(Math.max(0, lo - pad), hi + pad, 4);
  d.card(MX, d.y - h, CW, h, WHITE, 12, LINE);
  const yOf = (v: number) => yBot + ((v - sc.min) / (sc.max - sc.min)) * (yTop - yBot);
  for (const t of sc.ticks) {
    const y = yOf(t);
    d.line(x0, y, x1, y, LINE, 0.5, t === sc.min ? undefined : [2, 3]);
    d.right(`${num(t, 0)}${o.unit === "%" ? "%" : ""}`, x0 - 7, y - 2.5, 7.5, d.f.regular, FAINT);
  }
  const n = all.length;
  const xOf = (i: number) => (n === 1 ? (x0 + x1) / 2 : x0 + 16 + ((x1 - x0 - 32) * i) / (n - 1));
  if (pts.length >= 2) {
    const area = pts.map((p, i) => `${(xOf(i) - x0).toFixed(2)} ${(-(yOf(p.y) - yBot)).toFixed(2)}`);
    d.page.drawSvgPath(`M ${(xOf(0) - x0).toFixed(2)} 0 L ${area.join(" L ")} L ${(xOf(pts.length - 1) - x0).toFixed(2)} 0 Z`, { x: x0, y: yBot, color: RED, opacity: 0.1 });
  }
  for (let i = 1; i < pts.length; i++) d.line(xOf(i - 1), yOf(pts[i - 1]!.y), xOf(i), yOf(pts[i]!.y), RED, 2.4);
  if (o.projection) d.line(xOf(pts.length - 1), yOf(pts[pts.length - 1]!.y), xOf(pts.length), yOf(o.projection.y), RED, 1.8, [4, 3]);
  all.forEach((p, i) => {
    const proj = i >= pts.length;
    const x = xOf(i), y = yOf(p.y);
    d.page.drawCircle({ x, y, size: 5, color: proj ? WHITE : RED, borderColor: RED, borderWidth: 1.8 });
    if (!proj) d.page.drawCircle({ x, y, size: 1.8, color: WHITE });
    const lw = d.w(p.label, 8.5, d.f.bold) + 12;
    d.card(x - lw / 2, y + 9, lw, 14, proj ? WHITE : INK, 7, proj ? RED : undefined);
    d.center(p.label, x, y + 13, 8.5, d.f.bold, proj ? RED : WHITE);
    d.center(String(Math.round(p.x)) + (proj ? " (proj.)" : ""), x, yBot - 16, 8, d.f.bold, proj ? RED : MUTED);
  });
  d.y -= h + 12;
}

/** Barras agrupadas (anterior x recente). */
function groupedBars(d: Doc, rows: Array<{ name: string; a: number | null; b: number | null }>, la: string, lb: string) {
  const rowH = 30;
  const labelW = 160;
  const trackW = CW - labelW - 44;
  const max = Math.max(1, ...rows.flatMap((r) => [r.a ?? 0, r.b ?? 0]));
  legend(d, [{ label: la, color: rgb(0.62, 0.62, 0.66) }, { label: lb, color: RED }]);
  for (const r of rows) {
    d.ensure(rowH + 4);
    const y = d.y;
    d.text(d.fit(r.name, 9, labelW - 8, d.f.bold), MX, y - 18, 9, d.f.bold, GRAPHITE);
    const bar = (v: number | null, dy: number, color: RGB) => {
      const bw = v === null ? 0 : Math.max(v > 0 ? 4 : 0, (v / max) * trackW);
      if (bw > 0) d.card(MX + labelW, y - dy - 9, bw, 9, color, 3.5);
      d.text(v === null ? "-" : String(v), MX + labelW + bw + 6, y - dy - 7.5, 8, d.f.bold, v === null ? FAINT : INK);
    };
    bar(r.a, 3, rgb(0.62, 0.62, 0.66));
    bar(r.b, 15, RED);
    const dl = r.a !== null && r.b !== null ? r.b - r.a : null;
    if (dl !== null && dl !== 0) d.right(`${dl > 0 ? "+" : ""}${dl}`, W - MX, y - 18, 9, d.f.bold, dl > 0 ? GREEN : RED);
    d.line(MX, y - rowH + 1, W - MX, y - rowH + 1, LINE, 0.4);
    d.y -= rowH;
  }
  d.y -= 8;
}

function chip(d: Doc, s: string, x: number, y: number, color: RGB, fg: RGB = WHITE) {
  const w = d.w(s.toUpperCase(), 6.5, d.f.bold) + 14;
  d.card(x, y - 3.5, w, 13, color, 6.5);
  d.text(s.toUpperCase(), x + 7, y + 0.5, 6.5, d.f.bold, fg);
  return w;
}

function table(d: Doc, head: string[], widths: number[], rows: string[][], o: { boldCol?: number } = {}) {
  const rh = 19;
  const drawHead = () => {
    d.ensure(rh * 2);
    d.card(MX, d.y - rh, CW, rh, INK, 5);
    let x = MX + 8;
    head.forEach((h, i) => { d.text(h.toUpperCase(), x, d.y - 12.5, 7, d.f.bold, WHITE); x += widths[i]! * CW; });
    d.y -= rh;
  };
  if (rows.length <= 8) d.ensure(rh * (rows.length + 1) + 6);
  drawHead();
  rows.forEach((r, ri) => {
    if (d.y - rh < BOTTOM) { d.newPage(); drawHead(); }
    if (ri % 2 === 1) d.rect(MX, d.y - rh, CW, rh, SOFT);
    let x = MX + 8;
    r.forEach((c, i) => {
      const bold = o.boldCol === i;
      d.text(d.fit(c, 8.5, widths[i]! * CW - 12, bold ? d.f.bold : d.f.regular), x, d.y - 12.5, 8.5, bold ? d.f.bold : d.f.regular, bold ? RED : GRAPHITE);
      x += widths[i]! * CW;
    });
    d.y -= rh;
  });
  d.y -= 12;
}

/** Tabela com quebra de linha nas células (nada é cortado com reticências). */
function wrapTable(d: Doc, head: string[], widths: number[], rows: string[][], o: { boldCol?: number; maxLines?: number } = {}) {
  const lh = 10.5;
  const drawHead = () => {
    d.ensure(40);
    d.card(MX, d.y - 19, CW, 19, INK, 5);
    let x = MX + 8;
    head.forEach((h, i) => { d.text(h.toUpperCase(), x, d.y - 12.5, 7, d.f.bold, WHITE); x += widths[i]! * CW; });
    d.y -= 19;
  };
  drawHead();
  rows.forEach((r, ri) => {
    const cells = r.map((c, i) => d.wrap(c, 8.5, widths[i]! * CW - 12, o.boldCol === i ? d.f.bold : d.f.regular, o.maxLines ?? 4));
    const h = Math.max(...cells.map((c) => c.length)) * lh + 9;
    if (d.y - h < BOTTOM) { d.newPage(); drawHead(); }
    if (ri % 2 === 1) d.rect(MX, d.y - h, CW, h, SOFT);
    let x = MX + 8;
    cells.forEach((ls, i) => {
      const bold = o.boldCol === i;
      ls.forEach((l, k) => d.text(l, x, d.y - 12 - k * lh, 8.5, bold ? d.f.bold : d.f.regular, bold ? RED : GRAPHITE));
      x += widths[i]! * CW;
    });
    d.y -= h;
  });
  d.y -= 12;
}

function chipsList(d: Doc, items: string[]) {
  let x = MX;
  d.ensure(24);
  let y = d.y;
  for (const it of items) {
    const label = d.fit(it, 8.5, 230, d.f.bold);
    const w = d.w(label, 8.5, d.f.bold) + 18;
    if (x + w > W - MX) { x = MX; y -= 21; if (y - 18 < BOTTOM) { d.newPage(); y = d.y; } }
    d.card(x, y - 17, w, 17, SOFT, 8.5, LINE);
    d.text(label, x + 9, y - 12, 8.5, d.f.bold, GRAPHITE);
    x += w + 6;
  }
  d.y = y - 30;
}

/** Cor da célula do mapa de calor: do quase-branco ao vermelho, conforme a participação na prova. */
function heatCell(t: number): RGB {
  const k = Math.max(0, Math.min(1, t));
  return rgb(0.985 - k * (0.985 - 0.882), 0.96 - k * (0.96 - 0.024), 0.955 - k * 0.955);
}

// ---------------------------------------------------------------------------
// Capa e moldura

async function drawCover(d: Doc, data: RaioX, who: string | null) {
  const art = await d.pdf.embedJpg(b64(CAPA_JPG));
  const p = d.pdf.addPage([W, H]);
  d.page = p;
  p.drawImage(art, { x: 0, y: 0, width: W, height: H });
  p.drawRectangle({ x: 0, y: 0, width: W, height: 250, color: rgb(0, 0, 0), opacity: 0.55 });
  const ex = data.exam;
  d.spaced("RAIO-X DO EDITAL", MX, 238, 10, d.f.bold, rgb(1, 0.23, 0.25), 3.2);
  d.rect(MX, 230, 54, 2.4, RED);
  let y = 208;
  for (const l of d.wrap(ex.name, 24, CW, d.f.bold, 3)) { d.text(l, MX, y, 24, d.f.bold, WHITE); y -= 28; }
  d.text("Diagnóstico estratégico: notas de corte, incidência, mapa de calor e direcionamento.", MX, y - 4, 9.5, d.f.regular, rgb(0.8, 0.8, 0.84));
  const edYears = [...ex.editions].map((e) => e.year).sort((a, b) => b - a);
  const items = [
    { v: String(ex.editions.length), l: "Provas analisadas" },
    { v: String(ex.cutoffs.length), l: "Notas de corte" },
    { v: String(data.heat.cells.length), l: "Assuntos mapeados" },
    { v: edYears.length ? `${edYears[edYears.length - 1]}-${edYears[0]}` : "-", l: "Período" },
  ];
  const gap = 10, bw = (CW - gap * 3) / 4;
  items.forEach((it, i) => {
    const x = MX + i * (bw + gap);
    d.card(x, 70, bw, 50, rgb(0.08, 0.08, 0.1), 8, rgb(0.28, 0.08, 0.09));
    d.rect(x + 10, 112, 14, 2, RED);
    d.text(it.v, x + 10, 88, 16, d.f.bold, WHITE);
    d.text(it.l.toUpperCase(), x + 10, 77, 6.5, d.f.bold, rgb(0.7, 0.7, 0.74));
  });
  const when = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "long", year: "numeric" });
  d.text(`Gerado em ${when}${who ? ` para ${who}` : ""}`, MX, 40, 8, d.f.regular, rgb(0.7, 0.7, 0.74));
  d.text("Histórico não garante o que cairá na próxima prova. Nenhum conteúdo do edital deve ser abandonado.", MX, 28, 7, d.f.italic, rgb(0.6, 0.6, 0.64));
}

function drawChrome(d: Doc, logo: Awaited<ReturnType<PDFDocument["embedPng"]>>, title: string) {
  const pages = d.pdf.getPages();
  pages.forEach((p, i) => {
    if (i === 0) return;
    const lh = 24, lw = (lh * logo.width) / logo.height;
    p.drawImage(logo, { x: MX, y: H - 38 - lh + 6, width: lw, height: lh });
    d.spaced("RAIO-X DO EDITAL", W - MX - d.w("RAIO-X DO EDITAL", 6.5, d.f.bold) - 16 * 0.5, H - 36, 6.5, d.f.bold, RED, 1.4, p);
    const t = d.fit(title, 8, 230);
    d.text(t, W - MX - d.w(t, 8), H - 49, 8, d.f.regular, MUTED, p);
    p.drawRectangle({ x: MX, y: H - 70, width: 46, height: 2, color: RED });
    p.drawLine({ start: { x: MX + 50, y: H - 69 }, end: { x: W - MX, y: H - 69 }, thickness: 0.6, color: LINE });
    p.drawLine({ start: { x: MX, y: 46 }, end: { x: W - MX, y: 46 }, thickness: 0.6, color: LINE });
    const sl = d.spaced("///", MX, 30, 8, d.f.bold, RED, 0, p);
    d.spaced("APROVUM", MX + sl + 6, 30, 7.5, d.f.bold, INK, 1.6, p);
    d.text("Sua preparação. Seu próximo cargo.", MX + sl + 70, 30, 6.5, d.f.regular, MUTED, p);
    const label = `${i + 1} / ${pages.length}`;
    const lw2 = d.w(label, 8, d.f.bold);
    p.drawRectangle({ x: W - MX - lw2 - 14, y: 25, width: lw2 + 14, height: 15, color: INK });
    p.drawText(label, { x: W - MX - lw2 - 7, y: 29.5, size: 8, font: d.f.bold, color: WHITE });
  });
}

// ---------------------------------------------------------------------------

export interface SyllabusDiscipline { name: string; topics: Array<{ code: string | null; depth: number; title: string; hasLesson: boolean }> }

/** Separa "Tema: a; b; c" em tema + itens, para o conteúdo sair em tópicos e não num bloco de texto. */
function splitItem(title: string): { head: string; items: string[] } {
  const t = title.replace(/\s+/g, " ").trim();
  const i = t.indexOf(":");
  if (i > 0) {
    const items = t.slice(i + 1).split(/\s*;\s*/).map((x) => x.trim().replace(/\.$/, "")).filter(Boolean);
    if (items.length >= 2) return { head: t.slice(0, i), items };
  }
  return { head: t, items: [] };
}

/** Conteúdo programático completo do edital, por disciplina, numerado e em tópicos. */
function syllabusSection(d: Doc, toc: TocItem[], n: number, disciplines: SyllabusDiscipline[]) {
  const total = disciplines.reduce((a, x) => a + x.topics.length, 0);
  sectionPage(d, toc, n, "Conteúdo programático", `Tudo o que o edital cobra: ${disciplines.length} disciplinas e ${total} assuntos, na ordem do edital.`, null);
  kpis(d, [{ v: String(disciplines.length), l: "Disciplinas" }, { v: String(total), l: "Assuntos do edital" }, { v: String(disciplines.reduce((a, x) => a + x.topics.filter((t) => t.hasLesson).length, 0)), l: "Com aula na APROVUM" }]);
  const DISC_COLORS = [rgb(0.882, 0.024, 0), rgb(0.11, 0.36, 0.78), rgb(0.1, 0.55, 0.36), rgb(0.85, 0.5, 0.04), rgb(0.5, 0.2, 0.7), rgb(0.05, 0.5, 0.55), rgb(0.3, 0.33, 0.4), rgb(0.45, 0.28, 0.15), rgb(0.2, 0.25, 0.6)]; // tópicos e subtópicos usam a cor da matéria em tom claro
  const tint = (c: RGB, k: number) => rgb(1 - (1 - c.red) * k, 1 - (1 - c.green) * k, 1 - (1 - c.blue) * k);
  disciplines.forEach((disc, di) => {
    const col = DISC_COLORS[di % DISC_COLORS.length]!;
    if (di > 0) { if (d.y < H * 0.5 || disc.topics.length > 6) d.newPage(); else d.y -= 14; } // matéria grande abre página própria; as curtas se seguem, separadas pela faixa colorida
    const h = 38;
    d.card(MX, d.y - h, CW, h, col, 9);
    d.card(MX + 8, d.y - h + 7, 24, 24, WHITE, 6);
    d.center(String(di + 1), MX + 20, d.y - 23, 12, d.f.bold, col);
    d.text(d.fit(disc.name.toUpperCase(), 13, CW - 170, d.f.bold), MX + 42, d.y - 23, 13, d.f.bold, WHITE);
    d.right(`${disc.topics.length} assunto${disc.topics.length === 1 ? "" : "s"}`, W - MX - 12, d.y - 22.5, 8.5, d.f.bold, WHITE);
    d.y -= h + 12;
    if (!disc.topics.length) { note(d, "Nenhum assunto identificado nesta disciplina."); return; }
    disc.topics.forEach((t, ti) => {
      const indent = Math.max(0, Math.min(2, t.depth - 1)) * 12;
      const x0 = MX + indent, wCard = CW - indent;
      const { head, items } = splitItem(t.title);
      const hl = d.wrap(head.toUpperCase(), 11.5, wCard - 124, d.f.bold, 5);
      const hh = hl.length * 15 + 16;
      d.ensure(hh + (items.length ? 40 : 6));
      const deep = rgb(col.red * 0.55, col.green * 0.55, col.blue * 0.55);
      d.card(x0, d.y - hh, wCard, hh, tint(col, 0.3), 9, tint(col, 0.55));
      d.rect(x0, d.y - hh + 7, 4.5, hh - 14, col);
      d.card(x0 + 12, d.y - 24, 38, 16, col, 5);
      d.center(`${di + 1}.${ti + 1}`, x0 + 31, d.y - 19.5, 8.5, d.f.bold, WHITE);
      hl.forEach((l, k) => d.text(l, x0 + 60, d.y - 20 - k * 15, 11.5, d.f.bold, deep));
      d.right(t.hasLesson ? "COM AULA" : "SEM AULA", x0 + wCard - 10, d.y - 19, 7, d.f.bold, deep);
      d.y -= hh + 3;
      items.forEach((it, ii) => {
        const il = d.wrap(it, 8.5, wCard - 66, d.f.regular, 4);
        const ih = il.length * 11 + 9;
        d.ensure(ih + 4);
        d.card(x0 + 22, d.y - ih, wCard - 22, ih, tint(col, 0.1), 6, tint(col, 0.4));
        d.rect(x0 + 22, d.y - ih + 5, 3, ih - 10, tint(col, 1));
        d.text(`${di + 1}.${ti + 1}.${ii + 1}`, x0 + 32, d.y - 12, 7, d.f.bold, col);
        il.forEach((l, k) => d.text(l, x0 + 62, d.y - 12 - k * 11, 8.5, d.f.regular, GRAPHITE));
        d.y -= ih + 3;
      });
      d.y -= 5;
    });
  });
}

/** Plano de estudo "modo gabarito": meta, regras duras, tempo por disciplina, fases, rotina, cronograma e a visão do examinador. */
function planoSection(d: Doc, toc: TocItem[], n: number, plano: ReturnType<typeof buildPlano>) {
  sectionPage(d, toc, n, "Plano de estudo: modo gabarito", `${plano.weeks} semanas, ${plano.hoursPerWeek} h por semana de referência, montado a partir do que a banca cobra.`, `Meta: ${plano.targetPct}% de acerto. ${plano.targetWhy}`);
  kpis(d, [{ v: `${plano.targetPct}%`, l: "Meta de acerto na prova" }, { v: String(plano.weeks), l: "Semanas de preparação" }, { v: `${plano.hoursPerWeek} h`, l: "Horas por semana (referência)" }]);
  note(d, "Se você tem menos ou mais semanas até a prova, mantenha as proporções das fases e reduza ou amplie o cronograma. Ajuste as horas por semana na mesma proporção: o plano não aceita estudar menos do que o método pede.", { size: 8, color: FAINT });

  chartTitle(d, "1. Regras inegociáveis", "Quem negocia estas regras negocia a aprovação.", 120);
  plano.rules.forEach((r, i) => {
    const ls = d.wrap(r, 9, CW - 30, d.f.regular, 3);
    d.ensure(ls.length * 12 + 10);
    d.card(MX, d.y - 14, 18, 14, RED, 4);
    d.center(String(i + 1), MX + 9, d.y - 10.5, 8, d.f.bold, WHITE);
    ls.forEach((l, k) => d.text(l, MX + 26, d.y - 10 - k * 12, 9, d.f.regular, INK));
    d.y -= Math.max(18, ls.length * 12 + 6);
  });
  d.y -= 8;

  chartTitle(d, "2. Tempo e meta por disciplina", "Peso real nas provas anteriores, com folga para as disciplinas pequenas, que decidem o desempate. A: peso alto. B: médio. C: baixo.", 140);
  wrapTable(d, ["Disciplina", "Peso na prova", "Nível", "% do tempo", "Horas/sem.", "Meta de acerto"], [0.34, 0.14, 0.08, 0.14, 0.14, 0.16],
    plano.disciplines.map((x) => [x.name, `${num(x.pct)}%`, x.tier, `${num(x.timePct)}%`, num(x.hours), `${x.goalPct}%`]), { boldCol: 0 });
  note(d, "Horas/sem.: 80% do tempo total vai para estas disciplinas; os 20% restantes são de revisão do caderno de erros e simulados.", { size: 8, color: FAINT });

  chartTitle(d, "3. As quatro fases", "Cada fase tem um critério de saída. Não cumpriu, não avançou.", 150);
  for (const f of plano.phases) {
    const gl = d.wrap(f.goal, 8.5, CW - 28, d.f.regular, 4);
    const sl = d.wrap(`Divisão do tempo: ${f.split}.`, 8.5, CW - 28, d.f.regular, 2);
    const el = d.wrap(`Para avançar: ${f.exit}`, 8.5, CW - 28, d.f.bold, 3);
    const rl = f.rules.flatMap((r) => d.wrap(`- ${r}`, 8.5, CW - 28, d.f.regular, 2));
    const h = 30 + (gl.length + sl.length + el.length + rl.length) * 11.5 + 8;
    d.ensure(h + 8);
    d.card(MX, d.y - h, CW, h, SOFT, 10);
    d.rect(MX, d.y - h + 8, 3.5, h - 16, RED);
    d.spaced(`FASE ${f.n}  -  SEMANAS ${f.weeks[0]} A ${f.weeks[1]}`, MX + 16, d.y - 14, 7, d.f.bold, RED, 1.2);
    d.text(f.name, MX + 16, d.y - 27, 10.5, d.f.bold, INK);
    let y = d.y - 40;
    for (const l of gl) { d.text(l, MX + 16, y, 8.5, d.f.regular, GRAPHITE); y -= 11.5; }
    for (const l of sl) { d.text(l, MX + 16, y, 8.5, d.f.regular, MUTED); y -= 11.5; }
    for (const l of el) { d.text(l, MX + 16, y, 8.5, d.f.bold, INK); y -= 11.5; }
    for (const l of rl) { d.text(l, MX + 16, y, 8.5, d.f.regular, GRAPHITE); y -= 11.5; }
    d.y -= h + 8;
  }

  chartTitle(d, "4. Rotina semanal padrão", "De segunda a sexta, 5 h por dia; sábado é prova, domingo é revisão e planejamento.", 140);
  for (const r of plano.routine) {
    const ls = r.blocks.flatMap((b) => d.wrap(b, 8.5, CW - 96, d.f.regular, 3));
    const h = Math.max(26, ls.length * 11.5 + 12);
    d.ensure(h + 6);
    d.card(MX, d.y - h, 78, h, INK, 8);
    d.center(r.day.toUpperCase(), MX + 39, d.y - h / 2 - 3, 8, d.f.bold, WHITE);
    ls.forEach((l, k) => d.text(l, MX + 90, d.y - 12 - k * 11.5, 8.5, d.f.regular, GRAPHITE));
    d.line(MX + 84, d.y - h - 3, W - MX, d.y - h - 3, LINE, 0.3);
    d.y -= h + 6;
  }
  d.y -= 6;

  chartTitle(d, "5. Revisão espaçada", "O que não é revisado é esquecido. Marque a data no dia em que estudou.", 110);
  wrapTable(d, ["Quando", "O que fazer"], [0.22, 0.78], plano.review.map((r) => [r.when, r.what]), { boldCol: 0 });

  chartTitle(d, "6. Cronograma semana a semana", "Foco principal da semana (as disciplinas giram pela fila de prioridade), meta de questões e checkpoint.", 120);
  wrapTable(d, ["Sem.", "Fase", "Foco da semana", "Questões", "Checkpoint"], [0.07, 0.13, 0.34, 0.1, 0.36], plano.schedule.map((s) => [String(s.week), s.phase, s.focus.join(" + ") || "Revisão geral", `${s.questions}+`, s.checkpoint]), { boldCol: 0 });
  note(d, "Questões: mínimo por semana, sempre comentadas. Contar questão feita no chute como feita é enganar o próprio plano.", { size: 8, color: FAINT });

  chartTitle(d, "7. Como o examinador pensa (e como derrotá-lo)", "A prova é desenhada para separar quem decorou de quem entendeu.", 120);
  plano.examiner.forEach((t) => {
    const ls = d.wrap(t, 9, CW - 18, d.f.regular, 5);
    d.ensure(ls.length * 12 + 8);
    d.rect(MX, d.y - 8, 4, 4, RED);
    ls.forEach((l, k) => d.text(l, MX + 12, d.y - 8 - k * 12, 9, d.f.regular, INK));
    d.y -= ls.length * 12 + 6;
  });
  d.y -= 8;

  chartTitle(d, "8. Gatilhos de correção", "Quando o número falha, o plano muda na hora.", 110);
  wrapTable(d, ["Se acontecer", "Faça"], [0.36, 0.64], plano.triggers.map((t) => [t.signal, t.action]), { boldCol: 0 });
}

export async function renderRaioXPdf(data: RaioX, opts: { student?: string | null; syllabus?: SyllabusDiscipline[] } = {}): Promise<Uint8Array> {
  const d = await Doc.create();
  const { exam, heat, comparison } = data;
  d.pdf.setTitle(`Raio-X do edital — ${exam.name} — APROVUM`);
  d.pdf.setAuthor("APROVUM");
  d.pdf.setProducer("APROVUM");
  const logo = await d.pdf.embedPng(b64(LOGO_ESCURA_PNG));
  const org = orgImageFor(exam.name, exam.organ);
  if (org) {
    try {
      const jpg = await sharp(await readFile(path.join(process.cwd(), "public", org.capa))).flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer();
      d.bg = await d.pdf.embedJpg(jpg);
    } catch {
      d.bg = null; // o fundo é um extra: sem o arquivo, o PDF sai como antes
    }
  }
  const toc: TocItem[] = [];

  await drawCover(d, data, opts.student ?? null);
  d.newPage(); // página 2: índice e resumo (preenchida no final)
  const summaryPage = d.page;

  // Dados derivados (todos reais)
  const eds = data.incidence.map((i) => ({ year: i.year, board: i.board, denominator: i.denominator, rows: i.rows.map((r) => ({ name: r.name, questions: r.questions })) }));
  const agg = aggregateIncidence(eds, "todas");
  const colorIdx = new Map(agg.rows.map((r, i) => [r.name, i]));
  const colorOf = (n: string) => PALETTE[(colorIdx.get(n) ?? 7) % PALETTE.length]!;
  const series = cutoffSeries(exam.cutoffs, "todas");
  const proj = series ? projectNext(series.points, series.unit === "%" ? 100 : undefined) : null;
  const bullets: Array<{ k: string; t: string }> = [];

  // ---- 01 Notas de corte
  {
    let insight: string | null = null;
    if (series && series.points.length >= 2) {
      const a = series.points[0]!, b = series.points[series.points.length - 1]!;
      const dv = b.value - a.value;
      insight = `A nota de corte foi de ${num(a.value)}${series.unit === "%" ? "%" : ""} em ${a.year} para ${num(b.value)}${series.unit === "%" ? "%" : ""} em ${b.year} (${dv >= 0 ? "+" : ""}${num(dv)} ${series.unit === "%" ? "pontos percentuais" : "pontos"}). ${dv > 0 ? "A tendência é de nota mais alta: mire acima do último corte." : dv < 0 ? "A nota vem caindo, mas não conte com isso." : "A nota está estável."}`;
      bullets.push({ k: "Nota de corte", t: insight.split(". ")[0]! + "." });
    } else if (series) {
      insight = `Última nota catalogada: ${num(series.points[0]!.score)}${series.points[0]!.maxScore ? ` de ${num(series.points[0]!.maxScore!, 0)}` : ""} (${series.points[0]!.year}). Com uma só prova não há tendência.`;
      bullets.push({ k: "Nota de corte", t: insight });
    }
    sectionPage(d, toc, 1, "Notas de corte", "Qual nota costuma ser necessária e para onde ela caminha?", insight);
    if (!series || series.points.length === 0) {
      note(d, "Nenhuma nota de corte cadastrada para este concurso.");
    } else {
      const latest = [...exam.cutoffs].sort((a, b) => b.editionYear - a.editionYear)[0]!;
      kpis(d, [
        { v: `${num(latest.score)}${latest.maxScore ? ` / ${num(latest.maxScore, 0)}` : ""}`, l: "Última nota catalogada" },
        { v: String(latest.editionYear), l: "Ano de referência" },
        { v: String(series.points.length), l: "Provas na série" },
      ]);
      chartTitle(d, `Evolução · ${KIND[series.kind] ?? series.kind}${series.position ? ` · ${series.position}` : ""}`, `Eixo vertical: ${series.unit === "%" ? "percentual do máximo da prova" : "pontos"}. Cada ponto é uma prova. ${proj ? "O ponto vazado e a linha tracejada são a projeção." : ""}`);
      lineChart(d, series.points.map((p) => ({ x: p.year, y: p.value, label: series.unit === "%" ? `${num(p.value)}%` : num(p.value) })), {
        unit: series.unit,
        projection: proj ? { x: proj.year, y: proj.value, label: `${num(proj.value)}${series.unit === "%" ? "%" : ""}` } : null,
      });
      if (proj) note(d, `Projeção por tendência linear sobre ${series.points.length} provas (confiança ${proj.confidence}). É uma estimativa de apoio, nunca um resultado garantido.`, { size: 8, color: FAINT });
      note(d, "Tipos diferentes de nota de corte não são equivalentes: o gráfico usa só o tipo e o cargo mais frequentes. A tabela traz todas as notas cadastradas.", { size: 8, color: FAINT });
      chartTitle(d, "Todas as notas cadastradas", undefined, 46 + 19 * (Math.min(exam.cutoffs.length, 8) + 1));
      const rows = [...exam.cutoffs].sort((a, b) => b.editionYear - a.editionYear).slice(0, 24).map((c) => [
        String(c.editionYear), `${KIND[c.kind] ?? c.kind}${c.stage ? ` · ${c.stage}` : ""}`, `${MODALITY[c.modality] ?? c.modality}${c.position ? ` · ${c.position}` : ""}`,
        `${num(c.score)}${c.maxScore ? ` / ${num(c.maxScore, 0)}` : ""}`, c.source?.name ? `${c.source.name}${c.sourcePage ? ` p. ${c.sourcePage}` : ""}` : "-",
      ]);
      table(d, ["Ano", "Tipo", "Modalidade", "Nota", "Fonte"], [0.09, 0.3, 0.27, 0.12, 0.22], rows, { boldCol: 3 });
    }
  }

  // ---- 02 Incidência por disciplina
  {
    const top = agg.rows[0];
    const insight = top ? `${top.name} concentra ${num(top.pct)}% das questões (${top.questions} de ${agg.total}). ${agg.rows.length > 1 ? `Junto com ${agg.rows[1]!.name} (${num(agg.rows[1]!.pct)}%), somam ${num(top.pct + agg.rows[1]!.pct)}% da prova.` : ""}` : null;
    if (top) bullets.push({ k: "Disciplina de maior peso", t: `${top.name}: ${num(top.pct)}% das questões${agg.rows[1] ? `; depois ${agg.rows[1].name} (${num(agg.rows[1].pct)}%)` : ""}.` });
    sectionPage(d, toc, 2, "Incidência por disciplina", "Quantas questões cada disciplina costuma ter?", insight);
    if (!agg.rows.length) {
      note(d, "Disciplinas ainda não cadastradas para este concurso.");
    } else {
      chartTitle(d, "Mapa de peso das disciplinas", `Quanto maior o retângulo, mais questões. Soma de ${eds.length} ${eds.length === 1 ? "prova" : "provas"}: ${agg.total} questões.`);
      treemap(d, agg.rows.map((r) => ({ name: r.name, value: r.questions, pct: r.pct, color: colorOf(r.name) })));
      chartTitle(d, "Composição de cada prova", "Cada barra é uma prova (100%). Mostra se o peso das disciplinas mudou ao longo dos anos.");
      composition(d, [...data.incidence].sort((a, b) => a.year - b.year).map((i) => ({ label: String(i.year), parts: i.rows.map((r) => ({ name: r.name, pct: i.denominator ? (r.questions / i.denominator) * 100 : 0 })) })), colorOf);
      legend(d, agg.rows.slice(0, 8).map((r) => ({ label: r.name, color: colorOf(r.name) })));
      chartTitle(d, "Ranking de disciplinas", "Questões somadas e participação no total.");
      hBars(d, agg.rows.slice(0, 18).map((r) => ({ label: r.name, value: r.questions, right: `${r.questions} · ${num(r.pct)}%`, color: colorOf(r.name) })));
      chartTitle(d, "Provas catalogadas", undefined, 46 + 19 * (data.incidence.length + 1));
      table(d, ["Ano", "Banca", "Total de questões", "Regra de contagem"], [0.1, 0.3, 0.2, 0.4], data.incidence.map((i) => [String(i.year), i.board ?? "-", String(i.denominator), i.countingRule ?? "-"]));
    }
  }

  // ---- 03 Comparativo
  if (comparison) {
    const up = comparison.subjects.filter((s) => s.delta !== null && s.delta > 0).sort((a, b) => b.delta! - a.delta!);
    const down = comparison.subjects.filter((s) => s.delta !== null && s.delta < 0).sort((a, b) => a.delta! - b.delta!);
    const parts = [up[0] ? `${up[0].name} ganhou ${up[0].delta} ${up[0].delta === 1 ? "questão" : "questões"}` : null, down[0] ? `${down[0].name} perdeu ${Math.abs(down[0].delta!)}` : null].filter(Boolean);
    const insight = parts.length ? `De ${comparison.previous.year} para ${comparison.recent.year}: ${parts.join(" e ")}.` : `Distribuição igual entre ${comparison.previous.year} e ${comparison.recent.year}.`;
    bullets.push({ k: "Última mudança", t: insight });
    sectionPage(d, toc, 3, "Comparativo das duas últimas provas", `O que mudou entre ${comparison.previous.year} e ${comparison.recent.year}?`, insight);
    chartTitle(d, "Questões por disciplina", "Barra cinza: prova anterior. Barra vermelha: prova mais recente. À direita, a variação.");
    groupedBars(d, comparison.subjects.slice(0, 16).map((s) => ({ name: s.name, a: s.previous, b: s.recent })), `${comparison.previous.year}${comparison.previous.board ? ` · ${comparison.previous.board}` : ""}`, `${comparison.recent.year}${comparison.recent.board ? ` · ${comparison.recent.board}` : ""}`);
    if (up.length || down.length) {
      const half = (CW - 12) / 2;
      const box = (x: number, title: string, color: RGB, list: typeof up) => {
        const h = 26 + Math.max(1, Math.min(4, list.length)) * 15 + 6;
        d.card(x, d.y - h, half, h, SOFT, 10);
        d.rect(x, d.y - h + 8, 3.5, h - 16, color);
        d.spaced(title.toUpperCase(), x + 16, d.y - 16, 7, d.f.bold, color, 1.1);
        list.slice(0, 4).forEach((s, i) => {
          d.text(d.fit(s.name, 9, half - 70, d.f.bold), x + 16, d.y - 32 - i * 15, 9, d.f.bold, GRAPHITE);
          d.right(`${s.delta! > 0 ? "+" : ""}${s.delta}`, x + half - 14, d.y - 32 - i * 15, 9, d.f.bold, color);
        });
        if (!list.length) d.text("Nenhuma variação.", x + 16, d.y - 32, 9, d.f.regular, MUTED);
        return h;
      };
      d.ensure(120);
      const h1 = box(MX, "Ganharam peso", GREEN, up);
      const h2 = box(MX + half + 12, "Perderam peso", RED, down);
      d.y -= Math.max(h1, h2) + 16;
    }
    if (comparison.topicDataBoth) {
      const novos = comparison.topics.filter((t) => t.presence === "so_recente").slice(0, 14);
      if (novos.length) { chartTitle(d, `Assuntos que apareceram só em ${comparison.recent.year}`, "Não estavam na prova anterior: merecem atenção."); chipsList(d, novos.map((t) => t.title)); }
    } else note(d, "Os assuntos de uma das provas ainda não foram classificados: a comparação por assunto fica indisponível.", { size: 8, color: FAINT });
  }

  // ---- 04 Mapa de calor
  {
    const levels: Heat[] = ["muito_alta", "alta", "moderada", "baixa"];
    const counts = levels.map((h) => heat.cells.filter((c) => c.heat === h).length);
    const topCells = heat.cells.slice(0, 3);
    const insight = heat.cells.length ? `${counts[0]} ${counts[0] === 1 ? "assunto tem" : "assuntos têm"} incidência muito alta e ${counts[1]} alta. Os mais cobrados: ${topCells.map((c) => c.title).join("; ")}.` : null;
    if (heat.cells.length) bullets.push({ k: "Assuntos mais cobrados", t: topCells.map((c) => `${c.title} (${num(c.meanShare)}%)`).join(" · ") });
    sectionPage(d, toc, 4, "Mapa de calor de assuntos", "Quais assuntos mais caem, prova a prova?", insight);
    if (!heat.cells.length) {
      note(d, "Assuntos ainda não classificados para este concurso.");
    } else {
      kpis(d, levels.map((h, i) => ({ v: String(counts[i]), l: `${HEAT_LABEL[h]}` })));
      const tot = counts.reduce((a, b) => a + b, 0) || 1;
      chartTitle(d, "Distribuição dos assuntos por incidência");
      d.ensure(30);
      let sx = MX;
      levels.forEach((h, i) => { const w = (counts[i]! / tot) * CW; if (w > 0) { d.rect(sx, d.y - 14, w, 14, HEAT_COLOR[h], { border: WHITE, bw: 1 }); if (w > 22) d.center(String(counts[i]), sx + w / 2, d.y - 10, 8, d.f.bold, h === "moderada" ? INK : WHITE); sx += w; } });
      d.y -= 30;
      legend(d, levels.map((h) => ({ label: `${HEAT_LABEL[h]}${h === "muito_alta" ? ` (>= ${heat.criteria.muitoAlta}%)` : h === "alta" ? ` (>= ${heat.criteria.alta}%)` : h === "moderada" ? ` (>= ${heat.criteria.moderada}%)` : ""}`, color: HEAT_COLOR[h] })));
      note(d, `Como ler: cada linha é um assunto; cada coluna, uma prova. O número é a quantidade de questões e a cor mostra o peso dele naquela prova (mais vermelho, mais peso). "Média" é a participação média no total de questões. Com menos de ${heat.criteria.minEditions} provas, nada é classificado.`, { size: 8 });

      const years = [...heat.cells[0]!.byEdition.map((b) => b.year)].sort((a, b) => a - b).slice(-6);
      const den = new Map(data.incidence.map((i) => [i.year, i.denominator]));
      const bySubject = new Map<string, typeof heat.cells>();
      for (const c of heat.cells) bySubject.set(c.subject, [...(bySubject.get(c.subject) ?? []), c]);
      const subjects = [...bySubject].sort((a, b) => b[1].reduce((n, c) => n + c.questions, 0) - a[1].reduce((n, c) => n + c.questions, 0));
      const nameW = CW - 62 - years.length * 38 - 74;
      const peak = Math.max(1, ...heat.cells.flatMap((c) => c.byEdition.map((b) => ((b.questions ?? 0) / (den.get(b.year) || 1)) * 100)));
      for (const [subject, cells] of subjects) {
        const shown = cells.slice(0, 15);
        d.ensure(100);
        const q = cells.reduce((n, c) => n + c.questions, 0);
        d.card(MX, d.y - 24, CW, 24, INK, 7);
        d.rect(MX, d.y - 24, 5, 24, RED);
        d.text(d.fit(subject.toUpperCase(), 9.5, CW - 170, d.f.bold), MX + 16, d.y - 15.5, 9.5, d.f.bold, WHITE);
        d.right(`${cells.length} ${cells.length === 1 ? "assunto" : "assuntos"} · ${q} questões`, W - MX - 12, d.y - 15, 8, d.f.bold, rgb(0.78, 0.78, 0.82));
        d.y -= 30;
        // cabeçalho das colunas
        d.text("ASSUNTO", MX + 4, d.y - 8, 6.5, d.f.bold, FAINT);
        years.forEach((yr, i) => d.center(String(yr), MX + nameW + 62 + i * 38 + 17, d.y - 8, 7.5, d.f.bold, MUTED));
        d.right("MÉDIA", W - MX - 4, d.y - 8, 6.5, d.f.bold, FAINT);
        d.y -= 26;
        for (const c of shown) {
          d.ensure(22);
          const y = d.y;
          d.card(MX, y - 3, 6, 18, HEAT_COLOR[c.heat], 3);
          d.text(d.fit(c.title, 8.5, nameW - 8, d.f.bold), MX + 14, y + 3, 8.5, d.f.bold, GRAPHITE);
          const pr = `${c.editionsPresent}/${c.editionsWithData}`;
          d.text(pr, MX + nameW + 12, y + 3, 7.5, d.f.regular, MUTED);
          years.forEach((yr, i) => {
            const cell = c.byEdition.find((b) => b.year === yr);
            const qn = cell?.questions ?? null;
            const share = qn === null ? 0 : (qn / (den.get(yr) || 1)) * 100;
            const x = MX + nameW + 62 + i * 38;
            d.card(x, y - 3, 34, 18, qn === null ? SOFT : heatCell(share / peak), 4);
            d.center(qn === null ? "-" : String(qn), x + 17, y + 3, 8.5, d.f.bold, qn === null ? FAINT : share / peak > 0.55 ? WHITE : INK);
          });
          d.right(`${num(c.meanShare)}%`, W - MX - 4, y + 3, 9, d.f.bold, INK);
          d.y -= 22;
        }
        if (cells.length > shown.length) { d.text(`+ ${cells.length - shown.length} assuntos de menor incidência nesta disciplina`, MX + 14, d.y - 8, 7.5, d.f.italic, FAINT); d.y -= 14; }
        d.y -= 10;
      }
    }
  }

  // ---- 05 Direcionamento
  {
    const rec = exam.recommendations.filter((r) => r.priority === "maxima");
    const insight = rec.length ? `Prioridade máxima: ${rec.slice(0, 3).map((r) => r.topic).join("; ")}. Estude estes primeiro, sem abandonar o resto do edital.` : heat.cells.length ? `Comece pelos assuntos de maior incidência: ${heat.cells.slice(0, 3).map((c) => c.title).join("; ")}. Estude o restante do edital em seguida.` : null;
    sectionPage(d, toc, 5, "Direcionamento estratégico", "Por onde começar e no que concentrar a preparação?", insight);
    if (heat.cells.length) {
      chartTitle(d, "Comece por aqui: os 10 assuntos mais cobrados", "Ordenados pela participação média no total de questões. Cada um traz em quantas provas apareceu.");
      const top10 = heat.cells.slice(0, 10);
      const mx = Math.max(1, top10[0]!.meanShare);
      top10.forEach((c, i) => {
        d.ensure(30);
        const y = d.y;
        d.card(MX, y - 22, 24, 22, i < 3 ? RED : INK, 6);
        d.center(String(i + 1), MX + 12, y - 15, 11, d.f.bold, WHITE);
        d.text(d.fit(c.title, 9.5, 270, d.f.bold), MX + 34, y - 9, 9.5, d.f.bold, INK);
        d.text(d.fit(`${c.subject} · ${c.editionsPresent} de ${c.editionsWithData} provas · ${c.questions} ${c.questions === 1 ? "questão" : "questões"}`, 7.5, 270), MX + 34, y - 19, 7.5, d.f.regular, MUTED);
        d.card(MX + 318, y - 14, 140, 8, SOFT, 4);
        d.card(MX + 318, y - 14, Math.max(8, (c.meanShare / mx) * 140), 8, HEAT_COLOR[c.heat], 4);
        d.right(`${num(c.meanShare)}%`, W - MX, y - 14, 9.5, d.f.bold, INK);
        d.y -= 29;
      });
      d.y -= 8;
    }
    if (!exam.recommendations.length) {
      note(d, "Recomendações da equipe APROVUM ainda não cadastradas para este concurso. Siga o conteúdo programático do edital por completo.");
    } else {
      chartTitle(d, "Recomendações da equipe APROVUM");
      const col: Record<string, RGB> = { maxima: RED, alta: AMBER, complementar: rgb(0.5, 0.5, 0.55) };
      for (const p of ["maxima", "alta", "complementar"] as const) {
        const list = exam.recommendations.filter((r) => r.priority === p);
        if (!list.length) continue;
        d.ensure(44);
        chip(d, PRIO[p], MX, d.y - 8, col[p]!);
        d.y -= 20;
        for (const r of list) {
          const hl = d.wrap(`${r.subject ? `${r.subject} - ` : ""}${r.topic}`, 9.5, CW - 30, d.f.bold, 2);
          const bl = d.wrap(r.justification, 8.5, CW - 30, d.f.regular, 5);
          const h = 16 + hl.length * 12.5 + bl.length * 11.5 + 8;
          d.ensure(h + 6);
          d.card(MX, d.y - h, CW, h, SOFT, 9);
          d.rect(MX, d.y - h + 8, 3.5, h - 16, col[p]!);
          let y = d.y - 19;
          for (const l of hl) { d.text(l, MX + 16, y, 9.5, d.f.bold, INK); y -= 12.5; }
          for (const l of bl) { d.text(l, MX + 16, y, 8.5, d.f.regular, MUTED); y -= 11.5; }
          d.y -= h + 6;
        }
        d.y -= 6;
      }
      note(d, "Os demais conteúdos do edital continuam fazendo parte da sua preparação (prioridade complementar).", { size: 8.5 });
    }
    const recurrent = heat.cells.filter((c) => heat.editionsWithData >= 2 && c.editionsPresent === heat.editionsWithData);
    if (recurrent.length) {
      chartTitle(d, "Assuntos recorrentes", "Apareceram em todas as provas catalogadas.");
      chipsList(d, recurrent.slice(0, 30).map((c) => c.title));
    }
  }

  // ---- 06 Fontes
  {
    sectionPage(d, toc, 6, "Fontes e confiabilidade", "De onde vêm os dados e o que eles não garantem?", null);
    if (exam.limitations) {
      const ll = d.wrap(exam.limitations, 9, CW - 32, d.f.regular, 14);
      const h = 30 + ll.length * 12;
      d.ensure(h + 8);
      d.card(MX, d.y - h, CW, h, RED_SOFT, 9);
      d.rect(MX, d.y - h + 8, 3.5, h - 16, RED);
      d.spaced("LIMITAÇÕES DA ANÁLISE", MX + 16, d.y - 17, 7, d.f.bold, RED, 1.2);
      ll.forEach((l, i) => d.text(l, MX + 16, d.y - 31 - i * 12, 9, d.f.regular, GRAPHITE));
      d.y -= h + 14;
    }
    chartTitle(d, "Fontes consultadas");
    if (!exam.sources.length) note(d, "Nenhuma fonte cadastrada.");
    for (const s of exam.sources) {
      const kind = s.kind === "oficial" ? "Dado oficial" : s.kind === "extraido" ? "Extraído das provas" : "Análise própria";
      const meta = [s.page ? `p. ${s.page}` : null, s.organ, s.publishedAt ? `publicado em ${dateBr(s.publishedAt)}` : null, s.consultedAt ? `consultado em ${dateBr(s.consultedAt)}` : null, s.reviewer ? `conferido por ${s.reviewer}` : null].filter(Boolean).join(" · ");
      const ml = d.wrap(`${s.name}${meta ? ` - ${meta}` : ""}`, 8.5, CW - 110, d.f.regular, 3);
      const h = Math.max(22, ml.length * 11 + 10);
      d.ensure(h + 4);
      chip(d, kind, MX, d.y - 8, s.kind === "oficial" ? GREEN : GRAPHITE);
      ml.forEach((l, i) => d.text(l, MX + 104, d.y - 9 - i * 11, 8.5, d.f.regular, GRAPHITE));
      d.line(MX, d.y - h, W - MX, d.y - h, LINE, 0.35);
      d.y -= h + 4;
    }
    d.y -= 10;
    d.ensure(46);
    d.card(MX, d.y - 42, CW, 42, INK, 10);
    d.rect(MX, d.y - 34, 3.5, 26, RED);
    d.text("Histórico não garante o que cairá na próxima prova.", MX + 16, d.y - 18, 9.5, d.f.bold, WHITE);
    d.text("Use este Raio-X para priorizar, nunca para abandonar conteúdo do edital.", MX + 16, d.y - 32, 8.5, d.f.regular, rgb(0.78, 0.78, 0.82));
  }

  if (opts.syllabus?.some((x) => x.topics.length)) syllabusSection(d, toc, 7, opts.syllabus);

  {
    const sy = opts.syllabus?.filter((x) => x.topics.length) ?? [];
    const disciplines = agg.rows.length ? agg.rows.map((r) => ({ name: r.name, pct: r.pct })) : sy.map((x) => ({ name: x.name, pct: 100 / sy.length }));
    if (disciplines.length) {
      const latest = [...exam.cutoffs].sort((a, b) => b.editionYear - a.editionYear)[0];
      const lastPct = latest?.maxScore ? (latest.score / latest.maxScore) * 100 : series && series.unit === "%" ? series.points[series.points.length - 1]!.value : null;
      const plano = buildPlano({
        disciplines, lastCutPct: lastPct, projectedCutPct: proj && series?.unit === "%" ? proj.value : null,
        targets: exam.recommendations.slice(0, 6).map((r) => ({ subject: r.subject ?? null, topic: r.topic, priority: PRIO[r.priority as keyof typeof PRIO] ?? String(r.priority), why: r.justification ?? "" })),
      });
      planoSection(d, toc, opts.syllabus?.some((x) => x.topics.length) ? 8 : 7, plano);
    }
  }

  // ---- Página 2: índice + resumo executivo + como ler
  {
    d.page = summaryPage;
    d.y = H - TOP;
    d.spaced("RESUMO EXECUTIVO", MX, d.y - 10, 9, d.f.bold, RED, 2.4);
    d.rect(MX, d.y - 18, 46, 2.4, RED);
    d.text("Em 1 minuto", MX, d.y - 44, 22, d.f.bold, INK);
    d.y -= 62;
    if (!bullets.length) note(d, "Ainda não há dados catalogados suficientes para um resumo.");
    bullets.forEach((b, i) => {
      const lines = d.wrap(b.t, 9.5, CW - 56, d.f.regular, 3);
      const h = Math.max(40, 22 + lines.length * 12.5);
      d.card(MX, d.y - h, CW, h, SOFT, 10);
      d.card(MX + 10, d.y - h / 2 - 12, 24, 24, i === 0 ? RED : INK, 7);
      d.center(String(i + 1), MX + 22, d.y - h / 2 - 4, 11, d.f.bold, WHITE);
      d.spaced(b.k.toUpperCase(), MX + 46, d.y - 14, 6.5, d.f.bold, RED, 1.1);
      lines.forEach((l, k) => d.text(l, MX + 46, d.y - 27 - k * 12.5, 9.5, d.f.regular, INK));
      d.y -= h + 8;
    });
    d.y -= 14;
    d.spaced("ÍNDICE", MX, d.y - 10, 9, d.f.bold, RED, 2.4);
    d.rect(MX, d.y - 18, 46, 2.4, RED);
    d.y -= 34;
    for (const t of toc) {
      d.card(MX, d.y - 30, CW, 30, WHITE, 8, LINE);
      d.card(MX + 6, d.y - 24, 18, 18, RED, 5);
      d.center(String(t.n), MX + 15, d.y - 19, 9, d.f.bold, WHITE);
      d.text(t.title, MX + 34, d.y - 13, 9.5, d.f.bold, INK);
      d.text(d.fit(t.what, 8, CW - 110), MX + 34, d.y - 24, 8, d.f.regular, MUTED);
      d.right(`pág. ${t.page}`, W - MX - 12, d.y - 18, 9, d.f.bold, RED);
      d.y -= 36;
    }
    d.y -= 8;
    d.spaced("COMO LER AS CORES", MX, d.y - 10, 9, d.f.bold, RED, 2.4);
    d.y -= 28;
    legend(d, (["muito_alta", "alta", "moderada", "baixa"] as Heat[]).map((h) => ({ label: HEAT_LABEL[h], color: HEAT_COLOR[h] })));
    d.page = summaryPage;
    note(d, "Vermelho forte = assunto que mais cai. Cinza = cai pouco. Estude primeiro o vermelho, mas não abandone o cinza: o edital inteiro continua valendo.", { size: 8.5 });
  }

  drawChrome(d, logo, exam.name);
  return d.pdf.save();
}
