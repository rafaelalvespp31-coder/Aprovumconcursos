import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/supabase", () => ({ createAdminClient: () => ({}) }));
vi.mock("@/server/services/push", () => ({ sendPushToUsers: vi.fn() }));
vi.mock("@/server/services/trails", () => ({ UserFacingError: class extends Error {}, enforceRateLimit: vi.fn() }));
vi.mock("@/server/services/admin-pendencias", () => ({ resetAdminPendenciasCache: vi.fn() }));

import { cleanBody } from "@/server/services/team-chat";

describe("chat com a Equipe", () => {
  it("limpa o texto: tira marcação perigosa, limita tamanho e corta espaços", () => {
    const out = cleanBody("  Olá <b>equipe</b>\u0007  \n\n\n\n dúvida  ");
    expect(out).not.toMatch(/[<>\u0007]/);
    expect(out).not.toMatch(/\n{3,}/);
    expect(out.startsWith("Olá")).toBe(true);
    expect(out.endsWith("dúvida")).toBe(true);
  });
  it("vazio e não-texto viram vazio", () => {
    expect(cleanBody("   ")).toBe("");
    expect(cleanBody(42)).toBe("");
    expect(cleanBody(null)).toBe("");
  });
  it("limita a 1000 caracteres", () => {
    expect(cleanBody("a".repeat(5000))).toHaveLength(1000);
  });
});
