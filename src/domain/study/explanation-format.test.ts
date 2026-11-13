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
