import { describe, expect, it } from "vitest";
import { detectPitch } from "./pitch";

const SR = 24000;
const tone = (hz: number, n = 1024, amp = 0.3) => Float32Array.from({ length: n }, (_, i) => amp * Math.sin((2 * Math.PI * hz * i) / SR));
const voice = (hz: number, n = 1024) => Float32Array.from({ length: n }, (_, i) => [1, 0.6, 0.35, 0.2].reduce((s, a, k) => s + (a * 0.15) * Math.sin((2 * Math.PI * hz * (k + 1) * i) / SR), 0));

describe("detectPitch", () => {
  it("acha o tom de senoides graves e agudas", () => {
    for (const hz of [100, 140, 220, 330]) {
      const p = detectPitch(tone(hz), SR);
      expect(Math.abs(p.f0 - hz) / hz).toBeLessThan(0.02);
      expect(p.voiced).toBeGreaterThan(0.9);
    }
  });
  it("acha o tom fundamental de uma voz com harmônicos (sem pular de oitava)", () => {
    for (const hz of [120, 180, 250]) {
      const p = detectPitch(voice(hz), SR);
      expect(Math.abs(p.f0 - hz) / hz).toBeLessThan(0.03);
    }
  });
  it("funciona com janela longa (2048) e tom grave de 85 Hz", () => {
    const p = detectPitch(tone(85, 2048), SR);
    expect(Math.abs(p.f0 - 85) / 85).toBeLessThan(0.03);
  });
  it("silêncio e ruído não têm tom", () => {
    expect(detectPitch(new Float32Array(1024), SR)).toEqual({ f0: 0, voiced: 0 });
    let seed = 7;
    const noise = Float32Array.from({ length: 1024 }, () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 0.6);
    expect(detectPitch(noise, SR).f0).toBe(0);
  });
  it("sobe quando o tom sobe (entonação)", () => {
    expect(detectPitch(tone(220), SR).f0).toBeGreaterThan(detectPitch(tone(150), SR).f0);
  });
});
