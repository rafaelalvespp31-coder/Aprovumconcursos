/**
 * Montagem de um estudo a partir do catálogo revisado — puro (sem I/O).
 * Junta um ou mais temas (ex.: arts. 121 a 129) num único estudo do aluno:
 * texto-fonte combinado, mapa de cobertura com chaves renumeradas, plano com uma
 * unidade por tema, aulas e uma amostra de questões por nível tirada do banco.
 */
import type { ExtractedNode } from "@/domain/content/extract";
import type { LessonPlan } from "@/domain/content/plan";
import type { LessonOutput, QuestionsOutput } from "@/ai/schemas";
import type { LevelKey } from "@/domain/progress/levels";

export type CatalogQuestion = QuestionsOutput["questions"][number] & { id: string; level: LevelKey };

export interface CatalogTopicContent {
  id: string;
  title: string;
  version: number;
  disciplineMode: string;
  /** Texto normalizado ao qual os spans dos nós se referem. */
  sourceText: string;
  nodes: ExtractedNode[];
  lesson: LessonOutput & { verificationPending: boolean };
  questions: CatalogQuestion[];
  estimatedMinutes?: number;
}

export interface ComposedUnit {
  topicId: string;
  version: number;
  lessonKey: string;
  /** Chave do catálogo → chave no estudo do aluno. */
  keyMap: Record<string, string>;
  lesson: LessonOutput & { verificationPending: boolean };
  questions: Record<LevelKey, Array<CatalogQuestion>>;
}

export interface ComposedStudy {
  normalizedText: string;
  nodes: ExtractedNode[];
  plan: LessonPlan;
  units: ComposedUnit[];
  disciplineMode: string;
}

const SEP = "\n\n";
const key = (n: number) => `N${String(n).padStart(4, "0")}`;

/** Hash simples e estável (FNV-1a) para embaralhar de forma reprodutível por aluno. */
export function stableHash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Escolhe até `n` questões do banco: primeiro uma por item (cobertura), depois o
 * restante; a ordem varia por aluno (`seed`), sempre a mesma para o mesmo aluno.
 */
export function sampleQuestions<T extends { id: string; nodeKey: string }>(bank: readonly T[], n: number, seed: string): T[] {
  const shuffled = [...bank].sort((a, b) => stableHash(seed + a.id) - stableHash(seed + b.id));
  const picked: T[] = [];
  const seenNodes = new Set<string>();
  for (const q of shuffled) {
    if (picked.length >= n) break;
    if (!seenNodes.has(q.nodeKey)) {
      picked.push(q);
      seenNodes.add(q.nodeKey);
    }
  }
  for (const q of shuffled) {
    if (picked.length >= n) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return picked;
}

export const QUESTIONS_PER_LEVEL_FROM_BANK = 10;

export function composeStudy(topics: readonly CatalogTopicContent[], opts: { seed: string; moduleTitle: string; perLevel?: number }): ComposedStudy {
  if (!topics.length) throw new Error("Nenhum tema do catálogo para montar o estudo.");
  const perLevel = opts.perLevel ?? QUESTIONS_PER_LEVEL_FROM_BANK;
  let text = "";
  let seq = 0;
  const nodes: ExtractedNode[] = [];
  const units: ComposedUnit[] = [];
  const lessons: LessonPlan["modules"][number]["lessons"] = [];

  topics.forEach((t, i) => {
    const offset = text.length ? text.length + SEP.length : 0;
    text = text.length ? text + SEP + t.sourceText : t.sourceText;
    const keyMap: Record<string, string> = {};
    for (const n of t.nodes) keyMap[n.key] = key(++seq);
    for (const n of t.nodes) {
      nodes.push({
        ...n,
        key: keyMap[n.key]!,
        parentKey: n.parentKey ? (keyMap[n.parentKey] ?? null) : null,
        span: { start: n.span.start + offset, end: n.span.end + offset },
      });
    }
    const map = (k: string) => keyMap[k] ?? k;
    const lesson = {
      ...t.lesson,
      sections: t.lesson.sections.map((s) => ({ ...s, nodeKeys: s.nodeKeys.map(map), ...(s.sourceKey ? { sourceKey: map(s.sourceKey) } : {}) })),
      taughtNodeKeys: t.lesson.taughtNodeKeys.map(map),
    };
    const byLevel = (lv: LevelKey) =>
      sampleQuestions(t.questions.filter((q) => q.level === lv && keyMap[q.nodeKey]), perLevel, `${opts.seed}:${t.id}:${lv}`).map((q) => ({ ...q, nodeKey: map(q.nodeKey) }));
    const lessonKey = `CAT-L${i + 1}`;
    units.push({
      topicId: t.id,
      version: t.version,
      lessonKey,
      keyMap,
      lesson,
      questions: { facil: byLevel("facil"), medio: byLevel("medio"), dificil: byLevel("dificil") },
    });
    lessons.push({
      key: lessonKey,
      title: t.title,
      objective: t.lesson.objective,
      nodeKeys: t.nodes.filter((n) => n.requiresDirectCoverage).map((n) => keyMap[n.key]!),
      supplementary: [],
      prerequisiteLessonKeys: [],
      estimatedMinutes: t.estimatedMinutes ?? 40,
    });
  });

  return {
    normalizedText: text,
    nodes,
    plan: { modules: [{ key: "CAT-M1", title: opts.moduleTitle, lessons }] },
    units,
    disciplineMode: topics[0]!.disciplineMode,
  };
}
