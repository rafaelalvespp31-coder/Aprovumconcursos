import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("../supabase", () => ({ createAdminClient: () => ({}) }));
vi.mock("./push", () => ({ sendPushToUsers: vi.fn() }));
vi.mock("./mentor", () => ({ computeMentor: vi.fn() }));
vi.mock("./raiox-notice", () => ({ getRaioXNotices: vi.fn() }));
import { textoMentor } from "./mentor-push";

describe("textoMentor", () => {
  it("não avisa sem novidades", () => expect(textoMentor(0, [])).toBeNull());
  it("Raio-X tem prioridade", () => expect(textoMentor(1, ["x"])?.body).toContain("Raio-X"));
  it("mostra a primeira prioridade e quantas mais", () => {
    const t = textoMentor(0, ["Revise Matemática", "b", "c"]);
    expect(t?.body).toBe("Revise Matemática (+2)");
    expect(t?.total).toBe(3);
  });
});
