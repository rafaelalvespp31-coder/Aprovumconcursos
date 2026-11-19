import { describe, expect, it } from "vitest";
import { estimateQuestions, parseSmart } from "./smart-import";

const tec = (n: string, id: string) => `Matéria: [Língua Portuguesa (Português)](https://www.tecconcursos.com.br/materias/lingua-portuguesa-portugues)
Assunto:[Ortografia - Casos Gerais e Emprego das Letras](https://www.tecconcursos.com.br/aulas/materias/3/assuntos/5638)
${n}
[#${id}](https://www.tecconcursos.com.br/questoes/${id}) [AVANÇASP](https://www.tecconcursos.com.br/bancas/avancasp) - [2026 - Professor (Pref Aparecida (SP))/Educação Infantil (e mais 8 concursos)](https://www.tecconcursos.com.br/concursos/professor-pref-aparecida-sp-educacao-infantil-2026)
Assinale a alternativa em cuja frase todas as palavras atendem às normas vigentes de ortografia em Língua Portuguesa.

* A
Você é uma pessoa típica que apóia o lado mais difícil da questão.
* B
Os réus não foram absolvidos porque cometeram crimes graves no transito.
* C
Você sempre se mostrou muito eficás em todas as coisas que faz.
* D
A demonstrassão de apoio se dá não só nas palavras, mas também nas ações.
* E
Ideias brilhantes não nascem espontaneamente, ao acaso.
`;

describe("formato TEC Concursos", () => {
  it("lê uma questão colada do TEC", () => {
    const { drafts } = parseSmart(tec("5", "3750545"));
    expect(drafts).toHaveLength(1);
    const d = drafts[0]!;
    expect(d.board).toBe("AVANÇASP");
    expect(d.year).toBe(2026);
    expect(d.discipline).toBe("Língua Portuguesa (Português)");
    expect(d.topic).toBe("Ortografia - Casos Gerais e Emprego das Letras");
    expect(d.statement).toBe("Assinale a alternativa em cuja frase todas as palavras atendem às normas vigentes de ortografia em Língua Portuguesa.");
    expect(d.options.map((o) => o.label)).toEqual(["A", "B", "C", "D", "E"]);
    expect(d.options[0]!.text).toBe("Você é uma pessoa típica que apóia o lado mais difícil da questão.");
    expect(d.answer).toBeNull();
    expect(d.issues).toContain("gabarito_ausente");
    expect(d.issues).not.toContain("banca_ausente");
  });
  it("separa várias questões coladas juntas", () => {
    const txt = `${tec("5", "3750545")}\n${tec("6", "3750546")}`;
    expect(estimateQuestions(txt)).toBe(2);
    const { drafts } = parseSmart(txt);
    expect(drafts).toHaveLength(2);
    expect(drafts[1]!.discipline).toBe("Língua Portuguesa (Português)");
    expect(drafts[1]!.options).toHaveLength(5);
  });
});

import { matchDestino } from "./smart-import";
describe("matchDestino", () => {
  const subjects = [
    { id: "s1", name: "Língua Portuguesa", topics: [{ id: "t1", name: "Ortografia", parentId: null }, { id: "t2", name: "Crase", parentId: null }] },
    { id: "s2", name: "Direito Penal", topics: [] },
  ];
  it("casa matéria e assunto existentes", () => {
    expect(matchDestino(subjects, "Língua Portuguesa (Português)", "Ortografia - Casos Gerais e Emprego das Letras")).toEqual({ subjectId: "s1", topicId: "t1" });
  });
  it("matéria sem assunto correspondente deixa o assunto vazio e não inventa pasta", () => {
    expect(matchDestino(subjects, "Direito Penal", "Teoria do crime")).toEqual({ subjectId: "s2", topicId: null });
    expect(matchDestino(subjects, "Física", "X")).toEqual({ subjectId: null, topicId: null });
  });
});

describe("modelo TEC colado como texto (sem links)", () => {
  const txt = `Matéria: Língua Portuguesa (Português)
Assunto:
Ortografia - Casos Gerais e Emprego das Letras
   8  
 #3767074 FUNDATEC - 2026 - Agente Comunitário de Saúde (Pref Coqueiral)/PSF I (e mais 4 concursos)
 
  Texto associado

Instituto Butantan

Por Vanessa Sardinha dos Santos

 
O Instituto Butantan na...eu em um contexto de surto de peste bubônica, uma doença bacteriana transmitida, principalmente, pela picada de uma pulga. Em 1899, _____ doença estava se propagando do porto de Santos (SP). O laboratório, vinculado ______ Instituto Bacteriológico, foi criado ainda no mesmo ano.

 
Posteriormente, em 1901, o laboratório foi reconhecido como uma instituição autônoma e denominado Instituto Serumtherápico.

 
Atualmente, o Instituto, entre outras atividades, atua na produção de soros e vacinas.

 
(Disponível em: https://mundoeducacao.uol.com.br/curiosidades/instituto-butantan.htm – texto adaptado especialmente para esta prova).

 
De acordo com a norma ortográfica vigente, assinale a alternativa que preenche, correta e respectivamente, as lacunas pontilhadas.

A
sc – ç – c
B
c – ss – ss
C
c – s – ss
D
sc – ss – c
E
sc – ç – ss
`;
  it("lê matéria, assunto, banca, texto associado e alternativas", () => {
    const { drafts, baseTexts } = parseSmart(txt);
    expect(drafts).toHaveLength(1);
    const d = drafts[0]!;
    expect(d.board).toBe("FUNDATEC");
    expect(d.year).toBe(2026);
    expect(d.discipline).toBe("Língua Portuguesa (Português)");
    expect(d.topic).toBe("Ortografia - Casos Gerais e Emprego das Letras");
    expect(d.baseText).toContain("Instituto Butantan");
    expect(d.baseText).not.toContain("De acordo com a norma");
    expect(d.statement).toMatch(/^De acordo com a norma ortográfica vigente/);
    expect(d.options.map((o) => o.text)).toEqual(["sc – ç – c", "c – ss – ss", "c – s – ss", "sc – ss – c", "sc – ç – ss"]);
    expect(baseTexts).toHaveLength(1);
    expect(baseTexts[0]!.code).toBe("Instituto Butantan");
  });
});
