import { describe, expect, it } from "vitest";
import { planTier } from "./offers";

describe("planTier (cor do Meu Plano)", () => {
  it("gratuito é prata; planos com vencimento são vermelho neon; vitalício é dourado", () => {
    expect(planTier(false, null, false)).toBe("gratuito");
    expect(planTier(true, "mensal", true)).toBe("pago");
    expect(planTier(true, "semestral", true)).toBe("pago");
    expect(planTier(true, "anual", true)).toBe("pago");
    expect(planTier(true, null, false)).toBe("vitalicio");
  });
});

import { offerStorage, storedOffer } from "./offers";
describe("planos do admin (iguais ao Meu Plano)", () => {
  it("grava cada plano como a tela Meu Plano o lê de volta", () => {
    for (const o of ["gratuito", "mensal", "semestral", "anual", "vitalicio"] as const) {
      const st = offerStorage(o);
      expect(storedOffer(st.planId, st.period, st.period !== null)).toBe(o);
    }
  });
});

import { installmentOf } from "./offers";
describe("parcelamento em 12x", () => {
  it("parcela = à vista ÷ 12; o mensal não parcela", () => {
    const nbsp = (s: string) => s.replace(/\s/g, " ");
    expect(nbsp(installmentOf("semestral")!.value)).toBe("R$ 16,42");
    expect(nbsp(installmentOf("anual")!.value)).toBe("R$ 28,92");
    expect(nbsp(installmentOf("vitalicio")!.value)).toBe("R$ 58,08");
    expect(installmentOf("mensal")).toBeNull();
  });
});
