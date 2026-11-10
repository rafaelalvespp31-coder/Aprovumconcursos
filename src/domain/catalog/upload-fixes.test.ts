import { describe, expect, it } from "vitest";
import { prepareLessonUpload } from "./upload-preview";
import { describeIssues } from "./upload-fixes";

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

describe("conferência ao vivo: o painel corrige sozinho, sem erro", () => {
  it("o texto cheio de defeitos (matéria errada, tipo de seção inexistente, seção vazia, gabarito inválido) não gera erro, só avisos", () => {
    const p = prepareLessonUpload(base);
    expect(p.errors).toEqual([]);
    const issues = describeIssues(base, p.errors, p.warnings);
    expect(issues.some((i) => i.severity === "erro")).toBe(false);
    const w = p.warnings.join("\n");
    expect(w).not.toMatch(/Objetivo/);
    expect(w).not.toMatch(/matéria/);
    expect(p.parsed.meta.disciplineMode).toBe("lingua_portuguesa");
    expect(w).not.toMatch(/veio vazia/);
    expect(w).toMatch(/Questão da linha 15: .*Questão ignorada/);
    expect(w).toMatch(/Questão da linha 23: .*Questão ignorada/);
    expect(p.parsed.sections.map((x) => x.title)).toEqual(["O que é", "Revisão"]);
    expect(p.parsed.sections[0]!.kind).toBe("explicacao");
    expect(p.built.lesson.objective.length).toBeGreaterThan(5);
  });

  it("sem bloco AULA: não avisa; os dados saem do conteúdo", () => {
    expect(issuesOf("qualquer coisa").some((x) => /AULA/.test(x.message))).toBe(false);
  });
});

describe("seções que o ChatGPT escreveu fora do formato", () => {
  const head = ["=== AULA ===", "Título: TCO", "Matéria: Legislação especial", "Tipo: tema", "Objetivo: Dominar o termo circunstanciado.", "=== TEXTO-BASE ===", "1 Conceito", "2 Rito", "=== MÓDULO: Base ==="];
  it("aceita travessão no lugar de --- e “### SEÇÃO:”", () => {
    const t = [...head, "— SEÇÃO: introdução | O que é o TCO —", "Texto um.", "### SEÇÃO: resumo | Revisão", "Texto dois."].join("\n");
    expect(prepareLessonUpload(t).parsed.errors).toEqual([]);
  });
  it("títulos soltos viram seções sozinhos; texto solto nas questões só gera aviso", () => {
    const t = [...head, "## O que é o TCO", "Texto um.", "", "Mais texto.", "## Rito sumaríssimo", "Texto dois.", "=== QUESTÕES: FÁCIL ===", "solto aqui", "e aqui"].join("\n");
    const p = prepareLessonUpload(t);
    expect(p.errors).toEqual([]);
    expect(p.parsed.sections.map((s) => s.title)).toEqual(["O que é o TCO", "Rito sumaríssimo"]);
    expect(p.parsed.sections[0]!.bodyMarkdown).toContain("Mais texto.");
    expect(p.warnings.join("\n")).not.toMatch(/virou uma seção/);
    expect(p.warnings.join("\n")).toMatch(/fora de uma questão/);
  });
});

describe("autocorrigir tudo com um clique", () => {
  it("nada a corrigir: o texto já passa sem erros", async () => {
    const { autoFixText } = await import("./upload-fixes");
    const r = autoFixText(base, (t) => prepareLessonUpload(t));
    expect(r.remaining).toEqual([]);
    expect(prepareLessonUpload(r.text).parsed.errors).toEqual([]);
  });
  it("texto com títulos em negrito vira seções sem precisar escolher", async () => {
    const { autoFixText } = await import("./upload-fixes");
    const t = ["=== AULA ===", "Título: TCO", "Matéria: Legislação especial", "Tipo: tema", "Objetivo: Dominar o TCO.", "=== TEXTO-BASE ===", "1 Conceito", "=== MÓDULO: Base ===", "**O que é o TCO**", "Texto um.", "**Rito**", "Texto dois."].join("\n");
    const r = autoFixText(t, (x) => prepareLessonUpload(x));
    expect(r.remaining).toEqual([]);
    expect(prepareLessonUpload(t).parsed.sections.map((s) => s.title)).toEqual(["O que é o TCO", "Rito"]);
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
