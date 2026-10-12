import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderStudyPdf } from "./render";
import { sampleSnapshot } from "../../../tests/fixtures/pdf-snapshot";

describe("PDF do conteúdo estudado", () => {
  it("gera um PDF válido com capa, teoria, questões, revisão e referências", async () => {
    const bytes = await renderStudyPdf(sampleSnapshot, { pdfVersion: 2, contentHash: "b".repeat(64) });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
    expect(doc.getTitle()).toBe("Prisão em flagrante — APROVUM");
  });

  it("não quebra com texto muito longo nem com caracteres fora das fontes padrão", async () => {
    const long = { ...sampleSnapshot, units: [{ ...sampleSnapshot.units[0]!, sections: [{ kind: "explicacao", title: "Longo", verificationStatus: "nao_aplicavel", body: ("Palavra " + "x".repeat(400) + " ").repeat(40) + " 漢字 ← ≥ ≤ ✗" }] }] };
    const bytes = await renderStudyPdf(long, { pdfVersion: 1, contentHash: "c".repeat(64) });
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(3);
  });
});
