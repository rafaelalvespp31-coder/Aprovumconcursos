import { describe, expect, it } from "vitest";
import { renderPostitPdf } from "./postit";
import type { PostitPdfSnapshot } from "./postit-types";

const snap = (n: number): PostitPdfSnapshot => ({
  schema: 1,
  generatedAt: "2026-11-12T12:00:00.000Z",
  student: { name: "Rafael Alves" },
  lesson: { id: "00000000-0000-4000-8000-000000000001", title: "Cadeia de custódia da prova", subject: "Direito Processual Penal", trailTitle: "Estudo" },
  items: Array.from({ length: n }, (_, i) => ({
    n: i + 1,
    sectionTitle: i % 2 ? "Etapas da custódia" : "Conceito",
    quote: `A cadeia de custódia é o conjunto de procedimentos — rastreabilidade, idoneidade e não-contaminação (ação ${i + 1}). `.repeat(i === 2 ? 30 : 1).trim(),
    note: i % 2 ? "Cai muito: lembrar das 10 etapas do art. 158-B do CPP." : "",
    explanation: i % 3 === 0 ? "Significa o registro de todo o caminho percorrido pelo vestígio, da coleta ao descarte, para garantir que a prova não foi alterada. ".repeat(i === 3 ? 12 : 1).trim() : "",
    createdAt: "2026-11-12T10:00:00.000Z",
  })),
});

describe("renderPostitPdf", () => {
  it("gera um PDF válido, inclusive com trecho longo e muitos itens", async () => {
    const bytes = await renderPostitPdf(snap(14), { pdfVersion: 3 });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    expect(bytes.length).toBeGreaterThan(5000);
    if (process.env.PDF_OUT) (await import("node:fs")).writeFileSync(process.env.PDF_OUT, bytes);
  });

  it("desenha tabela, lista e título do trecho na mesma estrutura, inclusive tabela longa", async () => {
    const base = snap(1);
    const rows = Array.from({ length: 40 }, (_, i) => ({ c: [`Crime ${i + 1}`, "Pena de reclusão de 1 a 4 anos, e multa", i % 2 ? "Ação penal pública incondicionada" : "Ação penal privada"] }));
    base.items = [
      {
        n: 1, sectionTitle: "Quadro", note: "Decorar a coluna das penas.", explanation: "- Crime permanente: aquele cuja consumação se prolonga no tempo, como o sequestro.\n- Crime continuado: vários crimes da mesma espécie, em condições parecidas, tratados como um só para a pena.", createdAt: "2026-11-12T10:00:00.000Z",
        quote: "Quadro", structure: [
          { k: "h", t: "Quadro de crimes" },
          { k: "p", t: "Veja a tabela:" },
          { k: "table", rows: [{ h: true, c: ["Crime", "Pena", "Ação"] }, ...rows] },
          { k: "li", t: "Primeiro item da lista", n: 1 },
          { k: "li", t: "Subitem", n: 2, d: 1 },
        ],
      },
    ];
    const bytes = await renderPostitPdf(base, { pdfVersion: 1 });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    if (process.env.PDF_OUT2) (await import("node:fs")).writeFileSync(process.env.PDF_OUT2, bytes);
  });
});
