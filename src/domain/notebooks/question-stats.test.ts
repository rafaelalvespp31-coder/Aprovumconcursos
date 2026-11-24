import { describe, expect, it } from "vitest";
import { MIN_SAMPLE, pct, questionStatsSchema } from "./question-stats";

describe("estatísticas da questão", () => {
  it("percentual inteiro e zero sem respostas", () => {
    expect(pct(31, 50)).toBe(62);
    expect(pct(1, 3)).toBe(33);
    expect(pct(0, 0)).toBe(0);
  });
  it("aceita o formato devolvido pelo banco e recusa números negativos", () => {
    const ok = { type: "multipla_escolha", total: 25, correct: 18, wrong: 7, students: 13, options: [{ label: "A", isCorrect: false, count: 3 }, { label: "B", isCorrect: true, count: 18 }], mine: { attempts: 8, correct: 7 } };
    expect(questionStatsSchema.parse(ok).total).toBe(25);
    expect(() => questionStatsSchema.parse({ ...ok, total: -1 })).toThrow();
    expect(MIN_SAMPLE).toBeGreaterThan(1);
  });
});
