import { describe, expect, it } from "vitest";
import { extractPractice } from "@/domain/content/practice";
import { applyEnrichment, parseEnrichment } from "./enrich";
import { autoFixEnrichment, normalizeFlashcards } from "./enrich-fix";

const lesson = {
  sections: [
    { kind: "introducao", title: "Visão geral do inquérito policial", bodyMarkdown: "Texto.", nodeKeys: ["N0001"], module: "A" },
    { kind: "explicacao", title: "Características do inquérito", bodyMarkdown: "Texto.", nodeKeys: ["N0002"], module: "A" },
    { kind: "resumo", title: "Resumo para revisão", bodyMarkdown: "Resumo.", nodeKeys: ["N0001"], module: "B" },
  ],
};

const messy = [
  "Claro! Aqui estão:",
  "```",
  "### EXEMPLOS VISUAIS",
  "**SEÇÃO: Visao geral do inquerito**",
  "Situação: Um delegado instaura inquérito por portaria.",
  "Pergunta: Pode?",
  "Resposta: **Sim**, de ofício.",
  "Tirinha: [{“cenario”: “delegacia”, “legenda”: “O delegado assina”, “personagens”: [{“p”: “delegada”, “lado”: “centro”, “pose”: “falando”, “humor”: “serio”}],}]",
  "Carimbo: Pode | ok",
  "Esquema: {",
  '  "tipo": "fluxo",',
  '  "passos": [{"rotulo": "Notícia do crime", "estado": "ok"}, {"rotulo": "Portaria", "estado": "certo"}]',
  "}",
  "— SEÇÃO: Seção que não existe —",
  ":::exemplo",
  "Situação: x",
  "Resposta: y",
  ":::",
  "## Flashcards",
  "1. Quem preside o inquérito? — O delegado de polícia.",
  "2. O inquérito é obrigatório? — Não, é dispensável.",
  "Pergunta: É sigiloso?",
  "Resposta: Sim, em regra.",
  "P: Admite contraditório pleno?",
  "R: Não.",
  "```",
].join("\n");

describe("autocorreção dos exemplos visuais e flashcards", () => {
  it("conserta cabeçalhos, título parecido, bloco sem :::, JSON e flashcards", () => {
    expect(parseEnrichment(messy, lesson).errors.length).toBeGreaterThan(0);
    const r = autoFixEnrichment(messy, lesson);
    expect(r.errors).toEqual([]);
    const p = parseEnrichment(r.text, lesson);
    expect(p.examples).toHaveLength(1);
    expect(p.examples[0]!.title).toBe("Visão geral do inquérito policial");
    expect(p.flashCount).toBe(4);
    const out = applyEnrichment(lesson, p);
    const c = extractPractice(out.sections[0]!.bodyMarkdown).cases[0]!;
    expect(c.strip?.[0]?.personagens[0]).toMatchObject({ p: "delegado", pose: "fala" });
    expect(c.scheme).toMatchObject({ tipo: "fluxo" });
    expect(r.applied.some((a) => a.includes("não existe na aula"))).toBe(true);
    expect(r.applied.some((a) => a.includes("tirinha consertada"))).toBe(true);
  });

  it("flashcards em formatos variados viram **pergunta** → resposta", () => {
    const n = normalizeFlashcards("**Quem preside?**\nO delegado.\n\nQ: Sigiloso?\nA: Sim.");
    expect(n).toBe("**Quem preside?**\n→ O delegado.\n\n**Sigiloso?**\n→ Sim.");
  });
});
