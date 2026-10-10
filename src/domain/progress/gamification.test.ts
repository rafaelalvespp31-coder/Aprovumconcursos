import { describe, expect, it } from "vitest";
import { computeAchievements, computeGamification, computeLevel, computeStreak, streakMessage, type StudyStats } from "./gamification";

const base: StudyStats = {
  answered: 0, correct: 0, activeDays: [], maxInDay: 0, themesPassed: 0, themesMastered: 0, modulesClosed: 0, today: "2026-10-10",
};

describe("sequência de estudo", () => {
  it("conta dias seguidos até hoje", () => {
    const s = computeStreak(["2026-10-10", "2026-10-09", "2026-10-08", "2026-10-05"], "2026-10-10");
    expect(s).toMatchObject({ current: 3, best: 3, studiedToday: true });
    expect(s.last7).toEqual([false, true, false, false, true, true, true]);
  });
  it("mantém a sequência viva se ainda não estudou hoje", () => {
    expect(computeStreak(["2026-10-09", "2026-10-08"], "2026-10-10")).toMatchObject({ current: 2, studiedToday: false });
  });
  it("zera após um dia sem estudo, mas guarda o recorde", () => {
    const days = Array.from({ length: 8 }, (_, i) => `2026-09-${String(10 + i).padStart(2, "0")}`);
    expect(computeStreak(days, "2026-10-10")).toMatchObject({ current: 0, best: 8 });
  });
  it("ignora datas futuras e duplicadas", () => {
    expect(computeStreak(["2026-10-11", "2026-10-10", "2026-10-10"], "2026-10-10")).toMatchObject({ current: 1, best: 1 });
  });
  it("mensagem não exagera", () => {
    expect(streakMessage(computeStreak([], "2026-10-10"))).toMatch(/começar/);
    expect(streakMessage(computeStreak(["2026-10-10"], "2026-10-10"))).toMatch(/Faltam 6/);
  });
});

describe("nível por temas vencidos (sem XP)", () => {
  it("sobe um nível a cada 3 temas", () => {
    expect(computeLevel(0)).toEqual({ level: 1, intoLevel: 0, remaining: 3, progress: 0 });
    expect(computeLevel(2)).toMatchObject({ level: 1, remaining: 1 });
    expect(computeLevel(3)).toMatchObject({ level: 2, intoLevel: 0, remaining: 3 });
    expect(computeLevel(10)).toMatchObject({ level: 4, intoLevel: 1 });
  });
});

describe("conquistas com regras reais", () => {
  it("aluno novo não tem nenhuma conquista", () => {
    const g = computeGamification(base);
    expect(g.unlockedCount).toBe(0);
    expect(g.accuracy).toBeNull();
    expect(g.achievements.every((a) => a.progress === 0)).toBe(true);
  });
  it("cada regra desbloqueia somente no limite", () => {
    const days = Array.from({ length: 7 }, (_, i) => `2026-10-${String(4 + i).padStart(2, "0")}`);
    const s: StudyStats = { ...base, answered: 100, correct: 80, activeDays: days, maxInDay: 20, themesPassed: 25, themesMastered: 1, modulesClosed: 1 };
    const g = computeGamification(s);
    expect(g.unlockedCount).toBe(g.achievements.length);
    const almost = computeAchievements({ ...s, answered: 99, correct: 79, maxInDay: 19, themesPassed: 24 }, computeStreak(days.slice(1), s.today));
    const locked = almost.filter((a) => !a.unlocked).map((a) => a.id).sort();
    expect(locked).toEqual(["atirador", "centena", "devorador", "em_chamas", "rapido"]);
  });
  it("acerto alto com poucas respostas não vale 'atirador de elite'", () => {
    const a = computeAchievements({ ...base, answered: 10, correct: 10 }, computeStreak([], base.today)).find((x) => x.id === "atirador")!;
    expect(a.unlocked).toBe(false);
    expect(a.status).toBe("10 de 50 respostas");
  });
});
