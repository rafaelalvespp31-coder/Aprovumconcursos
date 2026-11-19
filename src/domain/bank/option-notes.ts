/**
 * Separa um comentário que traz uma explicação por alternativa ("A) Errada. …", "- B) Correta. …")
 * em: uma nota para cada alternativa + o restante (ex.: "Regra-chave: …"), que continua sendo o comentário geral.
 * Não altera o conteúdo: só distribui os trechos.
 */
export interface OptionNotes {
  byLabel: Record<string, string>;
  rest: string;
}

const LINE = /^\s*(?:[-•*·▪●]\s*)?(?:alternativa|letra|item)?\s*\(?([A-Ea-e])\)?\s*[).:\-–—]\s*(.*\S.*)$/i;
const STOP = /^\s*(?:regra(?:[- ]chave)?|resumo|conclus[ãa]o|portanto|dica|macete|obs(?:erva[çc][ãa]o)?|gabarito|fundamento|base legal|resposta)\b[^\n]{0,40}[:\-–—]/i;

export function splitCommentByOption(text: string | null | undefined): OptionNotes | null {
  const src = (text ?? "").replace(/\r\n?/g, "\n").trim();
  if (!src) return null;
  const lines = src.split("\n");
  const head: string[] = [];
  const rest: string[] = [];
  const segs: Array<{ label: string; lines: string[] }> = [];
  let inRest = false;
  for (const l of lines) {
    if (inRest) { rest.push(l); continue; }
    const m = l.match(LINE);
    if (m) {
      segs.push({ label: m[1]!.toUpperCase(), lines: [m[2]!.trim()] });
      continue;
    }
    if (segs.length === 0) { head.push(l); continue; }
    if (STOP.test(l)) { inRest = true; rest.push(l); continue; }
    if (l.trim()) segs[segs.length - 1]!.lines.push(l.trim());
  }
  const labels = new Set(segs.map((s) => s.label));
  if (segs.length < 2 || labels.size < 2) return null;
  const byLabel: Record<string, string> = {};
  for (const s of segs) byLabel[s.label] = byLabel[s.label] ? `${byLabel[s.label]}\n${s.lines.join(" ")}` : s.lines.join(" ");
  return { byLabel, rest: [...head, ...rest].join("\n").trim() };
}
