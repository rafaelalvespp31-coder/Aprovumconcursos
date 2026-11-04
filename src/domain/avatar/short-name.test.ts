import { describe, expect, it } from "vitest";
import { shortName } from "./short-name";

describe("shortName", () => {
  it("mantém nomes curtos", () => {
    expect(shortName("Rafael Alves")).toBe("Rafael Alves");
    expect(shortName("  William   Abreu ")).toBe("William Abreu");
  });
  it("abrevia só a primeira letra do nome nos extensos", () => {
    expect(shortName("William Abreu Pereira de Souza")).toBe("W. Souza");
    expect(shortName("Maria Aparecida Rodrigues")).toBe("M. Rodrigues");
  });
});
