import { describe, expect, it } from "vitest";
import { levelFor, patente, tierFor, toNextLevel } from "@/domain/quiz/levels";

describe("níveis do Modo Jogo", () => {
  it("sobe de nível a cada 10 questões respondidas", () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(9)).toBe(1);
    expect(levelFor(10)).toBe(2);
    expect(levelFor(29)).toBe(3);
    expect(toNextLevel(0)).toBe(10);
    expect(toNextLevel(13)).toBe(7);
  });
  it("a dificuldade aumenta e trava em Elite", () => {
    expect([1, 2, 3, 4, 9].map((l) => tierFor(l).label)).toEqual(["Fácil", "Médio", "Difícil", "Elite", "Elite"]);
    expect(tierFor(2).blanks).toBeGreaterThan(tierFor(1).blanks);
    expect(tierFor(4).context).toBe(false);
  });
  it("patentes", () => {
    expect(patente(1)).toBe("Recruta");
    expect(patente(10)).toBe("Coronel");
    expect(patente(11)).toBe("Coronel ★2");
  });
});
