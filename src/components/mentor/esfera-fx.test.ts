import { describe, expect, it } from "vitest";
import { Historia, clamp, follow, projetar, radiusAt, ringAmp } from "./esfera-fx";

describe("esfera do Mentor", () => {
  it("follow sobe mais rápido do que desce e não ultrapassa o alvo", () => {
    const up = follow(0, 1, 0.016);
    const down = 1 - follow(1, 0, 0.016);
    expect(up).toBeGreaterThan(down);
    expect(follow(0.9, 1, 1)).toBeLessThanOrEqual(1);
  });

  it("a sílaba nasce no equador e chega aos polos depois", () => {
    const h = new Historia(96);
    for (let i = 0; i < 30; i++) h.push(0);
    h.push(1); // sílaba agora
    const n = 25;
    expect(ringAmp(h, 12, n)).toBeGreaterThan(0.99); // equador
    expect(ringAmp(h, 0, n)).toBe(0); // polo ainda não recebeu
    for (let i = 0; i < 29; i++) h.push(0);
    expect(ringAmp(h, 0, n)).toBeGreaterThan(0.5); // ~29 amostras depois, a onda chega ao polo
  });

  it("o raio fica dentro dos limites mesmo com voz máxima", () => {
    for (let i = 0; i < 200; i++) {
      const r = radiusAt(((i % 20) - 10) * 0.15, i * 0.31, i % 26, 1, { k: 4.2, ph: i, t: i * 0.1, low: 1, high: 1 });
      expect(r).toBeGreaterThanOrEqual(0.42);
      expect(r).toBeLessThanOrEqual(1.25);
    }
  });

  it("projetar sem giro põe o ponto da frente no centro e na frente", () => {
    const p = projetar(0, 0, 1, 0, 0, 0, 100);
    expect(Math.abs(p.x)).toBeLessThan(1e-6);
    expect(p.z).toBeCloseTo(1);
    expect(clamp(5)).toBe(1);
  });
});
