import { describe, expect, it } from "vitest";
import { normalizeContent } from "@/domain/content/normalize";
import { extractStructure } from "@/domain/content/extract";
import { auditPlan } from "@/domain/content/audit";
import { composeStudy, sampleQuestions, type CatalogQuestion, type CatalogTopicContent } from "./compose";

function topic(id: string, text: string): CatalogTopicContent {
  const sourceText = normalizeContent(text).normalized;
  const nodes = extractStructure(sourceText).nodes;
  const keys = nodes.filter((n) => n.requiresDirectCoverage).map((n) => n.key);
  const qs: CatalogQuestion[] = (["facil", "medio", "dificil"] as const).flatMap((level, li) =>
    Array.from({ length: 12 }, (_, i) => ({
      id: `${id}-${level}-${i}`,
      level,
      type: "certo_errado" as const,
      statement: `Questão ${i} do nível ${level} (${id})`,
      options: [],
      correctAnswerTrue: true,
      justification: "Justificativa suficiente.",
      nodeKey: keys[i % keys.length]!,
      difficulty: li + 1,
      essential: false,
      dependsOnExternalSource: false,
    })),
  );
  return {
    id,
    title: `Tema ${id}`,
    version: 2,
    disciplineMode: "direito_penal",
    sourceText,
    nodes,
    lesson: {
      title: `Tema ${id}`,
      objective: "Objetivo",
      sections: [{ kind: "explicacao", title: "Explicação", bodyMarkdown: "Texto", nodeKeys: keys, ...(keys[0] ? { sourceKey: keys[0] } : {}) }],
      taughtNodeKeys: keys,
      references: [],
      unverifiedClaims: [],
      verificationPending: false,
    },
    questions: qs,
  };
}

const A = topic("a", "Art. 121. Matar alguém:\nPena - reclusão, de seis a vinte anos.\n§ 1º Se o agente comete o crime impelido por motivo de relevante valor social;\n§ 2º Se o homicídio é cometido mediante paga;");
const B = topic("b", "Art. 122. Induzir ou instigar alguém a suicidar-se:\nI - se o crime é praticado por motivo egoístico;\nII - se a vítima é menor;");

describe("montagem de estudo a partir do catálogo", () => {
  it("junta os temas com chaves renumeradas, spans deslocados e plano auditado", () => {
    const s = composeStudy([A, B], { seed: "aluno-1", moduleTitle: "Arts. 121 e 122 do CP" });
    expect(s.nodes.map((n) => n.key)).toEqual(s.nodes.map((_, i) => `N${String(i + 1).padStart(4, "0")}`));
    // Cada nó continua apontando para o próprio trecho no texto combinado.
    for (const n of s.nodes) expect(s.normalizedText.slice(n.span.start, n.span.end)).toBe(n.sourceText);
    // Pais remapeados para nós do mesmo tema.
    const keys = new Set(s.nodes.map((n) => n.key));
    expect(s.nodes.every((n) => !n.parentKey || keys.has(n.parentKey))).toBe(true);
    expect(s.plan.modules[0]!.lessons.map((l) => l.title)).toEqual(["Tema a", "Tema b"]);
    const audit = auditPlan({ normalizedText: s.normalizedText, nodes: s.nodes, unassigned: [], plan: s.plan });
    expect(audit.summary.structurallyComplete).toBe(true);
  });

  it("aulas e questões passam a usar as chaves do aluno; 10 por nível, cobrindo os itens", () => {
    const s = composeStudy([A, B], { seed: "aluno-1", moduleTitle: "x" });
    const u = s.units[1]!;
    const own = new Set(s.plan.modules[0]!.lessons[1]!.nodeKeys);
    expect(u.lesson.taughtNodeKeys.every((k) => own.has(k))).toBe(true);
    expect(own.has(u.lesson.sections[0]!.sourceKey!)).toBe(true);
    for (const lv of ["facil", "medio", "dificil"] as const) {
      expect(u.questions[lv]).toHaveLength(10);
      expect(u.questions[lv].every((q) => own.has(q.nodeKey))).toBe(true);
      expect(new Set(u.questions[lv].map((q) => q.nodeKey)).size).toBe(own.size);
    }
  });

  it("amostra estável por aluno e diferente entre alunos", () => {
    const bank = Array.from({ length: 30 }, (_, i) => ({ id: `q${i}`, nodeKey: `N${i % 3}` }));
    expect(sampleQuestions(bank, 10, "x")).toEqual(sampleQuestions(bank, 10, "x"));
    expect(sampleQuestions(bank, 10, "x").map((q) => q.id)).not.toEqual(sampleQuestions(bank, 10, "y").map((q) => q.id));
    expect(sampleQuestions(bank.slice(0, 4), 10, "x")).toHaveLength(4);
  });
});
