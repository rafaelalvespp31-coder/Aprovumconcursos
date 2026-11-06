import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../supabase", () => ({ createAdminClient: () => ({}) }));
const { folderNameFor } = await import("./edital-study");

describe("pasta do Começar estudo", () => {
  it("usa o cargo e o concurso", () => expect(folderNameFor({ roleName: "Guarda Municipal", contestName: "Prefeitura de Paulínia", title: "x" })).toBe("Guarda Municipal · Prefeitura de Paulínia"));
  it("sem cargo, usa o concurso", () => expect(folderNameFor({ roleName: null, contestName: "PMERJ 2026", title: "x" })).toBe("PMERJ 2026"));
  it("não repete o concurso quando o cargo já o contém", () => expect(folderNameFor({ roleName: "Soldado PMERJ 2026", contestName: "PMERJ 2026", title: "x" })).toBe("Soldado PMERJ 2026"));
  it("cabe nos 80 caracteres da pasta", () => expect(folderNameFor({ roleName: "a".repeat(100), contestName: null, title: "x" }).length).toBeLessThanOrEqual(80));
});
