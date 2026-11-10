import { describe, expect, it } from "vitest";
import { generateReferralCode, isReferralOffer, normalizeReferralCode } from "./code";

describe("código de indicação", () => {
  it("gera APV- + 6 caracteres válidos e que passam na normalização", () => {
    for (let i = 0; i < 50; i++) {
      const c = generateReferralCode();
      expect(c).toMatch(/^APV-[A-Z2-9]{6}$/);
      expect(normalizeReferralCode(c)).toBe(c);
    }
  });
  it("normaliza minúsculas, espaços e prefixo ausente", () => {
    expect(normalizeReferralCode(" apv-k7m2xq ")).toBe("APV-K7M2XQ");
    expect(normalizeReferralCode("k7m2xq")).toBe("APV-K7M2XQ");
  });
  it("rejeita lixo, tamanho errado e caracteres ambíguos", () => {
    expect(normalizeReferralCode("")).toBeNull();
    expect(normalizeReferralCode("APV-123")).toBeNull();
    expect(normalizeReferralCode("APV-O0I1LL")).toBeNull();
    expect(normalizeReferralCode(42)).toBeNull();
  });
  it("só anual e vitalício dão prêmio", () => {
    expect(isReferralOffer("anual")).toBe(true);
    expect(isReferralOffer("vitalicio")).toBe(true);
    expect(isReferralOffer("mensal")).toBe(false);
    expect(isReferralOffer("semestral")).toBe(false);
  });
});
