import { describe, expect, it } from "vitest";
import { computeOverview, type OvStudy } from "./overview";

const isDone = (status: string, pcts: number[]) => (status === "completa" || status === "parcial") && pcts.length > 0 && pcts.every((x) => x >= 100);
const NOW = Date.parse("2026-11-07T12:00:00Z");
const old = "2026-10-01T00:00:00Z";
const recent = "2026-11-05T00:00:00Z";

describe("computeOverview", () => {
  const preps = [
    { id: "A", createdAt: old, ready: true },
    { id: "B", createdAt: old, ready: true },
    { id: "C", createdAt: old, ready: false }, // ainda processando: fica de fora
  ];
  const topics = [
    { id: "a1", prepId: "A", status: "completa" },
    { id: "a2", prepId: "A", status: "completa" },
    { id: "a3", prepId: "A", status: "nao_encontrado" },
    { id: "a4", prepId: "A", status: "parcial" },
    { id: "b1", prepId: "B", status: "completa" },
    { id: "b2", prepId: "B", status: "completa" },
  ];
  const links = [
    { topicId: "a1", catalogId: "x" },
    { topicId: "a2", catalogId: "y" },
    { topicId: "a4", catalogId: "z" },
    { topicId: "b1", catalogId: "x" }, // a mesma aula vale nos dois editais
    { topicId: "b2", catalogId: "w" },
  ];
  const study = new Map<string, OvStudy>([
    ["x", { pct: 100, lessonId: "Lx", doneAt: "2026-10-10T00:00:00Z", lastAt: "2026-10-10T00:00:00Z" }],
    ["y", { pct: 100, lessonId: "Ly", doneAt: recent, lastAt: recent }],
    ["z", { pct: 50, lessonId: "Lz", doneAt: null, lastAt: "2026-11-06T00:00:00Z" }],
  ]);
  const attempts = [
    { id: "q1", catalogId: "x", createdAt: "2026-10-05T00:00:00Z" },
    { id: "q2", catalogId: "z", createdAt: "2026-11-06T10:00:00Z" },
    { id: "q0", catalogId: "x", createdAt: "2026-09-01T00:00:00Z" }, // antes do edital: não conta
  ];
  const ov = computeOverview({ preps, topics, links, study, attempts, isDone }, NOW);

  it("% de cada edital só com os próprios tópicos (aula aberta não conta)", () => {
    expect(ov.byPrep.get("A")).toMatchObject({ topics: 4, topicsDone: 2, pct: 50, lessons: 3, lessonsDone: 2, started: true });
    expect(ov.byPrep.get("B")).toMatchObject({ topics: 2, topicsDone: 1, pct: 50, lessons: 2, lessonsDone: 1 });
    expect(ov.byPrep.has("C")).toBe(false);
  });
  it("próxima atividade: aula em andamento primeiro", () => {
    expect(ov.byPrep.get("A")!.nextLessonId).toBe("Lz");
    expect(ov.byPrep.get("B")!.nextLessonId).toBeNull(); // aula "w" ainda não está em Meus estudos
  });
  it("questões: depois do envio do edital, sem contar duas vezes a mesma tentativa", () => {
    expect(ov.byPrep.get("A")!.questions).toBe(2);
    expect(ov.byPrep.get("B")!.questions).toBe(1);
    expect(ov.questions).toBe(2);
  });
  it("média e evolução em 7 dias", () => {
    expect(ov.analyzed).toBe(2);
    expect(ov.avgPct).toBe(50);
    // há 7 dias: A tinha 1/4 (25%), B 1/2 (50%) → média 38; hoje 50 → +12
    expect(ov.evolution7d).toBe(12);
  });
  it("sem nenhuma aula concluída: evolução sem dados", () => {
    const o = computeOverview({ preps, topics, links, study: new Map(), attempts: [], isDone }, NOW);
    expect(o.evolution7d).toBeNull();
    expect(o.avgPct).toBe(0);
    expect(o.byPrep.get("A")!.started).toBe(false);
  });
});
