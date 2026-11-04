import { describe, expect, it } from "vitest";
import { shortName } from "./short-name";

describe("shortName", () => {
  it("abrevia a primeira letra do primeiro nome, mantendo o último sobrenome", () => {
    expect(shortName("William Abreu")).toBe("W. Abreu");
    expect(shortName("  Rafael   Alves ")).toBe("R. Alves");
    expect(shortName("William Abreu Pereira de Souza")).toBe("W. Souza");
    expect(shortName("Maria Aparecida Rodrigues")).toBe("M. Rodrigues");
  });
  it("nome único fica como está", () => {
    expect(shortName("Rafael")).toBe("Rafael");
  });
});
