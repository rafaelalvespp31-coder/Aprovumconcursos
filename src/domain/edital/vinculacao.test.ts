import { describe, expect, it } from "vitest";
import { buildIndex, matchTopic, type CatalogEntry } from "./match";

const e = (id: string, title: string, mode: string, group: string | null): CatalogEntry => ({ id, title, aliases: [], mode, group, lawCode: null, articles: [] });
const CAT: CatalogEntry[] = [
  e("ld", "Legítima defesa: conceito, requisitos e modalidades", "direito_penal", "Ilicitude ou Antijuridicidade"),
  e("en", "Estado de necessidade: conceito, requisitos e espécies", "direito_penal", "Ilicitude ou Antijuridicidade"),
  e("pr-pen", "Prisão em flagrante", "direito_penal", "Prisão e liberdade"),
  e("pr-proc", "Prisão em flagrante", "direito_processual_penal", "Prisões cautelares"),
  e("pc", "Princípio da legalidade", "direito_penal", "Princípios do Direito Penal"),
  e("cf", "Princípio da legalidade", "direito_administrativo", "Princípios da Administração Pública"),
];
const idx = buildIndex(CAT);

describe("vinculação do edital com o catálogo", () => {
  it("1. nomes exatamente iguais", () => {
    const r = matchTopic(idx, "Legítima defesa: conceito, requisitos e modalidades", "direito_penal", "Ilicitude ou Antijuridicidade");
    expect(r.status).toBe("completa");
    expect(r.links[0]!.catalogId).toBe("ld");
  });
  it("2. numeração diferente", () => {
    for (const t of ["4.5 Legítima defesa: conceito, requisitos e modalidades", "IV.5. Legítima defesa: conceito, requisitos e modalidades", "7.2.1 Legítima defesa: conceito, requisitos e modalidades"]) {
      expect(matchTopic(idx, t.replace(/^[\dIVX.]+\s*/, ""), "direito_penal", "4. Ilicitude").links[0]?.catalogId).toBe("ld");
    }
  });
  it("3. acentuação, caixa e pontuação", () => {
    const r = matchTopic(idx, "LEGITIMA DEFESA – CONCEITO,  REQUISITOS E MODALIDADES.", "direito_penal", "Ilicitude");
    expect(r.status).toBe("completa");
    expect(r.links[0]!.catalogId).toBe("ld");
  });
  it("4. pequenas variações na descrição", () => {
    const r = matchTopic(idx, "Legítima defesa (conceito, requisitos e modalidades)", "direito_penal", "Ilicitude ou antijuridicidade");
    expect(r.links[0]!.catalogId).toBe("ld");
    expect(["completa", "parcial"]).toContain(r.status);
  });
  it("5. parcialmente catalogado: liga o que existe e deixa o resto pendente", () => {
    const r = matchTopic(idx, "Legítima defesa; Estado de necessidade; Estrito cumprimento do dever legal", "direito_penal", "Ilicitude");
    expect(r.status).toBe("parcial");
    expect(r.links.map((l) => l.catalogId).sort()).toEqual(["en", "ld"]);
  });
  it("6. conteúdo inexistente: não inventa e não liga a algo só parecido", () => {
    expect(matchTopic(idx, "Estrito cumprimento do dever legal", "direito_penal", "Ilicitude").status).toBe("nao_encontrado");
    expect(matchTopic(idx, "Exercício regular de direito", "direito_penal", "Ilicitude").status).toBe("nao_encontrado");
  });
  it("7. nomes iguais em matérias ou contextos diferentes: cada um liga ao seu", () => {
    expect(matchTopic(idx, "Prisão em flagrante", "direito_penal", "Prisão").links[0]!.catalogId).toBe("pr-pen");
    expect(matchTopic(idx, "Prisão em flagrante", "direito_processual_penal", "Prisões").links[0]!.catalogId).toBe("pr-proc");
    expect(matchTopic(idx, "Princípio da legalidade", "direito_administrativo", "Princípios da Administração").links[0]!.catalogId).toBe("cf");
    expect(matchTopic(idx, "Princípio da legalidade", "direito_penal", "Princípios").links[0]!.catalogId).toBe("pc");
  });
  it("7b. contexto sem relação com o do catálogo nunca vira 'completa' por semelhança", () => {
    const parcial = buildIndex([e("x", "Legítima defesa putativa e erro", "direito_penal", "Culpabilidade")]);
    const r = matchTopic(parcial, "Legítima defesa e erro", "direito_penal", "Ilicitude");
    expect(r.status).not.toBe("completa");
  });
  it("8. reenvio do mesmo edital: mesmo resultado, sem vínculos repetidos", () => {
    const a = matchTopic(idx, "Legítima defesa; Estado de necessidade", "direito_penal", "Ilicitude");
    const b = matchTopic(idx, "Legítima defesa; Estado de necessidade", "direito_penal", "Ilicitude");
    expect(b).toEqual(a);
    expect(new Set(a.links.map((l) => l.catalogId)).size).toBe(a.links.length);
  });
});

describe("palavras genéricas não ligam aulas de outro assunto", () => {
  const filler = Array.from({ length: 60 }, (_, i) => e(`f${i}`, `Crimes contra assunto${i} qualquer${i}`, "direito_penal", "Crimes contra o patrimônio"));
  const cat = buildIndex([
    ...filler,
    { ...e("furto", "Furto", "direito_penal", "Crimes contra o patrimônio"), aliases: ["crimes contra o patrimônio"] },
  ]);
  it("'Crimes contra a dignidade sexual' não vira Furto", () => {
    const r = matchTopic(cat, "Crimes contra a dignidade sexual", "direito_penal", "Direito Penal");
    expect(r.links.map((l) => l.catalogId)).not.toContain("furto");
  });
  it("'Crimes contra a fé pública' também não vira Furto", () => {
    const r = matchTopic(cat, "Crimes contra a fé pública", "direito_penal", "Direito Penal");
    expect(r.links.map((l) => l.catalogId)).not.toContain("furto");
  });
  it("'Furto' continua ligando", () => {
    expect(matchTopic(cat, "Furto", "direito_penal", null).links[0]!.catalogId).toBe("furto");
  });
});
