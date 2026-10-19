import { describe, expect, it } from "vitest";
import { subjectArt } from "./subjects-section";

describe("arte de fundo por matéria", () => {
  it("uma arte por matéria, qualquer que seja o tema", () => {
    expect(subjectArt("Direito Penal")).toBe("/images/materias/direito-penal.webp");
    expect(subjectArt("Direito Processual Penal")).toBe("/images/materias/processo-penal.webp");
    expect(subjectArt("Língua Portuguesa")).toBe("/images/materias/lingua-portuguesa.webp");
    expect(subjectArt("Raciocínio Lógico")).toBe("/images/materias/raciocinio-logico.webp");
    expect(subjectArt("Matemática")).toBe("/images/materias/raciocinio-logico.webp");
  });
  it("matérias sem arte própria mantêm a arte padrão", () => {
    expect(subjectArt("Direito Administrativo")).toBeNull();
    expect(subjectArt(null)).toBeNull();
  });
});
