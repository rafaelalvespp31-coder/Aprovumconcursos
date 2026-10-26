import { describe, expect, it } from "vitest";
import { prepareLessonUpload } from "./upload-preview";
import { applyFix, applyLineEdit, describeIssues } from "./upload-fixes";

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

describe("seções que o ChatGPT escreveu fora do formato", () => {
  const head = ["=== AULA ===", "Título: TCO", "Matéria: Legislação especial", "Tipo: tema", "Objetivo: Dominar o termo circunstanciado.", "=== TEXTO-BASE ===", "1 Conceito", "2 Rito", "=== MÓDULO: Base ==="];
  it("aceita travessão no lugar de --- e “### SEÇÃO:”", () => {
    const t = [...head, "— SEÇÃO: introdução | O que é o TCO —", "Texto um.", "### SEÇÃO: resumo | Revisão", "Texto dois."].join("\n");
    expect(prepareLessonUpload(t).parsed.errors).toEqual([]);
  });
  it("títulos soltos viram seções com um clique; texto solto vira um trecho só", () => {
    const t = [...head, "## O que é o TCO", "Texto um.", "", "Mais texto.", "## Rito sumaríssimo", "Texto dois.", "=== QUESTÕES: FÁCIL ===", "solto aqui", "e aqui"].join("\n");
    const issues = issuesOf(t);
    const two = issues.find((i) => /pelo menos 2 seções/.test(i.message))!;
    expect(two.fixes[0]!.label).toBe("Transformar os 2 títulos soltos em seções");
    const fixed = applyFix(t, two.fixes[0]!);
    expect(prepareLessonUpload(fixed).parsed.errors).toEqual([]);
    expect(prepareLessonUpload(fixed).parsed.sections.map((s) => s.title)).toEqual(["O que é o TCO", "Rito sumaríssimo"]);
    const looseQ = issues.find((i) => /fora de uma questão/.test(i.message))!;
    expect(looseQ.message).toMatch(/^Linhas 17–18/);
    expect(applyFix(t, looseQ.fixes[1]!)).not.toContain("solto aqui");
  });
});

describe("autocorrigir tudo com um clique", () => {
  it("aplica as correções sugeridas em sequência e diz o que fez", async () => {
    const { autoFixText } = await import("./upload-fixes");
    const r = autoFixText(base, (t) => prepareLessonUpload(t));
    expect(r.remaining).toEqual([]);
    expect(prepareLessonUpload(r.text).parsed.errors).toEqual([]);
    expect(r.applied.length).toBeGreaterThanOrEqual(5);
    expect(r.text).toContain("Gabarito: A");
  });
  it("títulos soltos viram seções sem precisar escolher", async () => {
    const { autoFixText } = await import("./upload-fixes");
    const t = ["=== AULA ===", "Título: TCO", "Matéria: Legislação especial", "Tipo: tema", "Objetivo: Dominar o TCO.", "=== TEXTO-BASE ===", "1 Conceito", "=== MÓDULO: Base ===", "**O que é o TCO**", "Texto um.", "**Rito**", "Texto dois."].join("\n");
    const r = autoFixText(t, (x) => prepareLessonUpload(x));
    expect(r.remaining).toEqual([]);
  });
});

describe("autocorrigir questões coladas na aula", () => {
  it("questões sem os marcadores ganham bloco e --- QUESTÃO --- pelo nível da Dificuldade", async () => {
    const { autoFixText } = await import("./upload-fixes");
    const { checkQuestionsText, parseLessonUpload } = await import("./upload");
    const t = ["Tipo: certo ou errado", "Dificuldade: 4", "Enunciado: O inquérito é dispensável.", "Gabarito: Certo", "Justificativa: Certo. Pode ser dispensado.", "", "Tipo: certo ou errado", "Dificuldade: 5", "Enunciado: O inquérito admite contraditório pleno.", "Gabarito: Errado", "Justificativa: Errado. É inquisitivo."].join("\n");
    expect(checkQuestionsText(t).errors[0]).toMatch(/Não encontrei questões/);
    const r = autoFixText(t, checkQuestionsText);
    expect(r.remaining).toEqual([]);
    const p = parseLessonUpload(r.text);
    expect(p.questions.map((q) => q.level)).toEqual(["dificil", "dificil"]);
  });
  it("sem pista de nível só corrige com o nível padrão", async () => {
    const { autoFixText } = await import("./upload-fixes");
    const { checkQuestionsText, parseLessonUpload } = await import("./upload");
    const t = "--- QUESTÃO ---\nTipo: certo ou errado\nEnunciado: O inquérito é dispensável.\nGabarito: Certo\nJustificativa: Certo. Pode ser dispensado.";
    expect(autoFixText(t, checkQuestionsText).remaining.length).toBe(1);
    const r = autoFixText(t, checkQuestionsText, { level: 1 });
    expect(r.remaining).toEqual([]);
    expect(parseLessonUpload(r.text).questions[0]!.level).toBe("medio");
  });
});
