import { describe, expect, it } from "vitest";
import { caminhoContavel, diaBrasilia, ehRobo, hashVisitante } from "./visitas";

describe("visitas", () => {
  it("ignora robôs", () => {
    expect(ehRobo("Googlebot/2.1")).toBe(true);
    expect(ehRobo("")).toBe(true);
    expect(ehRobo("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) Safari/604.1")).toBe(false);
  });
  it("dia no fuso de Brasília", () => {
    expect(diaBrasilia(new Date("2026-11-20T01:30:00Z"))).toBe("2026-11-19");
  });
  it("hash muda por dia e não expõe os dados", () => {
    const a = hashVisitante("1.2.3.4", "UA", "2026-11-19", "s");
    expect(a).toBe(hashVisitante("1.2.3.4", "UA", "2026-11-19", "s"));
    expect(a).not.toBe(hashVisitante("1.2.3.4", "UA", "2026-11-20", "s"));
    expect(a).not.toContain("1.2.3.4");
  });
  it("não conta áreas internas", () => {
    expect(caminhoContavel("/")).toBe(true);
    expect(caminhoContavel("/concursos")).toBe(true);
    expect(caminhoContavel("/admin/alunos")).toBe(false);
    expect(caminhoContavel("/api/x")).toBe(false);
  });
});
