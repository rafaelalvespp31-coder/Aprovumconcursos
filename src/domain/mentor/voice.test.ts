import { describe, expect, it } from "vitest";
import { VOICE_DAILY_SECONDS, formatClock, settleSeconds, voiceLeft } from "./voice";

describe("Mentor por voz: limite diário", () => {
  it("são 3 minutos por dia", () => expect(VOICE_DAILY_SECONDS).toBe(180));
  it("calcula o que resta e nunca fica negativo", () => {
    expect(voiceLeft(0)).toBe(180);
    expect(voiceLeft(100.9)).toBe(80);
    expect(voiceLeft(999)).toBe(0);
    expect(voiceLeft(-5)).toBe(180);
  });
  const t0 = new Date("2026-11-04T12:00:00Z");
  const at = (s: number) => new Date(t0.getTime() + s * 1000);
  it("cobra o que o navegador informou, limitado ao tempo real e ao reservado", () => {
    expect(settleSeconds({ startedAt: t0, reserved: 180, reported: 40, now: at(45) })).toBe(40);
    expect(settleSeconds({ startedAt: t0, reserved: 180, reported: 500, now: at(45) })).toBe(45);
    expect(settleSeconds({ startedAt: t0, reserved: 60, reported: 500, now: at(300) })).toBe(60);
  });
  it("sem informe do navegador cobra o tempo decorrido (limitado ao reservado)", () => {
    expect(settleSeconds({ startedAt: t0, reserved: 180, now: at(90) })).toBe(90);
    expect(settleSeconds({ startedAt: t0, reserved: 30, reported: null, now: at(90) })).toBe(30);
    expect(settleSeconds({ startedAt: t0, reserved: 30, reported: Number.NaN, now: at(10) })).toBe(10);
  });
  it("não cobra valor negativo", () => {
    expect(settleSeconds({ startedAt: at(10), reserved: 180, reported: -3, now: at(5) })).toBe(0);
  });
  it("formata o relógio", () => {
    expect(formatClock(180)).toBe("3:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(-1)).toBe("0:00");
  });
});
