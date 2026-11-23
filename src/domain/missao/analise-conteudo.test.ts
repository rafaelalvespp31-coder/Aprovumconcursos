import { describe, expect, it } from "vitest";
import focosPcmg from "./__fixtures__/focos-pcmg.json";
import { CATALOGO_AMOSTRA } from "./__fixtures__/catalogo-amostra";
import { agruparTopicos, modosDaDisciplina, combinarComEdital, focosComoConteudo, parearDisciplinas, resumoDisponibilidade, type TopicoVisao } from "./analise-conteudo";

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

describe("focosComoConteudo", () => {
  const cat = [
    { id: "1", title: "Atos Administrativos: conceito e atributos", aliases: ["Atos administrativos"], mode: "direito_administrativo", group: "ATOS", lawCode: null, articles: [] },
    { id: "2", title: "Poderes da Administração", aliases: [], mode: "direito_administrativo", group: "PODERES", lawCode: null, articles: [] },
    { id: "3", title: "Crase", aliases: [], mode: "lingua_portuguesa", group: "CRASE", lawCode: null, articles: [] },
  ];
  it("liga o foco à aula catalogada (verde) e deixa sem aula o que não existe (vermelho)", () => {
    const r = focosComoConteudo([{ nome: "NOÇÕES DE DIREITO ADMINISTRATIVO", focos: ["Atos administrativos", "Responsabilidade civil do Estado"] }, { nome: "VAZIA", focos: [] }], cat);
    expect(r).toHaveLength(1);
    expect(r[0]!.topicos.map((t) => [t.titulo, t.disponivel])).toEqual([["Atos administrativos", true], ["Responsabilidade civil do Estado", false]]);
    expect(r[0]!.topicos[0]!.aulas[0]).toContain("Atos Administrativos");
    expect(r[0]!.topicos[1]!.aulas).toEqual([]);
  });
});

describe("focosComoConteudo com os grupos reais do catálogo (PC MG)", () => {
  const r = focosComoConteudo(focosPcmg, CATALOGO_AMOSTRA);
  const por = (nome: string) => r.find((d) => d.nome.includes(nome))!;
  const verde = (nome: string, foco: string) => por(nome).topicos.find((t) => t.titulo.startsWith(foco))!.disponivel;
  it("acha as aulas que existem, pelo grupo ou pelo título", () => {
    for (const [d, f] of [["DIREITO PENAL", "Teoria do crime"], ["DIREITO PENAL", "Concurso de pessoas"], ["DIREITO PENAL", "Penas e extinção"], ["DIREITO PENAL", "Crimes em espécie"], ["PROCESSUAL PENAL", "Provas"], ["PROCESSUAL PENAL", "Prisões"], ["RACIOCÍNIO", "Lógica proposicional"], ["INFORMÁTICA", "Sistemas operacionais"], ["INFORMÁTICA", "Segurança da informação"], ["PORTUGUESA", "Sintaxe"], ["PORTUGUESA", "Pontuação"], ["PORTUGUESA", "Reescrita"], ["CONSTITUCIONAL", "Segurança pública"], ["HUMANOS", "Conceito, características"]] as const) expect(verde(d, f), `${d}: ${f}`).toBe(true);
  });
  it("mostra de onde vem a aula (grupo e quantidade)", () => {
    expect(por("DIREITO PENAL").topicos.find((t) => t.titulo === "Teoria do crime")!.aulas[0]).toMatch(/Teoria Geral do Crime · \d+ aulas?/);
  });
  it("não inventa aula onde o catálogo não tem", () => {
    for (const nome of ["ORGÂNICA", "MEDICINA LEGAL", "CRIMINOLOGIA"]) expect(por(nome).topicos.every((t) => !t.disponivel), nome).toBe(true);
    expect(verde("CONSTITUCIONAL", "Direitos e garantias")).toBe(false);
    expect(verde("INFORMÁTICA", "Apresentações")).toBe(false);
    expect(verde("EXTRAVAGANTE", "Crimes e respectivas")).toBe(false);
  });
  it("aulas da matéria que não casaram com nenhum foco aparecem à parte", () => {
    const extras = por("EXTRAVAGANTE").extras ?? [];
    expect(extras.some((e) => /ECA/.test(e.titulo))).toBe(true);
    expect(extras.some((e) => /Hediondos/.test(e.titulo))).toBe(true);
    expect(por("ORGÂNICA").extras).toBeUndefined();
  });
});

describe("modosDaDisciplina", () => {
  it("lógico-matemático usa lógica e matemática; direitos humanos tem matéria própria; área sem catálogo fica vazia", () => {
    expect(modosDaDisciplina("RACIOCÍNIO LÓGICO-MATEMÁTICO")).toEqual(["raciocinio_logico", "matematica"]);
    expect(modosDaDisciplina("NOÇÕES DE DIREITOS HUMANOS")).toEqual(["direitos_humanos"]);
    expect(modosDaDisciplina("LEGISLAÇÃO PENAL E PROCESSUAL EXTRAVAGANTE")).toEqual(["legislacao_especial"]);
    expect(modosDaDisciplina("NOÇÕES DE MEDICINA LEGAL")).toEqual([]);
    expect(modosDaDisciplina("NOÇÕES DE CRIMINOLOGIA", new Set(["criminologia"]))).toEqual(["criminologia"]);
  });
});
