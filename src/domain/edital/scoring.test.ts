import { describe, expect, it } from "vitest";
import { computePriorities, extractScoring } from "./scoring";

const DISC = ["Língua Portuguesa", "Matemática", "Direito Penal", "Informática"];

describe("questões, pesos e prioridades", () => {
  it("tabela com questões, peso e total: lê e calcula pontuação potencial", () => {
    const pages = ["QUADRO DE PROVAS\nDisciplina | Nº de questões | Peso | Pontos\nLíngua Portuguesa | 10 | 2,0 | 20\nMatemática | 5 | 1,0 | 5\nDireito Penal | 20 | 3,0 | 60\nInformática | 5 | 1,0 | 5"];
    const raws = extractScoring(pages, DISC);
    expect(raws.map((r) => [r.name, r.questions, r.weight])).toEqual([["Língua Portuguesa", 10, 2], ["Matemática", 5, 1], ["Direito Penal", 20, 3], ["Informática", 5, 1]]);
    const p = computePriorities(DISC, raws);
    expect(p.basis).toBe("questoes_x_peso");
    expect(p.estimated).toBe(false);
    expect(p.total).toBe(90);
    const by = Object.fromEntries(p.rows.map((r) => [r.name, r]));
    expect(by["Direito Penal"]!.pct).toBeCloseTo(66.7, 1);
    expect(by["Direito Penal"]!.priority).toBe("maxima");
    expect(by["Língua Portuguesa"]!.priority).toBe("moderada");
    expect(by["Informática"]!.priority).toBe("complementar");
  });
  it("frases: 'N questões' e 'peso N'", () => {
    const raws = extractScoring(["Língua Portuguesa: 10 questões, peso 2\nMatemática: 10 questões, peso 1"], ["Língua Portuguesa", "Matemática"]);
    expect(raws.map((r) => [r.questions, r.weight])).toEqual([[10, 2], [10, 1]]);
  });
  it("sem distribuição de questões: não inventa prioridade", () => {
    const raws = extractScoring(["EDITAL\nA prova terá 60 questões de múltipla escolha.\nDireito Penal\n1. Princípios"], DISC);
    const p = computePriorities(DISC, raws);
    expect(p.basis).toBe("nao_disponivel");
    expect(p.rows.every((r) => r.priority === null && r.pct === null)).toBe(true);
    expect(p.note).toMatch(/não informa/i);
  });
  it("só questões (sem peso): prioridade estimada e dita como estimada", () => {
    const pages = ["Disciplina | Questões\nLíngua Portuguesa | 10\nMatemática | 10\nDireito Penal | 30\nInformática | 10"];
    const p = computePriorities(DISC, extractScoring(pages, DISC));
    expect(p.basis).toBe("so_questoes");
    expect(p.estimated).toBe(true);
    expect(p.note).toMatch(/estimada/i);
    expect(p.rows.find((r) => r.name === "Direito Penal")!.priority).toBe("maxima");
  });
  it("tabela com 3 números que não batem: não confia no peso", () => {
    const pages = ["Disciplina | Questões | Peso | Pontos\nDireito Penal | 10 | 9 | 20"];
    const [r] = extractScoring(pages, ["Direito Penal"]);
    expect(r!.questions).toBe(10);
    expect(r!.weight).toBe(2);
  });
  it("número de item do conteúdo programático não vira questão", () => {
    const raws = extractScoring(["DIREITO PENAL\n1.2 Princípios do direito penal\n2. Aplicação da lei penal"], ["Direito Penal"]);
    expect(raws).toEqual([]);
  });
});
