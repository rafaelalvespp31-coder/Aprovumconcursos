import { describe, expect, it } from "vitest";
import { extractPractice } from "@/domain/content/practice";
import { applyEnrichment, buildEnrichPrompt, enrichStatus, parseEnrichment } from "./enrich";

const lesson = {
  title: "Equações",
  sections: [
    { kind: "introducao", title: "Visão geral: o que a modelagem representa", bodyMarkdown: "Modelar é traduzir o problema em equação.", nodeKeys: ["N0001"], module: "Visão geral" },
    { kind: "explicacao", title: "Equações do 2º grau: discriminante", bodyMarkdown: "Δ = b² − 4ac decide as raízes.", nodeKeys: ["N0002"], module: "Equações" },
    { kind: "resumo", title: "Resumo para revisão", bodyMarkdown: "| Pergunta | Resposta |\n|---|---|\n| Δ < 0? | Sem raiz real |", nodeKeys: ["N0001", "N0002"], module: "Revisão final" },
    { kind: "checklist", title: "Checklist", bodyMarkdown: "- [ ] Calcular Δ?", nodeKeys: [], module: "Revisão final" },
  ],
};

const reply = [
  "```",
  "=== EXEMPLOS VISUAIS ===",
  "--- SEÇÃO: Equações do 2º grau: discriminante ---",
  ":::exemplo",
  "Situação: Um terreno quadrado tem área 49 m².",
  "Pergunta: Qual o lado?",
  "Resposta: **7 m**; a raiz negativa não serve.",
  'Tirinha: [{"cenario": "obra", "legenda": "O mestre mede o terreno", "personagens": [{"p": "cidadao", "lado": "esq", "pose": "aponta", "humor": "serio"}]}]',
  "Carimbo: Só a raiz positiva | alerta",
  'Esquema: {"tipo": "fluxo", "passos": [{"rotulo": "x² = 49", "estado": "neutro"}, {"rotulo": "x = 7", "estado": "ok"}]}',
  ":::",
  "**--- SEÇÃO: Visão geral: o que a modelagem representa ---**",
  ":::exemplo",
  "Situação: Ana tem o dobro da idade de Bia.",
  "Pergunta: Como escrever?",
  "Resposta: a = 2b.",
  ":::",
  "=== FLASHCARDS ===",
  "**Δ negativo?**",
  "→ Nenhuma raiz real.",
  "",
  "**Δ zero?**",
  "→ Uma raiz dupla.",
  "",
  "**Δ positivo?**",
  "→ Duas raízes reais.",
  "",
  "**Fórmula de Δ?**",
  "→ b² − 4ac.",
  "```",
].join("\n");

describe("completar aula com exemplos visuais e flashcards", () => {
  it("o comando lista as seções sem exemplo e pede flashcards", () => {
    const p = buildEnrichPrompt("Equações", lesson);
    expect(enrichStatus(lesson)).toMatchObject({ teaching: 2, withExample: 0, flashcards: 0 });
    expect(p).toContain("1. Visão geral: o que a modelagem representa");
    expect(p).toContain("2. Equações do 2º grau: discriminante");
    expect(p).toContain("=== FLASHCARDS ===");
    expect(p).toContain("EXEMPLOS VISUAIS");
    expect(p).not.toContain("1. Resumo para revisão");
  });

  it("liga cada bloco à seção pelo título e põe os flashcards depois do resumo", () => {
    const r = parseEnrichment(reply, lesson);
    expect(r.errors).toEqual([]);
    expect(r.examples.map((e) => e.index).sort()).toEqual([0, 1]);
    expect(r.flashCount).toBe(4);
    expect(r.warnings.some((w) => w.includes("Visão geral") && w.includes("tirinha"))).toBe(true);
    const out = applyEnrichment(lesson, r);
    expect(out.sections).toHaveLength(5);
    expect(out.sections[3]).toMatchObject({ kind: "flashcards", title: "Flashcards de revisão", module: "Revisão final" });
    const c = extractPractice(out.sections[1]!.bodyMarkdown).cases[0]!;
    expect(c.strip?.length).toBe(1);
    expect(c.stamp?.tone).toBe("alerta");
    expect(extractPractice(out.sections[1]!.bodyMarkdown).body).toBe("Δ = b² − 4ac decide as raízes.");
    expect(enrichStatus(out)).toMatchObject({ withExample: 2, flashcards: 4 });
    expect(buildEnrichPrompt("Equações", out)).not.toContain("=== FLASHCARDS ===");
  });

  it("aponta título que não existe e bloco sem :::exemplo", () => {
    const r = parseEnrichment("--- SEÇÃO: Outra coisa ---\n:::exemplo\nSituação: a\nPergunta: b\nResposta: c\n:::\n--- SEÇÃO: Checklist ---\nsem bloco", lesson);
    expect(r.errors).toHaveLength(2);
    expect(r.errors[0]).toContain("não existe");
    expect(r.errors[1]).toContain(":::exemplo");
  });
});
