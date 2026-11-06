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
