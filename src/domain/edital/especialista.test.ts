import { describe, expect, it } from "vitest";
import { ANCORAGEM_MINIMA, compacto, lerJson, montarParsed, pedidoIdentificacao, pedidoTopicos, textoComPaginas, validarIdentificacao, validarTopicos } from "./especialista";

const PAGINAS = [
  "EDITAL Nº 01/2026 POLÍCIA CIVIL DO ESTADO DE MINAS GERAIS\nCargos: Investigador de Polícia I; Escrivão de Polícia I.\nInscrições de 10 a 20 de março.",
  "ANEXO II - CONTEÚDO PROGRAMÁTICO\nLÍNGUA PORTUGUESA\n1 Compreensão e interpretação de tex-\ntos. 2 Emprego das classes de pala-\nvras.\nDIREITO PENAL\n1 Princípios básicos. 2 Aplicação da lei penal.",
];

describe("especialista (Gemini) — regras puras", () => {
  it("marca as páginas do edital para o modelo apontar a origem", () => {
    const t = textoComPaginas(PAGINAS);
    expect(t).toContain("[[PÁGINA 1]]");
    expect(t).toContain("[[PÁGINA 2]]");
    expect(textoComPaginas(PAGINAS, 2, 2)).not.toContain("[[PÁGINA 1]]");
  });

  it("o pedido manda ler o edital inteiro e filtra pelo cargo quando ele é conhecido", () => {
    expect(pedidoIdentificacao("X", "Escrivão de Polícia I")).toContain("CARGO PRETENDIDO PELO ALUNO: Escrivão de Polícia I");
    expect(pedidoIdentificacao("X", null)).toContain("NÃO informou o cargo");
    expect(pedidoTopicos("DIREITO PENAL", "Y", null)).toContain('"DIREITO PENAL"');
  });

  it("valida a identificação: nomes inválidos, repetidos e páginas fora do edital saem", () => {
    const r = validarIdentificacao(JSON.stringify({ concurso: " PC MG ", ano: 2026, cargos: ["Investigador de Polícia I", "Investigador de Polícia I", "ab"], pagina_inicio: 9, pagina_fim: 2,
      disciplinas: [{ nome: "LÍNGUA PORTUGUESA", pagina: 2 }, { nome: "língua portuguesa", pagina: 2 }, { nome: "x" }, { nome: "DIREITO PENAL", pagina: 99 }] }), 2);
    expect(r?.concurso).toBe("PC MG");
    expect(r?.cargos).toEqual(["Investigador de Polícia I"]);
    expect(r?.disciplinas).toEqual([{ nome: "LÍNGUA PORTUGUESA", pagina: 2 }, { nome: "DIREITO PENAL", pagina: null }]);
    expect(r?.paginaInicio).toBeNull(); // 9 > total de páginas
    expect(validarIdentificacao("lixo", 2)).toBeNull();
    expect(lerJson("```json\n{\"a\":1}\n```")).toEqual({ a: 1 });
  });

  it("valida os tópicos: nível limitado, vazios e repetidos em sequência saem", () => {
    const r = validarTopicos({ topicos: [{ codigo: "1", nivel: 1, titulo: "Princípios básicos" }, { codigo: "1", nivel: 1, titulo: "Princípios básicos" }, { nivel: 9, titulo: "Aplicação da lei penal" }, { nivel: 1, titulo: "" }] });
    expect(r).toEqual([{ codigo: "1", nivel: 1, titulo: "Princípios básicos" }, { codigo: null, nivel: 5, titulo: "Aplicação da lei penal" }]);
    expect(validarTopicos({})).toBeNull();
  });

  it("monta a estrutura só com o que existe no texto do edital (mesmo com quebra de linha e hífen do PDF)", () => {
    const m = montarParsed({
      paginas: PAGINAS, inicio: 2, fim: 2,
      disciplinas: [
        { nome: "LÍNGUA PORTUGUESA", pagina: 2, topicos: [
          { codigo: "1", nivel: 1, titulo: "Compreensão e interpretação de textos" },
          { codigo: "2", nivel: 1, titulo: "Emprego das classes de palavras" },
          { codigo: "3", nivel: 1, titulo: "Tópico inventado pelo modelo sobre física quântica" },
        ] },
        { nome: "DIREITO PENAL", pagina: 2, topicos: [{ codigo: "1", nivel: 1, titulo: "Princípios básicos" }, { codigo: "2", nivel: 1, titulo: "Aplicação da lei penal" }] },
        { nome: "MATÉRIA FANTASMA", pagina: null, topicos: [{ codigo: "1", nivel: 1, titulo: "Nada disso está no edital" }] },
      ],
    });
    expect(m.parsed.disciplines.map((d) => d.name)).toEqual(["LÍNGUA PORTUGUESA", "DIREITO PENAL"]);
    expect(m.parsed.disciplines[0]!.topics.map((t) => t.title)).toEqual(["Compreensão e interpretação de textos", "Emprego das classes de palavras"]);
    expect(m.parsed.disciplines[0]!.topics[0]!.page).toBe(2);
    expect(m.parsed.disciplines[1]!.mode).toBe("direito_penal");
    expect(m.total).toBe(6);
    expect(m.descartados).toBe(2);
    expect(m.ancoragem).toBeCloseTo(4 / 6, 5);
    expect(m.parsed.warnings.join(" ")).toContain("MATÉRIA FANTASMA");
    expect(m.parsed.sectionPages).toEqual([2, 2]);
  });

  it("resposta toda inventada tem ancoragem abaixo do mínimo e não vira estrutura", () => {
    const m = montarParsed({ paginas: PAGINAS, inicio: null, fim: null, disciplinas: [{ nome: "FÍSICA", pagina: null, topicos: [{ codigo: "1", nivel: 1, titulo: "Relatividade geral e cosmologia" }] }] });
    expect(m.ancoragem).toBeLessThan(ANCORAGEM_MINIMA);
    expect(m.parsed.found).toBe(false);
    expect(compacto("Interpre-\ntação de  textos")).toBe("interpretacaodetextos");
  });
});
