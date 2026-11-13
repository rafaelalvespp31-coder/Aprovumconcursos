/**
 * Ponte entre o texto renderizado da aula e os post-its: lê a seleção do aluno (com a seção e a
 * posição do trecho) e reencontra o trecho guardado no texto da página para marcá-lo.
 */
import type { QuoteBlock } from "@/domain/study/postit-structure";

export const SECTION_SELECTOR = ".ap-secao";
export const POSTIT_QUOTE_MAX_CLIENT = 200_000;

export interface Capture {
  sectionId: string;
  sectionTitle: string;
  quote: string;
  quoteStart: number;
  around: string;
  /** Tabela, lista, títulos… do trecho, quando o trecho não é só texto corrido. */
  structure?: QuoteBlock[];
  at: number;
}
export type ReadResult = { cap: Capture } | { error: string } | null;

const elOf = (n: Node): Element | null => (n instanceof Element ? n : n.parentElement);
export const sectionIdOf = (el: Element) => (el.id.startsWith("secao-") ? el.id.slice(6) : null);

export function cleanQuote(s: string): string {
  return s.normalize("NFC").replace(/[ \t ]+/g, " ").replace(/ *\r?\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** Lê a seleção atual. null = nada selecionado na aula; {error} = seleção inválida (ex.: passa de uma seção). */
export function readSelection(): ReadResult {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;
  const range = sel.getRangeAt(0);
  const a = elOf(range.startContainer)?.closest(SECTION_SELECTOR) ?? null;
  const b = elOf(range.endContainer)?.closest(SECTION_SELECTOR) ?? null;
  if (!a && !b) return null;
  if (!a || a !== b) return { error: "Selecione um trecho dentro de uma única seção da aula." };
  const common = elOf(range.commonAncestorContainer);
  if (common?.closest("input, textarea, [contenteditable=true], [data-sem-explicar], button")) return null;
  const sectionId = sectionIdOf(a);
  if (!sectionId) return null;
  let structure: QuoteBlock[] | undefined;
  let blocks: QuoteBlock[] = [];
  try {
    blocks = structureFromRange(range);
    structure = blocks.length > 1 || (blocks[0] && blocks[0].k !== "p") ? blocks : undefined;
  } catch {
    blocks = [];
  }
  // O trecho é o texto da aula sem os botões da página (Esclarecer, Anotar…) que ficam entre os blocos.
  const quote = cleanQuote(blocks.length ? textOfBlocks(blocks) : sel.toString());
  if (quote.length < 2) return null;
  if (quote.length > POSTIT_QUOTE_MAX_CLIENT) return { error: "Trecho enorme: marque a seção em partes." };
  const pre = document.createRange();
  pre.selectNodeContents(a);
  pre.setEnd(range.startContainer, range.startOffset);
  const block = elOf(range.startContainer)?.closest("p, li, blockquote, td, h1, h2, h3, h4") ?? a;
  return {
    cap: {
      sectionId,
      sectionTitle: (a.querySelector("h2, h3")?.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 200),
      quote,
      quoteStart: pre.toString().length,
      around: (block.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 800),
      structure,
      at: Date.now(),
    },
  };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Reencontra o trecho no texto da seção (se ela estiver na tela agora) e devolve o intervalo. */
export function locateRange(p: { sectionId: string; quote: string; quoteStart: number }): Range | null {
  const root = document.getElementById(`secao-${p.sectionId}`);
  if (!root) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.parentElement?.closest(CHROME) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes: Array<{ node: Text; start: number }> = [];
  let full = "";
  while (walker.nextNode()) {
    const n = walker.currentNode as Text;
    nodes.push({ node: n, start: full.length });
    full += n.data;
  }
  // Só palavras/números: separadores como " | " das tabelas não existem no texto da página.
  const tokens = p.quote.split(/\s+/).filter((t) => /[\p{L}\p{N}]/u.test(t)).map(escapeRe);
  if (!tokens.length || tokens.length > 40000) return null;
  let re: RegExp;
  try {
    re = new RegExp(tokens.join("\\s*"), "gu");
  } catch {
    return null;
  }
  let best: { index: number; len: number } | null = null;
  let bestD = Infinity;
  for (const m of full.matchAll(re)) {
    const d = Math.abs((m.index ?? 0) - p.quoteStart);
    if (d < bestD) {
      bestD = d;
      best = { index: m.index ?? 0, len: m[0].length };
    }
  }
  if (!best) return null;
  const locate = (off: number, isEnd: boolean) => {
    for (const n of nodes) {
      const end = n.start + n.node.length;
      if (isEnd ? off <= end && off > n.start : off < end && off >= n.start) return { node: n.node, offset: off - n.start };
    }
    return null;
  };
  const s = locate(best.index, false);
  const e = locate(best.index + best.len, true);
  if (!s || !e) return null;
  const r = document.createRange();
  r.setStart(s.node, s.offset);
  r.setEnd(e.node, e.offset);
  return r;
}

/** Ponto do texto sob o clique (para abrir o post-it ao tocar no trecho marcado). */
export function caretAt(x: number, y: number): { node: Node; offset: number } | null {
  const d = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  if (d.caretPositionFromPoint) {
    const p = d.caretPositionFromPoint(x, y);
    return p ? { node: p.offsetNode, offset: p.offset } : null;
  }
  const r = d.caretRangeFromPoint?.(x, y);
  return r ? { node: r.startContainer, offset: r.startOffset } : null;
}

// ---------------------------------------------------------------- estrutura do trecho (tabelas, listas…)
const squash = (s: string) => s.replace(/[ \t ​]+/g, " ").replace(/ *\n */g, "\n").trim();
const BLOCK_TAGS = new Set(["P", "DIV", "SECTION", "ARTICLE", "BLOCKQUOTE", "FIGURE", "FIGCAPTION", "DETAILS", "SUMMARY", "ASIDE", "HEADER", "FOOTER", "MAIN", "DL", "DT", "DD"]);

function cellsOf(tr: Element): string[] {
  return [...tr.children].filter((c) => c.tagName === "TD" || c.tagName === "TH").map((c) => squash(c.textContent ?? ""));
}
function tableOf(rows: Element[]): QuoteBlock | null {
  const out = rows.map((tr) => ({ c: cellsOf(tr), h: [...tr.children].length > 0 && [...tr.children].every((c) => c.tagName === "TH") })).filter((r) => r.c.length);
  return out.length ? { k: "table", rows: out.map((r) => (r.h ? { h: true, c: r.c } : { c: r.c })) } : null;
}

/** Botões, ícones e textos só de leitura de tela não fazem parte do texto da aula. */
const CHROME = "button, [data-sem-explicar], [data-st], .sr-only, svg, script, style, [aria-hidden='true']";
function stripChrome(root: ParentNode) {
  root.querySelectorAll(CHROME).forEach((e) => e.remove());
}

/** Texto do trecho a partir da estrutura: uma linha por bloco/linha de tabela (células separadas por " | "). */
export function textOfBlocks(blocks: QuoteBlock[]): string {
  return blocks
    .map((b) => (b.k === "table" ? b.rows.map((r) => r.c.join(" | ")).join("\n") : b.t))
    .join("\n");
}

/** Monta a estrutura (tabela, lista, títulos, parágrafos) do que está dentro do intervalo selecionado. */
export function structureFromRange(range: Range): QuoteBlock[] {
  const root = range.cloneContents();
  stripChrome(root);
  const out: QuoteBlock[] = [];
  let buf = "";
  const flush = () => {
    const t = squash(buf);
    if (t) out.push({ k: "p", t });
    buf = "";
  };
  const list = (el: Element, depth: number) => {
    const ordered = el.tagName === "OL";
    let n = ordered ? Number(el.getAttribute("start") ?? 1) || 1 : 0;
    for (const li of [...el.children]) {
      if (li.tagName !== "LI") continue;
      let own = "";
      const nested: Element[] = [];
      const grab = (node: Node) => {
        if (node instanceof Element && (node.tagName === "UL" || node.tagName === "OL")) { nested.push(node); return; }
        if (node instanceof Text) own += node.data;
        else if (node instanceof Element && node.tagName === "BR") own += "\n";
        else node.childNodes.forEach(grab);
      };
      li.childNodes.forEach(grab);
      const t = squash(own);
      if (t) out.push({ k: "li", t, ...(ordered ? { n } : {}), ...(depth ? { d: depth } : {}) });
      if (ordered) n++;
      nested.forEach((x) => list(x, depth + 1));
    }
  };
  const PARTS = new Set(["THEAD", "TBODY", "TFOOT", "TR"]);
  /** Filhos em ordem; partes de tabela vizinhas (cabeçalho + corpo) viram UMA tabela. */
  const walkKids = (parent: Node) => {
    const kids = [...parent.childNodes];
    for (let i = 0; i < kids.length; i++) {
      const k = kids[i]!;
      if (k instanceof Element && PARTS.has(k.tagName)) {
        const group: Element[] = [];
        while (i < kids.length && kids[i] instanceof Element && PARTS.has((kids[i] as Element).tagName)) group.push(kids[i++] as Element);
        i--;
        flush();
        const t = tableOf(group.flatMap((g) => (g.tagName === "TR" ? [g] : [...g.querySelectorAll("tr")])));
        if (t) out.push(t);
      } else walk(k);
    }
  };
  const walk = (node: Node) => {
    if (node instanceof Text) { buf += node.data; return; }
    if (!(node instanceof Element)) { walkKids(node); return; }
    const tag = node.tagName;
    if (tag === "BR") { buf += "\n"; return; }
    if (tag === "TABLE") { flush(); const t = tableOf([...node.querySelectorAll("tr")]); if (t) out.push(t); return; }
    if (tag === "TD" || tag === "TH") { buf += `${node.textContent ?? ""}\n`; return; }
    if (tag === "UL" || tag === "OL") { flush(); list(node, 0); return; }
    if (tag === "LI") { flush(); const t = squash(node.textContent ?? ""); if (t) out.push({ k: "li", t }); return; }
    if (/^H[1-6]$/.test(tag)) { flush(); const t = squash(node.textContent ?? ""); if (t) out.push({ k: "h", t }); return; }
    if (tag === "PRE") { flush(); const t = (node.textContent ?? "").replace(/\s+$/, ""); if (t.trim()) out.push({ k: "pre", t }); return; }
    if (BLOCK_TAGS.has(tag)) { flush(); walkKids(node); flush(); return; }
    walkKids(node);
  };
  // Células/linhas soltas (seleção que começa e termina em células) viram uma única tabela.
  const kids = [...root.childNodes];
  if (kids.length && kids.every((k) => k instanceof Element && (k.tagName === "TR" || k.tagName === "TD" || k.tagName === "TH"))) {
    const trs = kids.every((k) => (k as Element).tagName === "TR") ? (kids as Element[]) : null;
    if (trs) { const t = tableOf(trs); if (t) out.push(t); }
    else out.push({ k: "table", rows: [{ c: kids.map((k) => squash(k.textContent ?? "")) }] });
  } else walkKids(root);
  flush();
  return out;
}
