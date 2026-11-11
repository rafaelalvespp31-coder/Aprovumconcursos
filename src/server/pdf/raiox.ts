/**
 * PDF do Raio-X do edital, com a identidade APROVUM (preto, vermelho e branco) e gráficos
 * desenhados em vetor (linha, rosca, barras, mapa de calor). pdf-lib com fontes padrão e logos
 * embutidas: nada lido do disco, funciona em ambiente serverless.
 * Só usa dados reais catalogados (os mesmos da tela); nada é inventado.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
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
const PALETTE = [RED, GRAPHITE, AMBER, rgb(0.5, 0.5, 0.55), RED_DARK, rgb(0.93, 0.55, 0.5), rgb(0.75, 0.75, 0.78)];

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
    this.y = H - TOP;
  }
  ensure(h: number) {
    if (this.y - h < BOTTOM) this.newPage();
  }
}

// ---------------------------------------------------------------------------
// Componentes

function sectionHeader(d: Doc, n: number, title: string, sub: string) {
  d.ensure(64);
  const y = d.y;
  d.card(MX, y - 30, 30, 30, RED, 7);
  d.center(String(n).padStart(2, "0"), MX + 15, y - 20, 12, d.f.bold, WHITE);
  d.spaced(title.toUpperCase(), MX + 42, y - 13, 11.5, d.f.bold, INK, 1.1);
  d.text(d.fit(sub, 8.5, CW - 44), MX + 42, y - 26, 8.5, d.f.regular, MUTED);
  d.line(MX, y - 38, W - MX, y - 38, LINE, 0.7);
  d.rect(MX, y - 39, 46, 2, RED);
  d.y = y - 54;
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

function subTitle(d: Doc, s: string) {
  d.ensure(24);
  d.rect(MX, d.y - 11, 3, 11, RED);
  d.text(s.toUpperCase(), MX + 9, d.y - 9, 8.5, d.f.bold, INK);
  d.y -= 20;
}

function kpis(d: Doc, items: Array<{ v: string; l: string; hint?: string }>) {
  const gap = 10;
  const w = (CW - gap * (items.length - 1)) / items.length;
  const h = 62;
  d.ensure(h + 8);
  items.forEach((it, i) => {
    const x = MX + i * (w + gap);
    d.card(x, d.y - h, w, h, i === 0 ? INK : SOFT, 9);
    d.rect(x + 12, d.y - 8, 18, 2.2, RED);
    d.text(it.v, x + 12, d.y - 38, 21, d.f.bold, i === 0 ? WHITE : INK);
    d.text(d.fit(it.l.toUpperCase(), 6.5, w - 20, d.f.bold), x + 12, d.y - 51, 6.5, d.f.bold, i === 0 ? rgb(0.75, 0.75, 0.78) : MUTED);
  });
  d.y -= h + 16;
}

/** Barras horizontais com rótulo e valor. */
function hBars(d: Doc, rows: Array<{ label: string; value: number; right: string; color?: RGB }>, o: { labelW?: number; barH?: number; max?: number } = {}) {
  const labelW = o.labelW ?? 150;
  const barH = o.barH ?? 11;
  const max = o.max ?? Math.max(1, ...rows.map((r) => r.value));
  const trackW = CW - labelW - 64;
  for (const r of rows) {
    d.ensure(barH + 9);
    const y = d.y - barH;
    d.text(d.fit(r.label, 8.5, labelW - 8, d.f.bold), MX, y + 2.5, 8.5, d.f.bold, GRAPHITE);
    d.card(MX + labelW, y, trackW, barH, SOFT, barH / 2);
    const bw = Math.max(barH, (r.value / max) * trackW);
    if (r.value > 0) d.card(MX + labelW, y, bw, barH, r.color ?? RED, barH / 2);
    d.right(r.right, W - MX, y + 2.5, 8.5, d.f.bold, INK);
    d.y -= barH + 8;
  }
  d.y -= 4;
}

/** Gráfico de rosca (polígonos) com legenda ao lado. */
function donut(d: Doc, parts: Array<{ label: string; value: number; color: RGB }>, centerBig: string, centerSmall: string, size = 118) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (total <= 0) return;
  const need = size + 18;
  d.ensure(need);
  const cx = MX + size / 2 + 6;
  const cy = d.y - size / 2 - 4;
  const R = size / 2;
  const r = R * 0.62;
  let a0 = -Math.PI / 2;
  for (const p of parts) {
    if (p.value <= 0) continue;
    const a1 = a0 + (p.value / total) * Math.PI * 2;
    const steps = Math.max(2, Math.ceil(((a1 - a0) / (Math.PI * 2)) * 90));
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) { const a = a0 + ((a1 - a0) * i) / steps; pts.push(`${(R * Math.cos(a)).toFixed(2)} ${(R * Math.sin(a)).toFixed(2)}`); }
    for (let i = steps; i >= 0; i--) { const a = a0 + ((a1 - a0) * i) / steps; pts.push(`${(r * Math.cos(a)).toFixed(2)} ${(r * Math.sin(a)).toFixed(2)}`); }
    d.page.drawSvgPath(`M ${pts.join(" L ")} Z`, { x: cx, y: cy, color: p.color, borderColor: WHITE, borderWidth: 1.2 });
    a0 = a1;
  }
  d.center(centerBig, cx, cy - 2, 17, d.f.bold, INK);
  d.center(centerSmall.toUpperCase(), cx, cy - 13, 6, d.f.bold, MUTED);
  const lx = MX + size + 34;
  const lw = W - MX - lx;
  let ly = d.y - 12;
  const step = Math.min(19, (size - 6) / Math.max(1, parts.length));
  for (const p of parts) {
    d.card(lx, ly - 7, 9, 9, p.color, 2.5);
    d.text(d.fit(p.label, 8.5, lw - 52, d.f.bold), lx + 15, ly - 5, 8.5, d.f.bold, GRAPHITE);
    d.right(`${num((p.value / total) * 100)}%`, lx + lw, ly - 5, 8.5, d.f.bold, INK);
    ly -= step;
  }
  d.y -= need;
}

/** Gráfico de linha com área, rótulos e projeção tracejada. */
function lineChart(d: Doc, pts: Array<{ x: number; y: number; label: string }>, o: { unit: string; projection?: { x: number; y: number; label: string } | null; lo?: number; hi?: number }) {
  const h = 176;
  d.ensure(h + 24);
  const padL = 38, padR = 16, padT = 16, padB = 26;
  const x0 = MX + padL, x1 = W - MX - padR;
  const yTop = d.y - padT, yBot = d.y - h + padB;
  const all = [...pts, ...(o.projection ? [o.projection] : [])];
  const vals = all.map((p) => p.y);
  const lo = o.lo ?? Math.min(...vals), hi = o.hi ?? Math.max(...vals);
  const pad = (hi - lo) * 0.18 || 5;
  const sc = niceScale(Math.max(0, lo - pad), hi + pad, 4);
  d.card(MX, d.y - h, CW, h, WHITE, 10, LINE);
  const yOf = (v: number) => yBot + ((v - sc.min) / (sc.max - sc.min)) * (yTop - yBot);
  for (const t of sc.ticks) {
    const y = yOf(t);
    d.line(x0, y, x1, y, LINE, 0.5, t === sc.min ? undefined : [2, 3]);
    d.right(`${num(t, 0)}${o.unit === "%" ? "%" : ""}`, x0 - 6, y - 2.5, 7, d.f.regular, FAINT);
  }
  const n = all.length;
  const xOf = (i: number) => (n === 1 ? (x0 + x1) / 2 : x0 + 14 + ((x1 - x0 - 28) * i) / (n - 1));
  // área
  if (pts.length >= 2) {
    const area = pts.map((p, i) => `${(xOf(i) - x0).toFixed(2)} ${(-(yOf(p.y) - yBot)).toFixed(2)}`);
    d.page.drawSvgPath(`M ${(xOf(0) - x0).toFixed(2)} 0 L ${area.join(" L ")} L ${(xOf(pts.length - 1) - x0).toFixed(2)} 0 Z`, { x: x0, y: yBot, color: RED, opacity: 0.1 });
  }
  for (let i = 1; i < pts.length; i++) d.line(xOf(i - 1), yOf(pts[i - 1]!.y), xOf(i), yOf(pts[i]!.y), RED, 2.2);
  if (o.projection) d.line(xOf(pts.length - 1), yOf(pts[pts.length - 1]!.y), xOf(pts.length), yOf(o.projection.y), RED, 1.6, [4, 3]);
  all.forEach((p, i) => {
    const proj = i >= pts.length;
    const x = xOf(i), y = yOf(p.y);
    d.page.drawCircle({ x, y, size: proj ? 4 : 4.2, color: proj ? WHITE : RED, borderColor: RED, borderWidth: proj ? 1.6 : 1.6 });
    if (!proj) d.page.drawCircle({ x, y, size: 1.6, color: WHITE });
    d.center(p.label, x, y + 8, 8, d.f.bold, proj ? RED : INK);
    d.center(String(Math.round(p.x)) + (proj ? "*" : ""), x, yBot - 15, 7.5, d.f.bold, proj ? RED : MUTED);
  });
  d.y -= h + 10;
}

/** Barras agrupadas (anterior x recente). */
function groupedBars(d: Doc, rows: Array<{ name: string; a: number | null; b: number | null }>, la: string, lb: string) {
  const rowH = 27;
  const labelW = 150;
  const trackW = CW - labelW - 40;
  const max = Math.max(1, ...rows.flatMap((r) => [r.a ?? 0, r.b ?? 0]));
  d.ensure(22);
  d.card(MX + labelW, d.y - 9, 9, 9, rgb(0.62, 0.62, 0.66), 2.5);
  d.text(la, MX + labelW + 14, d.y - 7, 8, d.f.bold, MUTED);
  d.card(MX + labelW + 14 + d.w(la, 8, d.f.bold) + 16, d.y - 9, 9, 9, RED, 2.5);
  d.text(lb, MX + labelW + 14 + d.w(la, 8, d.f.bold) + 30, d.y - 7, 8, d.f.bold, MUTED);
  d.y -= 20;
  for (const r of rows) {
    d.ensure(rowH + 4);
    const y = d.y;
    d.text(d.fit(r.name, 8.5, labelW - 8, d.f.bold), MX, y - 16, 8.5, d.f.bold, GRAPHITE);
    const bar = (v: number | null, dy: number, color: RGB) => {
      const bw = v === null ? 0 : Math.max(v > 0 ? 4 : 0, (v / max) * trackW);
      if (bw > 0) d.card(MX + labelW, y - dy - 8, bw, 8, color, 3);
      d.text(v === null ? "-" : String(v), MX + labelW + bw + 5, y - dy - 6.5, 7.5, d.f.bold, v === null ? FAINT : INK);
    };
    bar(r.a, 3, rgb(0.62, 0.62, 0.66));
    bar(r.b, 13, RED);
    d.line(MX, y - rowH + 1, W - MX, y - rowH + 1, LINE, 0.4);
    d.y -= rowH;
  }
  d.y -= 6;
}

function chip(d: Doc, s: string, x: number, y: number, color: RGB, fg: RGB = WHITE) {
  const w = d.w(s.toUpperCase(), 6, d.f.bold) + 12;
  d.card(x, y - 3, w, 12, color, 6);
  d.text(s.toUpperCase(), x + 6, y + 0.5, 6, d.f.bold, fg);
  return w;
}

function table(d: Doc, head: string[], widths: number[], rows: string[][], o: { boldCol?: number } = {}) {
  const rh = 18;
  const drawHead = () => {
    d.ensure(rh * 2);
    d.card(MX, d.y - rh, CW, rh, INK, 5);
    let x = MX + 8;
    head.forEach((h, i) => { d.text(h.toUpperCase(), x, d.y - 12, 6.5, d.f.bold, WHITE); x += widths[i]! * CW; });
    d.y -= rh;
  };
  drawHead();
  rows.forEach((r, ri) => {
    if (d.y - rh < BOTTOM) { d.newPage(); drawHead(); }
    if (ri % 2 === 1) d.rect(MX, d.y - rh, CW, rh, SOFT);
    let x = MX + 8;
    r.forEach((c, i) => {
      const bold = o.boldCol === i;
      d.text(d.fit(c, 8, widths[i]! * CW - 12, bold ? d.f.bold : d.f.regular), x, d.y - 12, 8, bold ? d.f.bold : d.f.regular, bold ? RED : GRAPHITE);
      x += widths[i]! * CW;
    });
    d.y -= rh;
  });
  d.y -= 10;
}

// ---------------------------------------------------------------------------
// Moldura (cabeçalho e rodapé) e capa

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
  const heat = data.heat;
  const items = [
    { v: String(ex.editions.length), l: "Provas analisadas" },
    { v: String(ex.cutoffs.length), l: "Notas de corte" },
    { v: String(heat.cells.length), l: "Assuntos mapeados" },
    { v: edYears.length ? `${edYears[edYears.length - 1]}-${edYears[0]}` : "-", l: "Período" },
  ];
  const gap = 10, bw = (CW - gap * 3) / 4;
  items.forEach((it, i) => {
    const x = MX + i * (bw + gap);
    d.card(x, 70, bw, 50, rgb(0.08, 0.08, 0.1), 8, rgb(0.28, 0.08, 0.09));
    d.rect(x + 10, 112, 14, 2, RED);
    d.text(it.v, x + 10, 88, 16, d.f.bold, WHITE);
    d.text(it.l.toUpperCase(), x + 10, 77, 6, d.f.bold, rgb(0.7, 0.7, 0.74));
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
    d.text(d.fit(title, 8, 230), W - MX - d.w(d.fit(title, 8, 230), 8), H - 49, 8, d.f.regular, MUTED, p);
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

export async function renderRaioXPdf(data: RaioX, opts: { student?: string | null } = {}): Promise<Uint8Array> {
  const d = await Doc.create();
  const { exam, heat, comparison } = data;
  d.pdf.setTitle(`Raio-X do edital — ${exam.name} — APROVUM`);
  d.pdf.setAuthor("APROVUM");
  d.pdf.setProducer("APROVUM");
  const logo = await d.pdf.embedPng(b64(LOGO_ESCURA_PNG));

  await drawCover(d, data, opts.student ?? null);
  d.newPage();
  let sec = 0;

  // ---- 01 Notas de corte
  sectionHeader(d, ++sec, "Notas de corte", "Evolução da nota de referência ao longo das provas catalogadas.");
  const series = cutoffSeries(exam.cutoffs, "todas");
  if (!series || series.points.length === 0) {
    note(d, "Nenhuma nota de corte cadastrada para este concurso.");
  } else {
    const latest = [...exam.cutoffs].sort((a, b) => b.editionYear - a.editionYear)[0]!;
    kpis(d, [
      { v: `${num(latest.score)}${latest.maxScore ? ` / ${num(latest.maxScore, 0)}` : ""}`, l: "Última nota catalogada" },
      { v: String(latest.editionYear), l: "Ano de referência" },
      { v: String(series.points.length), l: "Provas na série" },
    ]);
    const proj = projectNext(series.points, series.unit === "%" ? 100 : undefined);
    subTitle(d, `${KIND[series.kind] ?? series.kind}${series.position ? ` · ${series.position}` : ""} (${series.unit === "%" ? "% do máximo" : "pontos"})`);
    lineChart(d, series.points.map((p) => ({ x: p.year, y: p.value, label: series.unit === "%" ? `${num(p.value)}%` : num(p.value) })), {
      unit: series.unit,
      projection: proj ? { x: proj.year, y: proj.value, label: `${num(proj.value)}${series.unit === "%" ? "%" : ""}` } : null,
    });
    if (proj) note(d, `* Projeção por tendência linear sobre ${series.points.length} provas (confiança ${proj.confidence}). É uma estimativa de apoio e nunca um resultado garantido.`, { size: 7.5, color: FAINT });
    note(d, "Tipos diferentes de nota de corte não são equivalentes: o gráfico mostra apenas o tipo e o cargo mais frequentes. A tabela abaixo traz todas as notas.", { size: 7.5, color: FAINT });
    const rows = [...exam.cutoffs].sort((a, b) => b.editionYear - a.editionYear).slice(0, 24).map((c) => [
      String(c.editionYear), `${KIND[c.kind] ?? c.kind}${c.stage ? ` · ${c.stage}` : ""}`, `${MODALITY[c.modality] ?? c.modality}${c.position ? ` · ${c.position}` : ""}`,
      `${num(c.score)}${c.maxScore ? ` / ${num(c.maxScore, 0)}` : ""}`, c.source?.name ? `${c.source.name}${c.sourcePage ? ` p. ${c.sourcePage}` : ""}` : "-",
    ]);
    table(d, ["Ano", "Tipo", "Modalidade", "Nota", "Fonte"], [0.09, 0.3, 0.27, 0.12, 0.22], rows, { boldCol: 3 });
  }

  // ---- 02 Incidência por disciplina
  d.ensure(150);
  sectionHeader(d, ++sec, "Incidência por disciplina", "Quantas questões cada disciplina costuma ter, somando as provas catalogadas.");
  const eds = data.incidence.map((i) => ({ year: i.year, board: i.board, denominator: i.denominator, rows: i.rows.map((r) => ({ name: r.name, questions: r.questions })) }));
  const agg = aggregateIncidence(eds, "todas");
  if (!agg.rows.length) {
    note(d, "Disciplinas ainda não cadastradas para este concurso.");
  } else {
    const top = agg.rows.slice(0, 6);
    const rest = agg.rows.slice(6).reduce((s, r) => s + r.questions, 0);
    const parts = top.map((r, i) => ({ label: r.name, value: r.questions, color: PALETTE[i % PALETTE.length]! }));
    if (rest > 0) parts.push({ label: `Outras (${agg.rows.length - 6})`, value: rest, color: PALETTE[6]! });
    donut(d, parts, String(agg.total), "questões");
    subTitle(d, `Todas as disciplinas · ${eds.length} ${eds.length === 1 ? "prova" : "provas"}`);
    hBars(d, agg.rows.slice(0, 18).map((r) => ({ label: r.name, value: r.questions, right: `${r.questions} · ${num(r.pct)}%` })));
    if (eds.length) {
      subTitle(d, "Provas catalogadas");
      table(d, ["Ano", "Banca", "Total de questões", "Regra de contagem"], [0.1, 0.3, 0.2, 0.4], data.incidence.map((i) => [String(i.year), i.board ?? "-", String(i.denominator), i.countingRule ?? "-"]));
    }
  }

  // ---- 03 Comparativo
  if (comparison) {
    d.ensure(120);
    sectionHeader(d, ++sec, "Comparativo entre as duas últimas provas", `${comparison.previous.year}${comparison.previous.board ? ` (${comparison.previous.board})` : ""} x ${comparison.recent.year}${comparison.recent.board ? ` (${comparison.recent.board})` : ""}. Questões por disciplina.`);
    groupedBars(d, comparison.subjects.slice(0, 16).map((s) => ({ name: s.name, a: s.previous, b: s.recent })), String(comparison.previous.year), String(comparison.recent.year));
    const up = comparison.subjects.filter((s) => s.delta !== null && s.delta > 0).sort((a, b) => b.delta! - a.delta!).slice(0, 4);
    const down = comparison.subjects.filter((s) => s.delta !== null && s.delta < 0).sort((a, b) => a.delta! - b.delta!).slice(0, 4);
    if (up.length || down.length) {
      d.ensure(70);
      const half = (CW - 12) / 2;
      const box = (x: number, title: string, color: RGB, list: typeof up, sign: string) => {
        const h = 16 + Math.max(1, list.length) * 14 + 8;
        d.card(x, d.y - h, half, h, SOFT, 9);
        d.rect(x, d.y - h + 8, 3, h - 16, color);
        d.text(title.toUpperCase(), x + 14, d.y - 14, 7, d.f.bold, color);
        list.forEach((s, i) => {
          d.text(d.fit(s.name, 8.5, half - 70, d.f.bold), x + 14, d.y - 29 - i * 14, 8.5, d.f.bold, GRAPHITE);
          d.right(`${s.delta! > 0 ? "+" : ""}${s.delta}`, x + half - 12, d.y - 29 - i * 14, 8.5, d.f.bold, color);
        });
        if (!list.length) d.text("Nenhuma variação.", x + 14, d.y - 29, 8.5, d.f.regular, MUTED);
        return h;
      };
      const h1 = box(MX, "Ganharam peso", GREEN, up, "+");
      const h2 = box(MX + half + 12, "Perderam peso", RED, down, "-");
      d.y -= Math.max(h1, h2) + 14;
    }
    if (comparison.topicDataBoth) {
      const novos = comparison.topics.filter((t) => t.presence === "so_recente").slice(0, 12);
      if (novos.length) {
        subTitle(d, `Assuntos que apareceram só em ${comparison.recent.year}`);
        chipsList(d, novos.map((t) => t.title));
      }
    }
  }

  // ---- 04 Mapa de calor
  d.ensure(160);
  sectionHeader(d, ++sec, "Mapa de calor de assuntos", "Participação média de cada assunto no total de questões das provas catalogadas.");
  if (!heat.cells.length) {
    note(d, "Assuntos ainda não classificados para este concurso.");
  } else {
    const levels: Heat[] = ["muito_alta", "alta", "moderada", "baixa"];
    const counts = levels.map((h) => heat.cells.filter((c) => c.heat === h).length);
    kpis(d, levels.map((h, i) => ({ v: String(counts[i]), l: HEAT_LABEL[h] })));
    // barra empilhada
    const tot = counts.reduce((a, b) => a + b, 0) || 1;
    d.ensure(34);
    let sx = MX;
    levels.forEach((h, i) => {
      const w = (counts[i]! / tot) * CW;
      if (w > 0) { d.rect(sx, d.y - 12, w, 12, HEAT_COLOR[h]); sx += w; }
    });
    d.y -= 26;
    note(d, `Critério: muito alta >= ${heat.criteria.muitoAlta}%, alta >= ${heat.criteria.alta}%, moderada >= ${heat.criteria.moderada}% do total de questões, em média, nas ${heat.editionsWithData} provas com assuntos catalogados. Com menos de ${heat.criteria.minEditions} provas, nada é classificado.`, { size: 7.5, color: FAINT });
    const bySubject = new Map<string, typeof heat.cells>();
    for (const c of heat.cells) bySubject.set(c.subject, [...(bySubject.get(c.subject) ?? []), c]);
    const subjects = [...bySubject].sort((a, b) => b[1].reduce((n, c) => n + c.questions, 0) - a[1].reduce((n, c) => n + c.questions, 0));
    const maxShare = Math.max(1, ...heat.cells.map((c) => c.meanShare));
    for (const [subject, cells] of subjects) {
      const shown = cells.slice(0, 12);
      d.ensure(52);
      const q = cells.reduce((n, c) => n + c.questions, 0);
      d.card(MX, d.y - 22, CW, 22, INK, 6);
      d.rect(MX, d.y - 22, 4, 22, RED);
      d.text(d.fit(subject.toUpperCase(), 9, CW - 160, d.f.bold), MX + 14, d.y - 14, 9, d.f.bold, WHITE);
      d.right(`${cells.length} ${cells.length === 1 ? "assunto" : "assuntos"} · ${q} questões`, W - MX - 10, d.y - 14, 7.5, d.f.bold, rgb(0.78, 0.78, 0.82));
      d.y -= 30;
      for (const c of shown) {
        d.ensure(21);
        const y = d.y;
        d.text(d.fit(c.title, 8.5, 232, d.f.bold), MX + 4, y - 11, 8.5, d.f.bold, GRAPHITE);
        const tx = MX + 246, tw = 130;
        d.card(tx, y - 11, tw, 8, SOFT, 4);
        d.card(tx, y - 11, Math.max(8, (c.meanShare / maxShare) * tw), 8, HEAT_COLOR[c.heat], 4);
        d.text(`${num(c.meanShare)}%`, tx + tw + 6, y - 10, 7.5, d.f.bold, INK);
        d.right(`${c.editionsPresent}/${c.editionsWithData} provas · ${c.questions}q`, W - MX - 4, y - 10, 7.5, d.f.regular, MUTED);
        d.line(MX, y - 17, W - MX, y - 17, LINE, 0.35);
        d.y -= 20;
      }
      if (cells.length > shown.length) { d.text(`+ ${cells.length - shown.length} assuntos de menor incidência nesta disciplina`, MX + 4, d.y - 9, 7.5, d.f.italic, FAINT); d.y -= 14; }
      d.y -= 8;
    }
  }

  // ---- 05 Direcionamento
  d.ensure(120);
  sectionHeader(d, ++sec, "Direcionamento estratégico", "Onde concentrar a preparação, sem abandonar o edital.");
  if (!exam.recommendations.length) {
    note(d, "Recomendações ainda não cadastradas para este concurso. Siga o conteúdo programático do edital por completo.");
  } else {
    const col: Record<string, RGB> = { maxima: RED, alta: AMBER, complementar: rgb(0.5, 0.5, 0.55) };
    for (const p of ["maxima", "alta", "complementar"] as const) {
      const list = exam.recommendations.filter((r) => r.priority === p);
      if (!list.length) continue;
      d.ensure(40);
      chip(d, PRIO[p], MX, d.y - 8, col[p]!);
      d.y -= 22;
      for (const r of list) {
        const head = `${r.subject ? `${r.subject} - ` : ""}${r.topic}`;
        const hl = d.wrap(head, 9, CW - 28, d.f.bold, 2);
        const bl = d.wrap(r.justification, 8.5, CW - 28, d.f.regular, 5);
        const h = 14 + hl.length * 12 + bl.length * 11.5 + 8;
        d.ensure(h + 6);
        d.card(MX, d.y - h, CW, h, SOFT, 8);
        d.rect(MX, d.y - h + 7, 3, h - 14, col[p]!);
        let y = d.y - 17;
        for (const l of hl) { d.text(l, MX + 14, y, 9, d.f.bold, INK); y -= 12; }
        for (const l of bl) { d.text(l, MX + 14, y, 8.5, d.f.regular, MUTED); y -= 11.5; }
        d.y -= h + 6;
      }
      d.y -= 4;
    }
    note(d, "Os demais conteúdos do edital continuam fazendo parte da sua preparação (prioridade complementar).", { size: 8 });
  }
  const recurrent = heat.cells.filter((c) => heat.editionsWithData >= 2 && c.editionsPresent === heat.editionsWithData);
  if (recurrent.length) {
    subTitle(d, "Assuntos recorrentes (em todas as provas catalogadas)");
    chipsList(d, recurrent.slice(0, 30).map((c) => c.title));
  }

  // ---- 06 Fontes
  d.ensure(110);
  sectionHeader(d, ++sec, "Fontes e confiabilidade", "De onde vêm os dados e o que eles não garantem.");
  if (exam.limitations) {
    const ll = d.wrap(exam.limitations, 8.5, CW - 28, d.f.regular, 14);
    const h = 26 + ll.length * 11.5;
    d.ensure(h + 8);
    d.card(MX, d.y - h, CW, h, RED_SOFT, 8);
    d.rect(MX, d.y - h + 7, 3, h - 14, RED);
    d.text("LIMITAÇÕES DA ANÁLISE", MX + 14, d.y - 16, 7, d.f.bold, RED);
    ll.forEach((l, i) => d.text(l, MX + 14, d.y - 29 - i * 11.5, 8.5, d.f.regular, GRAPHITE));
    d.y -= h + 12;
  }
  if (!exam.sources.length) note(d, "Nenhuma fonte cadastrada.");
  for (const s of exam.sources) {
    const kind = s.kind === "oficial" ? "Dado oficial" : s.kind === "extraido" ? "Extraído das provas" : "Análise própria";
    const meta = [s.page ? `p. ${s.page}` : null, s.organ, s.publishedAt ? `publicado em ${dateBr(s.publishedAt)}` : null, s.consultedAt ? `consultado em ${dateBr(s.consultedAt)}` : null, s.reviewer ? `conferido por ${s.reviewer}` : null].filter(Boolean).join(" · ");
    const ml = d.wrap(`${s.name}${meta ? ` - ${meta}` : ""}`, 8, CW - 96, d.f.regular, 3);
    const h = Math.max(20, ml.length * 10.5 + 10);
    d.ensure(h + 4);
    chip(d, kind, MX, d.y - 7, s.kind === "oficial" ? GREEN : GRAPHITE);
    ml.forEach((l, i) => d.text(l, MX + 92, d.y - 8 - i * 10.5, 8, d.f.regular, GRAPHITE));
    d.line(MX, d.y - h, W - MX, d.y - h, LINE, 0.35);
    d.y -= h + 4;
  }
  d.y -= 8;
  d.ensure(40);
  d.card(MX, d.y - 36, CW, 36, INK, 8);
  d.text("Histórico não garante o que cairá na próxima prova.", MX + 14, d.y - 15, 8.5, d.f.bold, WHITE);
  d.text("Use este Raio-X para priorizar, nunca para abandonar conteúdo do edital.", MX + 14, d.y - 27, 8, d.f.regular, rgb(0.78, 0.78, 0.82));

  drawChrome(d, logo, exam.name);
  return d.pdf.save();
}

/** Lista de assuntos em "pílulas" com quebra de linha. */
function chipsList(d: Doc, items: string[]) {
  let x = MX;
  d.ensure(24);
  let y = d.y;
  for (const it of items) {
    const label = d.fit(it, 8, 220, d.f.bold);
    const w = d.w(label, 8, d.f.bold) + 16;
    if (x + w > W - MX) { x = MX; y -= 20; if (y - 18 < BOTTOM) { d.newPage(); y = d.y; } }
    d.card(x, y - 16, w, 16, SOFT, 8, LINE);
    d.text(label, x + 8, y - 11.5, 8, d.f.bold, GRAPHITE);
    x += w + 6;
  }
  d.y = y - 28;
}
