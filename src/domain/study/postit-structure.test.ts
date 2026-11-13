import { describe, expect, it } from "vitest";
import { isRichStructure, sanitizeStructure, structureMatchesQuote } from "./postit-structure";

const table = [{ k: "table", rows: [{ h: true, c: ["Crime", "Pena"] }, { c: ["Furto", "1 a 4 anos"] }] }];

describe("estrutura do post-it", () => {
  it("aceita tabela e confere o texto com o trecho", () => {
    const s = sanitizeStructure(table)!;
    expect(s).toHaveLength(1);
    expect(isRichStructure(s)).toBe(true);
    expect(structureMatchesQuote(s, "Crime Pena\nFurto 1 a 4 anos")).toBe(true);
    expect(structureMatchesQuote(s, "Crime Pena\nRoubo 4 a 10 anos")).toBe(false);
  });
  it("recusa formas desconhecidas e excessos", () => {
    expect(sanitizeStructure([{ k: "script", t: "x" }])).toBeNull();
    expect(sanitizeStructure("x")).toBeNull();
    expect(sanitizeStructure([{ k: "table", rows: [{ c: Array(30).fill("a") }] }])).toBeNull();
  });
  it("um parágrafo simples não é estrutura rica", () => {
    expect(isRichStructure(sanitizeStructure([{ k: "p", t: "texto" }])!)).toBe(false);
  });
});
