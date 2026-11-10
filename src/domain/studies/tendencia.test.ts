import { describe, expect, it } from "vitest";
import { tendenciaAulas, variacaoSemanal } from "./tendencia";

const AGORA = Date.parse("2026-11-10T12:00:00Z");
const ha = (d: number) => new Date(AGORA - d * 86_400_000).toISOString();

describe("tendenciaAulas", () => {
  it("acumula por semana e termina no total de hoje", () => {
    const r = tendenciaAulas([ha(100), ha(40), ha(10), ha(1)], AGORA, 4);
    expect(r.serie).toEqual([2, 2, 3, 4]);
  });
  it("crescimento de 30 dias só com base anterior", () => {
    expect(tendenciaAulas([ha(100), ha(40), ha(10), ha(1)], AGORA).pct30).toBe(100);
    expect(tendenciaAulas([ha(3), ha(1)], AGORA).pct30).toBeNull();
    expect(tendenciaAulas([ha(90)], AGORA).pct30).toBeNull();
  });
});

describe("variacaoSemanal", () => {
  it("compara a semana atual com a anterior", () => {
    expect(variacaoSemanal([0, 0, 3600, 5400])).toBe(50);
    expect(variacaoSemanal([0, 0, 3600, 1800])).toBe(-50);
  });
  it("sem semana anterior não inventa número", () => {
    expect(variacaoSemanal([0, 0, 0, 1200])).toBeNull();
    expect(variacaoSemanal([10])).toBeNull();
  });
});
