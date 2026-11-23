import { describe, expect, it } from "vitest";
import { equacao1, equacao2, expressao, raiz } from "./calc-algebra";

describe("expressões numéricas respeitam a ordem das operações", () => {
  it("parênteses, multiplicação, soma", () => {
    const e = expressao("2 + 3 x (10 - 4) : 2")!;
    expect(e.resultado).toContain("= 11");
    expect(e.passos.join(" ")).toContain("10 − 4 = 6");
    expect(e.passos.join(" ")).toContain("3 × 6 = 18");
    expect(e.passos.join(" ")).toContain("18 ÷ 2 = 9");
    expect(e.passos.join(" ")).toContain("2 + 9 = 11");
  });
  it("potência primeiro, sinais negativos e frações exatas", () => {
    expect(expressao("2 + 3^2 x 2")!.resultado).toContain("= 20");
    expect(expressao("5 - (-3)")!.resultado).toContain("= 8");
    expect(expressao("1 / 2 + 1 / 3")!.resultado).toContain("5/6");
    expect(expressao("7 : 2")!.resultado).toContain("7/2");
    expect(expressao("10 - 2 - 3")!.resultado).toContain("= 5");
    expect(expressao("2^3^2")!.resultado).toContain("= 512");
  });
  it("entradas inválidas viram null", () => {
    expect(expressao("5 : 0")).toBeNull();
    expect(expressao("(2 + 3")).toBeNull();
    expect(expressao("2 + + ")).toBeNull();
    expect(expressao("abc")).toBeNull();
  });
});

describe("equação do 1º grau", () => {
  it("2x + 3 = 11", () => {
    const e = equacao1("2x + 3 = 11")!;
    expect(e.resultado).toBe("x = 4");
    expect(e.passos.join(" ")).toContain("troca de sinal");
    expect(e.linhas.map((l) => l.partes.map((p) => p.t).join(" "))).toContain("= 2x = 8");
  });
  it("x dos dois lados, negativo e fração", () => {
    expect(equacao1("5x + 3 = 2x + 12")!.resultado).toBe("x = 3");
    expect(equacao1("3x - 5 = x + 7")!.resultado).toBe("x = 6");
    expect(equacao1("-2x = 8")!.resultado).toBe("x = −4");
    expect(equacao1("2x = 7")!.resultado).toContain("7/2");
    expect(equacao1("x + 1 = x + 2")!.resultado).toContain("sem solução");
    expect(equacao1("2x + 2 = 2x + 2")!.resultado).toContain("infinitas");
    expect(equacao1("3 = 3")).toBeNull();
  });
});

describe("equação do 2º grau (Bhaskara)", () => {
  it("raízes inteiras", () => {
    const e = equacao2(1, -5, 6)!;
    expect(e.resultado).toBe("x′ = 3 e x″ = 2");
    expect(e.passos.join(" ")).toContain("Δ");
    expect(equacao2(1, -6, 9)!.resultado).toBe("x = 3");
    expect(equacao2(2, -3, -2)!.resultado).toBe("x′ = 2 e x″ = −1/2");
  });
  it("delta negativo e raízes aproximadas", () => {
    expect(equacao2(1, 2, 5)!.resultado).toContain("sem raízes reais");
    expect(equacao2(1, -3, 1)!.resultado).toBe("x′ ≈ 2,618 e x″ ≈ 0,382");
    expect(equacao2(0, 1, 1)).toBeNull();
  });
});

describe("radiciação por fatoração", () => {
  it("exata e inexata", () => {
    expect(raiz(2, 144)!.resultado).toBe("√144 = 12");
    expect(raiz(3, 27)!.resultado).toBe("³√27 = 3");
    expect(raiz(2, 72)!.resultado).toContain("6√2");
    expect(raiz(2, 1)!.resultado).toBe("√1 = 1");
    expect(raiz(2, 0)).toBeNull();
    expect(raiz(2, 97)!.resultado).toContain("√97");
  });
});
