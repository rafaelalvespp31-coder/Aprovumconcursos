import { describe, expect, it } from "vitest";
import { rotuloDoTipo, tipoValido } from "./tipos";

describe("tipos de pergunta do Modo Jogo", () => {
  it("aceita os quatro tipos conhecidos", () => {
    for (const t of ["todas", "lacunas", "vf", "escolha"]) expect(tipoValido(t)).toBe(t);
  });
  it("valor desconhecido ou ausente vira 'todas'", () => {
    expect(tipoValido("abc")).toBe("todas");
    expect(tipoValido(undefined)).toBe("todas");
    expect(tipoValido(["vf"])).toBe("todas");
  });
  it("tem rótulo legível", () => {
    expect(rotuloDoTipo("vf")).toBe("Verdadeiro ou falso");
  });
});
