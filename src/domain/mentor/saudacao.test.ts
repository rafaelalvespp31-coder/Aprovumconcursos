import { describe, expect, it } from "vitest";
import { angulosAplicaveis, diasEntre, escolherAngulo, fatoDoAngulo, regraSaudacao, sequenciaDe, type DadosSaudacao } from "./saudacao";

const base: DadosSaudacao = { nome: "Rafael Alves", objetivo: "Polícia Penal MG", semAtividade: false, diasSemEstudar: 0, sequencia: 0, revisoesVencidas: 0, materiaFraca: null, aulaAndamento: null, respondidas: 0, acertoPct: null };

describe("saudação do Mentor na tela inicial", () => {
  it("primeiro acesso: sem atividade e sem concurso", () => {
    expect(angulosAplicaveis({ ...base, objetivo: null, semAtividade: true })).toEqual(["primeiro_acesso"]);
  });
  it("sem concurso mas já estudando: pede o concurso", () => {
    expect(angulosAplicaveis({ ...base, objetivo: null })[0]).toBe("sem_objetivo");
  });
  it("só inclui ângulos com dado real", () => {
    expect(angulosAplicaveis(base)).toEqual(["objetivo"]);
    const d = { ...base, diasSemEstudar: 5, revisoesVencidas: 4, aulaAndamento: { titulo: "Atos administrativos", pct: 50 }, materiaFraca: { nome: "Direito Penal", pct: 40, questoes: 25 }, respondidas: 80, acertoPct: 62 };
    expect(angulosAplicaveis(d)).toEqual(["retomada", "revisoes", "aula_andamento", "materia_fraca", "desempenho", "objetivo"]);
  });
  it("2 dias sem estudar não vira retomada", () => expect(angulosAplicaveis({ ...base, diasSemEstudar: 2 })).toEqual(["objetivo"]));
  it("não repete o ângulo do acesso anterior quando há outro", () => {
    const d = { ...base, revisoesVencidas: 3, materiaFraca: { nome: "Direito Penal", pct: 40, questoes: 25 } };
    expect(escolherAngulo(d, null)).toBe("revisoes");
    expect(escolherAngulo(d, "revisoes")).toBe("materia_fraca");
    expect(escolherAngulo(d, "materia_fraca")).toBe("revisoes");
  });
  it("com um único ângulo possível, repete (melhor que inventar)", () => expect(escolherAngulo(base, "objetivo")).toBe("objetivo"));
  it("os fatos só carregam números que existem nos dados", () => {
    const d = { ...base, revisoesVencidas: 1, diasSemEstudar: 7, materiaFraca: { nome: "Português", pct: 48, questoes: 31 }, respondidas: 120, acertoPct: 71, aulaAndamento: { titulo: "Crase", pct: 33 }, provaEmDias: 40 };
    expect(fatoDoAngulo("revisoes", d)).toContain("1 revisão pendente");
    expect(fatoDoAngulo("retomada", d)).toContain("7 dias");
    expect(fatoDoAngulo("retomada", d)).toContain("SEM cobrar");
    expect(fatoDoAngulo("materia_fraca", d)).toMatch(/Português: 48% .* 31 questões/);
    expect(fatoDoAngulo("desempenho", d)).toMatch(/120 questões.*71%/);
    expect(fatoDoAngulo("aula_andamento", d)).toContain("33%");
    expect(fatoDoAngulo("objetivo", d)).toContain("Faltam 40 dias");
    expect(fatoDoAngulo("objetivo", base)).not.toContain("Faltam");
  });
  it("a regra fixa o formato: 20 a 40 palavras, uma mensagem, silêncio depois, sem cobrar", () => {
    const r = regraSaudacao("objetivo", base);
    expect(r).toContain("20 a 40 palavras");
    expect(r).toContain("UMA única mensagem");
    expect(r).toContain("FIQUE EM SILÊNCIO");
    expect(r).toContain("Não constranja");
    expect(r).toContain("Rafael");
    expect(r).not.toContain("Alves");
  });
  it("dias entre datas e sequência de estudo", () => {
    expect(diasEntre("2026-11-20", "2026-11-23")).toBe(3);
    expect(diasEntre("2026-11-23", "2026-11-23")).toBe(0);
    expect(sequenciaDe(["2026-11-23", "2026-11-22", "2026-11-21", "2026-11-18"], "2026-11-23")).toBe(3);
    expect(sequenciaDe(["2026-11-22", "2026-11-21"], "2026-11-23")).toBe(2); // ainda não estudou hoje: conta até ontem
    expect(sequenciaDe(["2026-11-20"], "2026-11-23")).toBe(0);
    expect(sequenciaDe([], "2026-11-23")).toBe(0);
  });
});
