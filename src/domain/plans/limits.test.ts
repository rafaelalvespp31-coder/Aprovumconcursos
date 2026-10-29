import { describe, expect, it } from "vitest";
import { brDay, effectivePlan, nextPeriodEnd } from "./limits";

const NOW = new Date("2026-10-29T12:00:00.000Z");

describe("planos e limites", () => {
  it("conta nova (gratuito) e plano pago vigente", () => {
    expect(effectivePlan({ planId: "free", status: "active", currentPeriodEnd: null }, NOW)).toEqual({ planId: "free", paid: false, state: "gratuito" });
    expect(effectivePlan({ planId: "premium", status: "active", currentPeriodEnd: "2026-11-29T12:00:00.000Z" }, NOW)).toEqual({ planId: "premium", paid: true, state: "ativo" });
    expect(effectivePlan({ planId: "pro", status: "active", currentPeriodEnd: null }, NOW).paid).toBe(true);
    expect(effectivePlan(null, NOW).planId).toBe("free");
  });

  it("pago vencido ou cancelado volta a valer como gratuito", () => {
    expect(effectivePlan({ planId: "premium", status: "active", currentPeriodEnd: "2026-10-29T11:59:59.000Z" }, NOW)).toEqual({ planId: "free", paid: false, state: "expirado" });
    expect(effectivePlan({ planId: "premium", status: "canceled", currentPeriodEnd: null }, NOW).state).toBe("cancelado");
    expect(effectivePlan({ planId: "inventado", status: "active", currentPeriodEnd: null }, NOW).planId).toBe("free");
  });

  it("marcar como pago soma 1, 6 ou 12 meses (ao vencimento vigente, se houver)", () => {
    expect(nextPeriodEnd(null, "mensal", NOW).toISOString()).toBe("2026-11-29T12:00:00.000Z");
    expect(nextPeriodEnd(null, "semestral", NOW).toISOString()).toBe("2027-04-29T12:00:00.000Z");
    expect(nextPeriodEnd(null, "anual", NOW).toISOString()).toBe("2027-10-29T12:00:00.000Z");
    expect(nextPeriodEnd("2026-12-10T00:00:00.000Z", "mensal", NOW).toISOString()).toBe("2027-01-10T00:00:00.000Z");
    expect(nextPeriodEnd("2026-01-01T00:00:00.000Z", "mensal", NOW).toISOString()).toBe("2026-11-29T12:00:00.000Z");
    expect(nextPeriodEnd(null, "mensal", new Date("2027-01-31T15:00:00.000Z")).toISOString()).toBe("2027-02-28T15:00:00.000Z");
  });

  it("o dia vira à meia-noite de Brasília", () => {
    expect(brDay(new Date("2026-10-30T02:59:00.000Z"))).toEqual({ day: "2026-10-29", start: "2026-10-29T03:00:00.000Z" });
    expect(brDay(new Date("2026-10-30T03:00:00.000Z")).day).toBe("2026-10-30");
  });
});
