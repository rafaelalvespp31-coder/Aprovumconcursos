import { describe, expect, it } from "vitest";
import { checkCoupon, commissionCents, discountCents, normalizeCouponCode, partnerLink, quote, type CouponRule } from "./coupon";
import { OFFERS } from "@/domain/plans/offers";

const rule: CouponRule = { code: "NUNESDOUGLASPM", discountPct: 10, status: "ativo", maxUses: null, startsAt: null, expiresAt: null, eligibleOffers: ["mensal", "semestral", "anual", "vitalicio"], partnerActive: true };

describe("cupom", () => {
  it("normaliza o código", () => {
    expect(normalizeCouponCode(" nunes douglas-pm ")).toBe("NUNESDOUGLASPM");
    expect(normalizeCouponCode("ab")).toBeNull();
    expect(normalizeCouponCode(42)).toBeNull();
  });
  it("aplica 10% sobre o preço vigente de cada plano, sem mexer na tabela de preços", () => {
    expect(quote("mensal", 10)).toMatchObject({ listCents: 3700, discountCents: 370, finalCents: 3330 });
    expect(quote("semestral", 10)).toMatchObject({ discountCents: 1970, finalCents: 17730 });
    expect(quote("anual", 10)).toMatchObject({ discountCents: 3470, finalCents: 31230 });
    expect(quote("vitalicio", 10)).toMatchObject({ discountCents: 6970, finalCents: 62730 });
    expect(OFFERS.mensal.cents).toBe(3700);
  });
  it("nunca zera o preço e ignora percentuais inválidos", () => {
    expect(discountCents(1000, 100)).toBe(999);
    expect(discountCents(1000, 0)).toBe(0);
    expect(discountCents(1000, Number.NaN)).toBe(0);
  });
  it("valida status, janela, limite e plano", () => {
    const now = new Date("2026-11-20T12:00:00Z");
    expect(checkCoupon(rule, "anual", 99999, now)).toBeNull(); // ilimitado e sem expiração
    expect(checkCoupon({ ...rule, status: "inativo" }, "anual", 0, now)).toBe("inativo");
    expect(checkCoupon({ ...rule, partnerActive: false }, "anual", 0, now)).toBe("inativo");
    expect(checkCoupon({ ...rule, expiresAt: "2026-11-01T00:00:00Z" }, "anual", 0, now)).toBe("expirado");
    expect(checkCoupon({ ...rule, startsAt: "2026-12-01T00:00:00Z" }, "anual", 0, now)).toBe("ainda_nao_vale");
    expect(checkCoupon({ ...rule, maxUses: 5 }, "anual", 5, now)).toBe("esgotado");
    expect(checkCoupon({ ...rule, eligibleOffers: ["anual"] }, "mensal", 0, now)).toBe("plano_nao_elegivel");
  });
  it("comissão 0% não gera valor", () => {
    expect(commissionCents(31230, 0)).toBe(0);
    expect(commissionCents(10000, 15)).toBe(1500);
  });
  it("link exclusivo", () => {
    expect(partnerLink("NUNESDOUGLASPM")).toBe("https://aprovumconcursos.com.br/?ref=NUNESDOUGLASPM");
  });
});
