import { describe, expect, it } from "vitest";
import { nomeConcurso } from "./nome-concurso";
describe("nomeConcurso", () => {
  it("expande sigla", () => expect(nomeConcurso(" prf ")).toEqual({ nome: "Polícia Rodoviária Federal", sigla: "PRF" }));
  it("mantém nome completo", () => expect(nomeConcurso("Polícia Penal MG")).toEqual({ nome: "Polícia Penal MG", sigla: null }));
});
