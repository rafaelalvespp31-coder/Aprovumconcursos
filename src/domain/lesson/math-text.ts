/**
 * O conteúdo de algumas aulas traz notação LaTeX (\( \), \[ \], \begin{array}) que o leitor de aulas
 * não interpreta e aparece como código na tela. Converte para texto legível ANTES do markdown:
 * tabelas de decomposição simultânea (MMC/MDC) viram um bloco alinhado; fórmulas viram texto com ×, ÷, frações e potências.
 */

const SUP: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "-": "⁻", "+": "⁺", n: "ⁿ" };
const sup = (s: string) => (s.split("").every((c) => c in SUP) ? s.split("").map((c) => SUP[c]).join("") : `^(${s})`);

/** Fórmula em linha (sem delimitadores) → texto legível. */
export function formulaParaTexto(src: string): string {
  let t = src;
  for (let i = 0; i < 3; i++) t = t.replace(/\\[dt]?frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, (_, a: string, b: string) => `${/^[\w.,]+$/.test(a) ? a : `(${a})`}/${/^[\w.,]+$/.test(b) ? b : `(${b})`}`);
  t = t
    .replace(/\\sqrt\s*\{([^{}]*)\}/g, "√($1)")
    .replace(/\\(?:text|mathrm|mathbf|operatorname|textbf)\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\times/g, "×")
    .replace(/\\cdot/g, "·")
    .replace(/\\div/g, "÷")
    .replace(/\\pm/g, "±")
    .replace(/\\(?:leq|le)(?![a-zA-Z])/g, "≤")
    .replace(/\\(?:geq|ge)(?![a-zA-Z])/g, "≥")
    .replace(/\\neq?(?![a-zA-Z])/g, "≠")
    .replace(/\\approx/g, "≈")
    .replace(/\\(?:Rightarrow|implies)/g, "⇒")
    .replace(/\\(?:rightarrow|to)(?![a-zA-Z])/g, "→")
    .replace(/\\%/g, "%")
    .replace(/\\(?:quad|qquad|,|;|!|:)/g, " ")
    .replace(/\\(?:left|right)/g, "")
    .replace(/\^\{([^{}]*)\}/g, (_, s: string) => sup(s))
    .replace(/\^([0-9n])/g, (_, s: string) => sup(s))
    .replace(/_\{([^{}]*)\}/g, "_$1")
    .replace(/[{}]/g, "")
    .replace(/\\ /g, " ");
  return t.replace(/\s+/g, " ").trim();
}

/** Corpo de \begin{array}…\end{array} → texto monoespaçado alinhado (última coluna depois de "|"). */
function arrayParaBloco(corpo: string): string {
  const semSpec = corpo.replace(/^\s*\{[^{}]*\}/, "");
  const linhas = semSpec
    .split(/\\{2,}|\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split("&").map((c) => formulaParaTexto(c)));
  if (!linhas.length) return "";
  const nCols = Math.max(...linhas.map((l) => l.length));
  const largura = Array.from({ length: nCols - 1 }, (_, c) => Math.max(...linhas.map((l) => (l[c] ?? "").length), 1));
  return linhas
    .map((l) => {
      const esq = largura.map((w, c) => (l[c] ?? "").padStart(w)).join("  ");
      return `${esq} | ${l[nCols - 1] ?? ""}`.trimEnd();
    })
    .join("\n");
}

/** Converte a notação LaTeX do markdown da aula em texto legível. Sem LaTeX, devolve o texto igual. */
export function limparMatematica(md: string): string {
  if (!md || !/\\[([]|\\begin|\\times|\\frac|\$\$/.test(md)) return md;
  const bloco = (corpo: string) => {
    const m = /\\begin\{array\}([\s\S]*?)\\end\{array\}/.exec(corpo);
    return m ? `\n\n\`\`\`text\n${arrayParaBloco(m[1] ?? "")}\n\`\`\`\n\n` : `\n\n${formulaParaTexto(corpo)}\n\n`;
  };
  return md
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, c: string) => bloco(c))
    .replace(/\$\$([\s\S]*?)\$\$/g, (_, c: string) => bloco(c))
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, c: string) => formulaParaTexto(c))
    .replace(/\\begin\{array\}[\s\S]*?\\end\{array\}/g, (m) => bloco(m));
}
