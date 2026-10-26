import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { pdfToText } from "@/server/pdf-text";
import { parseLessonUpload } from "@/domain/catalog/upload";
import { parseBankUpload } from "@/domain/bank/upload";

// PDFs reais exportados (LibreOffice) a partir dos modelos em public/modelos.
const pdf = (f: string) => new Uint8Array(readFileSync(`src/domain/catalog/__fixtures__/${f}`));

describe("upload em PDF (leitor do servidor)", () => {
  it("modelo de aula em PDF lê igual ao .txt", async () => {
    const fromPdf = parseLessonUpload(await pdfToText(pdf("modelo-aula.pdf")));
    const fromTxt = parseLessonUpload(readFileSync("public/modelos/modelo-aula.txt", "utf8"));
    expect(fromPdf.errors).toEqual([]);
    expect(fromPdf.meta).toEqual(fromTxt.meta);
    expect(fromPdf.sections.map((s) => [s.kind, s.title, s.module, s.items])).toEqual(fromTxt.sections.map((s) => [s.kind, s.title, s.module, s.items]));
    expect(fromPdf.questions.map((q) => [q.statement, q.answer])).toEqual(fromTxt.questions.map((q) => [q.statement, q.answer]));
  });

  it("modelo de questões em PDF lê igual ao .txt", async () => {
    const fromPdf = parseBankUpload(await pdfToText(pdf("modelo-questoes.pdf")));
    const fromTxt = parseBankUpload(readFileSync("public/modelos/modelo-questoes.txt", "utf8"));
    expect(fromPdf.errors).toEqual([]);
    expect(fromPdf.questions.map((q) => [q.number, q.subject, q.topicPath, q.exam, q.answer, q.statement.replace(/\s+/g, " ")])).toEqual(
      fromTxt.questions.map((q) => [q.number, q.subject, q.topicPath, q.exam, q.answer, q.statement.replace(/\s+/g, " ")]),
    );
  });
});
