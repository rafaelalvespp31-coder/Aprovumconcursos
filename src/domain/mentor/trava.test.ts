import { describe, expect, it } from "vitest";
import { travaDeAssunto } from "./trava";

const outras = ["Furto", "Estelionato", "Furto qualificado", "Dos crimes contra o patrimônio"];
describe("trava de assunto", () => {
  it("na aula de roubo, pedir furto trava e aponta a aula de furto", () => {
    expect(travaDeAssunto("me ensina furto no quadro e dá um exemplo", "Roubo", outras)).toBe("Furto");
  });
  it("na aula de furto simples, pedir furto qualificado trava; pedir furto só, não", () => {
    expect(travaDeAssunto("explica furto qualificado", "Furto simples", ["Furto qualificado", "Roubo"])).toBe("Furto qualificado");
    expect(travaDeAssunto("explica o furto", "Furto simples", ["Furto qualificado", "Roubo"])).toBeNull();
  });
  it("assunto da própria aula ou comparação com ela não trava", () => {
    expect(travaDeAssunto("me explica o roubo", "Roubo", outras)).toBeNull();
    expect(travaDeAssunto("qual a diferença entre roubo e furto", "Roubo", outras)).toBeNull();
  });
  it("palavra genérica não trava", () => {
    expect(travaDeAssunto("fala dos crimes", "Roubo", outras)).toBeNull();
    expect(travaDeAssunto("me dá um exemplo", "Roubo", outras)).toBeNull();
  });
});
