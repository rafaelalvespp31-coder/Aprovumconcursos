import { describe, expect, it } from "vitest";
import { customParamsSchema, eyeBoxes, landmarksFromSilhouette } from "./custom";

/** Silhueta sintética: cabeça, pescoço fino, ombros largos, cintura e pernas. */
function figure(H = 1000, W = 400) {
  const left: number[] = [], right: number[] = [];
  for (let y = 0; y < H; y++) {
    const f = y / H;
    const half = f < 0.02 ? -1 : f < 0.13 ? 45 : f < 0.16 ? 25 : f < 0.19 ? 90 : f < 0.36 ? 150 : f < 0.45 ? 95 : f < 0.5 ? 110 : 70;
    if (half < 0) (left.push(-1), right.push(-1));
    else (left.push(200 - half), right.push(200 + half));
  }
  return { left, right, W };
}

describe("avatar personalizado", () => {
  it("acha pescoço, ombros, peito e cintura na silhueta", () => {
    const { left, right, W } = figure();
    const m = landmarksFromSilhouette(left, right, W);
    expect(m.neckY).toBeGreaterThanOrEqual(0.13);
    expect(m.neckY).toBeLessThan(0.16);
    expect(m.shoulderY).toBeGreaterThanOrEqual(0.19);
    expect(m.shoulderY).toBeLessThan(0.2);
    expect(m.chestY).toBeCloseTo(m.shoulderY + 0.085, 3);
    expect(m.waistY).toBeGreaterThanOrEqual(0.36);
    expect(m.waistY).toBeLessThan(0.46);
    expect(m.centerX).toBeCloseTo(0.5, 2);
  });

  it("silhueta vazia ou pequena usa valores padrão", () => {
    expect(landmarksFromSilhouette([], [], 0)).toMatchObject({ neckY: 0.15 });
  });

  it("caixas das pálpebras na proporção das artes oficiais, em qualquer ordem de clique", () => {
    // Masculino: olhos a 56 px em 578×1584.
    const [l, r] = eyeBoxes({ x: 0.5148, y: 0.0815 }, { x: 0.4178, y: 0.0815 }, 578, 1584);
    expect(l.x0).toBeLessThan(r.x0);
    expect((l.x1 - l.x0) * 578).toBeCloseTo(33, 0);
    expect((l.y1 - l.y0) * 1584).toBeCloseTo(16.3, 0);
  });

  it("parâmetros inválidos são recusados", () => {
    const ok = { aspect: 0.36, centerX: 0.47, neckY: 0.15, shoulderY: 0.19, chestY: 0.27, waistY: 0.45, eyes: [{ x0: 0.39, y0: 0.076, x1: 0.45, y1: 0.087 }, { x0: 0.49, y0: 0.076, x1: 0.54, y1: 0.087 }] };
    expect(customParamsSchema.safeParse(ok).success).toBe(true);
    expect(customParamsSchema.safeParse({ ...ok, neckY: 0.3 }).success).toBe(false);
    expect(customParamsSchema.safeParse({ ...ok, eyes: [ok.eyes[0], { x0: 0.5, y0: 0.5, x1: 0.6, y1: 0.55 }] }).success).toBe(false);
    expect(customParamsSchema.safeParse({ ...ok, aspect: 5 }).success).toBe(false);
  });
});
