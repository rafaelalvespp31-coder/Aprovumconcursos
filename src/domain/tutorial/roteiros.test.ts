import { describe, expect, it } from "vitest";
import { passoValido, rotuloPasso, segmentos, TOUR_ID, TUTORIAIS, tutorialPorId } from "./roteiros";

describe("roteiros do tour", () => {
  it("todos os tutoriais têm passos com texto, alvo e id único", () => {
    for (const t of TUTORIAIS) {
      expect(t.passos.length).toBeGreaterThan(0);
      expect(new Set(t.passos.map((p) => p.id)).size).toBe(t.passos.length);
      for (const p of t.passos) { expect(p.texto.length).toBeGreaterThan(20); expect(p.alvos.length).toBeGreaterThan(0); }
      expect(t.id).toMatch(/^[a-z0-9-]{2,40}$/);
    }
  });
  it("o tour completo existe e não tem etapa de simulados (a função não existe no app)", () => {
    const t = tutorialPorId(TOUR_ID)!;
    expect(t.passos.length).toBeGreaterThanOrEqual(12);
    expect(JSON.stringify(t).toLowerCase()).not.toContain("simulado");
  });
  it("rótulo e passo válido", () => {
    expect(rotuloPasso(2, 14)).toBe("PASSO 03 DE 14");
    const t = tutorialPorId(TOUR_ID)!;
    expect(passoValido(t, 5)).toBe(5);
    expect(passoValido(t, 99)).toBe(0);
    expect(passoValido(t, -1)).toBe(0);
  });
  it("segmentos agrupam passos seguidos da mesma rota", () => {
    const t = tutorialPorId(TOUR_ID)!;
    const seg = segmentos(t.passos, t.rota);
    expect(seg[0]).toMatchObject({ rota: "/trilhas", de: 0 });
    expect(seg[seg.length - 1]!.ate).toBe(t.passos.length - 1);
    expect(seg.length).toBeGreaterThanOrEqual(2); // estudos e perfil
  });
});
