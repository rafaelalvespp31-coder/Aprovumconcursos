import { describe, expect, it } from "vitest";
import { groupErrors, type ErrorNotebookEntry } from "./error-notebook";

const e = (subject: string, theme: string, topic: string | null, code: string): ErrorNotebookEntry => ({
  questionId: code, code, subject, theme, topic, source: null, originalHtml: "<p>x</p>", html: "<p>x</p>", edited: false, updatedAt: null, stillWrong: true, wrongAttempts: 1,
});

describe("caderno de erros organizado", () => {
  it("agrupa por matéria › tema › assunto (o próprio tema antes dos assuntos), em ordem", () => {
    const g = groupErrors([
      e("Direito Penal", "Patrimônio", "Roubo", "Q3"),
      e("Direito Administrativo", "Atos", null, "Q9"),
      e("Direito Penal", "Patrimônio", "Furto", "Q2"),
      e("Direito Penal", "Patrimônio", "Furto", "Q1"),
      e("Direito Penal", "Patrimônio", null, "Q5"),
    ]);
    expect(g.map((s) => s.subject)).toEqual(["Direito Administrativo", "Direito Penal"]);
    const penal = g[1]!.themes[0]!;
    expect(penal.topics.map((t) => t.topic)).toEqual([null, "Furto", "Roubo"]);
    expect(penal.topics[1]!.entries.map((x) => x.code)).toEqual(["Q1", "Q2"]);
  });
});
