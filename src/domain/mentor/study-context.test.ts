import { describe, expect, it } from "vitest";
import { sanitizeStudyContext, studyContextInstruction } from "./study-context";

describe("study-context", () => {
  it("limpa, limita e descarta vazio", () => {
    expect(sanitizeStudyContext(null)).toBeNull();
    expect(sanitizeStudyContext({ subject: "  ", lesson: 5 })).toBeNull();
    const c = sanitizeStudyContext({ selection: `a\u0000  b${"x".repeat(900)}`, extra: "ignorado" })!;
    expect(c.selection!.length).toBe(600);
    expect(c.selection!.startsWith("a b")).toBe(true);
    expect("extra" in c).toBe(false);
  });
  it("monta a instrução como dado", () => {
    const t = studyContextInstruction({ lesson: "Cadeia de custódia", selection: "rastreabilidade" });
    expect(t).toContain("Aula aberta: Cadeia de custódia");
    expect(t).toContain("«rastreabilidade»");
    expect(studyContextInstruction(null)).toBe("");
  });
});
