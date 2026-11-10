import { describe, expect, it } from "vitest";
import {
  COMMERCIAL_PERMISSIONS,
  normalizePermissions,
  PARTNER_PERMISSIONS,
  PERMISSION_GROUPS,
} from "./permissions";
import { byMonth, byWeek, changePct, periodDays } from "./series";

describe("permissões do sócio", () => {
  it("todas as 15 permissões aparecem uma vez nos grupos", () => {
    const keys = PERMISSION_GROUPS.flatMap((g) => g.items.map((i) => i.key));
    expect(keys.sort()).toEqual([...PARTNER_PERMISSIONS].sort());
    expect(PARTNER_PERMISSIONS).toHaveLength(16);
    expect(COMMERCIAL_PERMISSIONS).toContain("visualizar_faturamento");
    expect(COMMERCIAL_PERMISSIONS).not.toContain(
      "visualizar_total_cadastrados",
    );
  });
  it("limpa a lista: descarta desconhecidas e repetidas", () => {
    expect(
      normalizePermissions([
        "visualizar_faturamento",
        "ver_tudo",
        "visualizar_total_cadastrados",
        "visualizar_faturamento",
      ]),
    ).toEqual(["visualizar_total_cadastrados", "visualizar_faturamento"]);
  });
});

describe("séries do painel", () => {
  const days = [
    { dia: "2026-10-26", valor: 1 }, // segunda
    { dia: "2026-11-01", valor: 2 }, // domingo (mesma semana)
    { dia: "2026-11-02", valor: 3 }, // segunda seguinte
  ];
  it("agrupa por semana (segunda a domingo) e por mês", () => {
    expect(byWeek(days)).toEqual([
      { dia: "2026-10-26", valor: 3 },
      { dia: "2026-11-02", valor: 3 },
    ]);
    expect(byMonth(days)).toEqual([
      { dia: "2026-10", valor: 1 },
      { dia: "2026-11", valor: 5 },
    ]);
  });
  it("variação entre períodos e filtro de período", () => {
    expect(changePct(15, 10)).toBe(50);
    expect(changePct(5, 0)).toBeNull();
    expect(periodDays("180")).toBe(180);
    expect(periodDays("999")).toBe(30);
  });
});
