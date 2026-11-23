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

import { cargoHits, concursoScore, estadoDe, orgaosDe } from "./edital-match";

describe("concursoScore (concurso escolhido × edital)", () => {
  const MG = "Polícia Civil do Estado de Minas Gerais Investigador de Polícia I";
  it("PC MG casa com o edital da Polícia Civil de Minas, não com PRF nem com outros estados", () => {
    expect(concursoScore("PC MG", MG)).toBe(1);
    expect(concursoScore("PC MG", "Polícia Civil MG Investigador")).toBe(1);
    expect(concursoScore("PC MG", "Policia rodoviária federal Agente de polícia rodoviário federal")).toBe(0);
    expect(concursoScore("PC MG", "Prf Prf")).toBe(0);
    expect(concursoScore("PC MG", "Secretaria da Administração do Estado da Bahia Investigador de Polícia Civil")).toBe(0);
    expect(concursoScore("PC MG", "pm sp soldado")).toBe(0);
  });
  it("PRF e PF são distintas; federais não precisam de estado", () => {
    expect(concursoScore("PRF", "Policia rodoviária federal Agente")).toBe(1);
    expect(concursoScore("PF", "Policia rodoviária federal Agente")).toBe(0);
    expect(concursoScore("Polícia Federal", "Polícia Federal Agente")).toBe(1);
  });
  it("órgão estadual sem estado no pedido não casa (ambíguo)", () => {
    expect(concursoScore("Polícia Civil", MG)).toBe(0);
  });
  it("PM GO só com Goiás; Polícia Penal MG com Minas", () => {
    expect(concursoScore("PM GO", "Pm go Soldado")).toBe(1);
    expect(concursoScore("PM GO", "Secretaria de Estado da Administração do Estado de Goiás Soldado 2ª Classe Polícia Militar")).toBe(1);
    expect(concursoScore("PM GO", "pm sp soldado")).toBe(0);
    expect(concursoScore("Polícia Penal MG", "Polícia Penal de Minas Gerais Agente de Segurança Penitenciário")).toBe(1);
  });
  it("sem órgão policial cai no nome parecido", () => {
    expect(concursoScore("Banco do Brasil Escriturário", "Banco do Brasil Escriturário Agente Comercial")).toBeGreaterThanOrEqual(EDITAL_MIN_SCORE);
    expect(concursoScore("INSS Técnico", "Banco do Brasil Escriturário")).toBe(0);
  });
  it("detecta órgão e estado", () => {
    expect(orgaosDe("PC MG")).toEqual(["pc"]);
    expect(estadoDe("PC MG")).toBe("mg");
    expect(estadoDe("Polícia Civil MG Investigador")).toBe("mg");
    expect(estadoDe("Estado de Mato Grosso do Sul")).toBe("ms");
    expect(estadoDe("Investigador de Polícia Civil")).toBeNull();
    expect(estadoDe("Soldado se candidatou")).toBeNull();
  });
  it("cargo desempata", () => {
    expect(cargoHits("PC MG Escrivão", "Escrivão de Polícia")).toBeGreaterThan(cargoHits("PC MG Escrivão", "Investigador de Polícia I"));
  });
});
