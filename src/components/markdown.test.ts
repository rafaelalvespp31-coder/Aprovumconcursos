import { describe, expect, it } from "vitest";
import { isRevokedLegalLine } from "./markdown";

describe("dispositivos revogados", () => {
  it("reconhece linhas de lei revogadas", () => {
    expect(isRevokedLegalLine("VI - (revogado pela Lei nº 14.994/2024)")).toBe(true);
    expect(isRevokedLegalLine("§ 2º-A (revogado pela Lei nº 14.994/2024).")).toBe(true);
    expect(isRevokedLegalLine("Art. 214. (Revogado pela Lei nº 12.015, de 2009)")).toBe(true);
    expect(isRevokedLegalLine("a) (revogada);")).toBe(true);
  });
  it("não risca explicações que só mencionam a revogação", () => {
    expect(isRevokedLegalLine("Revogados pela Lei 14.994/2024: inciso VI, § 2º-A e § 7º.")).toBe(false);
    expect(isRevokedLegalLine("O feminicídio deixou de ser qualificadora; o inciso VI foi revogado.")).toBe(false);
    expect(isRevokedLegalLine("II - por motivo fútil;")).toBe(false);
  });
});

describe("texto legal renderizado", () => {
  it("risca só a linha revogada, cada linha num parágrafo", async () => {
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { createElement } = await import("react");
    const { Markdown } = await import("./markdown");
    const html = renderToStaticMarkup(createElement(Markdown, { legal: true, children: "> § 1º Texto vigente.\n> § 2º-A (revogado pela Lei nº 14.994/2024).\n> § 3º Outro vigente." }));
    expect(html.match(/<p/g)?.length).toBe(3);
    expect(html.match(/md-revogado"/g)?.length).toBe(1);
    expect(html).toContain("Revogado</span>");
    expect(html).not.toContain("md-destaque");
  });
});
