/** Caderno de erros editável: um item por questão errada no caderno (tipos e agrupamento). */
export interface ErrorNotebookEntry {
  questionId: string;
  code: string | null;
  subject: string;
  /** Tema (primeiro nível do cadastro de assuntos). */
  theme: string;
  /** Assunto dentro do tema; nulo quando a questão está no próprio tema. */
  topic: string | null;
  /** Banca · ano · prova (quando houver). */
  source: string | null;
  /** Justificativa original (HTML limpo), para "Restaurar original". */
  originalHtml: string;
  /** O que o aluno vê: a versão editada dele ou a original. */
  html: string;
  edited: boolean;
  updatedAt: string | null;
  /** Errou de novo na última resposta (ainda não acertou). */
  stillWrong: boolean;
  wrongAttempts: number;
  /** Resposta certa já legível ("C) texto da alternativa" ou "Certo"/"Errado"); nulo se a questão não tem gabarito. */
  correctAnswer?: string | null;
}

export interface ErrorNotebookData {
  notebook: { id: string; title: string };
  entries: ErrorNotebookEntry[];
}

export interface ErrorNotebookEdit {
  questionId: string;
  /** null = voltar à justificativa original. */
  html: string | null;
}

export interface ErrorGroup {
  subject: string;
  themes: Array<{ theme: string; topics: Array<{ topic: string | null; entries: ErrorNotebookEntry[] }> }>;
}

const cmp = (a: string, b: string) => a.localeCompare(b, "pt-BR");

/** Organiza por matéria › tema › assunto (as do próprio tema primeiro), e pelo código. */
export function groupErrors(entries: readonly ErrorNotebookEntry[]): ErrorGroup[] {
  const sorted = [...entries].sort(
    (a, b) => cmp(a.subject, b.subject) || cmp(a.theme, b.theme) || (a.topic === null ? -1 : b.topic === null ? 1 : cmp(a.topic, b.topic)) || cmp(a.code ?? "", b.code ?? ""),
  );
  const out: ErrorGroup[] = [];
  for (const e of sorted) {
    let s = out.at(-1);
    if (!s || s.subject !== e.subject) out.push((s = { subject: e.subject, themes: [] }));
    let t = s.themes.at(-1);
    if (!t || t.theme !== e.theme) s.themes.push((t = { theme: e.theme, topics: [] }));
    let p = t.topics.at(-1);
    if (!p || p.topic !== e.topic) t.topics.push((p = { topic: e.topic, entries: [] }));
    p.entries.push(e);
  }
  return out;
}

/** Texto puro de um trecho de HTML limpo (sem tags nem entidades comuns). */
export function htmlToPlain(html: string): string {
  return html
    .replace(/<\/(p|li|div|h\d)>/gi, ". ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\.\s*\.(\s|$)/g, ".$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Resumo objetivo da justificativa: frases inteiras até ~max caracteres (nunca corta no meio de uma frase). */
export function summarizeJustification(html: string, max = 320): string {
  const text = htmlToPlain(html);
  if (text.length <= max) return text;
  const sentences = text.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [text];
  let out = "";
  for (const sentence of sentences) {
    if ((out + sentence).length > max && out) break;
    out += sentence;
  }
  out = out.trim();
  return out.length > max + 80 ? `${out.slice(0, max).trimEnd()}…` : out;
}
