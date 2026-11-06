import { describe, expect, it } from "vitest";
import { detectContestInfo, detectRole, displayTitle, titleCasePt } from "./info";

describe("detectContestInfo", () => {
  it("acha órgão com estado, banca e ano", () => {
    const i = detectContestInfo(["GOVERNO DO ESTADO DE MINAS GERAIS\nPOLÍCIA CIVIL DE MINAS GERAIS\nEDITAL DE CONCURSO PÚBLICO Nº 01/2025\nOrganização: FUMARC"]);
    expect(i.contestName).toBe("Polícia Civil de Minas Gerais");
    expect(i.board).toBe("Fumarc");
    expect(i.year).toBe(2025);
  });
  it("corta o que vem depois do nome", () => {
    expect(detectContestInfo(["EDITAL\nPOLÍCIA RODOVIÁRIA FEDERAL - CONCURSO PÚBLICO 2021 Cebraspe"]).contestName).toBe("Polícia Rodoviária Federal");
  });
  it("sem pistas, devolve nulos", () => {
    expect(detectContestInfo(["texto qualquer sem órgão"]).contestName).toBeNull();
  });
});
describe("títulos", () => {
  it("title case em português", () => expect(titleCasePt("PREFEITURA MUNICIPAL DE SÃO PAULO")).toBe("Prefeitura Municipal de São Paulo"));
  it("nunca mostra UUID", () => {
    expect(displayTitle(null, "1b7d3b7c-8969-434b-9c0e-ce7ea73c460c.pdf")).toBe("Edital enviado");
    expect(displayTitle(null, "edital_pc_mg.pdf")).toBe("edital pc mg");
    expect(displayTitle("Polícia Civil de Minas Gerais", "x.pdf")).toBe("Polícia Civil de Minas Gerais");
  });
});

it("Polícia Penal do Espírito Santo", () => {
  const i = detectContestInfo(["Página 1\nPOLÍCIA PENAL DO ESTADO DO ESPÍRITO SANTO\nCONCURSO PÚBLICO Nº 001/2025\nANEXO III – CONTEÚDO PROGRAMÁTICO"]);
  expect(i.contestName).toBe("Polícia Penal do Estado do Espírito Santo");
  expect(i.year).toBe(2025);
});

describe("detectRole", () => {
  it("linha CARGO:", () => expect(detectRole(["PREFEITURA MUNICIPAL DE PAULÍNIA\nCARGO: GUARDA CIVIL MUNICIPAL\nVAGAS: 30"])).toBe("Guarda Civil Municipal"));
  it("para o cargo de", () => expect(detectRole(["Concurso público para provimento do cargo de Agente de Polícia Penal, nível superior, conforme"])).toBe("Agente de Polícia Penal"));
  it("vários cargos: deixa o aluno escolher", () => expect(detectRole(["CARGO: AGENTE ADMINISTRATIVO\nCARGO: PROFESSOR"])).toBeNull());
  it("frase genérica não vira cargo", () => expect(detectRole(["inscrição para o cargo de nível superior, conforme o edital"])).toBeNull());
  it("PCMG real: quebra de linha + nome completo", () => expect(detectRole(["concurso para o cargo de INVESTIGADOR DE\nPOLÍCIA", "provimento do cargo de Investigador de Polícia I a que se refere\ncargo de Investigador de Polícia I se atendidas, cumulativamente\ncargo de Investigador de Polícia I é de natureza policial"])).toBe("Investigador de Polícia I"));
  it("PMDF real: corta no travessão", () => expect(detectRole(["CARGO DE OFICIAL POLICIAL MILITAR – 2º TENENTE\ncargo, no sentido de exercer"])).toBe("Oficial Policial Militar"));
  it("Paulínia real: cargos públicos efetivos de", () => expect(detectRole(["provimento de cargos públicos efetivos de Guarda Municipal 6ª\nCARGOS\ncargos efetivos constantes do item 1.2., com\nCargo Total de"])).toBe("Guarda Municipal"));
  it("sem cargo", () => expect(detectRole(["texto qualquer"])).toBeNull());
});
