import { describe, expect, it } from "vitest";
import { buildNovoComandoCompleto } from "./novo-comando-completo";

const group = { code: "2", title: "Lei nº 8.069/1990 — ECA" };
const sub = { code: "2.1", title: "Disposições preliminares", items: [{ code: "2.1.1", title: "Conceito de criança e adolescente" }, { code: "2.1.2", title: "Proteção integral" }] };

describe("Novo Comando Completo", () => {
  it("preenche tópico, subtópico, TEXTO-BASE e data, sem marcadores sobrando", () => {
    const p = buildNovoComandoCompleto({ disciplineMode: "direito_penal", group, subs: [sub], today: new Date("2026-11-13T15:00:00Z") });
    expect(p).toContain("NOVO COMANDO COMPLETO");
    expect(p).toContain("13/11/2026");
    expect(p).toContain("Tópico: 2. Lei nº 8.069/1990 — ECA");
    expect(p).toContain("Subtópico: 2.1 Disposições preliminares");
    expect(p).toContain("2.1.1 Conceito de criança e adolescente");
    expect(p).toContain("9 CAMADAS");
    expect(p).not.toMatch(/\{\{[A-Z]+\}\}/);
  });
  it("tópico inteiro traz todos os subtópicos", () => {
    const p = buildNovoComandoCompleto({ disciplineMode: "direito_penal", group, subs: [sub, { ...sub, code: "2.2", title: "Direitos fundamentais" }] });
    expect(p).toContain("SUBTÓPICO 2 DE 2");
  });
  it("sem subtópicos devolve vazio", () => {
    expect(buildNovoComandoCompleto({ disciplineMode: "direito_penal", group, subs: [] })).toBe("");
  });
});
