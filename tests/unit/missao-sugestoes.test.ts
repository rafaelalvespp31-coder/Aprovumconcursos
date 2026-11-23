import { describe, expect, it } from "vitest";
import { mesclar, normalizar, pontuar, rankear, sanitizarConsulta, type Sugestao } from "@/domain/missao/sugestoes";

const cat = (id: string, nome: string, detalhe: string | null = null): Sugestao => ({ id, tipo: "catalogo", nome, detalhe });
const ed = (id: string, nome: string): Sugestao => ({ id, tipo: "edital", nome, detalhe: "Seu edital", editalId: id });

describe("sugestões da Central de Missão", () => {
  it("normaliza acentos e caixa", () => expect(normalizar("  Polícia   PENAL ")).toBe("policia penal"));
  it("sanitiza a consulta (sem curingas/operadores) e exige 2+ letras", () => {
    expect(sanitizarConsulta("pol%í,cia(*)")).toBe("pol í cia");
    expect(sanitizarConsulta("a")).toBe("");
    expect(sanitizarConsulta(42)).toBe("");
    expect(sanitizarConsulta("x".repeat(200)).length).toBe(60);
  });
  it("todas as palavras precisam combinar, em qualquer ordem", () => {
    const s = cat("1", "Polícia Penal MG");
    expect(pontuar("penal policia", s)).toBeGreaterThan(0);
    expect(pontuar("policia federal", s)).toBe(0);
  });
  it("prefixo vale mais que trecho; igualdade vale mais que tudo", () => {
    expect(pontuar("policia penal mg", cat("1", "Polícia Penal MG"))).toBe(100);
    expect(pontuar("pol", cat("1", "Polícia Penal MG"))).toBeGreaterThan(pontuar("penal", cat("2", "Polícia Penal MG")));
  });
  it("catálogo vem antes dos editais do aluno e repetidos somem", () => {
    const r = rankear("policia", [ed("e1", "Polícia Penal MG"), cat("c1", "Polícia Civil MG"), cat("c2", "Polícia Penal MG"), cat("c2b", "Polícia Penal MG")]);
    expect(r.map((x) => x.id)).toEqual(["c1", "c2", "e1"]);
  });
  it("sem correspondência = lista vazia (nunca inventa)", () => expect(rankear("xyzxyz", [cat("1", "PRF")])).toEqual([]));
  it("consulta vazia mostra tudo, respeitando o máximo", () => expect(rankear("", [cat("1", "A"), cat("2", "B"), cat("3", "C")], 2)).toHaveLength(2));
  it("mescla sem duplicar", () => expect(mesclar([cat("1", "A")], [cat("1", "A"), cat("2", "B")]).map((x) => x.id)).toEqual(["1", "2"]));
});
