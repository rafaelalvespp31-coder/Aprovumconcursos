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
