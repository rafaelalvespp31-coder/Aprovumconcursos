import { describe, expect, it } from "vitest";
import { buildStudyPlan } from "./plan";
import { diaConcluido, examDayFrom, monthCells } from "./plano-calendario";

const plan = buildStudyPlan({ contest: "Polícia Penal MG", dailyMinutes: 120, subjects: [{ name: "Direito Penal", pct: 50, pendingLessons: 2 }, { name: "Português", pct: 80, pendingLessons: 0 }], reviewsDue: 0, today: "2026-11-20", examDate: "2026-12-10" });

describe("calendário do plano de estudo", () => {
  it("novembro de 2026: 30 dias, cada data com o plano do seu dia da semana", () => {
    const c = monthCells(plan, 2026, 10, "2026-11-20", "2026-12-10");
    expect(c).toHaveLength(30);
    expect(c[0]?.weekday).toBe(0); // 1/11/2026 é domingo
    expect(c[19]).toMatchObject({ key: "2026-11-20", weekday: 5, isToday: true });
    expect(c[19]?.plan?.blocks.length).toBeGreaterThan(0);
    expect(c[0]?.isPast).toBe(true);
    expect(c[25]?.isPast).toBe(false);
  });
  it("marca o dia da prova e não programa estudo nem na prova nem depois", () => {
    const c = monthCells(plan, 2026, 11, "2026-11-20", "2026-12-10");
    const prova = c.find((x) => x.key === "2026-12-10")!;
    expect(prova.isExam).toBe(true);
    expect(prova.plan).toBeNull();
    const depois = c.find((x) => x.key === "2026-12-11")!;
    expect(depois.afterExam).toBe(true);
    expect(depois.plan).toBeNull();
    expect(c.find((x) => x.key === "2026-12-09")?.plan).not.toBeNull();
  });
  it("sem data de prova o estudo segue indefinidamente", () => {
    const c = monthCells(plan, 2027, 5, "2026-11-20", null);
    expect(c.filter((x) => x.plan).length).toBeGreaterThan(20);
    expect(c.some((x) => x.isExam || x.afterExam)).toBe(false);
  });
  it("calcula o dia da prova e a conclusão do dia", () => {
    expect(examDayFrom("2026-11-20", 20)).toBe("2026-12-10");
    expect(examDayFrom("2026-11-20", null)).toBeNull();
    expect(examDayFrom("2026-11-20", -3)).toBeNull();
    const d = plan.days.find((x) => x.weekday === 1)!;
    expect(diaConcluido(d, [0, 1])).toBe(false);
    expect(diaConcluido(d, d.blocks.map((_, i) => i))).toBe(true);
    expect(diaConcluido(null, [0])).toBe(false);
  });
});
