import { describe, expect, it } from "vitest";
import { aggregateIncidence, cutoffSeries, insightText, niceScale, projectNext, type CutoffLike } from "./painel";

const c = (id: string, year: number, score: number, over: Partial<CutoffLike> = {}): CutoffLike => ({ id, editionYear: year, position: null, modality: "ampla", kind: "minima_aprovacao", score, maxScore: 100, ...over });

describe("cutoffSeries", () => {
  it("não mistura tipos e usa o mais frequente, um ponto por ano, em ordem cronológica", () => {
    const s = cutoffSeries([c("a", 2022, 50), c("b", 2020, 40), c("x", 2021, 99, { kind: "ultimo_classificado" }), c("d", 2024, 60)], "todas")!;
    expect(s.kind).toBe("minima_aprovacao");
    expect(s.points.map((p) => p.year)).toEqual([2020, 2022, 2024]);
    expect(s.unit).toBe("%");
  });
  it("usa pontos quando falta a nota máxima e respeita a modalidade", () => {
    const s = cutoffSeries([c("a", 2022, 50, { maxScore: null }), c("b", 2023, 5, { modality: "pcd" })], "ampla")!;
    expect(s.unit).toBe("pts");
    expect(s.points).toHaveLength(1);
    expect(cutoffSeries([], "todas")).toBeNull();
  });
});

describe("projectNext", () => {
  const pts = (v: number[]) => v.map((value, i) => ({ year: 2020 + i, value, score: value, maxScore: null, id: String(i) }));
  it("exige 3 edições", () => expect(projectNext(pts([1, 2]))).toBeNull());
  it("extrapola a tendência linear e informa a confiança", () => {
    const p = projectNext(pts([60, 65, 70, 75, 80]))!;
    expect(p.year).toBe(2025);
    expect(p.value).toBeCloseTo(85, 5);
    expect(p.confidence).toBe("alta");
  });
  it("respeita o teto", () => expect(projectNext(pts([80, 90, 100]), 100)!.value).toBe(100));
});

describe("incidência", () => {
  const eds = [
    { year: 2024, board: null, denominator: 60, rows: [{ name: "A", questions: 40 }, { name: "B", questions: 20 }] },
    { year: 2022, board: null, denominator: 20, rows: [{ name: "B", questions: 20 }] },
  ];
  it("agrega todas as provas e filtra por ano", () => {
    expect(aggregateIncidence(eds, "todas").total).toBe(80);
    const y = aggregateIncidence(eds, 2024);
    expect(y.rows[0]).toMatchObject({ name: "A", pct: (40 / 60) * 100 });
    expect(insightText(y.rows)?.name).toBe("A");
    expect(insightText([])).toBeNull();
  });
});

describe("niceScale", () => {
  it("gera ticks cobrindo o intervalo", () => {
    const s = niceScale(64.7, 82.4);
    expect(s.min).toBeLessThanOrEqual(64.7);
    expect(s.max).toBeGreaterThanOrEqual(82.4);
    expect(s.ticks.length).toBeGreaterThan(2);
  });
});
