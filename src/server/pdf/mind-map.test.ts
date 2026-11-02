import { describe, expect, it } from "vitest";
import { writeFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import fixture from "../../../tests/fixtures/mind-map-homicidio.json";
import { buildMindMap } from "@/domain/content/mind-map";
import { renderMindMapPdf } from "./mind-map";

describe("PDF do mapa mental", () => {
  it("gera uma página só, deitada, no formato do modelo", async () => {
    const bytes = await renderMindMapPdf(buildMindMap(fixture));
    if (process.env.MIND_MAP_OUT) writeFileSync(process.env.MIND_MAP_OUT, bytes);
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect(width).toBeGreaterThan(height);
    expect(doc.getTitle()).toBe("Mapa mental — Homicídio");
  }, 30_000);

  it("aula sem esquema, sem listas e com caracteres fora da fonte não quebra", async () => {
    const map = buildMindMap({ title: "Tema livre", sections: [{ kind: "explicacao", title: "Só texto", body: ("Texto corrido " + "y".repeat(300) + " 漢字 ≥ ✗ ").repeat(30) }] });
    const doc = await PDFDocument.load(await renderMindMapPdf(map));
    expect(doc.getPageCount()).toBe(1);
  }, 30_000);
});

describe("frases curtas do mapa", () => {
  it("corta na primeira pausa sem quebrar abreviações", async () => {
    const { brief } = await import("./mind-map");
    expect(brief("Errado desde a Lei 14.994/2024: é o crime autônomo do art. 121-A. Outra frase.", 80)).toBe("Errado desde a Lei 14.994/2024: é o crime autônomo do art. 121-A");
    expect(brief("Texto (com parênteses) bem longo que passa do limite de caracteres", 30)).toBe("Texto bem longo que passa do…");
  });
});
