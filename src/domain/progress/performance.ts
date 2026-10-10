/**
 * Indicadores de desempenho calculados SOMENTE a partir das tentativas reais do aluno.
 * Puro e determinístico (testado). Nenhum valor é estimado ou preenchido.
 *
 * Duas leituras diferentes, sempre identificadas:
 *  - "atividade": todas as tentativas (quanto o aluno praticou);
 *  - "situação atual": a ÚLTIMA tentativa de cada questão (o que ele sabe hoje).
 * A confiança declarada aparece como calibração, nunca como prova de domínio.
 */

export interface AttemptRecord {
  questionId: string;
  correct: boolean;
  at: string; // ISO
  context: string;
  confidence: number | null; // 1 chutei, 2 em dúvida, 3 certeza
  difficulty: number;
  board: string | null;
  subjectId: string; // módulo/matéria
  subjectTitle: string;
  topic: string | null; // assunto (item do conteúdo)
  lessonId: string;
  lessonTitle: string;
  statement: string;
}

export interface Bucket {
  key: string;
  label: string;
  /** Questões distintas com tentativa. */
  questions: number;
  /** Acertos na última tentativa de cada questão. */
  currentCorrect: number;
  /** Proporção atual (0–1); nula quando não há questões. */
  currentAccuracy: number | null;
  attempts: number;
}

export interface RecurringError {
  questionId: string;
  statement: string;
  lessonId: string;
  lessonTitle: string;
  wrongCount: number;
  lastCorrect: boolean;
}

export interface Calibration {
  /** Acertou dizendo "chutei": acerto frágil, vale revisar. */
  luckyGuesses: number;
  /** Errou dizendo "tenho certeza": conceito possivelmente aprendido errado. */
  confidentErrors: number;
  /** Tentativas com confiança declarada. */
  declared: number;
}

export interface PerformanceSummary {
  attempts: number;
  questions: number;
  activityAccuracy: number | null;
  currentAccuracy: number | null;
  bySubject: Bucket[];
  byBoard: Bucket[];
  byDifficulty: Bucket[];
  byTopic: Bucket[];
  recurringErrors: RecurringError[];
  calibration: Calibration;
}

function bucketize(
  latest: Map<string, AttemptRecord>,
  all: AttemptRecord[],
  keyOf: (a: AttemptRecord) => string | null,
  labelOf: (a: AttemptRecord) => string,
): Bucket[] {
  const map = new Map<string, Bucket>();
  const get = (a: AttemptRecord) => {
    const key = keyOf(a);
    if (key === null) return null;
    let b = map.get(key);
    if (!b) {
      b = { key, label: labelOf(a), questions: 0, currentCorrect: 0, currentAccuracy: null, attempts: 0 };
      map.set(key, b);
    }
    return b;
  };
  for (const a of all) {
    const b = get(a);
    if (b) b.attempts++;
  }
  for (const a of latest.values()) {
    const b = get(a);
    if (!b) continue;
    b.questions++;
    if (a.correct) b.currentCorrect++;
  }
  for (const b of map.values()) b.currentAccuracy = b.questions ? b.currentCorrect / b.questions : null;
  return [...map.values()];
}

export function summarizePerformance(records: AttemptRecord[]): PerformanceSummary {
  const sorted = [...records].sort((a, b) => a.at.localeCompare(b.at));
  const latest = new Map<string, AttemptRecord>();
  const wrongCount = new Map<string, number>();
  for (const a of sorted) {
    latest.set(a.questionId, a);
    if (!a.correct) wrongCount.set(a.questionId, (wrongCount.get(a.questionId) ?? 0) + 1);
  }

  const activityCorrect = sorted.filter((a) => a.correct).length;
  const currentCorrect = [...latest.values()].filter((a) => a.correct).length;

  const bySubject = bucketize(latest, sorted, (a) => a.subjectId, (a) => a.subjectTitle)
    .sort((a, b) => (a.currentAccuracy ?? 1) - (b.currentAccuracy ?? 1) || b.questions - a.questions);
  const byBoard = bucketize(latest, sorted, (a) => a.board ?? "sem_banca", (a) => a.board ?? "Sem banca")
    .sort((a, b) => b.questions - a.questions);
  const byDifficulty = bucketize(latest, sorted, (a) => String(a.difficulty), (a) => DIFFICULTY_LABELS[a.difficulty] ?? `Nível ${a.difficulty}`)
    .sort((a, b) => Number(a.key) - Number(b.key));
  const byTopic = bucketize(latest, sorted, (a) => a.topic, (a) => a.topic ?? "")
    .filter((b) => b.questions >= 2)
    .sort((a, b) => (a.currentAccuracy ?? 1) - (b.currentAccuracy ?? 1));

  const recurringErrors: RecurringError[] = [...latest.values()]
    .filter((a) => (wrongCount.get(a.questionId) ?? 0) >= 2 || !a.correct)
    .map((a) => ({
      questionId: a.questionId,
      statement: a.statement,
      lessonId: a.lessonId,
      lessonTitle: a.lessonTitle,
      wrongCount: wrongCount.get(a.questionId) ?? 0,
      lastCorrect: a.correct,
    }))
    // Primeiro os que ainda estão errados; depois os que mais erraram.
    .sort((a, b) => Number(a.lastCorrect) - Number(b.lastCorrect) || b.wrongCount - a.wrongCount)
    .slice(0, 10);

  const declared = sorted.filter((a) => a.confidence !== null);
  return {
    attempts: sorted.length,
    questions: latest.size,
    activityAccuracy: sorted.length ? activityCorrect / sorted.length : null,
    currentAccuracy: latest.size ? currentCorrect / latest.size : null,
    bySubject,
    byBoard,
    byDifficulty,
    byTopic: byTopic.slice(0, 12),
    recurringErrors,
    calibration: {
      declared: declared.length,
      luckyGuesses: declared.filter((a) => a.confidence === 1 && a.correct).length,
      confidentErrors: declared.filter((a) => a.confidence === 3 && !a.correct).length,
    },
  };
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: "Compreensão",
  2: "Aplicação",
  3: "Interpretação",
  4: "Avançada",
  5: "Integradora",
};
