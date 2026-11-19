import { describe, expect, it } from "vitest";
import { motivoPagamento } from "./motivos";

describe("motivoPagamento", () => {
  it("traduz códigos conhecidos", () => {
    expect(motivoPagamento("cc_rejected_insufficient_amount")).toMatch(/insuficiente/);
    expect(motivoPagamento("cc_rejected_high_risk")).toMatch(/antifraude/);
  });
  it("mantém o código quando desconhecido e vazio quando não há", () => {
    expect(motivoPagamento("cc_rejected_novo")).toContain("cc_rejected_novo");
    expect(motivoPagamento("algo_novo")).toBe("algo_novo");
    expect(motivoPagamento(null)).toBe("");
  });
});
