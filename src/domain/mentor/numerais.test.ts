import { describe, expect, it } from "vitest";
import { numerais } from "./numerais";

describe("números por extenso → numerais", () => {
  it("anos e compostos", () => {
    expect(numerais("O João pratica um crime em dois mil e vinte")).toBe("O João pratica um crime em 2020");
    expect(numerais("Em dois mil e vinte e cinco, surge uma lei")).toBe("Em 2025, surge uma lei");
    expect(numerais("Em mil novecentos e oitenta e oito")).toBe("Em 1988");
    expect(numerais("cento e vinte prontuários em quatro horas")).toBe("120 prontuários em 4 horas");
  });
  it("não mexe em artigos nem separa números diferentes", () => {
    expect(numerais("uma lei e um crime")).toBe("uma lei e um crime");
    expect(numerais("três e quatro")).toBe("3 e 4");
    expect(numerais("vinte e dois mil")).toBe("22.000");
  });
});
