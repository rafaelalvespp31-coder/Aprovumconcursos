import { describe, expect, it } from "vitest";
import { detectContestInfo, displayTitle, titleCasePt } from "./info";

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
