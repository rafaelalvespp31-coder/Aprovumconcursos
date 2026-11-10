import { describe, expect, it } from "vitest";
import { compareLawHashes, extractLawRefs, hashLawText } from "@/domain/catalog/law-refs";

describe("extractLawRefs", () => {
  it("junta o cadastro do tema com as citações do texto, por lei", () => {
    const refs = extractLawRefs({
      law_code: "CF",
      articles: ["144"],
      texts: ["Segurança pública: art. 144 da CF.", "Ver também arts. 121 a 123 do Código Penal."],
    });
    const cf = refs.find((r) => r.law === "CF");
    const cp = refs.find((r) => r.law === "CP");
    expect(cf?.articles).toContain("144");
    expect(cp?.articles).toEqual(expect.arrayContaining(["121", "122", "123"]));
  });
  it("ignora leis sem fonte oficial e temas sem artigo", () => {
    expect(extractLawRefs({ law_code: null, articles: [], texts: ["Texto livre sem citação."] })).toEqual([]);
    expect(extractLawRefs({ law_code: "L99999", articles: ["1"], texts: [] })).toEqual([]);
  });
});

describe("compareLawHashes", () => {
  const a = { "CF:144": hashLawText("Art. 144 antigo") };
  it("primeira conferência vira base, nunca 'desatualizado'", () => {
    expect(compareLawHashes(null, a, []).status).toBe("baseline");
  });
  it("redação igual = ok; diferente = desatualizado com o artigo", () => {
    expect(compareLawHashes(a, a, []).status).toBe("ok");
    const novo = { "CF:144": hashLawText("Art. 144 novo, com polícia municipal") };
    const r = compareLawHashes(a, novo, []);
    expect(r.status).toBe("desatualizado");
    expect(r.changed).toEqual(["CF:144"]);
  });
  it("artigo que sumiu do texto oficial conta como mudança", () => {
    const r = compareLawHashes(a, {}, ["CF:144"]);
    expect(r.status).toBe("desatualizado");
  });
  it("espaços diferentes não mudam o hash", () => {
    expect(hashLawText("Art.  144   x")).toBe(hashLawText("Art. 144 x"));
  });
  it("sem lei citada", () => {
    expect(compareLawHashes(null, {}, []).status).toBe("sem_referencia");
  });
});
