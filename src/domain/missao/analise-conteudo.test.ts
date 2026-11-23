import { describe, expect, it } from "vitest";
import { agruparTopicos, combinarComEdital, parearDisciplinas, resumoDisponibilidade, type TopicoVisao } from "./analise-conteudo";

const t = (nivel: number, titulo: string, disponivel: boolean): TopicoVisao => ({ codigo: null, nivel, titulo, disponivel, aulas: disponivel ? ["Aula"] : [] });

describe("parearDisciplinas", () => {
  it("liga nomes da análise aos do edital mesmo com 'Noções de', 'Básica' e variações", () => {
    const analise = ["LÍNGUA PORTUGUESA", "RACIOCÍNIO LÓGICO-MATEMÁTICO", "INFORMÁTICA BÁSICA", "NOÇÕES DE DIREITO ADMINISTRATIVO", "DIREITO PENAL", "DIREITO PROCESSUAL PENAL", "NOÇÕES DE MEDICINA LEGAL"];
    const edital = ["Direito Processual Penal", "Informática", "Língua Portuguesa", "Raciocínio Lógico", "Direito Penal", "Direito Administrativo"];
    expect(parearDisciplinas(analise, edital)).toEqual([2, 3, 1, 5, 4, 0, null]);
  });
  it("não repete a disciplina do edital e não força o que não parece", () => {
    expect(parearDisciplinas(["DIREITO PENAL", "DIREITO PENAL MILITAR"], ["Direito Penal"])).toEqual([0, null]);
    expect(parearDisciplinas(["CRIMINOLOGIA"], ["Física"])).toEqual([null]);
    expect(parearDisciplinas([], ["A"])).toEqual([]);
  });
});

describe("agruparTopicos e resumo", () => {
  const lista = [t(1, "1 Crimes", true), t(2, "1.1 Homicídio", true), t(2, "1.2 Lesão", false), t(1, "2 Penas", false), t(1, "3 Extinção", true)];
  it("cria um cartão por tópico de nível mais alto, com os subtópicos dentro", () => {
    const c = agruparTopicos(lista);
    expect(c.map((x) => [x.raiz.titulo, x.filhos.length, x.disponiveis, x.total])).toEqual([["1 Crimes", 2, 2, 3], ["2 Penas", 0, 0, 1], ["3 Extinção", 0, 1, 1]]);
  });
  it("subtópicos soltos no começo viram cartão próprio e lista vazia dá nada", () => {
    expect(agruparTopicos([t(2, "a", true), t(1, "b", false)]).length).toBe(2);
    expect(agruparTopicos([])).toEqual([]);
  });
  it("resumo de disponibilidade", () => {
    expect(resumoDisponibilidade(lista)).toEqual({ total: 5, comAula: 3, semAula: 2, pct: 60 });
    expect(resumoDisponibilidade([]).pct).toBe(0);
  });
});

describe("combinarComEdital", () => {
  it("separa o que a análise cita do que só o edital tem", () => {
    const edital = [{ nome: "Direito Penal", topicos: [] }, { nome: "Física", topicos: [] }];
    const r = combinarComEdital(["DIREITO PENAL", "CRIMINOLOGIA"], edital);
    expect(r.pares.map((p) => p?.nome ?? null)).toEqual(["Direito Penal", null]);
    expect(r.extras.map((e) => e.nome)).toEqual(["Física"]);
  });
});
