import { describe, expect, it } from "vitest";
import { normalizeContent } from "./normalize";
import { extractStructure, findUnassigned } from "./extract";
import { detectNumberingGaps, intToRoman, romanToInt } from "./numbering";
import { auditPlan, autoRepairPlan } from "./audit";
import { computeCoverage } from "./coverage";
import type { LessonPlan } from "./plan";
import {
  EDITAL_INLINE,
  EDITAL_LISTA,
  LEI_CF_ART5,
  LEI_COM_LACUNA,
  PDF_QUEBRADO,
} from "../../../tests/fixtures/samples";

const run = (text: string) => {
  const n = normalizeContent(text);
  return { norm: n.normalized, ...extractStructure(n.normalized) };
};

describe("normalização", () => {
  it("preserva quebras de linha e numeração, removendo ruído", () => {
    const r = normalizeContent("1. Tópico​  um\r\n\r\n\r\n2. Tópico\tdois  ");
    expect(r.normalized).toBe("1. Tópico um\n\n2. Tópico dois");
    expect(r.original).toContain("​");
  });
  it("junta hifenização de quebra de linha", () => {
    expect(normalizeContent("constitu-\ncional").normalized).toBe("constitucional");
  });
  it("aceita entrada vazia", () => {
    expect(normalizeContent("   \n ").normalized).toBe("");
    expect(extractStructure("").nodes).toHaveLength(0);
  });
});

describe("extração hierárquica", () => {
  it("decompõe edital colado em linha única", () => {
    const { nodes, unassigned } = run(EDITAL_INLINE);
    expect(unassigned).toEqual([]);
    const lp = nodes.find((n) => n.title === "LÍNGUA PORTUGUESA")!;
    expect(lp.kind).toBe("disciplina");
    const grupo = nodes.find((n) => n.title === "CONHECIMENTOS BÁSICOS")!;
    expect(grupo.kind).toBe("grupo");
    expect(lp.parentKey).toBe(grupo.key);
    const t41 = nodes.find((n) => n.marker === "4.1")!;
    const t4 = nodes.find((n) => n.marker === "4" && n.parentKey === lp.key)!;
    expect(t41.parentKey).toBe(t4.key);
  });

  it("separa conceitos listados com ponto e vírgula em subtópicos rastreáveis", () => {
    const { nodes } = run(EDITAL_INLINE);
    const t21 = nodes.find((n) => n.marker === "2.1")!;
    const subs = nodes.filter((n) => n.parentKey === t21.key);
    expect(subs.map((s) => s.title)).toEqual([
      "Direitos e deveres individuais e coletivos",
      "direitos sociais",
      "nacionalidade",
      "direitos políticos",
    ]);
    expect(t21.requiresDirectCoverage).toBe(false);
    expect(subs.every((s) => s.requiresDirectCoverage)).toBe(true);
  });

  it("todo nó aponta para o trecho exato do texto normalizado", () => {
    for (const sample of [EDITAL_INLINE, EDITAL_LISTA, LEI_CF_ART5, PDF_QUEBRADO]) {
      const { norm, nodes } = run(sample);
      for (const n of nodes) {
        expect(norm.slice(n.span.start, n.span.end)).toBe(n.sourceText);
        expect(n.sourceText.length).toBeGreaterThan(0);
      }
      expect(new Set(nodes.map((n) => n.key)).size).toBe(nodes.length);
    }
  });

  it("separa subtópicos depois de 'Tema:' mantendo o tema no item pai", () => {
    const { nodes, unassigned } = run("1 Estado, governo e administração pública: conceitos; elementos; poderes.");
    const parent = nodes[0]!;
    expect(parent.title).toBe("Estado, governo e administração pública: conceitos; elementos; poderes");
    expect(nodes.filter((n) => n.parentKey === parent.key).map((n) => n.title)).toEqual(["conceitos", "elementos", "poderes"]);
    expect(unassigned).toEqual([]);
  });

  it("estrutura lista com marcadores sob o tópico correto", () => {
    const { nodes } = run(EDITAL_LISTA);
    const t2 = nodes.find((n) => n.title === "Lógica de argumentação")!;
    expect(nodes.filter((n) => n.parentKey === t2.key).map((n) => n.title)).toEqual([
      "analogias",
      "inferências",
      "deduções e conclusões",
    ]);
    const info = nodes.find((n) => n.title === "INFORMÁTICA")!;
    expect(info.kind).toBe("disciplina");
    expect(info.parentKey).toBeNull();
  });

  it("reconhece estrutura jurídica: título, capítulo, artigo, incisos e parágrafos", () => {
    const { nodes, unassigned } = run(LEI_CF_ART5);
    expect(unassigned).toEqual([]);
    const titulo = nodes[0]!;
    expect(titulo.kind).toBe("titulo");
    expect(titulo.title).toBe("DOS DIREITOS E GARANTIAS FUNDAMENTAIS");
    const art = nodes.find((n) => n.kind === "artigo")!;
    expect(art.marker).toBe("Art. 5º");
    const filhos = nodes.filter((n) => n.parentKey === art.key);
    expect(filhos.map((n) => n.marker)).toEqual(["I", "II", "III", "IV", "§ 1º", "§ 2º"]);
  });

  it("lê a letra do parágrafo quando o texto começa com maiúscula (§ 2º-A A pena…)", () => {
    const { nodes } = run("Art. 157 - Subtrair coisa.\n§ 2º A pena aumenta-se de 1/3 até metade:\nII - concurso;\n§ 2º-A A pena aumenta-se de 2/3:\nI - arma de fogo;\n§ 2º-B. Se a violência é exercida com arma.\n§ 3º - A pena é outra.\nParágrafo único. Texto.\nPARÁGRAFO ÚNICO - Texto.");
    expect(nodes.filter((n) => n.kind === "paragrafo").map((n) => n.marker)).toEqual(["§ 2º", "§ 2º-A", "§ 2º-B", "§ 3º", "Parágrafo único", "PARÁGRAFO ÚNICO"]);
    expect(nodes.find((n) => n.marker === "§ 2º-A")!.title).toMatch(/^A pena aumenta-se de 2\/3/);
    expect(nodes.find((n) => n.marker === "§ 3º")!.title).toMatch(/^A pena é outra/);
  });

  it("não lê a inicial acentuada do texto como letra do artigo (Art. 1º - Não…)", () => {
    const { nodes } = run("Art. 1º - Não há crime sem lei anterior que o defina.\nArt. 2º - Ninguém pode ser punido.\n§ 2º - É também aplicável.\nArt. 121-A - Texto.");
    expect(nodes.map((n) => n.marker)).toEqual(["Art. 1º", "Art. 2º", "§ 2º", "Art. 121-A"]);
    expect(nodes[0]!.title).toMatch(/^Não há crime/);
  });

  it("reúne linhas quebradas de PDF no mesmo tópico", () => {
    const { nodes } = run(PDF_QUEBRADO);
    expect(nodes).toHaveLength(2);
    expect(nodes[0]!.title).toContain("classificação e espécies");
    expect(nodes[1]!.title).toContain("poder regulamentar e poder de polícia");
  });

  it("não confunde números de leis com itens numerados", () => {
    const { nodes } = run("1 Lei nº 8.112/1990 e alterações. 2 Decreto nº 1.171/1994.");
    expect(nodes.map((n) => n.marker)).toEqual(["1", "2"]);
  });

  it("detecta trechos não atribuídos", () => {
    const gaps = findUnassigned("abc def ghi", [{ span: { start: 0, end: 3 } }, { span: { start: 8, end: 11 } }]);
    expect(gaps).toEqual([{ start: 4, end: 7 }]);
    expect(findUnassigned("abc ...", [{ span: { start: 0, end: 3 } }])).toEqual([]);
  });

  it("processa conteúdo grande em tempo razoável", () => {
    const big = Array.from({ length: 800 }, (_, i) => `${i + 1} Tópico número ${i + 1}; conceito A; conceito B.`).join("\n");
    const t0 = performance.now();
    const { nodes, unassigned } = run(big);
    expect(performance.now() - t0).toBeLessThan(2000);
    expect(nodes.filter((n) => n.kind === "topico")).toHaveLength(800);
    expect(unassigned).toEqual([]);
  });

  it("tolera entrada malformada sem lançar erro", () => {
    for (const s of ["....;;;:::", "§", "Art.", "I -", "a)", "1.1.1.1.1 x", "\u0000\u0007texto"]) {
      expect(() => run(s)).not.toThrow();
    }
  });
});

describe("numeração", () => {
  it("converte romanos", () => {
    expect(romanToInt("XIV")).toBe(14);
    expect(romanToInt("LXXVIII")).toBe(78);
    expect(intToRoman(49)).toBe("XLIX");
    expect(romanToInt("ABC")).toBeNull();
  });
  it("aponta inciso ausente", () => {
    const { nodes } = run(LEI_COM_LACUNA);
    const gaps = detectNumberingGaps(nodes);
    expect(gaps).toHaveLength(1);
    expect(gaps[0]!.missing).toEqual(["III"]);
  });
  it("aponta subtópico inicial ausente", () => {
    const { nodes } = run("1 Tema.\n1.2 Segundo item.\n1.3 Terceiro item.");
    expect(detectNumberingGaps(nodes)[0]!.missing).toEqual(["1.1"]);
  });
  it("não acusa lacuna em texto completo", () => {
    expect(detectNumberingGaps(run(LEI_CF_ART5).nodes)).toEqual([]);
    expect(detectNumberingGaps(run(EDITAL_INLINE).nodes)).toEqual([]);
  });
});

describe("auditoria do planejamento", () => {
  const { norm, nodes, unassigned } = run(EDITAL_INLINE);
  const req = nodes.filter((n) => n.requiresDirectCoverage).map((n) => n.key);

  const fullPlan = (): LessonPlan => ({
    modules: [{
      key: "M1",
      title: "Módulo",
      lessons: [
        { key: "L1", title: "Aula 1", objective: "x", nodeKeys: req.slice(0, 5), supplementary: [], prerequisiteLessonKeys: [], estimatedMinutes: 30 },
        { key: "L2", title: "Aula 2", objective: "x", nodeKeys: req.slice(5), supplementary: [], prerequisiteLessonKeys: ["L1"], estimatedMinutes: 30 },
      ],
    }],
  });

  it("aprova plano que cobre todos os tópicos", () => {
    const r = auditPlan({ normalizedText: norm, nodes, unassigned, plan: fullPlan() });
    expect(r.summary.errors).toBe(0);
    expect(r.summary.structurallyComplete).toBe(true);
    expect(r.summary.plannedNodes).toBe(req.length);
  });

  it("detecta tópico omitido no planejamento", () => {
    const plan = fullPlan();
    const omitted = plan.modules[0]!.lessons[1]!.nodeKeys.pop()!;
    const r = auditPlan({ normalizedText: norm, nodes, unassigned, plan });
    const issue = r.issues.find((i) => i.code === "node_not_planned");
    expect(issue?.nodeKeys).toEqual([omitted]);
    expect(r.summary.structurallyComplete).toBe(false);
  });

  it("não aceita referência ao pai como cobertura dos filhos", () => {
    const t21 = nodes.find((n) => n.marker === "2.1")!;
    const plan = fullPlan();
    const subKeys = nodes.filter((n) => n.parentKey === t21.key).map((n) => n.key);
    for (const l of plan.modules[0]!.lessons) l.nodeKeys = l.nodeKeys.filter((k) => !subKeys.includes(k));
    plan.modules[0]!.lessons[1]!.nodeKeys.push(t21.key);
    const r = auditPlan({ normalizedText: norm, nodes, unassigned, plan });
    expect(r.issues.filter((i) => i.code === "node_not_planned")).toHaveLength(subKeys.length);
  });

  it("rejeita tópicos inventados e pré-requisitos fora de ordem", () => {
    const plan = fullPlan();
    plan.modules[0]!.lessons[0]!.nodeKeys.push("N9999");
    plan.modules[0]!.lessons[0]!.prerequisiteLessonKeys.push("L2");
    const codes = auditPlan({ normalizedText: norm, nodes, unassigned, plan }).issues.map((i) => i.code);
    expect(codes).toContain("unknown_node_reference");
    expect(codes).toContain("prerequisite_after_lesson");
  });

  it("compara aulas geradas com o planejado", () => {
    const plan = fullPlan();
    const l1 = plan.modules[0]!.lessons[0]!;
    const r = auditPlan({
      normalizedText: norm, nodes, unassigned, plan,
      generated: [{ lessonKey: "L1", taughtNodeKeys: l1.nodeKeys.slice(1), questionCount: 0 }],
    });
    const codes = r.issues.map((i) => i.code);
    expect(codes).toContain("planned_not_generated");
    expect(codes).toContain("lesson_without_questions");
  });

  it("sinaliza itens jurídicos para verificação externa", () => {
    const law = run(LEI_CF_ART5);
    const r = auditPlan({ normalizedText: law.norm, nodes: law.nodes, unassigned: law.unassigned });
    const v = r.issues.find((i) => i.code === "needs_external_verification")!;
    expect(v.severity).toBe("info");
    expect(v.nodeKeys.length).toBe(law.nodes.length);
  });

  it("corrige automaticamente órfãos e referências inválidas", () => {
    const plan = fullPlan();
    const l2 = plan.modules[0]!.lessons[1]!;
    const orphan = l2.nodeKeys.pop()!;
    l2.nodeKeys.push("N9999");
    const { plan: fixed, repairs } = autoRepairPlan(plan, nodes);
    expect(repairs.map((r) => r.action).sort()).toEqual(["assigned_orphan", "removed_unknown_reference"]);
    expect(repairs.find((r) => r.action === "assigned_orphan")!.nodeKey).toBe(orphan);
    const r = auditPlan({ normalizedText: norm, nodes, unassigned, plan: fixed });
    expect(r.summary.errors).toBe(0);
  });

  it("cria aula quando não há onde encaixar o órfão", () => {
    const empty: LessonPlan = { modules: [{ key: "M1", title: "M", lessons: [] }] };
    const { plan, repairs } = autoRepairPlan(empty, nodes);
    expect(repairs.some((r) => r.action === "created_lesson")).toBe(true);
    // Irmãos de um órfão já alocado vão para a mesma aula, em vez de uma aula cada.
    expect(repairs.every((r) => ["created_lesson", "assigned_orphan"].includes(r.action))).toBe(true);
    expect(plan.modules[0]!.lessons.length).toBeLessThan(nodes.filter((n) => n.requiresDirectCoverage).length);
    expect(auditPlan({ normalizedText: norm, nodes, unassigned, plan }).summary.errors).toBe(0);
  });
});

describe("cobertura", () => {
  const { nodes } = run(EDITAL_INLINE);
  const t21 = nodes.find((n) => n.marker === "2.1")!;
  const subs = nodes.filter((n) => n.parentKey === t21.key);

  it("não marca como coberto se parte do escopo não foi ensinada", () => {
    const facts = new Map(subs.slice(0, 2).map((s) => [s.key, { planned: true, taught: true }]));
    const cov = computeCoverage(nodes, facts);
    expect(cov.get(t21.key)!.status).toBe("incompleto");
    expect(cov.get(t21.key)!.scopeTaught).toBe(2);
    expect(cov.get(t21.key)!.scopeSize).toBe(4);
  });

  it("leitura não é domínio", () => {
    const facts = new Map(subs.map((s) => [s.key, { planned: true, taught: true }]));
    expect(computeCoverage(nodes, facts).get(t21.key)!.status).toBe("ensinado");
    const mastered = new Map(subs.map((s) => [s.key, { planned: true, taught: true, mastered: true, questionsAnswered: 3 }]));
    expect(computeCoverage(nodes, mastered).get(t21.key)!.status).toBe("dominado");
  });

  it("propaga informação não verificada para os ancestrais", () => {
    const facts = new Map([[subs[0]!.key, { verification: "pendente" as const }]]);
    const cov = computeCoverage(nodes, facts);
    expect(cov.get(t21.key)!.verification).toBe("pendente");
    expect(cov.get(t21.key)!.reasons.join(" ")).toMatch(/não verificada/);
  });
});

describe("artigos no formato do Planalto (Art. 10. / Art. 10 - O …)", () => {
  it("reconhece o artigo e não confunde a palavra inicial com sufixo de letra", async () => {
    const { extractStructure } = await import("./extract");
    const { normalizeContent } = await import("./normalize");
    const text = "Art. 10. O inquérito deverá terminar no prazo de 10 dias.\nArt. 12 - O inquérito policial acompanhará a denúncia.\nArt. 14-A Nos casos em que servidores.\nArt. 121-A. Matar a mulher.\n§ 2º-A (revogado).";
    const nodes = extractStructure(normalizeContent(text).normalized).nodes;
    expect(nodes.map((n) => [n.kind, n.marker])).toEqual([
      ["artigo", "Art. 10"],
      ["artigo", "Art. 12"],
      ["artigo", "Art. 14-A"],
      ["artigo", "Art. 121-A"],
      ["paragrafo", "§ 2º-A"],
    ]);
    expect(nodes[0]!.title).toMatch(/^O inquérito/);
  });
});
