import { describe, expect, it } from "vitest";
import { resumir, textoAviso } from "./concursos-aviso";

const L = [
  { name: "PM-MG", uf: "MG", status: "inscricoes_abertas" },
  { name: "PC-GO", uf: "GO", status: "inscricoes_abertas" },
  { name: "Polícia Penal", uf: "MG", status: "previsto" },
];

describe("aviso diário de concursos", () => {
  it("conta abertos e previstos e escolhe destaque entre os abertos", () => {
    const r = resumir(L, new Date("2026-11-19T12:00:00Z"));
    expect(r).toMatchObject({ abertos: 2, previstos: 1 });
    expect(["PM-MG", "PC-GO"]).toContain(r.destaque?.name);
  });
  it("o destaque muda de um dia para o outro", () => {
    const a = resumir(L, new Date("2026-11-19T12:00:00Z")).destaque?.name;
    const b = resumir(L, new Date("2026-11-20T12:00:00Z")).destaque?.name;
    expect(a).not.toBe(b);
  });
  it("sem abertos usa os previstos; sem nada, não avisa", () => {
    expect(["Concursos previstos", "Edital a caminho", "Fique de olho", "Vem concurso por aí"]).toContain(textoAviso(resumir([L[2]!]))?.title);
    expect(textoAviso(resumir([]))).toBeNull();
    expect(textoAviso(resumir(L))?.body).toMatch(/2 concursos abertos e 1 previsto/);
  });
  it("varia frase e destaque entre sorteios", () => {
    const r = resumir(L);
    const corpos = new Set(Array.from({ length: 40 }, (_, i) => textoAviso(r, () => (i % 10) / 10)?.body));
    expect(corpos.size).toBeGreaterThan(3);
  });
});
