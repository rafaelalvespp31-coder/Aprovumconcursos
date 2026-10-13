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

import { parseVisual, schemeSchema, stripSchema, type Scheme, type Strip } from "./visual";

export interface PracticeCase {
  situation: string;
  question: string;
  answer: string;
  /** Tirinha da situação (opcional). */
  strip?: Strip;
  /** Esquema da resposta (opcional). */
  scheme?: Scheme;
  /** Carimbo que aparece sobre a tirinha ao revelar a resposta (ex.: "Ilegal | erro"). */
  stamp?: { text: string; tone: "erro" | "ok" | "alerta" };
}

const BLOCK = /(?:^|\n)[ \t]*:::exemplo[ \t]*\n([\s\S]*?)\n[ \t]*:::[ \t]*(?=\n|$)/g;
const FIELD = /^\s*(situa[çc][ãa]o|pergunta|resposta|tirinha|esquema|carimbo)\s*:\s*/i;

function parseBlock(raw: string): PracticeCase | null {
  const out: Record<string, string[]> = {};
  let key: string | null = null;
  for (const line of raw.split("\n")) {
    const m = line.match(FIELD);
    if (m) {
      const f = m[1]!.toLowerCase();
      key = f.startsWith("situa") ? "situation" : f === "pergunta" ? "question" : f === "resposta" ? "answer" : f === "tirinha" ? "strip" : f === "esquema" ? "scheme" : "stamp";
      out[key] = [line.slice(m[0].length)];
    } else if (key) {
      out[key]!.push(line);
    }
  }
  const get = (k: string) => (out[k] ?? []).join("\n").trim();
  const c: PracticeCase = { situation: get("situation"), question: get("question"), answer: get("answer") };
  const strip = parseVisual(get("strip"), stripSchema);
  const scheme = parseVisual(get("scheme"), schemeSchema);
  if (strip) c.strip = strip;
  if (scheme) c.scheme = scheme;
  const stamp = get("stamp").match(/^(.{1,40}?)\s*(?:\|\s*(erro|ok|alerta))?$/);
  if (stamp?.[1]) c.stamp = { text: stamp[1].trim(), tone: (stamp[2] as "erro" | "ok" | "alerta" | undefined) ?? "erro" };
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
