import { describe, expect, it } from "vitest";
import { seloDaSecao } from "./section-kind";

describe("selo da seção", () => {
  it("dá rótulo legível aos tipos conhecidos", () => {
    expect(seloDaSecao("pegadinhas")?.rotulo).toBe("Pegadinhas");
    expect(seloDaSecao("texto_legal")?.rotulo).toBe("Lei seca");
    expect(seloDaSecao("interpretacao_banca")?.rotulo).toBe("Como a banca cobra");
  });
  it("tipo desconhecido ou vazio fica sem selo", () => {
    expect(seloDaSecao("inventado")).toBeNull();
    expect(seloDaSecao(null)).toBeNull();
    expect(seloDaSecao("")).toBeNull();
  });
});
