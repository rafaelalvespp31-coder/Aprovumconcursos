import { describe, expect, it } from "vitest";
import { bodyFactor, defaultAvatar, isUnlocked, switchGender, validateAvatar, xpFromStats, type AvatarItem } from "./catalog";

const item = (id: string, slot: AvatarItem["slot"], o: Partial<AvatarItem> = {}): AvatarItem => ({ id, slot, name: id, genders: ["m", "f"], minLevel: 1, minXp: 0, isDefault: false, previewUrl: null, modelUrl: null, meta: {}, sort: 0, ...o });
const ITEMS: AvatarItem[] = [
  item("cabelo_m", "cabelo", { genders: ["m"], isDefault: true }),
  item("cabelo_f", "cabelo", { genders: ["f"], isDefault: true }),
  item("barba", "barba", { genders: ["m"] }),
  item("camiseta_oficial", "camiseta", { isDefault: true }),
  item("camiseta_camuflada", "camiseta", { minLevel: 5 }),
  item("uniforme_prf", "uniforme", { minLevel: 20, minXp: 3000 }),
  item("calca", "calca", { isDefault: true }),
  item("coturno", "calcado", { isDefault: true }),
];

describe("avatar", () => {
  it("padrão por gênero usa as peças padrão do catálogo", () => {
    expect(defaultAvatar("m", ITEMS).equipped).toEqual({ cabelo: "cabelo_m", camiseta: "camiseta_oficial", calca: "calca", calcado: "coturno" });
    expect(defaultAvatar("f", ITEMS).equipped.cabelo).toBe("cabelo_f");
  });

  it("trocar de gênero preserva o compatível e tira o que não serve", () => {
    const m = { ...defaultAvatar("m", ITEMS), skin: "negra" as const, equipped: { ...defaultAvatar("m", ITEMS).equipped, barba: "barba", camiseta: "camiseta_camuflada" } };
    const f = switchGender(m, "f", ITEMS);
    expect(f.skin).toBe("negra");
    expect(f.equipped.camiseta).toBe("camiseta_camuflada");
    expect(f.equipped.cabelo).toBe("cabelo_f");
    expect(f.equipped.barba).toBeUndefined();
  });

  it("valida contra o catálogo e o progresso real: peça bloqueada não entra", () => {
    const cfg = { ...defaultAvatar("m", ITEMS), equipped: { ...defaultAvatar("m", ITEMS).equipped, uniforme: "uniforme_prf" } };
    expect(validateAvatar(cfg, ITEMS, { level: 3, xp: 500 })).toEqual({ ok: false, error: "“uniforme_prf” ainda está bloqueado (nível 20 e 3000 XP)." });
    const ok = validateAvatar(cfg, ITEMS, { level: 20, xp: 3000 });
    expect(ok.ok).toBe(true);
    expect(validateAvatar({ ...cfg, gender: "f", equipped: { barba: "barba" } }, ITEMS, { level: 99, xp: 1e6 })).toMatchObject({ ok: false });
    expect(validateAvatar({ ...cfg, skin: "azul" }, ITEMS, { level: 1, xp: 0 })).toEqual({ ok: false, error: "Tom de pele inválido." });
    expect(validateAvatar({ ...cfg, body: { ombros: 140 } }, ITEMS, { level: 1, xp: 0 })).toMatchObject({ ok: false });
    expect(validateAvatar({ ...cfg, equipped: { camiseta: "nao_existe" } }, ITEMS, { level: 1, xp: 0 })).toMatchObject({ ok: false });
  });

  it("peças obrigatórias vazias voltam ao padrão", () => {
    const r = validateAvatar({ gender: "f", skin: "clara", hairColor: "loiro", equipped: {} }, ITEMS, { level: 1, xp: 0 });
    expect(r.ok && r.config.equipped).toEqual({ cabelo: "cabelo_f", camiseta: "camiseta_oficial", calca: "calca", calcado: "coturno" });
  });

  it("XP vem só da atividade real e desbloqueio exige nível e XP", () => {
    expect(xpFromStats({ correct: 12, themesPassed: 2, themesMastered: 1, activeDays: ["2026-11-01", "2026-11-02", "2026-11-02"] })).toBe(120 + 200 + 150 + 40);
    expect(isUnlocked({ minLevel: 5, minXp: 0 }, { level: 5, xp: 0 })).toBe(true);
    expect(isUnlocked({ minLevel: 5, minXp: 100 }, { level: 9, xp: 99 })).toBe(false);
  });

  it("ajustes do corpo ficam numa faixa pequena (sem deformar)", () => {
    expect(bodyFactor(0)).toBeCloseTo(0.94);
    expect(bodyFactor(100)).toBeCloseTo(1.06);
    expect(bodyFactor(50)).toBe(1);
    expect(bodyFactor(500)).toBeCloseTo(1.06);
  });
});

describe("patentes", () => {
  it("Aluno → Recruta → Policial pelo nível", async () => {
    const { rankFor, nextRank } = await import("./catalog");
    expect(rankFor(1).label).toBe("Aluno");
    expect(rankFor(9).label).toBe("Aluno");
    expect(rankFor(10).label).toBe("Recruta");
    expect(rankFor(27).label).toBe("Policial");
    expect(nextRank(4)?.label).toBe("Recruta");
    expect(nextRank(20)).toBeNull();
  });
});
