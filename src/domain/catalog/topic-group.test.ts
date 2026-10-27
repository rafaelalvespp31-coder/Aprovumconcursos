import { describe, expect, it } from "vitest";
import { compareCodes, findCatalogFor, groupByTopic, groupHeaderLines, parseCodedTitle, parseOutline } from "./topic-group";

const ILICITUDE = `tópico: Ilicitude
4.1. Causas de exclusão da ilicitude

* 4.1.1. Conceito de ilicitude ou antijuridicidade.
* 4.1.2. Estado de necessidade.
* 4.1.3. Legítima defesa.
* 4.1.4. Estrito cumprimento do dever legal.
* 4.1.5. Exercício regular de direito.
* 4.1.6. Requisitos de cada causa de justificação.
* 4.1.7. Excesso nas causas de exclusão da ilicitude.
* 4.1.8. Diferença entre ilicitude e culpabilidade.

4.2. Excesso punível

* 4.2.1. Conceito de excesso punível.
* 4.2.2. Excesso doloso.
* 4.2.3. Excesso culposo.
* 4.2.4. Excesso intensivo e extensivo.
* 4.2.5. Excesso na legítima defesa.
* 4.2.6. Excesso no estado de necessidade.`;

describe("tópicos do edital", () => {
  it("lê número e título", () => {
    expect(parseCodedTitle("4. Ilicitude")).toEqual({ code: "4", title: "Ilicitude" });
    expect(parseCodedTitle("* 4.1.2. Estado de necessidade.")).toEqual({ code: "4.1.2", title: "Estado de necessidade" });
    expect(parseCodedTitle("4.1 - Causas de exclusão")).toEqual({ code: "4.1", title: "Causas de exclusão" });
    expect(parseCodedTitle("Ilicitude")).toEqual({ code: null, title: "Ilicitude" });
    expect(parseCodedTitle("  ")).toBeNull();
  });

  it("ordena como o edital (4.2 antes de 4.10)", () => {
    expect(["4.10", "4.2", "4.1", undefined, "3.9"].sort((a, b) => compareCodes(a, b))).toEqual(["3.9", "4.1", "4.2", "4.10", undefined]);
  });

  it("monta a árvore do sumário colado (exemplo real)", () => {
    const o = parseOutline(ILICITUDE);
    expect(o.warnings).toEqual([]);
    expect(o.groups).toHaveLength(1);
    const g = o.groups[0]!;
    expect(g).toMatchObject({ code: "4", title: "Ilicitude" });
    expect(g.subtopics.map((s) => [s.code, s.title, s.items.length])).toEqual([
      ["4.1", "Causas de exclusão da ilicitude", 8],
      ["4.2", "Excesso punível", 6],
    ]);
    expect(g.subtopics[0]!.items[1]).toEqual({ code: "4.1.2", title: "Estado de necessidade" });
    expect(groupHeaderLines(g, g.subtopics[1]!)).toEqual(["Tópico: 4. Ilicitude", "Subtópico: 4.2 Excesso punível"]);
  });

  it("aceita vários tópicos numerados e avisa o que falta", () => {
    const o = parseOutline("3. Tipicidade\n3.1 Conduta\n- Ação e omissão\n4. Ilicitude");
    expect(o.groups.map((g) => [g.code, g.title, g.subtopics.length])).toEqual([
      ["3", "Tipicidade", 1],
      ["4", "Ilicitude", 0],
    ]);
    expect(o.groups[0]!.subtopics[0]!.items).toEqual([{ code: null, title: "Ação e omissão" }]);
    expect(o.warnings.join(" ")).toContain("Ilicitude");
    expect(parseOutline("").warnings[0]).toContain("Não encontrei");
  });

  it("agrupa aulas por tópico na ordem do edital, avulsas no fim", () => {
    const a = (title: string, topicGroup: string | null, subtopicCode: string | null, topicGroupCode: string | null = null) => ({ title, topicGroup, subtopicCode, topicGroupCode });
    const groups = groupByTopic([a("Excesso punível", "Ilicitude", "4.2", "4"), a("Homicídio", null, null), a("Causas", "ilicitude", "4.1"), a("Conduta", "Tipicidade", "3.1", "3")]);
    expect(groups.map((g) => [g.title, g.items.map((i) => i.title)])).toEqual([
      ["Tipicidade", ["Conduta"]],
      ["Ilicitude", ["Causas", "Excesso punível"]],
      [null, ["Homicídio"]],
    ]);
  });

  it("encontra no catálogo a aula de cada subtópico", () => {
    const cat = [
      { id: "1", title: "Causas de exclusão da ilicitude", status: "publicado", topicGroup: "Ilicitude", subtopicCode: "4.1" },
      { id: "2", title: "Excesso punível", status: "rascunho", topicGroup: "ILICITUDE", subtopicCode: null },
      { id: "3", title: "Conduta", status: "publicado", topicGroup: null, subtopicCode: null },
    ];
    const g = { code: "4", title: "Ilicitude" };
    expect(findCatalogFor(g, { code: "4.1", title: "outro nome" }, cat)?.id).toBe("1");
    expect(findCatalogFor(g, { code: "4.2", title: "Excesso punível" }, cat)?.id).toBe("2");
    expect(findCatalogFor(g, { code: "4.3", title: "Conduta" }, cat)).toBeNull();
  });

  it("subtópicos de nome parecido são independentes (Extorsão × Extorsão mediante sequestro)", () => {
    const g = { code: "1", title: "Crimes contra o patrimônio" };
    const extorsao = { id: "e", title: "Extorsão", status: "publicado", topicGroup: "Crimes contra o patrimônio", subtopicCode: "1.3" };
    const sequestro = { id: "s", title: "Extorsão mediante sequestro", status: "publicado", topicGroup: "Crimes contra o patrimônio", subtopicCode: "1.4" };
    // Só uma catalogada: a outra continua pendente (com o botão Catalogar).
    expect(findCatalogFor(g, { code: "1.4", title: "Extorsão mediante sequestro" }, [extorsao])).toBeNull();
    expect(findCatalogFor(g, { code: "1.3", title: "Extorsão" }, [sequestro])).toBeNull();
    // As duas catalogadas: cada subtópico abre a sua própria aula.
    expect(findCatalogFor(g, { code: "1.3", title: "Extorsão" }, [sequestro, extorsao])?.id).toBe("e");
    expect(findCatalogFor(g, { code: "1.4", title: "Extorsão mediante sequestro" }, [extorsao, sequestro])?.id).toBe("s");
    // Sem número, só nome idêntico.
    const semNumero = { ...extorsao, subtopicCode: null };
    expect(findCatalogFor(g, { code: null, title: "Extorsão mediante sequestro" }, [semNumero])).toBeNull();
    expect(findCatalogFor(g, { code: null, title: "extorsao" }, [semNumero])?.id).toBe("e");
    // Mesmo nome, números diferentes: subtópicos diferentes.
    expect(findCatalogFor(g, { code: "2.3", title: "Extorsão" }, [extorsao])).toBeNull();
  });
});
