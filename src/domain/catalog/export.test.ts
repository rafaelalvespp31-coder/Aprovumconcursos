import { describe, expect, it } from "vitest";
import { extractStructure } from "@/domain/content/extract";
import { normalizeContent } from "@/domain/content/normalize";
import { buildModelPrompt, exportTopicText, modelOutline, type ExportableTopic } from "./export";
import { buildLesson, parseLessonUpload } from "./upload";

const source = normalizeContent(
  "Art. 121 - Matar alguém:\nPena - reclusão, de seis a vinte anos.\n§ 1º Se o agente comete o crime impelido por motivo de relevante valor social ou moral.\n§ 2º Se o homicídio é cometido:\nI - mediante paga ou promessa de recompensa;\nII - por motivo fútil;\n1 Tipo penal: bem jurídico, sujeitos, consumação e classificação\n2 Dolo e culpa no homicídio",
).normalized;
const nodes = extractStructure(source).nodes;
const k = (re: RegExp) => nodes.find((n) => re.test(n.path))!.key;

const topic: ExportableTopic = {
  title: "Homicídio (CP, art. 121)",
  disciplineMode: "direito_penal",
  kind: "dispositivo",
  lawCode: "CP",
  articles: ["121"],
  aliases: ["homicídio simples", "homicídio qualificado"],
  estimatedMinutes: 90,
  summary: "Matar alguém.",
  sourceText: source,
  nodes,
  lesson: {
    objective: "Dominar o art. 121 do Código Penal.",
    sections: [
      { module: "Visão geral e lei seca", kind: "introducao", title: "Visão geral: o que o art. 121 protege", nodeKeys: [k(/^Art\. 121$/), k(/^1$/)], bodyMarkdown: "O **homicídio** é o crime de matar alguém.\n\n> **Por que isso importa na prova:** quase toda questão começa aqui.\n\n1. o texto da lei;\n2. o tipo penal." },
      { module: "Visão geral e lei seca", kind: "esquema", title: "Mapa do art. 121 (bloco por bloco)", nodeKeys: [k(/§ 1º$/), k(/§ 2º$/)], bodyMarkdown: "| Bloco | O que diz | Pena ou efeito |\n|---|---|---|\n| **Caput** | Matar alguém | Reclusão de **6 a 20 anos** |\n\n---\n\nRevogados: nenhum." },
      { module: "Visão geral e lei seca", kind: "texto_legal", title: "Texto legal do art. 121", nodeKeys: nodes.filter((n) => n.kind !== "topico").map((n) => n.key), bodyMarkdown: "> Art. 121 - Matar alguém:\n> Pena - reclusão, de seis a vinte anos." },
      { module: "O crime de homicídio", kind: "conceitos_fundamentals_invalid", title: "x", nodeKeys: [], bodyMarkdown: "x" },
      { module: "Revisão final", kind: "checklist", title: "Checklist: você consegue…", nodeKeys: [k(/^2/)], bodyMarkdown: "- [ ] Dizer a pena do caput?\n- [ ] Diferenciar dolo e culpa?" },
    ].filter((s) => s.kind !== "conceitos_fundamentals_invalid"),
    references: [{ kind: "lei", citation: "Código Penal, art. 121" }, { kind: "jurisprudencia", citation: "STJ, Súmula 18" }],
    unverifiedClaims: ["Conferir a redação vigente do § 2º."],
  },
  questions: [
    { level: "facil", type: "certo_errado", statement: "O perdão judicial cabe no homicídio doloso.", options: [], correctAnswerTrue: false, justification: "Errado. Só no culposo.", nodeKey: k(/^1/), difficulty: 1, essential: true },
    {
      level: "medio",
      type: "multipla_escolha",
      statement: "A mãe que, sob influência do estado puerperal, mata o filho comete:",
      options: [
        { label: "A", text: "Homicídio qualificado.", correct: false, explanation: "Há tipo específico." },
        { label: "B", text: "Infanticídio (art. 123).", correct: true, explanation: "Correto: estado puerperal." },
        { label: "C", text: "Aborto.", correct: false, explanation: "A criança já nasceu." },
      ],
      justification: "O infanticídio é forma especial de matar.",
      nodeKey: k(/§ 2º › II$/),
      difficulty: 3,
      essential: false,
    },
  ],
};

describe("aula-modelo exportada no formato do painel", () => {
  it("ida e volta: exportar e colar devolve a mesma aula", () => {
    const txt = exportTopicText(topic);
    const p = parseLessonUpload(txt);
    expect(p.errors).toEqual([]);
    expect(p.meta).toMatchObject({ title: topic.title, disciplineMode: "direito_penal", kind: "dispositivo", lawCode: "CP", articles: ["121"], estimatedMinutes: 90 });
    expect(p.sections.map((s) => [s.module, s.kind, s.title])).toEqual(topic.lesson.sections.map((s) => [s.module, s.kind, s.title]));
    expect(p.sections[1]!.bodyMarkdown).toBe(topic.lesson.sections[1]!.bodyMarkdown);
    const b = buildLesson(p, extractStructure(normalizeContent(p.sourceText).normalized).nodes);
    expect(b.errors).toEqual([]);
    expect(b.lesson.sections.map((s) => s.nodeKeys)).toEqual(topic.lesson.sections.map((s) => s.nodeKeys));
    expect(b.questions.map((q) => [q.level, q.type, q.nodeKey, q.correctAnswerTrue, q.options.find((o) => o.correct)?.label ?? null])).toEqual([
      ["facil", "certo_errado", topic.questions[0]!.nodeKey, false, null],
      ["medio", "multipla_escolha", topic.questions[1]!.nodeKey, null, "B"],
    ]);
    expect(b.questions[1]!.options[0]!.explanation).toBe("Há tipo específico.");
    expect(b.lesson.references).toEqual(topic.lesson.references);
    expect(b.lesson.unverifiedClaims).toEqual(topic.lesson.unverifiedClaims);
  });

  it("o comando traz o esqueleto e as contagens do modelo, e a aula-modelo inteira", () => {
    const o = modelOutline(topic);
    expect(o.modules.map((m) => m.name)).toEqual(["Visão geral e lei seca", "Revisão final"]);
    const prompt = buildModelPrompt(topic);
    expect(prompt).toContain('MÓDULO "Visão geral e lei seca"');
    expect(prompt).toContain("SEÇÃO esquema | Mapa do art. 121 (bloco por bloco)");
    expect(prompt).toContain("- Médio: 1 questões (1 de múltipla escolha e 0 de certo ou errado");
    expect(prompt).toContain("<<<INÍCIO DO MODELO OFICIAL: Homicídio (CP, art. 121)>>>");
    expect(prompt).toContain(exportTopicText(topic));
    // O que o ChatGPT devolver no mesmo formato é lido pelo painel (o próprio modelo serve de teste).
    const inner = prompt.slice(prompt.indexOf(">>>\n") + 4, prompt.lastIndexOf("<<<FIM"));
    expect(parseLessonUpload(inner).errors).toEqual([]);
  });
});

describe("comando em 2 partes", () => {
  it("parte 1 traz a aula sem questões; parte 2 só as questões; juntas formam a aula inteira", async () => {
    const { buildModelPromptParts } = await import("./export");
    const { part1, part2 } = buildModelPromptParts(topic);
    expect(part1).toContain("PARTE 1");
    expect(part1).not.toContain("=== QUESTÕES:");
    expect(part2).toContain("=== QUESTÕES: FÁCIL ===");
    expect(part2).not.toContain("=== AULA ===");
    const inner = (s: string) => s.slice(s.indexOf(">>>\n") + 4, s.lastIndexOf("<<<FIM"));
    const joined = `${inner(part1)}\n\n${inner(part2)}`;
    const p = parseLessonUpload(joined);
    expect(p.errors).toEqual([]);
    expect(p.questions).toHaveLength(topic.questions.length);
    expect(p.sections).toHaveLength(topic.lesson.sections.length);
  });
});

describe("comando compacto", () => {
  it("fica curto, mantém o esqueleto, o começo de cada seção e um exemplo de questão por tipo", async () => {
    const { buildCompactPrompt, sectionExcerpt } = await import("./export");
    const c = buildCompactPrompt(topic);
    expect(c).toContain('MÓDULO "Visão geral e lei seca"');
    expect(c).toContain("esquema | Mapa do art. 121 (bloco por bloco) (~");
    expect(c).toContain("| Bloco | O que diz | Pena ou efeito |");
    expect(c).toContain("Quando eu escrever \"questões\"");
    expect(c).toContain("Infanticídio (art. 123).");
    expect(c).toContain("O perdão judicial cabe no homicídio doloso.");
    const long = Array.from({ length: 40 }, (_, i) => `- item ${i} com bastante texto para ocupar espaço na seção`).join("\n") + "\n\n| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |\n| 5 | 6 |\n\n> **Pegadinha:** caixa no fim.";
    const ex = sectionExcerpt(long);
    expect(ex.length).toBeLessThan(560);
    expect(ex).toContain("| A | B |");
    expect(ex).toContain("> **Pegadinha:**");
    expect(ex).not.toContain("| 5 | 6 |");
    expect(ex.endsWith("(…)")).toBe(true);
  });
});
