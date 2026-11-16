import { describe, expect, it } from "vitest";
import { missaoVisual } from "./missao";

describe("missaoVisual", () => {
  it("reconhece órgãos com foto", () => {
    expect(missaoVisual("Polícia Rodoviária Federal")).toMatchObject({ sigla: "PRF", foto: "/orgs/prf-card.webp" });
    expect(missaoVisual("Concurso PMERJ 2025")).toMatchObject({ sigla: "PMRJ" });
    expect(missaoVisual("Polícia Penal de Minas Gerais")).toMatchObject({ foto: "/missoes/pp.webp" });
    expect(missaoVisual("Guarda Civil Municipal de BH")).toMatchObject({ sigla: "GCM" });
  });
  it("usa sigla própria ou iniciais, sem foto, nos demais", () => {
    expect(missaoVisual("TJSP Escrevente")).toEqual({ sigla: "TJSP", foto: null });
    expect(missaoVisual("Prefeitura de Contagem")).toEqual({ sigla: "PC", foto: null });
  });
});
