import { describe, expect, it } from "vitest";
import { fundoDoConcurso } from "./fundos";

describe("fundoDoConcurso", () => {
  it("reconhece a PC MG por sigla ou por extenso", () => {
    expect(fundoDoConcurso("PC MG", "Investigador")).toBe("/orgs/pcmg-fundo.webp");
    expect(fundoDoConcurso("Concurso", "Polícia Civil do Estado de Minas Gerais")).toBe("/orgs/pcmg-fundo.webp");
    expect(fundoDoConcurso("PCMG 2026")).toBe("/orgs/pcmg-fundo.webp");
  });
  it("não inventa fundo para outros órgãos", () => {
    expect(fundoDoConcurso("Polícia Civil do Tocantins")).toBeNull();
    expect(fundoDoConcurso(null, undefined)).toBeNull();
  });
});
