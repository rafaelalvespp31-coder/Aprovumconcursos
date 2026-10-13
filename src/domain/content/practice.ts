/**
 * "Na prática": exemplo interativo de cada tema ensinado.
 *
 * Formato dentro do texto da seção (não exige mudança no banco):
 *
 *   :::exemplo
 *   Situação: Ana é ameaçada pelo vizinho e não quer processá-lo…
 *   Pergunta: O delegado pode instaurar o inquérito de ofício?
 *   Resposta: Não. A ameaça é de ação condicionada… (art. 5º, § 4º).
 *   :::
 *
 * Na aula, o bloco vira um card interativo; no PDF e em outros lugares, vira texto comum.
 */

export interface PracticeCase {
  situation: string;
  question: string;
  answer: string;
}

const BLOCK = /(?:^|\n)[ \t]*:::exemplo[ \t]*\n([\s\S]*?)\n[ \t]*:::[ \t]*(?=\n|$)/g;
const FIELD = /^\s*(situa[çc][ãa]o|pergunta|resposta)\s*:\s*/i;

function parseBlock(raw: string): PracticeCase | null {
  const out: Record<string, string[]> = {};
  let key: string | null = null;
  for (const line of raw.split("\n")) {
    const m = line.match(FIELD);
    if (m) {
      key = m[1]!.toLowerCase().startsWith("situa") ? "situation" : m[1]!.toLowerCase() === "pergunta" ? "question" : "answer";
      out[key] = [line.slice(m[0].length)];
    } else if (key) {
      out[key]!.push(line);
    }
  }
  const get = (k: string) => (out[k] ?? []).join("\n").trim();
  const c = { situation: get("situation"), question: get("question"), answer: get("answer") };
  return c.situation && c.answer ? c : null;
}

/** Separa os blocos "Na prática" do restante do texto da seção. */
export function extractPractice(md: string): { body: string; cases: PracticeCase[] } {
  const cases: PracticeCase[] = [];
  const body = md
    .replace(BLOCK, (_, raw: string) => {
      const c = parseBlock(raw);
      if (c) cases.push(c);
      return c ? "" : `\n${raw}`;
    })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { body, cases };
}

/** Versão em texto comum (PDF, exportação, pré-visualização). */
export function practiceToMarkdown(md: string): string {
  if (!md.includes(":::exemplo")) return md;
  return md.replace(BLOCK, (_, raw: string) => {
    const c = parseBlock(raw);
    if (!c) return `\n${raw}`;
    return `\n> **Na prática:** ${c.situation}${c.question ? `\n>\n> **Pergunta:** ${c.question}` : ""}\n>\n> **Resposta:** ${c.answer}`;
  });
}

/** Tipos de seção que ensinam um assunto e, por isso, ganham o card "Na prática". */
export const PRACTICE_KINDS = new Set([
  "introducao",
  "conceitos_fundamentais",
  "explicacao",
  "aprofundamento",
  "comparacao",
  "quadro_comparativo",
  "doutrina",
  "jurisprudencia",
  "aplicacao",
  "excecoes",
]);
