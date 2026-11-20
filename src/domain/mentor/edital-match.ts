const STOP = new Set(["de", "da", "do", "das", "dos", "e", "o", "a", "para", "estado", "concurso", "publico", "cargo"]);

const tokens = (s: string): Set<string> =>
  new Set(s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP.has(w)));

/** Quanto dois nomes de concurso se parecem (0 a 1). Exige 2 palavras em comum para não confundir concursos. */
export function nameScore(query: string, candidate: string): number {
  const q = tokens(query), c = tokens(candidate);
  let overlap = 0;
  for (const w of q) if (c.has(w)) overlap++;
  if (overlap < 2) return 0;
  return overlap / Math.min(q.size, c.size);
}

export const EDITAL_MIN_SCORE = 0.6;
