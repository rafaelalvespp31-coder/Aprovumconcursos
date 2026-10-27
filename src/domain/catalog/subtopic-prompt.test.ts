import { describe, expect, it } from "vitest";
import { buildSubtopicPrompt } from "./subtopic-prompt";
import { parseOutline } from "./topic-group";
import { prepareLessonUpload } from "./upload-preview";

const outline = parseOutline(`tópico: Ilicitude
4.1. Causas de exclusão da ilicitude
* 4.1.1. Conceito de ilicitude ou antijuridicidade.
* 4.1.2. Estado de necessidade.
* 4.1.3. Legítima defesa.
4.2. Excesso punível
* 4.2.1. Conceito de excesso punível.`);
const group = outline.groups[0]!;
const sub = group.subtopics[0]!;

/** Resposta como o ChatGPT devolveria seguindo o comando: o esqueleto preenchido. */
function fakeAnswer(prompt: string): string {
  const start = prompt.indexOf("=== AULA ===");
  const end = prompt.indexOf("=== REFERÊNCIAS ===");
  const body = prompt
    .slice(start, end)
    .split("\n")
    .map((l) => {
      if (/^\(.*\)$/.test(l.trim())) return "Texto de exemplo da seção, com **termo-chave** e explicação suficiente para o aluno.";
      if (/^Sinônimos:/.test(l)) return "Sinônimos: excludentes";
      if (/^Tempo estimado:/.test(l)) return "Tempo estimado: 60";
      if (/^Objetivo:/.test(l)) return "Objetivo: Dominar as causas de exclusão da ilicitude.";
      if (/^Resumo:/.test(l)) return "Resumo: Aula sobre as excludentes.";
      return l;
    })
    .join("\n")
    // O parêntese do TEXTO-BASE é instrução, não item.
    .replace(/=== TEXTO-BASE ===\nTexto de exemplo[^\n]*\n/, "=== TEXTO-BASE ===\n");
  const q = (lv: string, item: string, i: number) =>
    `--- QUESTÃO ---\nTipo: certo ou errado\nItem: ${item}\nEssencial: ${i < 3 ? "sim" : "não"}\nDificuldade: ${lv === "FÁCIL" ? 1 : lv === "MÉDIO" ? 3 : 4}\nEnunciado: Afirmação ${i + 1} de nível ${lv} sobre o item ${item} para julgar.\nGabarito: Certo\nJustificativa: Certo. Explicação objetiva da resposta ${i + 1}.`;
  const items = ["4.1.1", "4.1.2", "4.1.3"];
  const levels = ["FÁCIL", "MÉDIO", "DIFÍCIL"].map((lv) => `=== QUESTÕES: ${lv} ===\n\n${Array.from({ length: 10 }, (_, i) => q(lv, items[i % 3]!, i)).join("\n\n")}`);
  return `${body}\n=== REFERÊNCIAS ===\nLei: Código Penal, arts. 23 a 25\n\n${levels.join("\n\n")}`;
}

describe("comando do subtópico", () => {
  const prompt = buildSubtopicPrompt({ disciplineMode: "direito_penal", group, sub });

  it("traz o cabeçalho do tópico e um módulo por item", () => {
    expect(prompt).toContain("Tópico: 4. Ilicitude");
    expect(prompt).toContain("Subtópico: 4.1 Causas de exclusão da ilicitude");
    expect(prompt).toContain("=== MÓDULO: 4.1.2 Estado de necessidade ===");
    expect(prompt).toContain("=== QUESTÕES: DIFÍCIL ===");
    expect(prompt).not.toContain("Excesso punível\n");
  });

  it("a resposta no formato do comando é catalogada dentro do tópico, sem erros", () => {
    const p = prepareLessonUpload(fakeAnswer(prompt));
    expect(p.errors).toEqual([]);
    expect(p.parsed.meta).toMatchObject({ title: "Causas de exclusão da ilicitude", topicGroup: "Ilicitude", topicGroupCode: "4", subtopicCode: "4.1", disciplineMode: "direito_penal" });
    expect(p.slug).toBe("ilicitude-4-1-causas-de-exclusao-da-ilicitude");
    const modules = [...new Set(p.built.lesson.sections.map((s) => s.module))];
    expect(modules).toEqual(["Visão geral do subtópico", "4.1.1 Conceito de ilicitude ou antijuridicidade", "4.1.2 Estado de necessidade", "4.1.3 Legítima defesa", "Casos práticos e pegadinhas", "Revisão final"]);
    expect(p.built.lesson.taughtNodeKeys).toHaveLength(3);
    expect(p.built.questions).toHaveLength(30);
  });

  it("sem tópico, a aula continua avulsa (como hoje)", () => {
    const p = prepareLessonUpload(fakeAnswer(prompt).replace(/^Tópico:.*\n^Subtópico:.*\n/m, ""));
    expect(p.parsed.meta).toMatchObject({ topicGroup: null, subtopicCode: null });
    expect(p.slug).toBe("causas-de-exclusao-da-ilicitude");
  });
});
