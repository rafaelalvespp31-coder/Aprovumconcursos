import { describe, expect, it } from "vitest";
import { estimateQuestions, parseSmart } from "./smart-import";

const gran = (enunciado: string, opts: string[], extra = "") => `${extra}Ano: [2026](https://questoes.grancursosonline.com.br/concursos/2026)
Banca: [Instituto de Desenvolvimento Educacional, Cultural e Assistencial Nacional - IDECAN](https://questoes.grancursosonline.com.br/concursos/idecan)
Prova: [IDECAN - PC SC - Agente de Polícia - 2026](https://questoes.grancursosonline.com.br/prova/pc-sc-sc-2026-idecan-agente-de-policia-8487)
${enunciado}

${opts.map((o, i) => `${"ABCDE"[i]}\n${o}`).join("\n")}
`;

const Q1 = gran(
  "Um estudo da Polícia Civil sobre 100 crimes violentos recentes revelou que 47 ocorreram com uso de arma de fogo (AF), 30 ocorreram durante o período noturno (PN), 20 ocorreram em áreas rurais (AR), 10 ocorreram com AF e PN, 8 ocorreram com AF e AR, 5 ocorreram com PN e AR, 3 ocorreram com AF, PN e AR.\n\nO total de crimes que ocorreram com apenas uma dessas três características (apenas AF, apenas PN ou apenas AR) é igual a:",
  ["64.", "55.", "60.", "48.", "72."],
);

describe("formato Gran Cursos", () => {
  it("lê banca, ano, cargo/órgão, enunciado e alternativas", () => {
    const { drafts } = parseSmart(Q1);
    expect(drafts).toHaveLength(1);
    const d = drafts[0]!;
    expect(d.board).toBe("IDECAN");
    expect(d.boardKnown).toBe(true);
    expect(d.year).toBe(2026);
    expect(d.role).toBe("Agente de Polícia");
    expect(d.organ).toBe("PC SC");
    expect(d.statement).toMatch(/^Um estudo da Polícia Civil/);
    expect(d.statement).toMatch(/igual a:$/);
    expect(d.statement).not.toMatch(/Banca:|Prova:|Ano:/);
    expect(d.options.map((o) => o.label)).toEqual(["A", "B", "C", "D", "E"]);
    expect(d.options.map((o) => o.text)).toEqual(["64.", "55.", "60.", "48.", "72."]);
    expect(d.type).toBe("multipla_escolha");
    expect(d.answer).toBeNull();
    expect(d.issues).toContain("gabarito_ausente");
    expect(d.issues).not.toContain("banca_ausente");
    expect(d.issues).not.toContain("ano_ausente");
    expect(d.issues).not.toContain("concurso_ausente");
  });

  it("separa várias questões coladas juntas", () => {
    const txt = `${Q1}\n${gran("Qual é a capital de Santa Catarina?", ["Joinville", "Florianópolis", "Blumenau", "Chapecó", "Lages"])}`;
    expect(estimateQuestions(txt)).toBe(2);
    const { drafts } = parseSmart(txt);
    expect(drafts).toHaveLength(2);
    expect(drafts[1]!.options[1]!.text).toBe("Florianópolis");
    expect(drafts[1]!.board).toBe("IDECAN");
  });

  it("leva Disciplina/Assunto que vêm antes do cabeçalho para a mesma questão", () => {
    const txt = `${gran("Primeira questão do lote, com enunciado completo?", ["a", "b", "c", "d", "e"])}\nDisciplina: Raciocínio Lógico\nAssunto: Conjuntos\n${gran("Segunda questão do lote, com enunciado completo?", ["a", "b", "c", "d", "e"])}`;
    const { drafts } = parseSmart(txt);
    expect(drafts).toHaveLength(2);
    expect(drafts[0]!.discipline).toBeNull();
    expect(drafts[1]!.discipline).toBe("Raciocínio Lógico");
    expect(drafts[1]!.topic).toBe("Conjuntos");
  });

  it("aceita valores na linha de baixo e banca sem sigla (usa a da prova)", () => {
    const txt = `Ano:
2025
Banca:
Fundação Getúlio Vargas
Prova:
FGV - TJ SC - Analista Judiciário - 2025
Quanto ao tema, assinale a alternativa correta entre as abaixo.

A
um
B
dois
C
três
`;
    const d = parseSmart(txt).drafts[0]!;
    expect(d.board).toBe("FGV");
    expect(d.year).toBe(2025);
    expect(d.organ).toBe("TJ SC");
    expect(d.role).toBe("Analista Judiciário");
    expect(d.options).toHaveLength(3);
  });
});
