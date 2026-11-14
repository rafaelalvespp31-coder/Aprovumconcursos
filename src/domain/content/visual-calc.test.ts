import { describe, expect, it } from "vitest";
import { schemeSchema } from "./visual";

describe("esquemas de linha do tempo e cálculo", () => {
  it("aceita vigência de leis com faixas e marcos com data", () => {
    const r = schemeSchema.safeParse({ tipo: "linha_tempo", unidade: "", marcos: [{ em: 0, data: "Lei antiga", rotulo: "Início" }, { em: 5, data: "Fato", rotulo: "Crime" }, { em: 8, data: "Sentença", rotulo: "Lei nova em vigor" }], faixas: [{ de: 0, ate: 6, rotulo: "Lei A vigente", estado: "ok" }, { de: 6, ate: 10, rotulo: "Lei B vigente", estado: "alerta" }] });
    expect(r.success).toBe(true);
  });
  it("aceita cálculo com passos, total e barra", () => {
    const r = schemeSchema.safeParse({ tipo: "calculo", passos: [{ rotulo: "Pena-base", conta: "6 anos", resultado: "6 anos" }, { rotulo: "Aumento de 1/3", conta: "6 × 1/3", resultado: "2 anos" }], total: { rotulo: "Pena final", valor: "8 anos" }, barra: [{ rotulo: "Base", valor: 6 }, { rotulo: "Aumento", valor: 2, estado: "alerta" }] });
    expect(r.success).toBe(true);
  });
  it("ainda aceita a linha do tempo numérica antiga", () => {
    expect(schemeSchema.safeParse({ tipo: "linha_tempo", unidade: "dias", marcos: [{ em: 0, rotulo: "A" }, { em: 5, rotulo: "B" }] }).success).toBe(true);
  });
});
