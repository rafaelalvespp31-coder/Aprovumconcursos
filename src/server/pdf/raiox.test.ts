import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { writeFileSync } from "node:fs";
import { renderRaioXPdf } from "./raiox";
import { compareLastTwo, heatmap, subjectIncidence, type Edition } from "@/domain/strategic/analysis";
import type { RaioX } from "@/server/services/strategic";

const mk = (id: string, year: number, board: string, subs: Array<[string, Array<[string, number]>]>): Edition => ({
  id, year, board, totalQuestions: subs.reduce((n, s) => n + s[1].reduce((m, t) => m + t[1], 0), 0), countingRule: "Anuladas pontuam para todos",
  subjects: subs.map(([name, ts]) => ({ name, mode: null, questions: ts.reduce((n, t) => n + t[1], 0), annulled: 0, topics: ts.map(([title, questions]) => ({ title, questions, annulled: 0 })) })),
});
const eds = [
  mk("a", 2021, "Cebraspe", [["Língua Portuguesa", [["Interpretação de textos", 6], ["Coesão textual", 3], ["Crase", 1]]], ["Direito Penal", [["Crimes contra a pessoa", 4], ["Teoria do crime", 5]]], ["Informática", [["Redes", 3], ["Segurança", 2]]]]),
  mk("b", 2023, "Cebraspe", [["Língua Portuguesa", [["Interpretação de textos", 7], ["Coesão textual", 2], ["Pontuação", 2]]], ["Direito Penal", [["Crimes contra a pessoa", 3], ["Teoria do crime", 6]]], ["Informática", [["Redes", 4]]]]),
  mk("c", 2025, "Cebraspe", [["Língua Portuguesa", [["Interpretação de textos", 8], ["Coesão textual", 3]]], ["Direito Penal", [["Crimes contra a pessoa", 4], ["Teoria do crime", 7], ["Lei de Drogas", 3]]], ["Informática", [["Redes", 2], ["Segurança", 3]]]]),
];
const cut = (id: string, y: number, score: number) => ({ id, editionYear: y, board: "Cebraspe", position: "Policial Penal", modality: "ampla", stage: null, kind: "corte_primeira_fase", score, maxScore: 100, candidates: 5000, criterion: null, source: { name: "Resultado oficial", url: null, kind: "oficial", organ: "Cebraspe", reviewer: null }, sourcePage: 3, verifiedAt: null });
const data = {
  exam: {
    id: "x", name: "Concurso Polícia Penal de Minas Gerais — Policial Penal", organ: "SEJUSP", status: "publicado", limitations: "Dados de provas anteriores; o próximo edital pode alterar a distribuição das disciplinas e dos assuntos.",
    positions: [], editions: eds, cutoffs: [cut("1", 2021, 62), cut("2", 2023, 68), cut("3", 2025, 71)],
    sources: [{ id: "s", kind: "oficial", name: "Resultado final da prova objetiva", url: null, page: 3, organ: "Cebraspe", publishedAt: "2025-05-10", consultedAt: "2026-11-01", reviewer: "Equipe APROVUM", notes: null }],
    recommendations: [{ priority: "maxima", subject: "Direito Penal", topic: "Teoria do crime", justification: "Maior incidência nas três provas; cresceu na mais recente." }, { priority: "alta", subject: "Língua Portuguesa", topic: "Interpretação de textos", justification: "Presente em todas as provas, com peso estável." }],
  },
  incidence: [...eds].reverse().map((e) => ({ year: e.year, board: e.board, countingRule: e.countingRule, ...subjectIncidence(e) })),
  comparison: compareLastTwo(eds), heat: heatmap(eds), lessons: {},
} as unknown as RaioX;

describe("PDF do Raio-X", () => {
  it("gera um PDF válido com capa e seções", async () => {
    const bytes = await renderRaioXPdf(data, { student: "Rafael" });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(3);
    if (process.env.RAIOX_OUT) writeFileSync(process.env.RAIOX_OUT, bytes);
  });
  it("não quebra sem notas, sem comparativo e sem assuntos", async () => {
    const empty = { ...data, exam: { ...data.exam, cutoffs: [], editions: [], recommendations: [], sources: [], limitations: null }, incidence: [], comparison: null, heat: { cells: [], editionsWithData: 0, criteria: data.heat.criteria } } as unknown as RaioX;
    const bytes = await renderRaioXPdf(empty);
    expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThanOrEqual(2);
  });
});
