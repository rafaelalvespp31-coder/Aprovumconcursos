import { describe, expect, it } from "vitest";
import { parseOutline } from "./topic-group";
import { buildTopicMasterPrompt } from "./topic-master";
import { splitLessons } from "./bulk";

const outline = parseOutline(`4. Ilicitude
4.1 Causas de exclusão da ilicitude
4.1.1 Estado de necessidade
4.1.2 Legítima defesa
4.2 Excesso punível
4.3 Descriminantes putativas
5. Culpabilidade
5.1 Imputabilidade`);

describe("comando-mestre do tópico", () => {
  const g = outline.groups[0]!;
  const p = buildTopicMasterPrompt({ disciplineMode: "direito_penal", group: g });
  it("traz o tópico, todos os subtópicos e os itens de cada um", () => {
    expect(p).toContain("TÓPICO: 4. Ilicitude");
    expect(p).toContain("SUBTÓPICOS: 3");
    for (const t of ["Causas de exclusão da ilicitude", "Excesso punível", "Descriminantes putativas"]) expect(p).toContain(t);
    expect(p).toContain("SUBTÓPICO 3 DE 3");
    expect(p).toContain("Subtópico: 4.2 Excesso punível");
    expect(p).toContain("=== AULA ===");
    expect(p).toContain("Digite 'próximo'");
  });
  it("não mistura subtópicos de outro tópico", () => {
    expect(p).not.toContain("Imputabilidade");
  });
  it("tem tamanho que cabe no chat", () => {
    expect(p.length).toBeLessThan(70_000);
  });
  it("tópico sem subtópicos não gera comando", () => {
    expect(buildTopicMasterPrompt({ disciplineMode: "direito_penal", group: { ...g, subtopics: [] } })).toBe("");
  });
  it("o esqueleto do comando é lido como uma aula pelo divisor do arquivo", () => {
    expect(splitLessons(p.slice(p.indexOf("ESQUELETO PADRÃO"))).length).toBeGreaterThanOrEqual(1);
  });
});
