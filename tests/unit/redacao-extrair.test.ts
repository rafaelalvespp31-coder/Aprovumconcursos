/** Extração de PDF da redação: exige sessão, tem limite por aluno e teto de páginas. */
import { describe, expect, it, vi } from "vitest";
import { PDFDocument, StandardFonts } from "pdf-lib";

const limit = vi.fn(async () => undefined);
vi.mock("@/server/auth", () => ({ getSessionUser: async () => ({ id: "u1", email: null }), isAdmin: async () => false }));
vi.mock("@/server/observability", () => ({ logEvent: async () => undefined }));
vi.mock("@/server/services/trails", () => ({ enforceRateLimit: (...a: unknown[]) => limit(...(a as [])), UserFacingError: class extends Error { code = "x"; } }));
vi.mock("@/server/services/redacao-ia", () => ({ executarCorrecao: async () => undefined }));
vi.mock("@/server/services/redacao", () => ({}));
vi.mock("next/server", () => ({ after: () => undefined }));

const { extrairArquivoAction } = await import("@/app/(app)/redacao/actions");

async function pdf(pages: number) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i++) doc.addPage().drawText("Texto de redação de exemplo com mais de quarenta caracteres no total.", { x: 20, y: 700, size: 10, font });
  return new File([Buffer.from(await doc.save())], "r.pdf", { type: "application/pdf" });
}
const form = (f: File) => { const fd = new FormData(); fd.set("arquivo", f); return fd; };

describe("extrairArquivoAction", () => {
  it("lê um PDF pequeno e aplica o limite por aluno", async () => {
    const r = await extrairArquivoAction(form(await pdf(1)));
    expect(r.ok).toBe(true);
    expect(limit).toHaveBeenCalled();
  });
  it("recusa PDF com mais de 40 páginas", async () => {
    const r = await extrairArquivoAction(form(await pdf(41)));
    expect(r.ok).toBe(false);
  });
});
