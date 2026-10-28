/**
 * Texto formatado do caderno de erros (editado pelo aluno): uma lista fechada de marcações
 * seguras. Roda igual no servidor (antes de gravar) e no navegador (antes de mostrar), sem DOM.
 * Tudo o que não está na lista some: scripts, eventos (onclick…), links, imagens, estilos livres.
 */

/** Tamanho máximo do HTML de uma anotação (depois de limpo). */
export const RICH_MAX = 20_000;

const BLOCK = new Set(["p", "div", "ul", "ol", "li", "blockquote", "h3", "h4"]);
const INLINE = new Set(["b", "strong", "i", "em", "u", "s", "strike", "mark", "span", "sub", "sup"]);
const VOID = new Set(["br"]);
/** Conteúdo inteiro descartado (não só a marcação). */
const DROP_WITH_CONTENT = new Set(["script", "style", "iframe", "object", "embed", "template", "noscript", "svg", "math", "textarea", "select", "title", "head"]);

const COLOR = /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*(0|1|0?\.\d+)\s*)?\)|transparent|black|white|red|blue|green|yellow|orange|purple|gray|grey)$/i;
const STYLE_RULES: Record<string, RegExp> = {
  color: COLOR,
  "background-color": COLOR,
  "font-weight": /^(bold|bolder|normal|[1-9]00)$/i,
  "font-style": /^(italic|normal)$/i,
  "text-decoration": /^(underline|line-through|none)( (underline|line-through))?$/i,
  "text-decoration-line": /^(underline|line-through|none)( (underline|line-through))?$/i,
  "text-align": /^(left|right|center|justify)$/i,
};

function cleanStyle(raw: string): string {
  const out: string[] = [];
  for (const decl of raw.split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const value = decl.slice(i + 1).trim().replace(/\s+/g, " ");
    const rule = STYLE_RULES[prop];
    if (rule && rule.test(value) && !/[\\<>"'`]|url|expression/i.test(value)) out.push(`${prop}: ${value}`);
  }
  return out.join("; ");
}

function attrStyle(attrs: string): string {
  const m = /\sstyle\s*=\s*("([^"]*)"|'([^']*)')/i.exec(attrs);
  return m ? cleanStyle((m[2] ?? m[3] ?? "").replace(/&quot;/g, '"').replace(/&#39;/g, "'")) : "";
}

/** `<font color>` (execCommand antigo) vira cor via estilo. */
function fontColor(attrs: string): string {
  const m = /\scolor\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
  const c = (m?.[2] ?? m?.[3] ?? m?.[4] ?? "").trim();
  return COLOR.test(c) ? `color: ${c}` : "";
}

const ENTITY = /^&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z][a-z0-9]{1,31});/i;
function escapeText(t: string): string {
  let out = "";
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]!;
    if (ch === "&") {
      const m = ENTITY.exec(t.slice(i));
      if (m) {
        out += m[0];
        i += m[0].length - 1;
      } else out += "&amp;";
    } else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else out += ch;
  }
  return out;
}

/** Limpa o HTML do editor: só marcações e estilos permitidos, tags sempre fechadas. */
export function sanitizeRichHtml(input: string): string {
  const html = String(input ?? "").replace(/<!--[\s\S]*?-->/g, "").replace(/<!\[CDATA\[[\s\S]*?\]\]>/g, "");
  const tokens = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b((?:[^>"']|"[^"]*"|'[^']*')*)>|[^<]+|</g;
  const stack: string[] = [];
  let drop: string | null = null;
  let out = "";
  for (let m = tokens.exec(html); m; m = tokens.exec(html)) {
    const tok = m[0];
    const name = m[1]?.toLowerCase();
    if (!name) {
      if (!drop) out += escapeText(tok);
      continue;
    }
    const closing = tok.startsWith("</");
    if (drop) {
      if (closing && name === drop) drop = null;
      continue;
    }
    if (DROP_WITH_CONTENT.has(name)) {
      if (!closing && !/\/\s*>$/.test(tok)) drop = name;
      continue;
    }
    const tag = name === "font" ? "span" : name;
    if (VOID.has(tag)) {
      if (!closing) out += "<br>";
      continue;
    }
    if (!BLOCK.has(tag) && !INLINE.has(tag)) continue;
    if (closing) {
      const at = stack.lastIndexOf(tag);
      if (at < 0) continue;
      while (stack.length > at) out += `</${stack.pop()}>`;
      continue;
    }
    const style = name === "font" ? fontColor(m[2] ?? "") : tag === "span" || tag === "p" || tag === "div" || tag === "mark" || tag === "li" ? attrStyle(m[2] ?? "") : "";
    if (tag === "span" && !style) {
      stack.push("span");
      out += "<span>";
      continue;
    }
    stack.push(tag);
    out += style ? `<${tag} style="${style}">` : `<${tag}>`;
  }
  while (stack.length) out += `</${stack.pop()}>`;
  return out.replace(/<span>([\s\S]*?)<\/span>/g, "$1").trim();
}

/** Texto puro (justificativa original) → HTML de parágrafos, pronto para editar. */
export function plainToHtml(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      const esc = p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      // **negrito** do comentário original vira negrito de verdade.
      return `<p>${esc.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

/** Texto visível (sem marcação), para saber se a anotação ficou vazia. */
export function richToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h3|h4|blockquote)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

/**
 * Só a justificativa (caderno de erros): sem gabarito e sem "certo/errado" no começo — a
 * explicação direta do porquê.
 */
export function plainJustification(text: string): string {
  return text
    .split("\n")
    .filter((l) => !/^\s*gabarito\b/i.test(l))
    .join("\n")
    .replace(/^\s*(certo|errado|correta|incorreta|verdadeiro|falso)\s*[.!:;,–-]\s*/i, "")
    .replace(/^\s*(alternativa\s+)?[a-e]\)?\s*[.:–-]\s*(?=[A-ZÁÉÍÓÚÂÊÔÃÕÇ])/, "")
    .trim();
}
