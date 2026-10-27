import { describe, expect, it } from "vitest";
import type { ThemeCard } from "@/domain/studies/home";
import { buildKnowledgeMap, radarPoint, searchMap, territorySlots } from "./model";

const st = (pct: number, done = false): ThemeCard["study"] => ({ trailId: "t", answered: 1, totalQuestions: 2, lessonsDone: 0, lessonsTotal: 1, lastStudiedAt: null, pct, done });
const themes: ThemeCard[] = [
  { id: "a", title: "Roubo (CP, art. 157)", discipline: "Direito Penal", questions: 30, minutes: 60, study: st(50) },
  { id: "b", title: "Homicídio (CP, art. 121)", discipline: "Direito Penal", questions: 36, minutes: 90, study: null },
  { id: "c", title: "Coesão textual", discipline: "Língua Portuguesa", questions: 20, minutes: 40, study: st(100, true) },
  { id: "d", title: "Tema sem matéria conhecida", discipline: "Astronomia", questions: 0, minutes: 10, study: null },
];

describe("mapa do conhecimento", () => {
  it("agrupa os temas reais por matéria, com contagens e progresso verdadeiros", () => {
    const m = buildKnowledgeMap(themes);
    expect(m.territories.map((t) => t.id)).toEqual(["direito_penal", "lingua_portuguesa", "outras"]);
    const penal = m.territories[0]!;
    expect(penal.topics.map((t) => t.id)).toEqual(["b", "a"]);
    expect(penal).toMatchObject({ questions: 66, started: 1, done: 0, progress: 25 });
    expect(m.territories[2]!.progress).toBeNull();
    expect(m.totals).toEqual({ disciplines: 3, topics: 4, questions: 86, started: 2, done: 1 });
  });

  it("catálogo vazio vira mapa vazio (sem dados inventados)", () => {
    expect(buildKnowledgeMap([])).toEqual({ territories: [], totals: { disciplines: 0, topics: 0, questions: 0, started: 0, done: 0 } });
  });

  it("territórios não se sobrepõem", () => {
    const s = territorySlots(10);
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) expect(Math.hypot(s[i]![0] - s[j]![0], s[i]![1] - s[j]![1])).toBeGreaterThan(10);
  });

  it("busca matérias e assuntos sem acento e com várias palavras", () => {
    const m = buildKnowledgeMap(themes);
    expect(searchMap(m, "homicidio").map((h) => (h.kind === "assunto" ? h.topic.id : h.territory.id))).toEqual(["b"]);
    expect(searchMap(m, "penal")[0]).toMatchObject({ kind: "materia" });
    expect(searchMap(m, "art 157 penal")).toHaveLength(1);
    expect(searchMap(m, "   ")).toEqual([]);
  });

  it("radar: norte do mapa para cima e posições dentro do círculo", () => {
    expect(radarPoint([0, 0])).toEqual([0.5, 0.5]);
    const [, y] = radarPoint([0, -20]);
    expect(y).toBeLessThan(0.5);
  });
});
