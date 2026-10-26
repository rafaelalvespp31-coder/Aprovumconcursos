import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseBankUpload } from "./upload";

describe("upload de questões de concurso", () => {
  it("lê o modelo oficial com padrão e campos por questão", () => {
    const r = parseBankUpload(readFileSync("public/modelos/modelo-questoes.txt", "utf8"));
    expect(r.errors).toEqual([]);
    expect(r.questions).toHaveLength(2);
    const [a, b] = r.questions;
    expect(a).toMatchObject({ number: "41", subject: "Direito Penal", topicPath: ["Crimes contra a vida", "Homicídio"], board: "FGV", year: 2026, exam: "Analista Judiciário — Área Fim", organ: "TJ MS", difficulty: "dificil", type: "multipla_escolha", answer: "E" });
    expect(a!.options.map((o) => o.label)).toEqual(["A", "B", "C", "D", "E"]);
    expect(a!.statement).toContain("causa de aumento de pena");
    expect(a!.legalBasis).toMatch(/art\. 121/);
    expect(b).toMatchObject({ type: "certo_errado", answer: "errado", topicPath: ["Crimes contra a vida", "Infanticídio"], board: "FGV" });
    expect(b!.options).toEqual([]);
  });

  it("usa o bloco de gabarito no fim da prova", () => {
    const txt = [
      "=== PADRÃO ===",
      "Matéria: Língua Portuguesa",
      "=== QUESTÕES ===",
      "QUESTÃO 1",
      "Assinale a alternativa com erro de concordância.",
      "(A) Fazem dois anos.",
      "(B) Faz dois anos.",
      "QUESTÃO 2",
      "Enunciado: A crase é facultativa antes de pronome possessivo feminino.",
      "Tipo: C/E",
      "=== GABARITO ===",
      "1-A; 2-C",
    ].join("\n");
    const r = parseBankUpload(txt);
    expect(r.errors).toEqual([]);
    expect(r.questions.map((q) => [q.number, q.answer, q.board])).toEqual([["1", "A", null], ["2", "certo", null]]);
  });

  it("aponta problemas por questão", () => {
    const txt = [
      "=== PADRÃO ===",
      "Banca: FGV",
      "=== QUESTÕES ===",
      "--- QUESTÃO ---",
      "Enunciado: Questão sem matéria e sem ano de prova.",
      "A) um",
      "C) dois",
      "Gabarito: Z",
    ].join("\n");
    const all = parseBankUpload(txt).errors.join("\n");
    expect(all).toMatch(/Matéria/);
    expect(all).toMatch(/ordem A, B/);
    expect(all).toMatch(/gabarito “Z”/);
    expect(all).toMatch(/Banca, Ano e Concurso juntos/);
  });

  it("avisa enunciados repetidos no mesmo arquivo", () => {
    const q = ["--- QUESTÃO ---", "Enunciado: Texto igual nas duas questões aqui.", "Tipo: certo ou errado", "Gabarito: C"];
    const r = parseBankUpload(["=== PADRÃO ===", "Matéria: Direito Penal", "=== QUESTÕES ===", ...q, ...q].join("\n"));
    expect(r.warnings.join()).toMatch(/igual ao da questão 1/);
  });
});
