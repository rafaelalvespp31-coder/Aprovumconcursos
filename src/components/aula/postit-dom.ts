/**
 * Ponte entre o texto renderizado da aula e os post-its: lê a seleção do aluno (com a seção e a
 * posição do trecho) e reencontra o trecho guardado no texto da página para marcá-lo.
 */
export const SECTION_SELECTOR = ".ap-secao";
export const POSTIT_QUOTE_MAX_CLIENT = 1500;

export interface Capture {
  sectionId: string;
  sectionTitle: string;
  quote: string;
  quoteStart: number;
  around: string;
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
  const quote = cleanQuote(sel.toString());
  if (quote.length < 2) return null;
  if (quote.length > POSTIT_QUOTE_MAX_CLIENT) return { error: `Trecho longo demais: selecione até ${POSTIT_QUOTE_MAX_CLIENT} caracteres.` };
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
      at: Date.now(),
    },
  };
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Reencontra o trecho no texto da seção (se ela estiver na tela agora) e devolve o intervalo. */
export function locateRange(p: { sectionId: string; quote: string; quoteStart: number }): Range | null {
  const root = document.getElementById(`secao-${p.sectionId}`);
  if (!root) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: Array<{ node: Text; start: number }> = [];
  let full = "";
  while (walker.nextNode()) {
    const n = walker.currentNode as Text;
    nodes.push({ node: n, start: full.length });
    full += n.data;
  }
  const tokens = p.quote.split(/\s+/).filter(Boolean).map(escapeRe);
  if (!tokens.length || tokens.length > 600) return null;
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
