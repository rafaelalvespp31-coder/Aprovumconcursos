import { describe, expect, it } from "vitest";
import { apportion, buildPlano } from "./plano";

const disc = [{ name: "Direito Penal", pct: 40 }, { name: "Português", pct: 35 }, { name: "Informática", pct: 15 }, { name: "Raciocínio Lógico", pct: 10 }];

describe("plano de estudo", () => {
  it("apportion fecha o total", () => {
    const r = apportion([40, 35, 15, 10], 10);
    expect(r.reduce((a, b) => a + b, 0)).toBe(10);
  });
  it("meta fica acima do corte e as fases cobrem todas as semanas", () => {
    const p = buildPlano({ disciplines: disc, lastCutPct: 71, projectedCutPct: 74, targets: [] });
    expect(p.targetPct).toBeGreaterThanOrEqual(84);
    expect(p.schedule).toHaveLength(p.weeks);
    expect(p.phases[0]!.weeks[0]).toBe(1);
    expect(p.phases[3]!.weeks[1]).toBe(p.weeks);
    expect(p.disciplines[0]!.tier).toBe("A");
    expect(p.routine).toHaveLength(7);
  });
  it("sem corte catalogado, meta de método 85%", () => {
    expect(buildPlano({ disciplines: disc, lastCutPct: null, projectedCutPct: null, targets: [] }).targetPct).toBe(85);
  });
  it("não quebra sem disciplinas", () => {
    expect(buildPlano({ disciplines: [], lastCutPct: null, projectedCutPct: null, targets: [] }).schedule.length).toBeGreaterThan(0);
  });
});
