/**
 * Explicação do trecho em tópicos: quando o aluno marca vários itens (uma lista, linhas de uma tabela),
 * a explicação vem uma linha por item ("- Termo: explicação"). Aqui ela vira blocos para a tela e o PDF.
 */
export type ExplanationPart = { kind: "item"; term: string; text: string } | { kind: "p"; text: string };

const BULLET = /^\s*(?:[-–•▪■*]|\d{1,2}[.)])\s+/;

export function parseExplanation(raw: string): ExplanationPart[] {
  const out: ExplanationPart[] = [];
  for (const line of raw.replace(/\r\n?/g, "\n").split("\n")) {
    const t = line.trim();
    if (!t) continue;
    if (BULLET.test(t)) {
      const body = t.replace(BULLET, "").trim();
      const m = body.match(/^(.{2,70}?)\s*[:–—]\s+(.+)$/s);
      out.push(m ? { kind: "item", term: m[1]!.replace(/\*\*/g, "").trim(), text: m[2]!.trim() } : { kind: "item", term: "", text: body });
    } else out.push({ kind: "p", text: t });
  }
  return out;
}

/** A explicação já está em tópicos? */
export const hasBullets = (raw: string): boolean => parseExplanation(raw).some((p) => p.kind === "item");

/** O trecho tem vários itens (uma linha por item)? Então a explicação deve vir separada por item. */
export const wantsItemized = (quote: string): boolean => quote.split("\n").filter((l) => l.trim().length > 1).length >= 2;
