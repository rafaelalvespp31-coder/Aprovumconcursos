import { describe, expect, it } from "vitest";
import { questionInputSchema, slugify, toDbPayload } from "./schema";
import { availableActions } from "./workflow";

const base = {
  subjectId: "11111111-1111-4111-8111-111111111111",
  origin: "autoral_humana",
  questionType: "multipla_escolha",
  statement: "Enunciado fictício para teste de validação.",
  initialDifficulty: "dificil",
  usageRights: "proprio",
  options: [
    { text: "Certa", isCorrect: true },
    { text: "Errada", isCorrect: false },
  ],
};

describe("validação da questão", () => {
  it("aceita múltipla escolha com uma correta e monta alternativas A, B…", () => {
    const q = questionInputSchema.parse(base);
    const p = toDbPayload(q);
    expect(p.options.map((o) => o.label)).toEqual(["A", "B"]);
    expect(p.correct_answer_true).toBeNull();
  });

  it("recusa nenhuma ou duas corretas", () => {
    expect(questionInputSchema.safeParse({ ...base, options: [{ text: "a", isCorrect: false }, { text: "b", isCorrect: false }] }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...base, options: [{ text: "a", isCorrect: true }, { text: "b", isCorrect: true }] }).success).toBe(false);
  });

  it("recusa mais de 5 alternativas", () => {
    const options = Array.from({ length: 6 }, (_, i) => ({ text: `x${i}`, isCorrect: i === 0 }));
    expect(questionInputSchema.safeParse({ ...base, options }).success).toBe(false);
  });

  it("certo/errado exige gabarito e não tem alternativas", () => {
    expect(questionInputSchema.safeParse({ ...base, questionType: "certo_errado" }).success).toBe(false);
    const ok = questionInputSchema.parse({ ...base, questionType: "certo_errado", options: [], correctAnswerTrue: false });
    expect(toDbPayload(ok).correct_answer_true).toBe(false);
  });

  it("não deixa questão autoral/IA declarar ano ou banca de origem", () => {
    expect(questionInputSchema.safeParse({ ...base, origin: "ia_assistida", year: 2024 }).success).toBe(false);
  });

  it("prova anterior exige fonte e não pode ser 'própria'", () => {
    const r = questionInputSchema.safeParse({ ...base, origin: "prova_anterior" });
    expect(r.success).toBe(false);
    const r2 = questionInputSchema.safeParse({ ...base, origin: "prova_anterior", sourceId: base.subjectId, usageRights: "proprio" });
    expect(r2.success).toBe(false);
  });

  it("referência: jurisprudência precisa ser localizável e data de consulta não pode ser futura", () => {
    const ref = { normName: "Código Penal", consultedOn: "2026-01-10" };
    expect(questionInputSchema.safeParse({ ...base, legalRefs: [ref] }).success).toBe(true);
    expect(questionInputSchema.safeParse({ ...base, legalRefs: [{ ...ref, caseLawThesis: "tese solta" }] }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...base, legalRefs: [{ ...ref, caseLawCourt: "STJ" }] }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...base, legalRefs: [{ ...ref, consultedOn: "2999-01-01" }] }).success).toBe(false);
    expect(questionInputSchema.safeParse({ ...base, legalRefs: [{ ...ref, officialUrl: "http://planalto.gov.br" }] }).success).toBe(false);
  });

  it("slug sem acentos", () => {
    expect(slugify("Teoria do Crime — Tipicidade")).toBe("teoria-do-crime-tipicidade");
  });
});

describe("fluxo de revisão (ações disponíveis)", () => {
  const checks = { content: true, answer: true, source: true, rights: true };
  it("autor não aprova; revisor que criou também não", () => {
    const autor = availableActions("em_revisao", { autor: true, revisor: false, admin: false }, { isCreator: false, checklist: checks, rightsOk: true });
    expect(autor.find((a) => a.to === "aprovada")?.blocked).toMatch(/revisores/);
    const criador = availableActions("em_revisao", { autor: true, revisor: true, admin: false }, { isCreator: true, checklist: checks, rightsOk: true });
    expect(criador.find((a) => a.to === "aprovada")?.blocked).toMatch(/outro revisor/);
  });

  it("checklist incompleto bloqueia aprovação", () => {
    const r = availableActions("em_revisao", { autor: false, revisor: true, admin: false }, { isCreator: false, checklist: { ...checks, rights: false }, rightsOk: true });
    expect(r.find((a) => a.to === "aprovada")?.blocked).toMatch(/checklist/);
  });

  it("questão publicada: só revisor mexe e sempre com motivo", () => {
    const r = availableActions("publicada", { autor: true, revisor: false, admin: false }, { isCreator: true, checklist: checks, rightsOk: true });
    expect(r.every((a) => a.blocked && a.needsReason)).toBe(true);
  });
});
