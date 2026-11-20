import { describe, expect, it } from "vitest";
import { EDITAL_MIN_SCORE, nameScore } from "./edital-match";

describe("nameScore", () => {
  it("reconhece o mesmo concurso escrito de jeitos diferentes", () => {
    expect(nameScore("PRF 2027 Polícia Rodoviária Federal Policial Rodoviário Federal", "Policia rodoviária federal Agente de polícia rodoviário federal")).toBeGreaterThanOrEqual(EDITAL_MIN_SCORE);
    expect(nameScore("PC MG Policia Civil do Estado de Minas Gerais Investigador", "Polícia Civil MG Investigador")).toBeGreaterThanOrEqual(EDITAL_MIN_SCORE);
  });
  it("não confunde concursos diferentes", () => {
    expect(nameScore("PM SP Policia Militar do Estado de São Paulo", "Polícia Civil do Estado de Minas Gerais Investigador")).toBeLessThan(EDITAL_MIN_SCORE);
    expect(nameScore("PRF", "Polícia Federal")).toBe(0);
  });
});
