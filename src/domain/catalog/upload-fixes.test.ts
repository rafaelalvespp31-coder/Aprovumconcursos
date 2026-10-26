import { describe, expect, it } from "vitest";
import { prepareLessonUpload } from "./upload-preview";
import { applyLineEdit, describeIssues } from "./upload-fixes";

const base = [
  "```",
  "=== AULA ===",
  "Título: Coesão textual",
  "Matéria: Lingua Portugesa",
  "Tipo: tema",
  "=== TEXTO-BASE ===",
  "1 Referenciação",
  "=== MÓDULO: Base ===",
  "--- SEÇÃO: explicaçao detalhada | O que é ---",
  "A referenciação retoma termos.",
  "--- SEÇÃO: resumo | Vazia ---",
  "--- SEÇÃO: resumo | Revisão ---",
  "Coesão liga o texto.",
  "=== QUESTÕES: FÁCIL ===",
  "--- QUESTÃO ---",
  "Tipo: múltipla escolha",
  "Enunciado: A referenciação retoma termos do texto?",
  "A) Sim",
  "Comentário: Sim, ela retoma termos já citados no texto.",
  "B) Não",
  "Gabarito: X",
  "Justificativa: A alternativa A está certa: retoma termos.",
  "--- QUESTÃO ---",
  "Tipo: certo ou errado",
  "Enunciado: Conectivos ligam ideias no texto.",
  "Justificativa: Certo. Eles ligam orações.",
  "```",
].join("\n");

const issuesOf = (t: string) => {
  const p = prepareLessonUpload(t);
  return describeIssues(t, p.errors, p.warnings);
};

describe("conferência ao vivo com correção de um clique", () => {
  it("aponta a linha certa do texto colado (com cercas de código) e oferece correções", () => {
    const issues = issuesOf(base);
    const byMsg = (re: RegExp) => issues.find((i) => re.test(i.message))!;

    const objetivo = byMsg(/Objetivo/);
    expect(objetivo.fixes[0]!.label).toBe("Escrever um objetivo padrão");

    const materia = byMsg(/matéria/);
    expect(materia.line).toBe(4);
    expect(materia.fixes.find((f) => f.recommended)?.label).toBe("Língua Portuguesa");

    const tipo = byMsg(/tipo de seção/);
    expect(tipo.line).toBe(9);
    expect(tipo.fixes[0]).toMatchObject({ label: "Usar “explicacao”", recommended: true });

    const vazia = byMsg(/está vazia/);
    expect(vazia.line).toBe(11);
    expect(vazia.fixes[0]!.label).toBe("Remover a seção");

    const gab = byMsg(/Questão da linha 15: “Gabarito:”/);
    expect(gab.endLine).toBe(23);
    expect(gab.fixes.map((f) => f.label)).toEqual(["Gabarito A", "Gabarito B", "Remover a questão"]);
    expect(gab.fixes[0]!.recommended).toBe(true);

    const ce = byMsg(/Questão da linha 23: “Gabarito:” deve ser Certo/);
    expect(ce.fixes.find((f) => f.recommended)?.label).toBe("Gabarito Certo");
  });

  it("aplicar as correções sugeridas deixa o texto sem erros", () => {
    let t = base;
    for (let round = 0; round < 10; round++) {
      const errs = issuesOf(t).filter((i) => i.severity === "erro");
      if (!errs.length) break;
      const f = errs[0]!.fixes.find((x) => x.recommended) ?? errs[0]!.fixes[0];
      expect(f, errs[0]!.message).toBeTruthy();
      t = applyLineEdit(t, f!.edit);
    }
    expect(prepareLessonUpload(t).parsed.errors).toEqual([]);
    expect(t).toContain("Matéria: Língua Portuguesa");
    expect(t).toContain("Gabarito: A");
    expect(t).toContain("Gabarito: Certo");
    expect(t).not.toContain("Vazia");
  });

  it("sem bloco AULA: insere o cabeçalho no começo", () => {
    const i = issuesOf("qualquer coisa").find((x) => /AULA/.test(x.message))!;
    expect(applyLineEdit("qualquer coisa", i.fixes[0]!.edit).startsWith("=== AULA ===\n")).toBe(true);
  });
});
