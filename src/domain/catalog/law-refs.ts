import { normalizeText, parseLawReference } from "./match";
import { LAW_SOURCES } from "@/domain/bank/law-text";
import { createHash } from "node:crypto";

/** Uma lei e os artigos de um tema que dependem dela. */
export interface LawRef {
  law: string;
  articles: string[];
}

const MAX_ARTICLES_PER_LAW = 60;

/**
 * Referências legais de um tema: o que está cadastrado (lei + artigos) somado ao que o
 * texto cita ("art. 144 da CF", "arts. 121 a 129 do CP"). Só leis com fonte oficial conhecida.
 */
export function extractLawRefs(input: { law_code: string | null; articles: readonly string[]; texts: readonly string[] }): LawRef[] {
  const acc = new Map<string, Set<string>>();
  const add = (law: string | null, arts: readonly string[]) => {
    if (!law || !LAW_SOURCES[law] || !arts.length) return;
    const set = acc.get(law) ?? new Set<string>();
    for (const a of arts) set.add(a);
    acc.set(law, set);
  };
  add(input.law_code, input.articles);
  for (const text of input.texts) {
    // Cada frase que cita artigo e lei é lida isoladamente: "art. 144 da CF/88" ≠ "art. 5º do CP".
    for (const piece of text.split(/\n|;|\.\s+(?=[A-ZÀ-Ú])/)) {
      if (!/\b(?:arts?|artigos?)\b/i.test(normalizeText(piece))) continue;
      const ref = parseLawReference(piece);
      add(ref.law, ref.articles);
    }
  }
  return [...acc.entries()].map(([law, set]) => ({ law, articles: [...set].slice(0, MAX_ARTICLES_PER_LAW) }));
}

/** Normaliza para comparar redações sem ruído de espaço, caixa e pontuação de marcação. */
export function normalizeLawText(s: string): string {
  return s.normalize("NFC").replace(/\s+/g, " ").trim();
}

export function hashLawText(s: string): string {
  return createHash("sha256").update(normalizeLawText(s)).digest("hex").slice(0, 32);
}

export type LawStatus = "ok" | "desatualizado" | "sem_referencia" | "erro" | "baseline";

export interface LawCheck {
  status: LawStatus;
  /** Hash por "LEI:artigo" na conferência atual. */
  hashes: Record<string, string>;
  /** Artigos cuja redação oficial mudou desde a última conferência. */
  changed: string[];
  /** Artigos que não foram encontrados no texto oficial (revogados, renumerados ou erro de digitação). */
  missing: string[];
}

/**
 * Compara o hash oficial atual com o guardado. Sem base anterior, a conferência vira a
 * base ("baseline"): não dá para afirmar que está desatualizado sem ter com o que comparar.
 */
export function compareLawHashes(previous: Record<string, string> | null, current: Record<string, string>, missing: string[]): LawCheck {
  const keys = Object.keys(current);
  if (!keys.length && !missing.length) return { status: "sem_referencia", hashes: current, changed: [], missing };
  if (!previous || !Object.keys(previous).length) return { status: "baseline", hashes: current, changed: [], missing };
  const changed = keys.filter((k) => previous[k] && previous[k] !== current[k]);
  const dropped = Object.keys(previous).filter((k) => !(k in current));
  const all = [...changed, ...dropped.filter((k) => missing.includes(k))];
  return { status: all.length ? "desatualizado" : "ok", hashes: current, changed: all, missing };
}
