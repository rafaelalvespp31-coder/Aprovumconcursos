import { describe, expect, it } from "vitest";
import { buildStudyPlan, daysUntil, planAsText, rankSubjects } from "./plan";

const base = { contest: "Polícia Penal MG", dailyMinutes: 120, reviewsDue: 3, today: "2026-11-14", subjects: [
  { name: "Direito Penal", pct: 55, pendingLessons: 4 },
  { name: "Português", pct: 90, pendingLessons: 0 },
  { name: "Matemática", pct: null, pendingLessons: 1 },
] };

describe("plano de estudo do Mentor", () => {
  it("cobre os 7 dias, respeita o tempo diário e põe a matéria mais fraca primeiro", () => {
    const p = buildStudyPlan(base);
    expect(p.days).toHaveLength(7);
    expect(p.days[0]!.label).toBe("Segunda");
    expect(p.days[0]!.blocks[0]!.subject).toBe("Direito Penal");
    for (const d of p.days.slice(0, 6)) expect(Math.abs(d.minutes - 120)).toBeLessThanOrEqual(15);
    expect(p.weeklyQuestions).toBeGreaterThan(0);
    expect(p.notes.join(" ")).toContain("3 revisões vencidas");
  });
  it("usa a meta de questões do aluno e a data da prova", () => {
    const p = buildStudyPlan({ ...base, dailyQuestions: 40, examDate: "2026-12-14" });
    expect(p.daysToExam).toBe(30);
    expect(p.days[1]!.questions).toBe(40);
    expect(p.notes.join(" ")).toContain("Faltam 30 dias");
  });
  it("sem matérias, orienta começar pelas aulas", () => {
    const p = buildStudyPlan({ ...base, subjects: [] });
    expect(p.notes.join(" ")).toContain("Ainda não há matérias");
  });
  it("ranking e datas", () => {
    expect(rankSubjects(base.subjects)[0]!.name).toBe("Direito Penal");
    expect(daysUntil("2026-11-20", "2026-11-14")).toBe(6);
    expect(daysUntil(null, "2026-11-14")).toBeNull();
    expect(planAsText(buildStudyPlan(base))).toContain("PLANO SEMANAL PARA Polícia Penal MG");
  });
});
