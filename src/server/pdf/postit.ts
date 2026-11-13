/**
 * "Meu PDF de Revisão": os post-its ativos de uma aula, na ordem da aula, com a identidade do
 * APROVUM. Nada é resumido nem reescrito — o trecho e a anotação saem exatamente como o aluno
 * guardou (acentos preservados). Entrada: o retrato congelado; saída: bytes do PDF.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { LOGO_ESCURA_PNG } from "./logos";
import { parseExplanation } from "@/domain/study/explanation-format";
import type { PostitPdfSnapshot } from "./postit-types";

const A4: [number, number] = [595.28, 841.89];
const M = { top: 112, bottom: 70, left: 54, right: 54 };
const INK = rgb(0.04, 0.04, 0.04);
const MUTED = rgb(0.36, 0.36, 0.38);
const FAINT = rgb(0.55, 0.55, 0.57);
const RED = rgb(0.882, 0.024, 0);
const LINE = rgb(0.85, 0.85, 0.86);
const SOFT = rgb(0.965, 0.965, 0.97);
const WHITE = rgb(1, 1, 1);
const NOTE_BG = rgb(1, 0.965, 0.72);
const EXPL_BG = RED;
const EXPL_BAR = rgb(0.42, 0, 0);
const NOTE_LINE = rgb(0.92, 0.82, 0.3);

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

export async function renderPostitPdf(s: PostitPdfSnapshot, meta: { pdfVersion: number }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Meu PDF de Revisão — ${s.lesson.title}`);
  doc.setAuthor("APROVUM");
  doc.setCreator("APROVUM");
  doc.setProducer("APROVUM");
  doc.setCreationDate(new Date(s.generatedAt));
  doc.setLanguage("pt-BR");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique);
  const boldItalic = await doc.embedFont(StandardFonts.HelveticaBoldOblique);
  const logo = await doc.embedPng(b64(LOGO_ESCURA_PNG));
  const charset = new Set(regular.getCharacterSet());
  const [W, H] = A4;
  const innerW = W - M.left - M.right;

  /** Mantém o texto como está; só troca o que a fonte padrão não consegue desenhar. */
  const clean = (t: string) =>
    [...t.normalize("NFC").replace(/[→⇒]/g, "->").replace(/[←⇐]/g, "<-").replace(/≥/g, ">=").replace(/≤/g, "<=").replace(/≠/g, "!=").replace(/[−‐‑]/g, "-").replace(/ /g, " ")]
      .map((ch) => (ch === "\n" || charset.has(ch.codePointAt(0)!) ? ch : "?"))
      .join("");

  let page: PDFPage = doc.addPage(A4);
  let y = H - M.top;
  const newPage = () => { page = doc.addPage(A4); y = H - M.top; };

  // Título da revisão
  const title = (t: string, size: number, font: PDFFont, color = INK, gap = 4) => {
    for (const l of wrap(font, clean(t), size, innerW)) {
      page.drawText(l, { x: M.left, y: y - size, size, font, color });
      y -= size + 3;
    }
    y -= gap;
  };
  page.drawText("MEU PDF DE REVISÃO", { x: M.left, y: y - 8, size: 8, font: bold, color: RED });
  y -= 22;
  title(s.lesson.title, 18, bold, INK, 6);
  const metaLines: Array<[string, string]> = [];
  if (s.lesson.subject) metaLines.push(["Matéria", s.lesson.subject]);
  metaLines.push(["Aula", s.lesson.title]);
  if (s.student.name) metaLines.push(["Aluno(a)", s.student.name]);
  metaLines.push(["Data", fmtDate(s.generatedAt)]);
  metaLines.push(["Versão", `v${meta.pdfVersion} · ${s.items.length} post-it${s.items.length === 1 ? "" : "s"}`]);
  for (const [k, v] of metaLines) {
    page.drawText(clean(k.toUpperCase()), { x: M.left, y: y - 8, size: 6.5, font: bold, color: FAINT });
    const lines = wrap(regular, clean(v), 9.5, innerW - 70);
    lines.forEach((l, i) => page.drawText(l, { x: M.left + 70, y: y - 9 - i * 12, size: 9.5, font: regular, color: INK }));
    y -= Math.max(1, lines.length) * 12 + 3;
  }
  y -= 8;
  page.drawLine({ start: { x: M.left, y }, end: { x: W - M.right, y }, thickness: 0.6, color: LINE });
  y -= 18;

  const QS = 10.5, NS = 9.5, LH = 1.38;
  for (const it of s.items) {
    const quoteLines = wrap(regular, clean(it.quote), QS, innerW - 40);
    const noteLines = it.note ? wrap(italic, clean(it.note), NS, innerW - 52) : [];
    const sec = it.sectionTitle ? clean(it.sectionTitle) : "";
    // Blocos longos continuam na página seguinte: desenha linha a linha com checagem de espaço.
    const headH = 18;
    if (y - headH - 30 < M.bottom) newPage();
    // Número + seção
    page.drawRectangle({ x: M.left, y: y - 16, width: 20, height: 16, color: RED });
    const ns = String(it.n);
    page.drawText(ns, { x: M.left + 10 - bold.widthOfTextAtSize(ns, 8.5) / 2, y: y - 12, size: 8.5, font: bold, color: WHITE });
    if (sec) {
      let secT = sec;
      while (bold.widthOfTextAtSize(secT, 7.5) > innerW - 34 && secT.length > 4) secT = secT.slice(0, -2);
      if (secT !== sec) secT = secT.trimEnd() + "…";
      page.drawText(secT.toUpperCase().length === secT.length ? secT : secT, { x: M.left + 28, y: y - 12, size: 7.5, font: bold, color: MUTED });
    }
    y -= headH + 4;
    // Trecho: texto corrido ou, se o aluno marcou uma tabela/lista/títulos, a mesma estrutura da leitura.
    const card = (from: number, h: number) => {
      page.drawRectangle({ x: M.left, y: from - h + 4, width: innerW, height: h, color: SOFT });
      page.drawRectangle({ x: M.left, y: from - h + 4, width: 2.5, height: h, color: RED });
    };
    /** Linhas de texto dentro do cartão do trecho, continuando na página seguinte quando preciso. */
    const textBlock = (lines: string[], font: PDFFont, size: number, x: number, bullet?: string) => {
      const lh = size * LH;
      let i = 0;
      while (i < lines.length) {
        let fit = Math.floor((y - M.bottom - 14) / lh);
        if (fit < 1 || (fit < 2 && i === 0 && lines.length > 1 && y - M.bottom < 60)) { newPage(); fit = Math.floor((y - M.bottom - 14) / lh); }
        const chunk = lines.slice(i, i + Math.max(1, fit));
        card(y, chunk.length * lh + 10);
        chunk.forEach((l, k) => page.drawText(l, { x, y: y - 1 - size - k * lh, size, font, color: INK }));
        if (bullet && i === 0) page.drawText(bullet, { x: x - 12 - (bullet.length > 1 ? bold.widthOfTextAtSize(bullet, size) - 5 : 0), y: y - 1 - size, size, font: bold, color: RED });
        y -= chunk.length * lh + 10;
        i += chunk.length;
        if (i < lines.length) newPage();
      }
    };
    /** Tabela com as mesmas linhas e colunas do texto; larguras proporcionais ao conteúdo; linha de cabeçalho repetida ao mudar de página. */
    const tableBlock = (rows: Array<{ h?: boolean; c: string[] }>) => {
      const TS = 8.6, TLH = TS * 1.3, PAD = 3.5;
      const cols = Math.max(...rows.map((r) => r.c.length));
      const avail = innerW - 24;
      const fnt = (r: { h?: boolean }) => (r.h ? bold : regular);
      const cell = (r: { h?: boolean; c: string[] }, ci: number) => clean(r.c[ci] ?? "");
      const natural = Array.from({ length: cols }, (_, ci) => Math.max(...rows.map((r) => fnt(r).widthOfTextAtSize(cell(r, ci).replace(/\n/g, " "), TS))) + 2 * PAD);
      const minW = Array.from({ length: cols }, (_, ci) => Math.min(natural[ci]!, Math.max(...rows.map((r) => Math.max(0, ...cell(r, ci).split(/\s+/).map((w) => fnt(r).widthOfTextAtSize(w, TS)))) ) + 2 * PAD));
      let widths: number[];
      if (natural.reduce((a2, b2) => a2 + b2, 0) <= avail) {
        const extra = (avail - natural.reduce((a2, b2) => a2 + b2, 0)) / cols;
        widths = natural.map((w) => w + extra);
      } else {
        const minSum = minW.reduce((a2, b2) => a2 + b2, 0);
        if (minSum >= avail) widths = minW.map((w) => (w * avail) / minSum);
        else {
          const extra = avail - minSum;
          const wt = natural.map((w, i) => Math.max(0, w - minW[i]!));
          const wsum = wt.reduce((a2, b2) => a2 + b2, 0) || 1;
          widths = minW.map((w, i) => w + (extra * wt[i]!) / wsum);
        }
      }
      const laid = rows.map((r) => {
        const lines = widths.map((w, ci) => wrap(fnt(r), cell(r, ci), TS, Math.max(8, w - 2 * PAD)));
        return { r, lines, h: Math.max(...lines.map((l) => l.length), 1) * TLH + 2 * PAD };
      });
      const head = laid[0]?.r.h ? laid[0] : null;
      let i = 0;
      while (i < laid.length) {
        const prefix = head && i > 0 ? [head] : [];
        let total = prefix.reduce((a2, l) => a2 + l.h, 0);
        const room = y - M.bottom - 16;
        const take: typeof laid = [];
        while (i + take.length < laid.length && (take.length === 0 ? total + laid[i]!.h <= room : total + laid[i + take.length]!.h <= room)) {
          total += laid[i + take.length]!.h;
          take.push(laid[i + take.length]!);
        }
        if (!take.length) {
          if (y < H - M.top - 4) { newPage(); continue; }
          take.push(laid[i]!); // linha maior que a página: desenha assim mesmo
          total += laid[i]!.h;
        }
        card(y, total + 10);
        let yy = y;
        for (const L of [...prefix, ...take]) {
          let x = M.left + 14;
          widths.forEach((w, ci) => {
            page.drawRectangle({ x, y: yy - L.h, width: w, height: L.h, color: L.r.h ? rgb(0.9, 0.9, 0.92) : WHITE, borderColor: LINE, borderWidth: 0.6 });
            L.lines[ci]!.forEach((ln, k) => page.drawText(ln, { x: x + PAD, y: yy - PAD - TS - k * TLH + 1, size: TS, font: fnt(L.r), color: INK }));
            x += w;
          });
          yy -= L.h;
        }
        y -= total + 10;
        i += take.length;
        if (i < laid.length) newPage();
      }
    };
    if (it.structure?.length) {
      if (y - 40 < M.bottom) newPage();
      for (const b of it.structure) {
        if (b.k === "table") tableBlock(b.rows);
        else if (b.k === "li") {
          const ind = 26 + (b.d ?? 0) * 14;
          textBlock(wrap(regular, clean(b.t), QS, innerW - ind - 14), regular, QS, M.left + ind, b.n != null ? `${b.n}.` : "•");
        } else if (b.k === "h") textBlock(wrap(bold, clean(b.t), QS + 0.5, innerW - 28), bold, QS + 0.5, M.left + 14);
        else textBlock(wrap(regular, clean(b.t), QS, innerW - 28), regular, QS, M.left + 14);
      }
    } else {
    let top = y;
    const startQuote = (pg: PDFPage, from: number, count: number) => {
      pg.drawRectangle({ x: M.left, y: from - count * QS * LH - 6, width: innerW, height: count * QS * LH + 10, color: SOFT });
      pg.drawRectangle({ x: M.left, y: from - count * QS * LH - 6, width: 2.5, height: count * QS * LH + 10, color: RED });
    };
    let i = 0;
    while (i < quoteLines.length) {
      const fit = Math.max(1, Math.floor((y - M.bottom - 12) / (QS * LH)));
      const chunk = quoteLines.slice(i, i + fit);
      if (fit < 2 && i === 0 && quoteLines.length > 1 && y - M.bottom < 60) { newPage(); top = y; continue; }
      startQuote(page, y + 0, chunk.length);
      chunk.forEach((l, k) => page.drawText(l, { x: M.left + 14, y: y - 4 - QS - k * QS * LH + 3, size: QS, font: regular, color: INK }));
      y -= chunk.length * QS * LH + 10;
      i += chunk.length;
      if (i < quoteLines.length) newPage();
    }
    void top;
    }
    // Anotação e explicação fazem parte do mesmo cartão: blocos colados ao trecho, mesma largura e mesmo filete vermelho.
    if (noteLines.length) {
      const nH = noteLines.length * NS * LH + 24;
      if (y - nH < M.bottom) newPage();
      page.drawRectangle({ x: M.left, y: y - nH + 4, width: innerW, height: nH, color: NOTE_BG });
      page.drawRectangle({ x: M.left, y: y - nH + 4, width: 2.5, height: nH, color: RED });
      page.drawLine({ start: { x: M.left + 2.5, y: y + 4 }, end: { x: M.left + innerW, y: y + 4 }, thickness: 0.4, color: NOTE_LINE });
      page.drawText("MINHA ANOTAÇÃO", { x: M.left + 14, y: y - 10, size: 6.5, font: bold, color: MUTED });
      noteLines.forEach((l, k) => page.drawText(l, { x: M.left + 14, y: y - 22 - k * NS * LH, size: NS, font: italic, color: INK }));
      y -= nH;
    }
    if (it.explanation) {
      // Explicação em tópicos: cada assunto separado (quadradinho + nome em cima, explicação embaixo).
      type Row = { t: string; bold?: boolean; icon?: boolean; sub?: boolean; rule?: boolean; indent: number; h: number };
      const LHX = NS * LH;
      const rows: Row[] = [];
      const parts = parseExplanation(clean(it.explanation));
      parts.forEach((pt, pi) => {
        // Cada assunto vira um bloco próprio: linha fina separadora e respiro antes de começar o próximo.
        if (pi > 0 && pt.kind !== "sub" && (pt.kind === "item" || parts[pi - 1]!.kind !== "p")) rows.push({ t: "", rule: true, indent: 0, h: 11 });
        else if (pi > 0 && pt.kind === "sub") rows.push({ t: "", indent: 0, h: 4 });
        if (pt.kind === "p") {
          for (const l of wrap(regular, pt.text, NS, innerW - 28)) rows.push({ t: l, indent: 0, h: LHX });
        } else if (pt.kind === "sub") {
          wrap(bold, pt.term, NS + 0.5, innerW - 66).forEach((l, k) => rows.push({ t: l, bold: true, sub: k === 0, indent: 28, h: LHX }));
          for (const l of wrap(regular, pt.text, NS, innerW - 66)) rows.push({ t: l, indent: 28, h: LHX });
        } else if (pt.term) {
          wrap(bold, pt.term.toUpperCase(), NS + 1, innerW - 44).forEach((l, k) => rows.push({ t: l, bold: true, icon: k === 0, indent: 14, h: LHX + 1 }));
          for (const l of wrap(regular, pt.text, NS, innerW - 44)) rows.push({ t: l, indent: 14, h: LHX });
        } else wrap(regular, pt.text, NS, innerW - 44).forEach((l, k) => rows.push({ t: l, icon: k === 0, indent: 14, h: LHX }));
      });
      let k = 0;
      let first = true;
      while (k < rows.length) {
        const head = first ? 22 : 8;
        if (y - head - LHX - 12 < M.bottom) newPage();
        const room = y - head - M.bottom - 8;
        let used = 0;
        let cnt = 0;
        while (k + cnt < rows.length && (cnt === 0 || used + rows[k + cnt]!.h <= room)) used += rows[k + cnt++]!.h;
        const chunk = rows.slice(k, k + cnt);
        const h = head + used + 8;
        page.drawRectangle({ x: M.left, y: y - h + 4, width: innerW, height: h, color: EXPL_BG });
        page.drawRectangle({ x: M.left, y: y - h + 4, width: 2.5, height: h, color: EXPL_BAR });
        if (first) page.drawText("EXPLICAÇÃO", { x: M.left + 14, y: y - 12, size: 7.5, font: bold, color: WHITE });
        let yy = y - head;
        for (const r of chunk) {
          if (r.rule) page.drawLine({ start: { x: M.left + 14, y: yy - r.h / 2 }, end: { x: M.left + innerW - 14, y: yy - r.h / 2 }, thickness: 0.5, color: rgb(1, 0.72, 0.72), opacity: 0.7 });
          if (r.t) page.drawText(r.t, { x: M.left + 14 + r.indent, y: yy - 2 - NS + 4, size: r.bold ? NS + 0.5 : NS, font: r.bold ? bold : regular, color: WHITE });
          if (r.icon) page.drawRectangle({ x: M.left + 14, y: yy - 2 - NS + 4 + 1.2, width: 5, height: 5, color: WHITE });
          if (r.sub) page.drawRectangle({ x: M.left + 14 + 14, y: yy - 2 - NS + 4 + 1.8, width: 3.2, height: 3.2, color: rgb(1, 0.78, 0.78) });
          yy -= r.h;
        }
        y -= h;
        k += cnt;
        first = false;
        if (k < rows.length) newPage();
      }
    }
    y -= 18;
  }

  // Cabeçalho e rodapé em todas as páginas
  const pages = doc.getPages();
  pages.forEach((p, idx) => {
    const lh = 22;
    const lw = (lh * logo.width) / logo.height;
    p.drawImage(logo, { x: M.left, y: H - 34 - lh, width: lw, height: lh });
    const tag = "REVISÃO";
    p.drawText(tag, { x: W - M.right - bold.widthOfTextAtSize(tag, 7), y: H - 41, size: 7, font: bold, color: RED });
    let t = clean(s.lesson.title);
    while (regular.widthOfTextAtSize(t, 8) > 230 && t.length > 4) t = t.slice(0, -2);
    if (t !== clean(s.lesson.title)) t = t.trimEnd() + "…";
    p.drawText(t, { x: W - M.right - regular.widthOfTextAtSize(t, 8), y: H - 54, size: 8, font: regular, color: MUTED });
    p.drawRectangle({ x: M.left, y: H - 70, width: 46, height: 2, color: RED });
    p.drawLine({ start: { x: M.left + 50, y: H - 69 }, end: { x: W - M.right, y: H - 69 }, thickness: 0.6, color: LINE });
    p.drawLine({ start: { x: M.left, y: 48 }, end: { x: W - M.right, y: 48 }, thickness: 0.6, color: LINE });
    p.drawText("///", { x: M.left, y: 32, size: 8, font: boldItalic, color: RED });
    p.drawText("APROVUM  ·  Meu PDF de Revisão", { x: M.left + 22, y: 32, size: 7, font: bold, color: INK });
    const num = `${idx + 1} / ${pages.length}`;
    p.drawText(num, { x: W - M.right - bold.widthOfTextAtSize(num, 8), y: 32, size: 8, font: bold, color: INK });
  });
  return doc.save();
}
