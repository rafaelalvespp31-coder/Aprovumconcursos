import { describe, expect, it } from "vitest";
import { findPlanDuplicates } from "./plan-duplicates";
import { parseOutline } from "./topic-group";

const outline = parseOutline("4. Ilicitude\n4.1 Exclusão de ilicitude\n4.2 Legítima defesa\n5. Culpabilidade\n5.1 Imputabilidade\n5.1 Imputabilidade penal\n");
const c = (id: string, title: string, status: string, code: string | null, group: string | null) => ({ id, title, status, topicGroup: group, subtopicCode: code });

describe("findPlanDuplicates", () => {
  it("sem duplicidade devolve zero", () => {
    const o = parseOutline("1. A\n1.1 Um\n1.2 Dois\n");
    expect(findPlanDuplicates(o, [c("a", "Um", "publicado", "1.1", "A")]).total).toBe(0);
  });
  it("subtópico coberto por duas aulas", () => {
    const d = findPlanDuplicates(outline, [c("a", "Legítima defesa", "publicado", "4.2", "Ilicitude"), c("b", "Legítima defesa 2", "rascunho", "4.2", "Ilicitude")]);
    expect(d.subtopics).toHaveLength(1);
    expect(d.subtopics[0]!.lessons.map((l) => l.id)).toEqual(["a", "b"]);
    expect(d.flagged).toContain("0-1");
  });
  it("aulas gêmeas por título (fora de subtópico) e ignora arquivadas", () => {
    const d = findPlanDuplicates(parseOutline("1. A\n1.1 Um\n"), [c("a", "Homicídio simples", "publicado", null, null), c("b", "Homicídio  Simples", "rascunho", null, null), c("c", "Homicídio simples", "arquivado", null, null)]);
    expect(d.titles).toHaveLength(1);
    expect(d.titles[0]!.lessons).toHaveLength(2);
  });
  it("não conta duas vezes o que já é subtópico duplicado", () => {
    const d = findPlanDuplicates(outline, [c("a", "Legítima defesa", "publicado", "4.2", "Ilicitude"), c("b", "Legítima defesa", "rascunho", "4.2", "Ilicitude")]);
    expect(d.subtopics).toHaveLength(1);
    expect(d.titles).toHaveLength(0);
  });
  it("item repetido dentro do plano", () => {
    const d = findPlanDuplicates(outline, []);
    expect(d.outline.some((x) => x.kind === "subtopico" && x.code === "5.1" && x.times === 2)).toBe(true);
  });
  it("tópico repetido no plano", () => {
    const d = findPlanDuplicates(parseOutline("1. Tópico Alfa\n1.1 Assunto um\n1. Tópico Alfa\n1.2 Assunto dois\n"), []);
    expect(d.outline.find((x) => x.kind === "topico")?.times).toBe(2);
  });
});
