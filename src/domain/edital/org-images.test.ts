import { describe, expect, it } from "vitest";
import { orgImageFor } from "./org-images";

describe("imagens dos órgãos", () => {
  it("reconhece os 5 órgãos", () => {
    expect(orgImageFor("Prf")?.logo).toBe("/orgs/prf-logo.webp");
    expect(orgImageFor("Polícia Militar do Estado do Rio de Janeiro 1")?.card).toBe("/orgs/pmerj-card.webp");
    expect(orgImageFor("Concurso PC/MG", "Polícia Civil de Minas Gerais")?.card).toBe("/orgs/pcmg-card.webp");
    expect(orgImageFor("Polícia Militar do Distrito Federal")?.card).toBe("/orgs/pmdf-card.webp");
    expect(orgImageFor("PCDF", null)?.card).toBe("/orgs/pcdf-card.webp");
  });
  it("outros órgãos ficam sem imagem", () => {
    expect(orgImageFor("Polícia Penal MG")).toBeNull();
  });
});
