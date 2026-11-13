/**
 * "Meu PDF de Revisão": os post-its ativos de uma aula, na ordem da aula, com a identidade do
 * APROVUM. Nada é resumido nem reescrito — o trecho e a anotação saem exatamente como o aluno
 * guardou (acentos preservados). Entrada: o retrato congelado; saída: bytes do PDF.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { LOGO_ESCURA_PNG } from "./logos";
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
    // Trecho
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
      y -= chunk.length * QS * LH + 14;
      i += chunk.length;
      if (i < quoteLines.length) newPage();
    }
    void top;
    // Anotação
    if (noteLines.length) {
      const nH = noteLines.length * NS * LH + 24;
      if (y - nH < M.bottom) newPage();
      page.drawRectangle({ x: M.left + 12, y: y - nH + 4, width: innerW - 12, height: nH, color: NOTE_BG, borderColor: NOTE_LINE, borderWidth: 0.6 });
      page.drawText("MINHA ANOTAÇÃO", { x: M.left + 22, y: y - 10, size: 6.5, font: bold, color: MUTED });
      noteLines.forEach((l, k) => page.drawText(l, { x: M.left + 22, y: y - 22 - k * NS * LH, size: NS, font: italic, color: INK }));
      y -= nH + 6;
    }
    y -= 14;
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
