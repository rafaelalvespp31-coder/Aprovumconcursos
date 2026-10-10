import { describe, expect, it } from "vitest";
import { summarizePerformance, type AttemptRecord } from "./performance";

let t = 0;
const a = (over: Partial<AttemptRecord>): AttemptRecord => ({
  questionId: "q1",
  correct: true,
  at: new Date(Date.UTC(2026, 9, 1, 0, t++)).toISOString(),
  context: "fixacao",
  confidence: null,
  difficulty: 2,
  board: "FGV",
  subjectId: "m1",
  subjectTitle: "Ato administrativo",
  topic: "Anulação",
  lessonId: "l1",
  lessonTitle: "Aula 1",
  statement: "Enunciado",
  ...over,
});

describe("desempenho", () => {
  it("sem tentativas não inventa números", () => {
    const s = summarizePerformance([]);
    expect(s.activityAccuracy).toBeNull();
    expect(s.currentAccuracy).toBeNull();
    expect(s.bySubject).toEqual([]);
  });

  it("separa atividade (todas as tentativas) de situação atual (última por questão)", () => {
    const s = summarizePerformance([
      a({ questionId: "q1", correct: false }),
      a({ questionId: "q1", correct: false }),
      a({ questionId: "q1", correct: true }),
      a({ questionId: "q2", correct: false }),
    ]);
    expect(s.attempts).toBe(4);
    expect(s.questions).toBe(2);
    expect(s.activityAccuracy).toBe(0.25);
    expect(s.currentAccuracy).toBe(0.5);
  });

  it("agrupa por matéria, banca e dificuldade, piores matérias primeiro", () => {
    const s = summarizePerformance([
      a({ questionId: "q1", subjectId: "m1", correct: true }),
      a({ questionId: "q2", subjectId: "m2", subjectTitle: "Poderes", correct: false, board: "CEBRASPE", difficulty: 4 }),
    ]);
    expect(s.bySubject.map((b) => [b.label, b.currentAccuracy])).toEqual([["Poderes", 0], ["Ato administrativo", 1]]);
    expect(s.byBoard.map((b) => b.label).sort()).toEqual(["CEBRASPE", "FGV"]);
    expect(s.byDifficulty.map((b) => b.label)).toEqual(["Aplicação", "Avançada"]);
  });

  it("erros recorrentes: primeiro os que continuam errados", () => {
    const s = summarizePerformance([
      a({ questionId: "q1", correct: false }),
      a({ questionId: "q1", correct: false }),
      a({ questionId: "q1", correct: true }),
      a({ questionId: "q2", correct: false }),
      a({ questionId: "q3", correct: true }),
    ]);
    expect(s.recurringErrors.map((e) => [e.questionId, e.lastCorrect, e.wrongCount])).toEqual([
      ["q2", false, 1],
      ["q1", true, 2],
    ]);
  });

  it("confiança é calibração, não domínio", () => {
    const s = summarizePerformance([
      a({ questionId: "q1", correct: true, confidence: 1 }),
      a({ questionId: "q2", correct: false, confidence: 3 }),
      a({ questionId: "q3", correct: true, confidence: 3 }),
      a({ questionId: "q4", correct: true }),
    ]);
    expect(s.calibration).toEqual({ declared: 3, luckyGuesses: 1, confidentErrors: 1 });
    // A acurácia não muda por causa da confiança declarada.
    expect(s.currentAccuracy).toBe(0.75);
  });

  it("assuntos só aparecem com pelo menos 2 questões", () => {
    const s = summarizePerformance([a({ questionId: "q1", topic: "X" }), a({ questionId: "q2", topic: "Y" }), a({ questionId: "q3", topic: "Y" })]);
    expect(s.byTopic.map((b) => b.label)).toEqual(["Y"]);
  });
});
