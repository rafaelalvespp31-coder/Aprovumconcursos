import { describe, expect, it } from "vitest";
import { IMPORT_EXAMPLE, checkImport, importSchema } from "./import";

describe("importação estratégica", () => {
  it("o exemplo é válido e sem erros", () => {
    const d = importSchema.parse(IMPORT_EXAMPLE);
    expect(checkImport(d).filter((i) => i.level === "erro")).toEqual([]);
  });
  it("recusa nota de corte sem fonte e totais incoerentes", () => {
    const bad = structuredClone(IMPORT_EXAMPLE) as typeof IMPORT_EXAMPLE;
    (bad.editions[0]!.cutoffs[0] as { sourceKey: string | null }).sourceKey = null;
    bad.editions[0]!.subjects[0]!.topics[0]!.questions = 30;
    const errs = checkImport(importSchema.parse(bad)).filter((i) => i.level === "erro").map((i) => i.message);
    expect(errs.some((m) => /sem fonte/i.test(m))).toBe(true);
    expect(errs.some((m) => /acima das/.test(m))).toBe(true);
  });
  it("formato inválido falha no schema", () => expect(importSchema.safeParse({ exam: { name: "x" }, editions: [] }).success).toBe(false));
});

import { IMPORT_EXAMPLE_TEXT, parseStrategicText } from "./text";
describe("importação por texto (ChatGPT)", () => {
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
    expect((r.data as { editions: Array<{ cutoffs: Array<{ score: number; modality: string }> }> }).editions[0]!.cutoffs[0]).toMatchObject({ score: 31.5, modality: "pcd" });
  });
});
