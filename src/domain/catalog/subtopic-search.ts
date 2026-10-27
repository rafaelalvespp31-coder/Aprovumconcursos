/**
 * Busca dentro do tópico: o aluno digita parte do nome ou o número do subtópico ("peculato",
 * "4.2") e vai direto para a aula. Puro: sem acento, sem maiúscula, todas as palavras precisam aparecer.
 */
import { compareCodes } from "./topic-group";

export interface SubtopicEntry {
  /** Aula do catálogo (catalog_topics.id). */
  topicId: string;
  title: string;
  code: string | null;
  /** Aula do aluno para este subtópico (quando ele já tem estudo). */
  lessonId: string | null;
  /** Andamento do aluno: null = ainda não começou. */
  pct: number | null;
  done: boolean;
  current: boolean;
}

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9. ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function searchSubtopics(items: readonly SubtopicEntry[], query: string): SubtopicEntry[] {
  const sorted = [...items].sort((a, b) => compareCodes(a.code, b.code) || a.title.localeCompare(b.title, "pt-BR"));
  const words = fold(query).split(" ").filter(Boolean);
  if (!words.length) return sorted;
  return sorted.filter((it) => {
    const hay = fold(`${it.code ?? ""} ${it.title}`);
    // "4.2" casa com o número e os filhos (4.2, 4.2.1), não com "14.2" nem "4.20".
    return words.every((w) => {
      if (!/^\d+(\.\d+)*\.?$/.test(w)) return hay.includes(w);
      const c = it.code ?? "";
      const n = w.replace(/\.$/, "");
      return c === n || c.startsWith(`${n}.`);
    });
  });
}
