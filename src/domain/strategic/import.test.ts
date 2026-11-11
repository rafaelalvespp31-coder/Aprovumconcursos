import { describe, expect, it } from "vitest";
import { IMPORT_EXAMPLE, checkImport, importSchema, repairImport } from "./import";

describe("importação estratégica", () => {
  it("o exemplo é válido e sem erros", () => {
    const d = importSchema.parse(IMPORT_EXAMPLE);
    expect(checkImport(d).filter((i) => i.level === "erro")).toEqual([]);
  });
  it("conserta nota com fonte inexistente e totais incoerentes, sem erros", () => {
    const bad = structuredClone(IMPORT_EXAMPLE) as typeof IMPORT_EXAMPLE;
    (bad.editions[0]!.cutoffs[0] as { sourceKey: string | null }).sourceKey = "nao-existe";
    bad.editions[0]!.subjects[0]!.topics[0]!.questions = 70;
    const d = importSchema.parse(bad);
    const fixes = repairImport(d);
    expect(fixes.length).toBeGreaterThan(0);
    expect(d.editions[0]!.subjects[0]!.questions).toBe(70);
    expect(d.editions[0]!.totalQuestions).toBe(70);
    expect(d.editions[0]!.cutoffs[0]!.sourceKey).toBeNull();
    expect(checkImport(d).filter((i) => i.level === "erro")).toEqual([]);
  });
  it("formato inválido falha no schema", () => expect(importSchema.safeParse({ exam: { name: "x" }, editions: [] }).success).toBe(false));
});

import { IMPORT_EXAMPLE_TEXT, parseStrategicText } from "./text";
describe("importação por texto (IA)", () => {
  it("o exemplo em texto vira dados válidos", () => {
    const r = parseStrategicText(IMPORT_EXAMPLE_TEXT);
    expect(r.issues).toEqual([]);
    const d = importSchema.parse(r.data);
    expect(d.exam.name).toBe("Polícia Penal do Estado do Espírito Santo");
    expect(d.editions[0]!.cutoffs[0]).toMatchObject({ kind: "corte_primeira_fase", modality: "ampla", score: 38, sourceKey: "res-2025" });
    expect(d.editions[0]!.subjects[0]!.topics).toHaveLength(2);
    expect(d.sources[0]!.publishedAt).toBe("2025-05-10");
    expect(checkImport(d).filter((i) => i.level === "erro")).toEqual([]);
  });
  it("aceita markdown, decimais com vírgula e aponta linhas erradas", () => {
    const r = parseStrategicText("**CONCURSO:** X\n- PROVA: 2024 | Banca | 50 | -\nNOTA: Cargo | PCD | 1ª fase | MINIMA | 31,5 | 50 | - | crit | f1 | 2 | -\nASSUNTO: solto | 2 | 0\nDISCIPLINA: Direito Penal | abc | 0");
    expect(r.issues.map((i) => i.line)).toEqual([4, 5]);
    expect(r.issues.every((i) => i.level === "aviso")).toBe(true);
    expect((r.data as { editions: Array<{ cutoffs: Array<{ score: number; modality: string }> }> }).editions[0]!.cutoffs[0]).toMatchObject({ score: 31.5, modality: "pcd" });
  });
});

describe("importação tolerante (sem erros)", () => {
  it("assuntos sem quantidade, prioridade estranha e duplicidades viram avisos e o resto é catalogado", () => {
    const txt = `CONCURSO: Guarda Municipal de Paulínia | Prefeitura
CARGOS: Guarda; Guarda
FONTE: f1 | OFICIAL | Edital | - | - | - | - | - | -
PROVA: 2024 | Banca | 50 | -
DISCIPLINA: Legislação | - | -
ASSUNTO: Lei de Tortura – Lei 9.455/1997 | - | -
ASSUNTO: Código de Trânsito Brasileiro | não localizado | 0
ASSUNTO: Lei Complementar Municipal 139/2026 | 3 questões | 0
NOTA: Guarda | Ampla | Objetiva | Corte | 30 | 50 | - | - | fx | - | -
FOCO: Muito alta | Legislação | - | Cai sempre`;
    const t = parseStrategicText(txt);
    expect(t.issues.filter((i) => i.level === "erro")).toEqual([]);
    const d = importSchema.parse(t.data);
    const issues = [...repairImport(d), ...checkImport(d)];
    expect(issues.filter((i) => i.level === "erro")).toEqual([]);
    const s = d.editions[0]!.subjects[0]!;
    expect(s.topics.map((x) => x.questions)).toEqual([0, 0, 3]);
    expect(s.questions).toBe(3);
    expect(d.positions).toEqual(["Guarda"]);
    expect(d.recommendations[0]).toMatchObject({ priority: "maxima", topic: "Legislação" });
  });
});

import { buildStrategicPrompt } from "./text";
describe("comando da IA preenchido pelo edital do aluno", () => {
  it("leva nome, ano e conteúdo programático", () => {
    const p = buildStrategicPrompt({ name: "PMERJ 2026", year: 2026, program: "Direito Penal: Crimes contra a pessoa" });
    expect(p).toContain("CONCURSO: PMERJ 2026 (use exatamente este nome");
    expect(p).toContain("CONTEÚDO PROGRAMÁTICO EXTRAÍDO");
    expect(p).toContain("Direito Penal: Crimes contra a pessoa");
    expect(buildStrategicPrompt()).toContain("[nome do concurso]");
  });
});

describe("resposta do chat no formato do comando", () => {
  it("o exemplo do comando é aceito, mesmo dentro de bloco de código", () => {
    const r = parseStrategicText("```text\n" + IMPORT_EXAMPLE_TEXT + "\n```");
    expect(r.data).not.toBeNull();
    expect(r.issues.filter((i) => i.level === "erro")).toEqual([]);
  });
  it("o comando traz as seções e pede um único bloco", () => {
    const p = buildStrategicPrompt();
    for (const h of ["# PAPEL", "# CONCURSO", "# O QUE FAZER", "# REGRAS OBRIGATÓRIAS", "# FORMATO DA RESPOSTA", "# CONFIRA ANTES DE RESPONDER", "# EXEMPLO DE SAÍDA"]) expect(p).toContain(h);
    expect(p).toContain("UM único bloco de código");
  });
});
