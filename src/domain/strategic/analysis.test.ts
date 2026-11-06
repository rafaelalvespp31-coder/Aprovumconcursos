import { describe, expect, it } from "vitest";
import { compareLastTwo, denominator, heatmap, subjectIncidence, type Edition } from "./analysis";

const ed = (year: number, total: number | null, subjects: Edition["subjects"]): Edition => ({ id: String(year), year, board: "X", totalQuestions: total, countingRule: null, subjects });
const t = (title: string, questions: number) => ({ title, questions, annulled: 0 });
const A = ed(2021, 100, [{ name: "Direito Penal", mode: "direito_penal", questions: 12, annulled: 0, topics: [t("Crimes contra a Administração Pública", 3), t("Teoria do crime", 2)] }]);
const B = ed(2024, 100, [{ name: "Direito Penal", mode: "direito_penal", questions: 15, annulled: 1, topics: [t("Crimes contra a Administração Pública", 5), t("Pena", 4)] }]);

describe("analysis", () => {
  it("incidência com denominador explícito", () => {
    const r = subjectIncidence(B);
    expect(r.denominator).toBe(100);
    expect(r.rows[0]!.pct).toBe(15);
    expect(denominator(ed(2020, null, [{ name: "a", mode: null, questions: 7, annulled: 0, topics: [] }]))).toBe(7);
  });
  it("compara as duas últimas provas", () => {
    const c = compareLastTwo([A, B])!;
    expect(c.recent.year).toBe(2024);
    expect(c.subjects[0]).toMatchObject({ recent: 15, previous: 12, delta: 3 });
    const adm = c.topics.find((x) => /Administração/.test(x.title))!;
    expect(adm).toMatchObject({ recent: 5, previous: 3, presence: "ambas" });
    expect(c.topics.find((x) => x.title === "Pena")!.presence).toBe("so_recente");
    expect(c.topics.find((x) => x.title === "Teoria do crime")!.presence).toBe("so_anterior");
  });
  it("uma prova só não compara", () => expect(compareLastTwo([A])).toBeNull());
  it("mapa de calor exige dados suficientes para classificar", () => {
    expect(heatmap([A]).cells.every((c) => c.heat === "sem_dados")).toBe(true);
    const h = heatmap([A, B]);
    expect(h.cells[0]!.title).toMatch(/Administração/);
    expect(h.cells[0]!.heat).toBe("muito_alta"); // média (3% + 5%)/2 = 4%
  });
});
