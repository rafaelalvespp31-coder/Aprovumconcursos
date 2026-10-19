import { describe, expect, it } from "vitest";
import { assignSectionsToCards, buildLessonBoard, clip } from "./board";

const sections = [
  { id: "s1", kind: "introducao", title: "Introdução", body_markdown: "Homicídio é **matar outra pessoa**. Protege a vida humana.\n\n:::exemplo\nSituação: João atira em Pedro, que morre.\nPergunta: Que crime é?\nResposta: Homicídio consumado.\n:::" },
  { id: "s2", kind: "texto_legal", title: "Texto legal", body_markdown: "> Art. 121. Matar alguém:\n> Pena – reclusão, de seis a vinte anos." },
  { id: "s3", kind: "esquema", title: "Elementos", body_markdown: "- **Conduta**: ação ou omissão\n- **Resultado**: morte\n- **Nexo causal**: a conduta causou a morte" },
  { id: "s4", kind: "conceitos_fundamentais", title: "Termos", body_markdown: "- **Matar**: tirar a vida\n- **Alguém**: pessoa humana viva" },
  { id: "s5", kind: "quadro_comparativo", title: "Consumado × tentativa", body_markdown: "| | Consumado | Tentativa |\n|---|---|---|\n| Resultado | Morte ocorre | Morte não ocorre |" },
  { id: "s6", kind: "pegadinhas", title: "Pegadinhas", body_markdown: "- Não basta a morte. É preciso nexo causal.\n- Tentativa exige início da execução. Sem isso, não há crime tentado." },
  { id: "s7", kind: "resumo", title: "Resumo", body_markdown: "1. Matar alguém: pena de 6 a 20 anos.\n2. Tentativa: art. 14, II." },
];
const nodes = [
  { key: "N1", marker: "Art. 121", title: "Matar alguém" },
  { key: "N2", marker: null, title: "Título" },
];

describe("visão da aula (nove cards) a partir das seções reais", () => {
  it("separa título e base legal e destaca a última palavra", () => {
    const b = buildLessonBoard({ title: "Homicídio Simples (CP, art. 121)", sections, nodes });
    expect(b.title).toEqual({ lead: "Homicídio", highlight: "Simples" });
    expect(b.legalBasis).toBe("CP, art. 121");
    expect(b.mindmap.center).toBe("HOMICÍDIO SIMPLES");
  });

  it("monta cada card com o conteúdo da seção correspondente", () => {
    const b = buildLessonBoard({ title: "Homicídio Simples", sections, nodes });
    expect(b.concept?.markdown).toContain("**matar outra pessoa**");
    expect(b.concept?.example?.answer).toBe("Homicídio consumado.");
    expect(b.scheme.source).toBe("esquema");
    expect(b.scheme.items.map((i) => i.label)).toEqual(["Conduta", "Resultado", "Nexo causal"]);
    expect(b.law?.markdown).toContain("Art. 121");
    expect(b.law?.items[0]).toEqual({ marker: "Art. 121", text: "Matar alguém" });
    expect(b.glossary).toMatchObject({ source: "termos", rows: [["Matar", "tirar a vida"], ["Alguém", "pessoa humana viva"]] });
    expect(b.compare).toMatchObject({ panels: true, headers: ["", "Consumado", "Tentativa"] });
    expect(b.traps.items[0]).toEqual({ head: "Não basta a morte.", rest: "É preciso nexo causal." });
    expect(b.keyPoints).toEqual(["Matar alguém: pena de 6 a 20 anos.", "Tentativa: art. 14, II."]);
    expect(b.mindmap.branches.map((x) => x.label)).toEqual(["Conceito", "Elementos", "Lei", "Diferenças", "Exemplos", "Atenção"]);
  });

  it("matéria sem lei nem quadro: cards ficam vazios em vez de inventar", () => {
    const b = buildLessonBoard({ title: "Crase", sections: [{ id: "a", kind: "explicacao", title: "Explicação", body_markdown: "Crase é a fusão de duas vogais *a*." }], nodes: [] });
    expect(b.law).toBeNull();
    expect(b.compare).toBeNull();
    expect(b.glossary).toBeNull();
    expect(b.traps.items).toEqual([]);
    expect(b.scheme.source).toBe("temas");
    expect(b.title).toEqual({ lead: "", highlight: "Crase" });
  });

  it("clip corta em frase ou palavra", () => {
    expect(clip("Uma frase curta. Outra frase bem mais longa que passa do limite", 24)).toBe("Uma frase curta.");
    expect(clip("palavra ".repeat(10).trim(), 20)).toBe("palavra palavra…");
  });

  it("distribui todas as seções pelos cards, sem perder nenhuma", () => {
    const m = assignSectionsToCards([...sections, { id: "x", kind: "desconhecido", title: "X", body_markdown: "" }, { id: "f", kind: "flashcards", title: "F", body_markdown: "" }]);
    expect(m.get(1)!.map((s) => s.id)).toEqual(["s1", "x"]);
    expect(m.get(2)!.map((s) => s.id)).toEqual(["s3"]);
    expect(m.get(3)!.map((s) => s.id)).toEqual(["s2"]);
    expect(m.get(4)!.map((s) => s.id)).toEqual(["s4"]);
    expect(m.get(5)!.map((s) => s.id)).toEqual(["s5"]);
    expect(m.get(7)!.map((s) => s.id)).toEqual(["s6"]);
    expect(m.get(8)!.map((s) => s.id)).toEqual(["f"]);
    expect(m.get(9)!.map((s) => s.id)).toEqual(["s7"]);
    expect([...m.values()].flat()).toHaveLength(sections.length + 2);
  });
});
