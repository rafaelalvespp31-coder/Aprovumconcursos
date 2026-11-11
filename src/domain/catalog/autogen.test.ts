import { describe, expect, it } from "vitest";
import { assemble, checkPart, cleanPart, partPrompt, planGeneration, progressOf } from "./autogen";
import { parseOutline } from "./topic-group";

const o = parseOutline("1. Inquérito Policial\n1.1 Conceito\n1.1.1 Natureza jurídica\n1.1.2 Características\n1.2 Instauração");
const g = o.groups[0]!;
const plan = planGeneration({ disciplineMode: "direito_processual_penal", group: g, sub: g.subtopics[0]! });

describe("geração automática por partes", () => {
  it("planeja cabeçalho, módulos, referências e os três níveis de questões", () => {
    const keys = plan.parts.map((p) => p.key);
    expect(keys[0]).toBe("cabecalho");
    expect(keys).toContain("referencias");
    expect(keys.filter((k) => k.startsWith("questoes-"))).toHaveLength(3);
    expect(plan.parts.filter((p) => p.kind === "modulo").length).toBeGreaterThanOrEqual(6);
    expect(plan.parts.find((p) => p.expect.flashcards)).toBeTruthy();
  });
  it("cada parte pede só o seu pedaço, com o texto-base e o que já foi escrito", () => {
    const p = partPrompt(plan, plan.parts[2]!, ["Cabeçalho e texto-base"], "final anterior");
    expect(p.prompt).toContain("1.1.1 Natureza jurídica");
    expect(p.prompt).toContain("JÁ ESCRITO");
    expect(p.prompt).toContain("final anterior");
    expect(p.system).toContain("ATUALIZAÇÃO");
  });
  it("limpa cercas e texto solto, e confere o mínimo da parte", () => {
    expect(cleanPart("Aqui está:\n```\n=== MÓDULO: X ===\n--- SEÇÃO: explicação | A ---\ntexto\n```", "modulo")).toMatch(/^=== MÓDULO: X/);
    const q = plan.parts.find((x) => x.level === "FÁCIL")!;
    const few = "=== QUESTÕES: FÁCIL ===\n--- QUESTÃO ---\nTipo: certo ou errado";
    expect(checkPart(q, few)[0]).toContain("1 de 12");
    const ok = "=== QUESTÕES: FÁCIL ===\n" + Array.from({ length: 12 }, () => "--- QUESTÃO ---\nTipo: certo ou errado").join("\n");
    expect(checkPart(q, ok)).toEqual([]);
  });
  it("o percentual nunca chega a 100% antes da validação final", () => {
    const texts = plan.parts.map(() => "x");
    expect(progressOf(plan.parts, texts).percent).toBe(99);
    expect(progressOf(plan.parts, plan.parts.map(() => null)).percent).toBe(0);
  });
  it("monta a aula na ordem das partes", () => {
    expect(assemble(["a", "b", " "])).toBe("a\n\nb\n");
  });
});
