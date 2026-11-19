import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../supabase", () => ({ createAdminClient: () => ({}) }));
vi.mock("./push", () => ({ sendPushToUsers: vi.fn() }));
vi.mock("./mentor", () => ({ computeMentor: vi.fn() }));
vi.mock("./raiox-notice", () => ({ getRaioXNotices: vi.fn() }));
vi.mock("./concursos-aviso", () => ({ resumoConcursos: vi.fn() }));
import { textoMentor } from "./mentor-push";

describe("textoMentor", () => {
  it("não avisa sem novidades", () => expect(textoMentor(0, [])).toBeNull());
  it("pode sortear o Raio-X", () => expect(textoMentor(1, [{ key: "x", texto: "x" }], 0, () => 0)?.body).toContain("Raio-X"));
  it("rotaciona entre prioridades e concursos", () => {
    const vistos = new Set(Array.from({ length: 200 }, () => textoMentor(0, [{ key: "a", texto: "Revise Matemática" }, { key: "b", texto: "Faça 10 questões" }], 2)?.body));
    expect(vistos.size).toBeGreaterThan(4);
    expect(textoMentor(0, [{ key: "a", texto: "a" }, { key: "b", texto: "b" }, { key: "c", texto: "c" }])?.total).toBe(3);
  });
});

describe("textoMentor com concursos", () => {
  it("só concursos ativos geram aviso e entram no selo", () => {
    const t = textoMentor(0, [], 3, () => 0);
    expect(t?.total).toBe(3);
    expect(t?.body).toContain("3 concursos");
  });
  it("soma ao selo com prioridades", () => expect(textoMentor(0, [{ key: "a", texto: "a" }, { key: "b", texto: "b" }], 3)?.total).toBe(5));
});
