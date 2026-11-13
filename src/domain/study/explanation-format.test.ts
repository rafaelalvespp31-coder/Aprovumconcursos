import { describe, expect, it } from "vitest";
import { hasBullets, parseExplanation, wantsItemized } from "./explanation-format";

describe("explicação em tópicos", () => {
  it("separa um item por linha, com o termo em cima", () => {
    const p = parseExplanation("- Crime permanente: consumação que se prolonga.\n- Crime continuado: vários crimes da mesma espécie.");
    expect(p).toEqual([
      { kind: "item", term: "Crime permanente", text: "consumação que se prolonga." },
      { kind: "item", term: "Crime continuado", text: "vários crimes da mesma espécie." },
    ]);
  });
  it("texto corrido vira parágrafo", () => {
    expect(parseExplanation("Explicação simples.")).toEqual([{ kind: "p", text: "Explicação simples." }]);
    expect(hasBullets("Explicação simples.")).toBe(false);
  });
  it("detecta trecho com vários itens", () => {
    expect(wantsItemized("Crime permanente.\nCrime continuado.")).toBe(true);
    expect(wantsItemized("Um parágrafo só")).toBe(false);
  });
});

describe("explicação com itens colados numa linha", () => {
  it("separa cada assunto e põe o subtópico embaixo do título", () => {
    const p = parseExplanation("- Caput: furto simples: É a forma básica do furto.- Repouso noturno: Aumento de pena à noite.- Semovente: Animal que se move sozinho.");
    expect(p).toEqual([
      { kind: "item", term: "Caput", text: "" },
      { kind: "sub", term: "furto simples", text: "É a forma básica do furto." },
      { kind: "item", term: "Repouso noturno", text: "Aumento de pena à noite." },
      { kind: "item", term: "Semovente", text: "Animal que se move sozinho." },
    ]);
  });
  it("não quebra palavras com hífen", () => {
    expect(parseExplanation("- Ex-esposa: pessoa que foi casada.")).toEqual([{ kind: "item", term: "Ex-esposa", text: "pessoa que foi casada." }]);
  });
});
