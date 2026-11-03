import { describe, expect, it } from "vitest";
import { accuracy, daysUntil, formatStudyTime, levelPct, missionXp, nextMilestone, rankTrend, subjectSplit, weekDays, weeklyEvolution } from "./home";

const missions = (e: boolean, c: boolean, r: boolean) => ({
  day: "2026-11-03",
  completed: [e, c, r].filter(Boolean).length,
  estudar: { progress: e ? 1 : 0, target: 1, done: e },
  combater: { progress: c ? 20 : 5, target: 20, done: c },
  revisar: { progress: r ? 15 : 0, target: 15, done: r },
});
const xp = { estudar: 100, combater: 100, revisar: 100, bonus: 300 };

describe("home gamificada", () => {
  it("barra do nível pelo XP real", () => {
    expect(levelPct({ xp: 1000, levelFloor: 0, levelNext: 1100 })).toBe(91);
    expect(levelPct({ xp: 1100, levelFloor: 1100, levelNext: 2300 })).toBe(0);
  });

  it("XP do dia: ganho e disponível, bônus só com as 3 missões", () => {
    expect(missionXp({ missions: missions(true, true, false), missionXp: xp })).toEqual({ earned: 200, available: 400 });
    expect(missionXp({ missions: missions(true, true, true), missionXp: xp })).toEqual({ earned: 600, available: 0 });
    expect(missionXp({ missions: missions(false, false, false), missionXp: xp })).toEqual({ earned: 0, available: 600 });
  });

  it("próxima meta de disciplina", () => {
    expect(nextMilestone(0, [7, 15, 30, 60])).toBe(7);
    expect(nextMilestone(7, [7, 15, 30, 60])).toBe(15);
    expect(nextMilestone(60, [7, 15, 30, 60])).toBeNull();
  });

  it("semana de segunda a domingo com dias feitos, perdidos, hoje e futuros", () => {
    // 2026-11-03 é terça.
    const w = weekDays("2026-11-03", ["2026-11-02"]);
    expect(w.map((d) => d.state)).toEqual(["feito", "hoje", "futuro", "futuro", "futuro", "futuro", "futuro"]);
    expect(weekDays("2026-11-04", ["2026-11-04"]).map((d) => d.state).slice(0, 3)).toEqual(["perdido", "perdido", "feito"]);
  });

  it("sem dados não inventa número", () => {
    expect(accuracy(0, 0)).toBeNull();
    expect(accuracy(82, 100)).toBe(82);
    expect(weeklyEvolution({ answered: 5, correct: 5, prevAnswered: 30, prevCorrect: 10 })).toBeNull();
    expect(weeklyEvolution({ answered: 20, correct: 18, prevAnswered: 20, prevCorrect: 12 })).toBe(30);
    expect(formatStudyTime(30)).toBeNull();
    expect(formatStudyTime(8943)).toBe("2h 29min");
    expect(formatStudyTime(48 * 3600 + 120)).toBe("48h");
    expect(rankTrend({ position: 15, total: 40, previous: 18 })).toBe(3);
    expect(rankTrend({ position: 15, total: 40, previous: null })).toBeNull();
  });

  it("matérias fortes e que precisam de atenção", () => {
    const s = subjectSplit([
      { name: "Homicídio", answered: 34, correct: 34 },
      { name: "Inquérito", answered: 34, correct: 32 },
      { name: "Processo Penal", answered: 20, correct: 9 },
      { name: "Constitucional", answered: 10, correct: 6 },
    ]);
    expect(s.best.map((x) => x.name)).toEqual(["Homicídio", "Inquérito"]);
    expect(s.attention.map((x) => [x.name, x.pct])).toEqual([["Processo Penal", 45], ["Constitucional", 60]]);
  });

  it("contagem regressiva só com data confirmada e futura", () => {
    expect(daysUntil("2027-07-27", true, "2026-11-01")).toBe(268);
    expect(daysUntil("2027-07-27", false, "2026-11-01")).toBeNull();
    expect(daysUntil(null, true, "2026-11-01")).toBeNull();
    expect(daysUntil("2026-10-01", true, "2026-11-01")).toBeNull();
  });
});
