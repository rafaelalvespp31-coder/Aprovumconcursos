/**
 * Explicação do trecho em tópicos: quando o aluno marca vários itens (uma lista, linhas de uma tabela),
 * a explicação vem uma linha por item ("- Termo: explicação"). Aqui ela vira blocos para a tela e o PDF.
 */
/** `sub`: subtópico (fica recuado, debaixo do último `item`). */
export type ExplanationPart = { kind: "item"; term: string; text: string } | { kind: "sub"; term: string; text: string } | { kind: "p"; text: string };

const BULLET = /^\s*(?:[-–•▪■*]|\d{1,2}[.)])\s+/;

/** Itens colados numa linha só ("...multa.- Repouso noturno: ...") voltam a ser um por linha. */
const GLUED = /([.!?;)])\s*[-–•]\s+(?=\p{Lu})/gu;
/** "termo: explicação" no começo do texto de um item vira subtópico. */
const SUBTERM = /^([^.:;]{2,60}?):\s+(.+)$/s;

export function parseExplanation(raw: string): ExplanationPart[] {
  const out: ExplanationPart[] = [];
  const norm = raw.replace(/\r\n?/g, "\n").replace(GLUED, "$1\n- ");
  for (const line of norm.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (BULLET.test(t)) {
      const body = t.replace(BULLET, "").trim();
      const m = body.match(/^(.{2,70}?)\s*[:–—]\s+(.+)$/s);
      if (!m) {
        out.push({ kind: "item", term: "", text: body });
        continue;
      }
      const term = m[1]!.replace(/\*\*/g, "").trim();
      const text = m[2]!.trim();
      const sub = text.match(SUBTERM);
      if (sub) {
        // "Caput: furto simples: É a forma básica..." -> título "Caput" e, embaixo, o subtópico "furto simples".
        out.push({ kind: "item", term, text: "" });
        out.push({ kind: "sub", term: sub[1]!.trim(), text: sub[2]!.trim() });
      } else out.push({ kind: "item", term, text });
    } else out.push({ kind: "p", text: t });
  }
  return out;
}

/** A explicação já está em tópicos? */
export const hasBullets = (raw: string): boolean => parseExplanation(raw).some((p) => p.kind === "item");

/** O trecho tem vários itens (uma linha por item)? Então a explicação deve vir separada por item. */
export const wantsItemized = (quote: string): boolean => quote.split("\n").filter((l) => l.trim().length > 1).length >= 2;
