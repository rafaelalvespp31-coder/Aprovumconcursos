import { describe, expect, it } from "vitest";
import { activityLevel, byRecent, todayBr, yearGrid, yearSummary } from "./model";

describe("cadernos", () => {
  it("ordem de recentes: último uso, senão criação", () => {
    const xs = [
      { id: "a", lastOpenedAt: null, createdAt: "2026-01-01T00:00:00Z" },
      { id: "b", lastOpenedAt: "2026-10-01T00:00:00Z", createdAt: "2025-01-01T00:00:00Z" },
      { id: "c", lastOpenedAt: null, createdAt: "2026-05-01T00:00:00Z" },
    ];
    expect(xs.sort(byRecent).map((x) => x.id)).toEqual(["b", "c", "a"]);
  });
});

describe("mapa anual", () => {
  it("faixas de intensidade", () => {
    expect([0, 1, 9, 10, 29, 30, 200].map(activityLevel)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it("grade: 12 meses, dias certos, semana começando no domingo e dias futuros marcados", () => {
    const counts = new Map([["2026-10-21", 12], ["2026-02-28", 3], ["2025-12-31", 50]]);
    const g = yearGrid(2026, counts, "2026-10-21");
    expect(g).toHaveLength(12);
    const days = (m: number) => g[m]!.flat().filter((c) => c.date).length;
    expect(days(1)).toBe(28);
    expect(days(9)).toBe(31);
    // 01/10/2026 é quinta-feira: 4 espaços antes (dom, seg, ter, qua).
    expect(g[9]![0]!.slice(0, 4).every((c) => !c.date)).toBe(true);
    expect(g[9]![0]![4]!.date).toBe("2026-10-01");
    const out = g[9]!.flat().find((c) => c.date === "2026-10-21")!;
    expect(out).toMatchObject({ answers: 12, level: 2, future: false });
    expect(g[9]!.flat().find((c) => c.date === "2026-10-22")!.future).toBe(true);
    expect(yearSummary(counts, 2026)).toEqual({ days: 2, answers: 15 });
  });
  it("hoje no fuso de Brasília", () => {
    expect(todayBr(new Date("2026-10-21T02:30:00Z"))).toBe("2026-10-20");
    expect(todayBr(new Date("2026-10-21T03:30:00Z"))).toBe("2026-10-21");
  });
});
