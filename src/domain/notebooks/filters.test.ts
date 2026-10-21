import { describe, expect, it } from "vitest";
import { activeFilterCount, autoTitle, countMatches, filterLabels, filtersSchema, matchQuestion, parseFilters, type IndexedQuestion, type NotebookFilters } from "./filters";

const q = (id: string, o: Partial<IndexedQuestion> = {}): IndexedQuestion => ({ id, subject: "S1", topic: null, board: "fgv", exam: null, year: 2025, difficulty: "dificil", type: "multipla_escolha", ...o });
const ctx = { answered: new Set(["a"]), favorites: new Set(["b"]), topicParent: new Map<string, string | null>([["T2", "T1"], ["T1", null]]) };
const F = (o: Partial<NotebookFilters>): NotebookFilters => ({ ...filtersSchema.parse({}), ...o });
const names = { subject: (id: string) => ({ S1: "Direito Penal", S2: "Direito Constitucional" })[id], topic: (id: string) => ({ T1: "Crimes contra a vida", T2: "Homicídio" })[id], board: (s: string) => ({ fgv: "FGV" })[s], exam: () => "Agente · MPES · 2026" };

describe("filtros do caderno", () => {
  it("sem filtros, entra tudo", () => {
    expect(countMatches([q("a"), q("b", { subject: "S2" })], F({}), ctx)).toBe(2);
  });
  it("matéria inteira OU assunto (com subassuntos)", () => {
    const xs = [q("a"), q("b", { subject: "S2", topic: "T2" }), q("c", { subject: "S2", topic: null })];
    expect(xs.filter((x) => matchQuestion(x, F({ subjects: ["S1"] }), ctx)).map((x) => x.id)).toEqual(["a"]);
    // escolher o assunto pai T1 inclui a questão do subassunto T2
    expect(xs.filter((x) => matchQuestion(x, F({ topics: ["T1"] }), ctx)).map((x) => x.id)).toEqual(["b"]);
    expect(xs.filter((x) => matchQuestion(x, F({ subjects: ["S1"], topics: ["T2"] }), ctx)).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("banca, concurso, ano, dificuldade e tipo restringem (E entre filtros, OU dentro de cada um)", () => {
    expect(matchQuestion(q("x"), F({ boards: ["fgv", "cebraspe"] }), ctx)).toBe(true);
    expect(matchQuestion(q("x", { board: null }), F({ boards: ["fgv"] }), ctx)).toBe(false);
    expect(matchQuestion(q("x"), F({ years: [2024, 2025], difficulty: ["dificil"] }), ctx)).toBe(true);
    expect(matchQuestion(q("x"), F({ years: [2025], difficulty: ["extrema"] }), ctx)).toBe(false);
    expect(matchQuestion(q("x", { year: null }), F({ years: [2025] }), ctx)).toBe(false);
    expect(matchQuestion(q("x"), F({ types: ["certo_errado"] }), ctx)).toBe(false);
  });
  it("abas e favoritas", () => {
    const xs = [q("a"), q("b"), q("c")];
    expect(countMatches(xs, F({ scope: "minhas" }), ctx)).toBe(1);
    expect(countMatches(xs, F({ scope: "favoritas" }), ctx)).toBe(1);
    expect(countMatches(xs, F({ favorites: "sem" }), ctx)).toBe(2);
    expect(countMatches(xs, F({ favorites: "so", scope: "minhas" }), ctx)).toBe(0);
  });
  it("leitura tolerante, rótulos e nome automático", () => {
    expect(parseFilters({ subjects: ["não-uuid"] })).toEqual(F({}));
    expect(parseFilters(null)).toEqual(F({}));
    const f = F({ subjects: ["11111111-1111-4111-8111-111111111111"], boards: ["fgv"], years: [2024, 2026], favorites: "so" });
    expect(activeFilterCount(f)).toBe(5);
    const n = { ...names, subject: () => "Direito Penal" };
    expect(filterLabels(f, n)).toEqual(["Direito Penal", "Banca FGV", "2026", "2024", "Só as favoritas"]);
    expect(autoTitle(f, n)).toBe("Direito Penal");
    expect(autoTitle(F({ boards: ["fgv"] }), names)).toBe("Questões FGV");
    expect(autoTitle(F({}), names)).toBe("Caderno de Questões");
    expect(autoTitle(F({ scope: "favoritas" }), names)).toBe("Minhas favoritas");
  });
});
