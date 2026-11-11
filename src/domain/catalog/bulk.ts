/**
 * Importação em massa: um .txt com várias aulas (todos os subtópicos de um tópico), cada uma começando em
 * "=== AULA ===". Aqui só a divisão do arquivo; cada pedaço é lido e gravado como a aula avulsa de sempre.
 */
import { cleanPasted } from "./upload";

export interface BulkChunk {
  /** Posição da aula no arquivo (1, 2, 3…). */
  index: number;
  /** Linha do arquivo onde a aula começa. */
  line: number;
  text: string;
}

/** Máximo de aulas por arquivo (um tópico inteiro cabe com folga). */
export const BULK_MAX_LESSONS = 40;

const AULA = /^\s*={3,}\s*AULA\s*={0,}\s*$/i;

/** Divide o arquivo em aulas. Sem nenhum "=== AULA ===", devolve o arquivo todo como uma aula só. */
export function splitLessons(raw: string): BulkChunk[] {
  const lines = cleanPasted(raw).split("\n");
  const starts = lines.flatMap((l, i) => (AULA.test(l) ? [i] : []));
  if (!starts.length) return raw.trim() ? [{ index: 1, line: 1, text: lines.join("\n").trim() }] : [];
  return starts.map((s, k) => ({
    index: k + 1,
    line: s + 1,
    text: lines.slice(s, k + 1 < starts.length ? starts[k + 1] : lines.length).join("\n").trim(),
  }));
}
