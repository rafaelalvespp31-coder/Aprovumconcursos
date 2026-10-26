import "server-only";
import { getDocumentProxy } from "unpdf";
import { unwrapPdfLines } from "@/domain/catalog/upload";

/** Texto de um PDF com texto selecionável, linha a linha (PDF escaneado volta vazio). */
export async function pdfToText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const lines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let line = "";
    let lastY: number | null = null;
    for (const it of content.items) {
      if (!("str" in it)) continue;
      const y = it.transform[5] as number;
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        lines.push(line);
        line = "";
      }
      line += it.str;
      lastY = y;
      if (it.hasEOL) {
        if (line) lines.push(line);
        line = "";
        lastY = null;
      }
    }
    if (line) lines.push(line);
    lines.push("");
  }
  return unwrapPdfLines(lines);
}
