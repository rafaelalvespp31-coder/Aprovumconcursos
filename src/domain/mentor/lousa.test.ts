import { describe, expect, it } from "vitest";
import { lousaSchema, pedeLousa } from "./lousa";

describe("pedeLousa", () => {
  it("detecta pedidos de conta, exemplo e desenho", () => {
    expect(pedeLousa("me ensina como calcular porcentagem")).toBe(true);
    expect(pedeLousa("dá um exemplo de regra de três")).toBe(true);
    expect(pedeLousa("desenha um triângulo retângulo pra mim")).toBe(true);
    expect(pedeLousa("explica passo a passo essa equação")).toBe(true);
  });
  it("ignora conversa comum e falas curtas", () => {
    expect(pedeLousa("tudo bem com você hoje")).toBe(false);
    expect(pedeLousa("ok")).toBe(false);
  });
});

describe("lousaSchema", () => {
  it("aceita passos e desenho e rejeita primitivas desconhecidas", () => {
    const ok = lousaSchema.safeParse({ mostrar: true, titulo: "x", passos: [{ texto: "a", conta: "1+1=2" }], desenho: [{ t: "linha", x1: 1, y1: 2, x2: 3, y2: 4 }] });
    expect(ok.success).toBe(true);
    expect(lousaSchema.safeParse({ mostrar: true, passos: [], desenho: [{ t: "svg", raw: "<script>" }] }).success).toBe(false);
  });
});
