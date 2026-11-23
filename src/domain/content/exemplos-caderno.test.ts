import { describe, expect, it } from "vitest";
import { GRUPOS_CADERNO, exemplosDoCaderno, secaoCaderno } from "./exemplos-caderno";
import { parseCalculo } from "./calc-visual";

describe("exemplos do caderno", () => {
  it("todo exemplo de todo grupo é calculável pelo app (nenhum bloco quebrado)", () => {
    for (const g of GRUPOS_CADERNO) for (const e of g.exemplos) {
      const r = parseCalculo(e.linguagem, e.corpo);
      expect(r, `${g.id}: ${e.linguagem} ${e.corpo}`).not.toBeNull();
      expect(r!.passos.length).toBeGreaterThan(1);
    }
  });
  it("só vale para Matemática / Raciocínio Lógico e acha o assunto pelo título", () => {
    expect(exemplosDoCaderno("Matemática", "MMC e MDC").length).toBe(6);
    expect(exemplosDoCaderno("Direito Penal", "MMC e MDC")).toEqual([]);
    expect(exemplosDoCaderno("Matemática", "História da escrita")).toEqual([]);
    expect(exemplosDoCaderno("Raciocínio Lógico", "Operações fundamentais")[0]).toEqual({ linguagem: "conta", corpo: "soma 25 13" });
  });
  it("seção em markdown com blocos cercados", () => {
    const s = secaoCaderno("Matemática", "Regra de três composta");
    expect(s).toContain("#### Vamos fazer no caderno");
    expect(s).toContain("```regra3c");
    expect(secaoCaderno("Português", "Crase")).toBe("");
  });
});
