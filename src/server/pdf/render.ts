/**
 * Renderização do PDF de um conteúdo estudado (pdf-lib, fontes padrão embutidas no
 * próprio pacote — nada lido do disco, funciona em ambiente serverless).
 * Entrada: o retrato congelado (PdfSnapshot). Saída: bytes do PDF.
 */
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import type { PhrasingContent, RootContent } from "mdast";
import type { PdfSnapshot } from "./types";

const A4: [number, number] = [595.28, 841.89];
const M = { top: 64, bottom: 64, left: 56, right: 56 };
const INK = rgb(0.04, 0.04, 0.04);
const MUTED = rgb(0.32, 0.32, 0.32);
const RED = rgb(0.882, 0.024, 0);
const LINE = rgb(0.86, 0.86, 0.86);
const SOFT = rgb(0.965, 0.965, 0.965);

const LEVEL_LABEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" } as const;
const TYPE_LABEL: Record<string, string> = { multipla_escolha: "Múltipla escolha", certo_errado: "Certo ou errado", situacional: "Situacional", discursiva: "Discursiva" };

interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

/**
 * Largura sem kerning: o pdf-lib mede com kerning, mas desenha sem — medir caractere
 * a caractere evita palavras "coladas" (ex.: "P," ficava mais largo que o medido).
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

/** Escreve páginas com quebra automática de linha e de página. */
class Writer {
  doc: PDFDocument;
  page!: PDFPage;
  y = 0;
  fonts: { regular: PDFFont; bold: PDFFont; italic: PDFFont; boldItalic: PDFFont };
  private charset: Set<number>;

  constructor(doc: PDFDocument, fonts: Writer["fonts"]) {
    this.doc = doc;
    this.fonts = fonts;
    this.charset = new Set(fonts.regular.getCharacterSet());
    this.newPage();
  }

  get width() {
    return A4[0] - M.left - M.right;
  }

  newPage() {
    this.page = this.doc.addPage(A4);
    this.y = A4[1] - M.top;
  }

  ensure(h: number) {
    if (this.y - h < M.bottom) this.newPage();
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

  /** Parágrafo com trechos em negrito/itálico, quebrando por palavra. */
  rich(runs: Run[], opts: { size?: number; indent?: number; color?: RGB; gap?: number; lineHeight?: number; width?: number } = {}) {
    const size = opts.size ?? 10.5;
    const lh = opts.lineHeight ?? size * 1.45;
    const indent = opts.indent ?? 0;
    const maxW = (opts.width ?? this.width) - indent;
    type Word = { text: string; run: Run; w: number; space: number };
    const words: Word[] = [];
    const lines: Word[][] = [[]];
    for (const r of runs) {
      const parts = this.clean(r.text).split(/(\s+)/);
      for (const p of parts) {
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
        lines.push([w]);
        lineW = w.w + w.space;
      } else {
        // Palavra maior que a linha: corta em pedaços.
        if (!cur.length && w.w > maxW) {
          let chunk = "";
          for (const ch of w.text) {
            if (measure(this.font(w.run), chunk + ch, size) > maxW) {
              cur.push({ ...w, text: chunk, w: measure(this.font(w.run), chunk, size), space: 0 });
              lines.push([]);
              chunk = "";
            }
            chunk += ch;
          }
          lines[lines.length - 1]!.push({ ...w, text: chunk, w: measure(this.font(w.run), chunk, size) });
          lineW = measure(this.font(w.run), chunk, size) + w.space;
          continue;
        }
        cur.push(w);
        lineW += w.w + w.space;
      }
    }
    for (const line of lines) {
      this.ensure(lh);
      let x = M.left + indent;
      for (const w of line) {
        this.page.drawText(w.text, { x, y: this.y - size, size, font: this.font(w.run), color: opts.color ?? INK });
        x += w.w + w.space;
      }
      this.y -= lh;
    }
    this.y -= opts.gap ?? 4;
  }

  text(s: string, opts: Parameters<Writer["rich"]>[1] & { bold?: boolean; italic?: boolean } = {}) {
    this.rich([{ text: s, bold: opts.bold, italic: opts.italic }], opts);
  }

  heading(s: string, level: 1 | 2 | 3) {
    const size = level === 1 ? 20 : level === 2 ? 14.5 : 12;
    this.ensure(size * 3);
    this.y -= level === 1 ? 4 : 10;
    if (level <= 2) {
      this.page.drawRectangle({ x: M.left, y: this.y - size - 1, width: 3, height: size + 2, color: RED });
      this.rich([{ text: s, bold: true }], { size, indent: 10, gap: level === 1 ? 10 : 6 });
    } else {
      this.rich([{ text: s, bold: true }], { size, gap: 4 });
    }
  }

  rule() {
    this.ensure(10);
    this.page.drawLine({ start: { x: M.left, y: this.y - 4 }, end: { x: A4[0] - M.right, y: this.y - 4 }, thickness: 0.6, color: LINE });
    this.y -= 12;
  }

  /** Bloco destacado por uma faixa vermelha lateral (desenhada ao fim, sem cobrir o texto). */
  box(draw: () => void, accent: RGB = RED) {
    this.ensure(40);
    const startPage = this.page;
    const top = this.y;
    this.y -= 4;
    draw();
    if (this.page === startPage) {
      startPage.drawRectangle({ x: M.left - 8, y: this.y + 2, width: 2.5, height: top - this.y - 2, color: accent });
    }
    this.y -= 8;
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
        out.push(...inlineRuns(n.children, style));
        break;
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

function plain(nodes: PhrasingContent[]): string {
  return inlineRuns(nodes).map((r) => r.text).join("");
}

/** Desenha Markdown (títulos, parágrafos, listas, citações, tabelas) no Writer. */
export function drawMarkdown(w: Writer, md: string, indent = 0) {
  const tree = fromMarkdown(md, { extensions: [gfm()], mdastExtensions: [gfmFromMarkdown()] });
  const block = (node: RootContent, ind: number, bullet?: string) => {
    switch (node.type) {
      case "heading":
        w.rich(inlineRuns(node.children, { bold: true }), { size: node.depth <= 2 ? 12 : 11, indent: ind, gap: 3 });
        break;
      case "paragraph":
        if (bullet) {
          w.ensure(16);
          w.page.drawText(w.clean(bullet), { x: M.left + ind - 12, y: w.y - 10.5, size: 10.5, font: w.fonts.regular, color: RED });
        }
        w.rich(inlineRuns(node.children), { indent: ind, gap: 4 });
        break;
      case "list": {
        let n = node.start ?? 1;
        for (const item of node.children) {
          item.children.forEach((c, i) => block(c, ind + 14, i === 0 ? (node.ordered ? `${n}.` : "•") : undefined));
          n++;
        }
        w.y -= 2;
        break;
      }
      case "blockquote": {
        const startY = w.y;
        const startPage = w.page;
        node.children.forEach((c) => block(c, ind + 12));
        if (w.page === startPage) {
          w.page.drawRectangle({ x: M.left + ind, y: w.y + 4, width: 2.5, height: startY - w.y - 4, color: RED });
        }
        break;
      }
      case "table": {
        const rows = node.children.map((r) => r.children.map((c) => plain(c.children as PhrasingContent[])));
        const cols = Math.max(...rows.map((r) => r.length));
        const colW = (w.width - ind) / cols;
        rows.forEach((r, ri) => {
          const size = 9.5;
          // Altura da linha = maior célula.
          const heights = r.map((cell) => {
            const lines = Math.max(1, Math.ceil(measure(w.fonts.regular, w.clean(cell), size) / (colW - 8)) + (cell.match(/\n/g)?.length ?? 0));
            return lines * size * 1.4 + 6;
          });
          const h = Math.max(...heights);
          w.ensure(h);
          const top = w.y;
          if (ri === 0) w.page.drawRectangle({ x: M.left + ind, y: top - h, width: w.width - ind, height: h, color: SOFT });
          r.forEach((cell, ci) => {
            const saveY = w.y;
            w.y = top - 3;
            w.rich([{ text: cell, bold: ri === 0 }], { size, indent: ind + ci * colW + 4, width: ind + (ci + 1) * colW - 4 + 0, gap: 0, lineHeight: size * 1.4 });
            w.y = saveY;
          });
          w.page.drawLine({ start: { x: M.left + ind, y: top - h }, end: { x: A4[0] - M.right, y: top - h }, thickness: 0.5, color: LINE });
          w.y = top - h;
        });
        w.y -= 8;
        break;
      }
      case "code":
        w.text(node.value, { indent: ind + 8, size: 9.5, color: MUTED });
        break;
      case "thematicBreak":
        w.rule();
        break;
      default:
        if ("children" in node) (node as { children: RootContent[] }).children.forEach((c) => block(c, ind));
    }
  };
  tree.children.forEach((c) => block(c, indent));
}

export async function renderStudyPdf(s: PdfSnapshot, meta: { pdfVersion: number; contentHash: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`${s.content.title} — APROVUM`);
  doc.setAuthor("APROVUM");
  doc.setSubject(s.content.subject ?? s.content.title);
  doc.setCreator("APROVUM");
  doc.setCreationDate(new Date(s.generatedAt));
  doc.setLanguage("pt-BR");
  const w = new Writer(doc, {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  });

  // ---- Capa ----
  w.page.drawRectangle({ x: 0, y: A4[1] - 150, width: A4[0], height: 150, color: rgb(0.04, 0.04, 0.04) });
  w.page.drawText("APRO", { x: M.left, y: A4[1] - 78, size: 26, font: w.fonts.bold, color: rgb(1, 1, 1) });
  const aproW = measure(w.fonts.bold, "APRO", 26);
  w.page.drawText("V", { x: M.left + aproW, y: A4[1] - 78, size: 26, font: w.fonts.bold, color: RED });
  w.page.drawText("UM", { x: M.left + aproW + measure(w.fonts.bold, "V", 26), y: A4[1] - 78, size: 26, font: w.fonts.bold, color: rgb(1, 1, 1) });
  w.page.drawText(w.clean("SUA PREPARAÇÃO. SEU PRÓXIMO CARGO."), { x: M.left, y: A4[1] - 100, size: 8.5, font: w.fonts.regular, color: rgb(0.75, 0.75, 0.75) });
  w.y = A4[1] - 190;
  w.heading(s.content.title, 1);
  if (s.content.subject && s.content.subject !== s.content.title) w.text(s.content.subject, { size: 12, color: MUTED, gap: 8 });
  w.rich(
    [
      { text: "Estudante: ", bold: true },
      { text: s.student.name ?? "—" },
      { text: "\nBanca de referência: ", bold: true },
      { text: s.content.board },
      { text: "\nTipo de conteúdo: ", bold: true },
      { text: s.content.contentTypeLabel },
      { text: "\nConcluído nos três níveis (fácil, médio e difícil) com pelo menos 90% em cada um.", italic: true },
    ],
    { gap: 10 },
  );
  w.box(() => {
    w.rich(
      [
        { text: "Versão do PDF: ", bold: true },
        { text: String(meta.pdfVersion) },
        { text: "\nGerado em: ", bold: true },
        { text: fmtDateTime(s.generatedAt) },
        { text: "\nConteúdo informado: ", bold: true },
        { text: `versão ${s.content.sourceVersion}, de ${fmtDate(s.content.sourceCreatedAt)}` },
        { text: "\nAulas atualizadas em: ", bold: true },
        { text: [...new Set(s.units.map((u) => (u.generatedAt ? fmtDate(u.generatedAt) : "—")))].join(", ") },
        { text: "\nIdentificador (SHA-256): ", bold: true },
        { text: meta.contentHash.slice(0, 32) + "…" },
      ],
      { size: 9.5, indent: 4 },
    );
  });

  if (s.content.scopeStatement) {
    w.heading("Escopo deste estudo", 2);
    w.text(s.content.scopeStatement);
    if (s.content.legalReferences.length) {
      w.text("Dispositivos e normas", { bold: true, gap: 2 });
      for (const r of s.content.legalReferences) w.rich([{ text: `${r.norm}: `, bold: true }, { text: r.provisions }], { indent: 12, gap: 2 });
    }
    if (s.content.outOfScope.length) {
      w.text("Fica de fora (fora do pedido)", { bold: true, gap: 2 });
      for (const o of s.content.outOfScope) w.text(`• ${o}`, { indent: 12, gap: 1 });
    }
    if (s.content.aiOutline) {
      w.text("Subtemas organizados pela IA a partir do seu pedido", { bold: true, gap: 2 });
      w.text(s.content.aiOutline, { indent: 12, size: 9.5, color: MUTED });
    }
  }

  // ---- Teoria ----
  w.newPage();
  w.heading("Teoria", 1);
  for (const u of s.units) {
    w.heading(u.title, 2);
    w.text(u.objective, { italic: true, color: MUTED, gap: 8 });
    for (const sec of u.sections) {
      w.text(sec.title + (sec.verificationStatus === "pendente" ? "  [não verificado]" : ""), { bold: true, size: 11.5, gap: 3 });
      drawMarkdown(w, sec.body);
      w.y -= 4;
    }
    if (u.unverifiedClaims.length) {
      w.text("Pontos pendentes de verificação na fonte oficial", { bold: true, color: RED, gap: 2 });
      for (const c of u.unverifiedClaims) w.text(`• ${c}`, { indent: 12, size: 9.5, gap: 1 });
    }
  }

  // ---- Questões ----
  w.newPage();
  w.heading("Questões respondidas", 1);
  w.text(
    `${s.questions.length} questão(ões) respondida(s) por você, com a sua última resposta, o gabarito e os comentários. Exercícios de recuperação aparecem logo depois do nível a que pertencem. São questões de treino elaboradas pela plataforma, não questões oficiais.`,
    { color: MUTED, gap: 8 },
  );
  let n = 0;
  for (const level of ["facil", "medio", "dificil"] as const) {
    const qs = s.questions.filter((q) => q.level === level);
    if (!qs.length) continue;
    w.heading(`Nível ${LEVEL_LABEL[level]}`, 2);
    for (const q of qs) {
      n++;
      w.ensure(80);
      w.rich(
        [
          { text: `${n}. `, bold: true },
          { text: `${q.recovery ? "Recuperação · " : ""}${TYPE_LABEL[q.type] ?? q.type}${q.topic ? ` · ${q.topic}` : ""}`, italic: true },
        ],
        { size: 9.5, color: MUTED, gap: 2 },
      );
      w.text(q.statement, { gap: 4 });
      if (q.type === "certo_errado") {
        w.rich(
          [
            { text: "Gabarito: ", bold: true },
            { text: q.correctAnswerTrue ? "CERTO" : "ERRADO" },
            { text: "   Sua resposta: ", bold: true },
            { text: q.answer.bool === null ? "—" : q.answer.bool ? "CERTO" : "ERRADO" },
            { text: q.answer.correct ? "  (acertou)" : "  (errou)", bold: true },
          ],
          { indent: 12, size: 10 },
        );
      } else {
        for (const o of q.options) {
          const mine = q.answer.label === o.label;
          w.rich(
            [
              { text: `${o.label}) `, bold: true },
              { text: o.text, bold: o.correct },
              ...(o.correct ? [{ text: "  [correta]", bold: true }] : []),
              ...(mine ? [{ text: "  [sua resposta]", italic: true }] : []),
            ],
            { indent: 12, size: 10, gap: 1 },
          );
          w.text(o.explanation, { indent: 26, size: 9, color: MUTED, gap: 3 });
        }
        w.rich([{ text: q.answer.correct ? "Você acertou." : "Você errou.", bold: true }], { indent: 12, size: 10, color: q.answer.correct ? INK : RED });
      }
      w.rich([{ text: "Comentário: ", bold: true }, { text: q.justification }], { indent: 12, size: 10 });
      if (q.everWrong && q.answer.correct) w.text("Você errou esta questão (ou a original) antes e corrigiu depois.", { indent: 12, size: 9, italic: true, color: MUTED });
      w.text(`Tentativas: ${q.attempts} · última em ${fmtDateTime(q.answer.at)}`, { indent: 12, size: 8.5, color: MUTED, gap: 8 });
    }
  }

  // ---- Revisão ----
  w.heading("Explicação dos erros e pontos de revisão", 1);
  if (!s.review.length) {
    w.text("Você não errou nenhuma questão deste conteúdo. Mesmo assim, faça as revisões espaçadas para manter o domínio.");
  } else {
    w.text("Itens em que você errou ao menos uma vez. Releia a teoria correspondente e refaça as questões antes da revisão espaçada.", { color: MUTED, gap: 6 });
    for (const r of s.review) w.rich([{ text: `• ${r.topic}`, bold: true }, { text: ` — ${r.unitTitle} (${r.wrongAttempts} erro(s))` }], { indent: 6, gap: 2 });
  }

  // ---- Referências ----
  w.heading("Referências e fontes", 1);
  w.rich([{ text: "Conteúdo informado pelo aluno: ", bold: true }, { text: `versão ${s.content.sourceVersion} (${fmtDate(s.content.sourceCreatedAt)}), SHA-256 ${s.content.sourceSha256.slice(0, 16)}…` }], { gap: 4 });
  const refs = s.units.flatMap((u) => u.references.map((r) => ({ ...r, unit: u.title })));
  if (refs.length) {
    for (const r of refs) w.rich([{ text: `• ${r.citation}` }, { text: r.verified ? "" : "  (não verificada)", italic: true }], { indent: 6, size: 10, gap: 2 });
  } else {
    w.text("Nenhuma referência externa citada nas aulas.", { color: MUTED });
  }
  w.text(
    "Dispositivos legais, doutrina e jurisprudência citados devem ser conferidos na fonte oficial: o texto legal só é transcrito quando foi colado por você.",
    { size: 9, italic: true, color: MUTED, gap: 8 },
  );
  w.heading("Conteúdo informado", 2);
  w.text(s.content.sourceText.slice(0, 20_000) + (s.content.sourceText.length > 20_000 ? "\n[…]" : ""), { size: 9, color: MUTED });

  // ---- Rodapé com paginação ----
  const pages = doc.getPages();
  pages.forEach((p, i) => {
    const footer = w.clean(`APROVUM · ${s.content.title.slice(0, 60)} · PDF v${meta.pdfVersion} · ${fmtDate(s.generatedAt)}`);
    p.drawText(footer, { x: M.left, y: 32, size: 8, font: w.fonts.regular, color: MUTED });
    const num = `${i + 1}/${pages.length}`;
    p.drawText(num, { x: A4[0] - M.right - measure(w.fonts.regular, num, 8), y: 32, size: 8, font: w.fonts.regular, color: MUTED });
  });
  return doc.save();
}
