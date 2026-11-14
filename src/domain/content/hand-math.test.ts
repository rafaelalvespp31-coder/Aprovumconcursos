import { describe, expect, it } from "vitest";
import { worked } from "./hand-math";

describe("contas armadas à mão", () => {
  it("soma com vai-um", () => {
    const w = worked("soma", [478, 59])!;
    expect(w.result).toBe("478 + 59 = 537");
    expect(w.steps[0]).toContain("8 + 9 = 17");
  });
  it("subtração com empréstimo", () => {
    const w = worked("subtracao", [402, 158])!;
    expect(w.result).toBe("402 − 158 = 244");
    expect(w.steps.some((s) => s.includes("pede emprestado"))).toBe(true);
    expect(worked("subtracao", [5, 9])).toBeNull();
  });
  it("multiplicação em linhas", () => {
    const w = worked("multiplicacao", [47, 23])!;
    expect(w.result).toBe("47 × 23 = 1.081");
    expect(w.steps.at(-1)).toContain("141 + 940 = 1.081");
  });
  it("divisão na chave, com resto e com zero no quociente", () => {
    expect(worked("divisao", [432, 12])!.result).toContain("= 36 (resto 0");
    expect(worked("divisao", [1000, 7])!.result).toBe("1.000 ÷ 7 = 142 (resto 6)");
    expect(worked("divisao", [3012, 3])!.result).toContain("= 1.004");
    expect(worked("divisao", [5, 8])!.result).toBe("5 ÷ 8 = 0 (resto 5)");
    expect(worked("divisao", [5, 0])).toBeNull();
  });
  it("MMC e MDC por fatoração simultânea", () => {
    expect(worked("mmc", [12, 20])!.result).toBe("MMC(12, 20) = 2 × 2 × 3 × 5 = 60");
    expect(worked("mdc", [12, 20])!.result).toBe("MDC(12, 20) = 2 × 2 = 4");
    expect(worked("mmc", [72, 90])!.result).toContain("= 360");
    expect(worked("mdc", [7, 9])!.result).toBe("MDC(7, 9) = 1");
    expect(worked("mmc", [4, 6, 10])!.result).toContain("= 60");
  });
});
