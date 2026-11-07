import { describe, expect, it } from "vitest";
import { ALVOS, boltSpan, ease, makeBolt, mulberry32, pickNodes, resolveEstado, rimBolt, spawnBolt, NODES } from "./skull-orb-fx";

const base = { conn: "live", me: 0, mic: 0, peak: 0, awaiting: false } as const;

describe("resolveEstado", () => {
  it("segue conexão, fala do Mentor e microfone", () => {
    expect(resolveEstado({ ...base, conn: "off" })).toBe("disconnected");
    expect(resolveEstado({ ...base, conn: "error" })).toBe("error");
    expect(resolveEstado({ ...base, conn: "connecting" })).toBe("thinking");
    expect(resolveEstado(base)).toBe("idle");
    expect(resolveEstado({ ...base, mic: 0.3 })).toBe("listening");
    expect(resolveEstado({ ...base, awaiting: true })).toBe("thinking");
    expect(resolveEstado({ ...base, me: 0.3, peak: 0.3 })).toBe("speaking");
    expect(resolveEstado({ ...base, me: 0.3, peak: 0.8 })).toBe("high");
  });
  it("o Mentor falando vale mais que o microfone e que a espera", () => {
    expect(resolveEstado({ ...base, me: 0.2, mic: 0.5, awaiting: true, peak: 0.2 })).toBe("speaking");
  });
  it("todo estado tem alvos", () => {
    for (const e of ["idle", "listening", "thinking", "speaking", "high", "error", "disconnected"] as const) expect(ALVOS[e].energy).toBeGreaterThan(0);
    expect(ALVOS.high.eye).toBeGreaterThan(ALVOS.speaking.eye);
    expect(ALVOS.disconnected.energy).toBeLessThan(ALVOS.idle.energy);
  });
});

describe("ease", () => {
  it("sobe mais rápido do que desce e não ultrapassa o alvo", () => {
    const up = ease(0, 1, 0.5, 0.05, 1);
    const down = 1 - ease(1, 0, 0.5, 0.05, 1);
    expect(up).toBeGreaterThan(down);
    expect(ease(0.9, 1, 0.5, 0.05, 60)).toBeLessThanOrEqual(1);
  });
});

describe("raios", () => {
  it("mantêm as pontas e têm 2^níveis+1 pontos", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 100, y: 40 };
    const pts = makeBolt(mulberry32(7), a, b, 20, 4);
    expect(pts).toHaveLength(17);
    expect(pts[0]).toEqual(a);
    expect(pts[16]).toEqual(b);
  });
  it("são reproduzíveis com a mesma semente e diferentes com outra", () => {
    const f = (s: number) => spawnBolt(mulberry32(s), { x: 0, y: 0 }, { x: 80, y: 30 }, 0, 0.5).pts;
    expect(f(1)).toEqual(f(1));
    expect(f(1)).not.toEqual(f(2));
  });
  it("sempre partem e chegam em pontos da caveira", () => {
    const r = mulberry32(3);
    for (let i = 0; i < 300; i++) {
      const p = pickNodes(r, i % 2 ? 0.9 : 0.1);
      expect(NODES[p.a]).toBeDefined();
      expect(NODES[p.b]).toBeDefined();
    }
  });
  it("a ponta corre primeiro e a cauda some depois", () => {
    const s0 = boltSpan(0, 1);
    const s1 = boltSpan(0.3, 1);
    const s2 = boltSpan(0.9, 1);
    expect(s0.head).toBe(0);
    expect(s1.head).toBe(0.3 / 0.35 > 1 ? 1 : 0.3 / 0.35);
    expect(s1.tail).toBe(0);
    expect(s2.tail).toBeGreaterThan(0.5);
    expect(s2.alpha).toBeLessThan(s1.alpha);
  });
  it("o raio da casca fica perto do raio da esfera", () => {
    const b = rimBolt(mulberry32(5), 100, 0.3, 1, 0, 0.5);
    expect(b.pts).toHaveLength(17);
    for (const p of b.pts) expect(Math.hypot(p.x, p.y)).toBeGreaterThan(90);
    for (const p of b.pts) expect(Math.hypot(p.x, p.y)).toBeLessThan(110);
  });
});
