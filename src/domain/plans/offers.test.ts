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
