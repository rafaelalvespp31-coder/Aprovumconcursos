import { describe, expect, it } from "vitest";
import { canonicalRedirect, nameMatches } from "./identity";

describe("recuperação de senha: nome confere", () => {
  it("nome completo ou primeiro e último nome, sem acento e maiúscula", () => {
    expect(nameMatches("rafael alves", "Rafael Alves")).toBe(true);
    expect(nameMatches("JOSÉ da Silva Souza", "Jose Silva Souza")).toBe(true);
    expect(nameMatches("José Souza", "José da Silva Souza")).toBe(true);
  });
  it("nome diferente, só o primeiro nome de conta com sobrenome, ou conta sem nome: não confere", () => {
    expect(nameMatches("Rafael Costa", "Rafael Alves")).toBe(false);
    expect(nameMatches("Rafael", "Rafael Alves")).toBe(false);
    expect(nameMatches("Rafael Alves", "")).toBe(false);
    expect(nameMatches("", "Rafael Alves")).toBe(false);
    expect(nameMatches("Rafael", "Rafael")).toBe(true);
  });
});

describe("endereço oficial", () => {
  it("produção fora do domínio oficial vai para aprovumconcursos.com.br", () => {
    expect(canonicalRedirect("aprovumconcursos20.vercel.app", "production")).toBe("https://aprovumconcursos.com.br");
    expect(canonicalRedirect("www.aprovumconcursos.com.br", "production")).toBe("https://aprovumconcursos.com.br");
    expect(canonicalRedirect("aprovumconcursos.com.br", "production")).toBeNull();
  });
  it("prévias e desenvolvimento não redirecionam", () => {
    expect(canonicalRedirect("aprovum-git-x.vercel.app", "preview")).toBeNull();
    expect(canonicalRedirect("localhost:3000", undefined)).toBeNull();
  });
});
