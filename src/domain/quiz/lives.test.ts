import { describe, expect, it } from "vitest";
import { faltaPara, maxLives, semTrava } from "./lives";

describe("vidas do Modo Jogo", () => {
  it("gratuito 2, pago 5", () => {
    expect(maxLives(false)).toBe(2);
    expect(maxLives(true)).toBe(5);
  });
  it("tempo que falta para destravar", () => {
    const now = new Date("2026-11-19T12:00:00Z");
    expect(faltaPara("2026-11-20T12:00:00Z", now)).toBe("24 h");
    expect(faltaPara("2026-11-19T15:20:00Z", now)).toBe("3 h 20 min");
    expect(faltaPara("2026-11-19T12:10:00Z", now)).toBe("10 min");
  });
});

describe("semTrava", () => {
  it("plano pago e admin jogam sem trava; gratuito e degustação não", () => {
    expect(semTrava({ paid: true, admin: false })).toBe(true);
    expect(semTrava({ paid: false, admin: true })).toBe(true);
    expect(semTrava({ paid: false, admin: false })).toBe(false);
  });
});
