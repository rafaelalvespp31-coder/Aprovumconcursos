import { describe, expect, it } from "vitest";
import { parseCalculo } from "./calc-visual";

describe("cálculos visuais da aula", () => {
  it("conta armada: MMC e divisão vêm calculados pelo app", () => {
    expect(parseCalculo("conta", "mmc 12 18")?.resultado).toContain("36");
    expect(parseCalculo("conta", "divisao 432 12")?.resultado).toContain("36");
    expect(parseCalculo("conta", "mmc 12 x")).toBeNull();
    expect(parseCalculo("conta", "divisao 5 0")).toBeNull();
  });
  it("fração: representação e operações", () => {
    expect(parseCalculo("fracao", "3/4")?.resultado).toBe("3/4 = 0,75 = 75%");
    const soma = parseCalculo("fracao", "1/2 + 1/3")!;
    expect(soma.resultado).toBe("1/2 + 1/3 = 5/6");
    expect(soma.passos.join(" ")).toContain("MMC(2, 3) = 6");
    expect(parseCalculo("fracao", "3/4 - 1/4")?.resultado).toBe("3/4 − 1/4 = 1/2");
    expect(parseCalculo("fracao", "2/3 x 3/4")?.resultado).toBe("2/3 × 3/4 = 1/2");
    expect(parseCalculo("fracao", "1/2 : 1/4")?.resultado).toBe("1/2 ÷ 1/4 = 2");
    expect(parseCalculo("fracao", "1/4 - 1/2")).toBeNull();
    expect(parseCalculo("fracao", "3/0")).toBeNull();
  });
  it("regra de três direta e inversa", () => {
    expect(parseCalculo("regra3", "direta 6 24 9")?.resultado).toBe("x = 36");
    expect(parseCalculo("regra3", "inversa 4 6 8")?.resultado).toBe("x = 3");
    const r = parseCalculo("regra3", "direta 2 10 3\nCanetas | Reais")!;
    expect(r.visual).toMatchObject({ k: "regra3", rotuloA: "Canetas", rotuloB: "Reais", x: "15" });
    expect(parseCalculo("regra3", "direta 0 1 2")).toBeNull();
  });
  it("potenciação expande as multiplicações", () => {
    const p = parseCalculo("potencia", "2 5")!;
    expect(p.resultado).toBe("2⁵ = 32");
    expect(p.visual).toMatchObject({ k: "potencia", produtos: [2, 4, 8, 16, 32] });
    expect(parseCalculo("potencia", "7 0")?.resultado).toBe("7⁰ = 1");
    expect(parseCalculo("potencia", "9 99")).toBeNull();
  });
  it("porcentagem com dinheiro", () => {
    expect(parseCalculo("porcentagem", "20 150 R$")?.resultado).toBe("20% de R$ 150,00 = R$ 30,00");
    expect(parseCalculo("porcentagem", "15 200")?.resultado).toBe("15% de 200 = 30");
    expect(parseCalculo("porcentagem", "abc")).toBeNull();
    expect(parseCalculo("porcentagem", "desconto 20 150 R$")?.resultado).toContain("valor final R$ 120,00");
    expect(parseCalculo("porcentagem", "aumento 10 200")?.resultado).toContain("valor final 220");
    expect(parseCalculo("porcentagem", "quanto 30 150")?.resultado).toBe("30 é 20% de 150");
  });
  it("linguagem desconhecida ou vazia não vira cálculo", () => {
    expect(parseCalculo("outra", "1 2")).toBeNull();
    expect(parseCalculo("conta", "")).toBeNull();
  });
});
