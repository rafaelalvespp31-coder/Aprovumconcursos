import { describe, expect, it } from "vitest";
import { chaveCargo, podeCompartilhar, validarCompartilhada } from "./leitura-compartilhada";
import type { ParsedEdital } from "./parser";

const parsed = (topicos = 2): ParsedEdital => ({ found: true, confidence: 0.97, sectionPages: [43, 47], warnings: [], disciplines: [{ name: "Direito Penal", mode: null as never, page: 46, topics: Array.from({ length: topicos }, (_, i) => ({ code: `1.${i + 1}`, depth: 1, title: `Item ${i}`, titleKey: `item ${i}`, page: 46 })) }] });
const info = { concurso: "PC MG", banca: null, ano: null, cargos: ["Investigador"], cargoUsado: null, paginaInicio: 43, paginaFim: 47, disciplinas: [], observacao: null };

describe("leitura compartilhada entre alunos", () => {
  it("o mesmo cargo escrito de formas diferentes tem a mesma chave; sem cargo é a chave vazia", () => {
    expect(chaveCargo("Investigador de Polícia I")).toBe(chaveCargo("  INVESTIGADOR  de polícia i "));
    expect(chaveCargo(null)).toBe("");
    expect(chaveCargo("Escrivão")).not.toBe(chaveCargo("Investigador"));
  });

  it("só compartilha leitura que cobriu bem o edital e não tem matéria vazia", () => {
    expect(podeCompartilhar(parsed(), 0.97)).toBe(true);
    expect(podeCompartilhar(parsed(), 0.6)).toBe(false);
    expect(podeCompartilhar(null, 1)).toBe(false);
    const vazia = parsed(); vazia.disciplines.push({ name: "Vazia", mode: null as never, page: 1, topics: [] });
    expect(podeCompartilhar(vazia, 0.99)).toBe(false);
  });

  it("linha do banco íntegra é aceita; linha estragada vale como inexistente", () => {
    const ok = validarCompartilhada({ modelo: "gemini-3.8-flash", info, parsed: parsed(), leitura: { cobertura: 0.97, trechos: 3, descartados: 0, naoClassificados: [] } });
    expect(ok?.parsed.disciplines[0]!.topics).toHaveLength(2);
    expect(ok?.modelo).toBe("gemini-3.8-flash");
    expect(validarCompartilhada(null)).toBeNull();
    expect(validarCompartilhada({ info, parsed: { disciplines: [] }, leitura: { cobertura: 1 } })).toBeNull();
    expect(validarCompartilhada({ info, parsed: { disciplines: [{ name: "X", topics: [{ title: 1 }] }] }, leitura: { cobertura: 1 } })).toBeNull();
    expect(validarCompartilhada({ info, parsed: parsed(), leitura: {} })).toBeNull();
  });
});
