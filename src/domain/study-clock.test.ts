import { describe, expect, it } from "vitest";
import { IDLE_LIMIT_SECONDS, formatHMS, tickClock, touchClock } from "./study-clock";

describe("study clock", () => {
  it("soma enquanto há interação", () => {
    let s = { seconds: 0, idleFor: 0, paused: false };
    for (let i = 0; i < 60; i++) s = tickClock(i % 30 === 0 ? touchClock(s) : s);
    expect(s.seconds).toBe(60);
    expect(s.paused).toBe(false);
  });
  it("para após 10 min inerte e desconta o tempo parado", () => {
    let s = { seconds: 1000, idleFor: 0, paused: false };
    for (let i = 0; i < IDLE_LIMIT_SECONDS; i++) s = tickClock(s);
    expect(s.paused).toBe(true);
    expect(s.seconds).toBe(1000);
    expect(tickClock(s)).toEqual(s);
  });
  it("retoma com interação", () => {
    const s = touchClock({ seconds: 5, idleFor: 700, paused: true });
    expect(s).toEqual({ seconds: 5, idleFor: 0, paused: false });
  });
  it("formata", () => {
    expect(formatHMS(3725)).toBe("01:02:05");
  });
});
