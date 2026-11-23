import { describe, expect, it } from "vitest";
import { parseCalculo } from "./calc-visual";

const r = (l: string, c: string) => parseCalculo(l, c)?.resultado;

describe("razão, proporção e regra de três composta", () => {
  it("simplifica razão e fração", () => {
    expect(r("razao", "12 18")).toBe("12 : 18 = 2 : 3");
    expect(r("simplificar", "18/24")).toBe("18/24 = 3/4");
    expect(r("simplificar", "6 3")).toBe("6/3 = 2");
    expect(r("simplificar", "7 9")).toBe("7/9 = 7/9");
  });
  it("proporção", () => {
    expect(r("proporcao", "3 12 5")).toBe("x = 20");
    expect(parseCalculo("proporcao", "3 12 5")!.passos.join(" ")).toContain("multiplicamos em cruz");
  });
  it("regra de três composta (operários, horas, peças)", () => {
    const c = parseCalculo("regra3c", "Operários | Horas | Peças\n10 8 200\n15 6 x\ndireta | direta");
    expect(c?.resultado).toBe("x = 225");
    const inv = parseCalculo("regra3c", "Máquinas | Dias | Peças\n4 6 240\n8 3 x\ninversa | inversa");
    expect(inv?.resultado).toBe("x = 240");
    expect(parseCalculo("regra3c", "A | B\n1 2\n3 x\ndireta")).toBeNull();
  });
});

describe("unidades de medida", () => {
  it("escada e tempo", () => {
    expect(r("unidade", "3,5 km m")).toBe("3,5 km = 3.500 m");
    expect(r("unidade", "250 cm m")).toBe("250 cm = 2,5 m");
    expect(r("unidade", "2 m2 cm2")).toBe("2 m² = 20.000 cm²");
    expect(r("unidade", "1,5 h min")).toBe("1,5 h = 90 min");
    expect(r("unidade", "7200 s h")).toBe("7.200 s = 2 h");
    expect(r("unidade", "3 l ml")).toBe("3 l = 3.000 ml");
  });
  it("capacidade ↔ volume", () => {
    expect(r("unidade", "2 m3 l")).toBe("2 m³ = 2.000 l");
    expect(r("unidade", "500 ml cm3")).toBe("500 ml = 500 cm³");
  });
  it("unidades incompatíveis ou iguais viram null", () => {
    expect(r("unidade", "3 km kg")).toBeUndefined();
    expect(r("unidade", "3 km km")).toBeUndefined();
  });
});

describe("geometria", () => {
  it("áreas e perímetros", () => {
    expect(r("geometria", "retangulo 8 5 cm")).toBe("A = 40 cm² e P = 26 cm");
    expect(r("geometria", "quadrado 6")).toBe("A = 36 e P = 24");
    expect(r("geometria", "triângulo 6 4 m")).toBe("A = 12 m²");
    expect(r("geometria", "circulo 3 cm")).toBe("A = 28,26 cm² e C = 18,84 cm");
    expect(r("geometria", "trapézio 10 6 4")).toBe("A = 32");
    expect(r("geometria", "losango 8 6")).toBe("A = 24");
    expect(r("geometria", "paralelogramo 7 3")).toBe("A = 21");
  });
  it("volumes e Pitágoras", () => {
    expect(r("geometria", "cubo 3 cm")).toBe("V = 27 cm³ e A = 54 cm²");
    expect(r("geometria", "paralelepipedo 2 3 4")).toBe("V = 24");
    expect(r("geometria", "cilindro 2 5")).toBe("V = 62,8");
    expect(r("geometria", "pitagoras 3 4")).toBe("c = 5");
    expect(r("geometria", "pitagoras 1 1")).toContain("√2 ≈ 1,414");
    expect(r("geometria", "hexagono 3")).toBeUndefined();
    expect(parseCalculo("geometria", "retangulo 8 5")!.visual).toMatchObject({ k: "linhas", fig: { tipo: "retangulo" } });
  });
});

describe("matemática financeira", () => {
  it("juros simples e compostos", () => {
    expect(r("financeira", "simples 1000 2 6")).toBe("J = R$ 120,00 e M = R$ 1.120,00");
    expect(r("financeira", "composto 1000 10 2")).toBe("M = R$ 1.210,00 e J = R$ 210,00");
    expect(r("financeira", "composto 1000 2 3")).toBe("M = R$ 1.061,21 e J = R$ 61,21");
    expect(r("financeira", "simples 1000 2 0")).toBeUndefined();
  });
});

describe("conta com vírgula alinhada pelo parser", () => {
  it("soma e subtração decimais; multiplicação decimal não é aceita", () => {
    expect(r("conta", "soma 12,5 3,25")).toBe("12,50 + 3,25 = 15,75");
    expect(r("conta", "subtracao 10 2,75")).toBe("10,00 − 2,75 = 7,25");
    expect(r("conta", "multiplicacao 1,5 2")).toBeUndefined();
  });
});
