import { fold } from "./text";
import type { ParsedEdital, ParsedDiscipline } from "./parser";

/** Quais fontes alimentaram a análise (rastreabilidade). */
export interface CrossSources {
  pdf: boolean;
  text: boolean;
}

export interface CrossResult {
  /** Estrutura usada na análise: o texto colado pelo aluno, quando ele traz as disciplinas; senão a do PDF. */
  parsed: ParsedEdital;
  used: CrossSources;
  /** Divergências entre o PDF e o texto: só são sinalizadas, nada é inventado nem descartado em silêncio. */
  divergences: string[];
}

const key = (d: ParsedDiscipline) => fold(d.name);
const count = (d: ParsedDiscipline) => d.topics.length;

/**
 * Cruza o conteúdo programático lido do PDF com o texto colado pelo aluno.
 * O texto do aluno é o detalhamento e a conferência; o PDF segue como referência oficial.
 * Disciplina ou assunto que só uma das fontes traz vira aviso (divergência), nunca é misturado sem o aluno saber.
 */
export function crossSources(pdf: ParsedEdital | null, text: ParsedEdital | null): CrossResult {
  const pdfOk = !!pdf && pdf.found && pdf.disciplines.length > 0;
  const textOk = !!text && text.found && text.disciplines.length > 0;
  if (!textOk) return { parsed: pdf as ParsedEdital, used: { pdf: pdfOk, text: false }, divergences: [] };
  if (!pdfOk) return { parsed: text!, used: { pdf: false, text: true }, divergences: [] };

  const divergences: string[] = [];
  const pdfBy = new Map(pdf!.disciplines.map((d) => [key(d), d]));
  const textBy = new Map(text!.disciplines.map((d) => [key(d), d]));
  for (const [k, d] of pdfBy) if (!textBy.has(k)) divergences.push(`A disciplina “${d.name}” está no PDF, mas não no texto colado.`);
  for (const [k, d] of textBy) if (!pdfBy.has(k)) divergences.push(`A disciplina “${d.name}” está no texto colado, mas não no PDF.`);
  for (const [k, t] of textBy) {
    const p = pdfBy.get(k);
    if (!p) continue;
    const a = count(p);
    const b = count(t);
    if (Math.abs(a - b) >= Math.max(3, Math.ceil(Math.max(a, b) * 0.25))) divergences.push(`“${t.name}”: o PDF traz ${a} assuntos e o texto colado, ${b}.`);
    else {
      const inPdf = new Set(p.topics.map((x) => x.titleKey));
      const only = t.topics.filter((x) => !inPdf.has(x.titleKey)).length;
      if (only >= Math.max(3, Math.ceil(b * 0.25))) divergences.push(`“${t.name}”: ${only} assuntos do texto colado não aparecem no PDF.`);
    }
  }
  return { parsed: text!, used: { pdf: true, text: true }, divergences };
}
