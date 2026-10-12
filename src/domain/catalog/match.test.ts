import { describe, expect, it } from "vitest";
import { articleId, matchCatalog, normalizeText, parseLawReference, type CatalogTopicIndex } from "./match";

const art = (law: string, a: string): CatalogTopicIndex => ({ id: `${law}-${a}`, title: `${law} art. ${a}`, kind: "dispositivo", lawCode: law, articles: [a], aliases: [] });
const tema = (id: string, title: string, aliases: string[] = []): CatalogTopicIndex => ({ id, title, kind: "tema", lawCode: null, articles: [], aliases });

const catalog: CatalogTopicIndex[] = [
  ...Array.from({ length: 9 }, (_, i) => art("CP", String(121 + i))),
  art("CF", "5"),
  ...["1", "2", "3", "4", "5", "6", "7"].map((a) => art("L11340", a)),
  tema("flagrante", "Prisão em flagrante", ["flagrante delito", "prisao em flagrante delito"]),
  tema("poderes", "Poderes administrativos", ["poderes da administracao"]),
];

describe("referências de lei", () => {
  it("reconhece leis e artigos em formatos variados", () => {
    expect(parseLawReference("Art. 5º da Constituição Federal")).toEqual({ law: "CF", articles: ["5"] });
    expect(parseLawReference("Arts. 121 a 129 do Código Penal").articles).toEqual(["121", "122", "123", "124", "125", "126", "127", "128", "129"]);
    expect(parseLawReference("Lei Maria da Penha, arts. 1º a 7º")).toEqual({ law: "L11340", articles: ["1", "2", "3", "4", "5", "6", "7"] });
    expect(parseLawReference("CP, art. 121-A e 122")).toEqual({ law: "CP", articles: ["121-A", "122"] });
    expect(parseLawReference("artigos 33, 34 e 35 da lei 11.343").law).toBe("L11343");
    expect(parseLawReference("artigos 33, 34 e 35 da lei 11.343").articles).toEqual(["33", "34", "35"]);
    expect(parseLawReference("art 301 ao 310 do CPP")).toMatchObject({ law: "CPP" });
    expect(parseLawReference("Lei 9.999/2020, art. 2").law).toBe("L9999");
  });
  it("não confunde CP com CPP e normaliza artigo", () => {
    expect(parseLawReference("art. 302 do CPP").law).toBe("CPP");
    expect(articleId("005")).toBe("5");
    expect(articleId("121a")).toBe("121-A");
    expect(normalizeText("Prisão  em FLAGRANTE!")).toBe("prisao em flagrante");
  });
});

describe("busca no catálogo", () => {
  it("dispositivos: usa o catálogo só com cobertura total", () => {
    const r = matchCatalog("Arts. 121 a 129 do Código Penal", catalog);
    expect(r.kind).toBe("completo");
    expect(r.kind === "completo" && r.topics.map((t) => t.id)).toEqual(Array.from({ length: 9 }, (_, i) => `CP-${121 + i}`));
    const p = matchCatalog("Arts. 128 a 131 do CP", catalog);
    expect(p).toMatchObject({ kind: "parcial", missing: ["130", "131"] });
    expect(matchCatalog("Art. 1º da Lei 8.112", catalog).kind).toBe("nenhum");
  });
  it("temas: título, sinônimo ou frase que contém o tema", () => {
    expect(matchCatalog("Prisão em flagrante", catalog)).toMatchObject({ kind: "completo", topics: [{ id: "flagrante" }] });
    expect(matchCatalog("quero estudar flagrante delito", catalog)).toMatchObject({ kind: "completo", topics: [{ id: "flagrante" }] });
    expect(matchCatalog("poderes administrativos", catalog)).toMatchObject({ kind: "completo", topics: [{ id: "poderes" }] });
    expect(matchCatalog("Prisão preventiva", catalog).kind).toBe("nenhum");
    expect(matchCatalog("Atos administrativos", catalog).kind).toBe("nenhum");
  });
  it("dispositivos também são encontrados pelo nome ou sinônimo, sem citar o artigo", () => {
    const homicidio: CatalogTopicIndex = { id: "cp121", title: "Homicídio (CP, art. 121)", kind: "dispositivo", lawCode: "CP", articles: ["121"], aliases: ["homicídio", "homicídio qualificado"] };
    expect(matchCatalog("Homicídio", [homicidio])).toMatchObject({ kind: "completo", topics: [{ id: "cp121" }] });
    expect(matchCatalog("quero estudar homicídio qualificado", [homicidio])).toMatchObject({ kind: "completo" });
    expect(matchCatalog("Feminicídio", [homicidio]).kind).toBe("nenhum");
  });
  it("texto longo colado segue para a IA", () => {
    expect(matchCatalog(`Prisão em flagrante. ${"x ".repeat(200)}`, catalog).kind).toBe("nenhum");
  });
});

describe("intervalos com hífen", () => {
  it("121-129 é intervalo; 121-A é artigo", () => {
    expect(parseLawReference("CP arts. 121-123").articles).toEqual(["121", "122", "123"]);
    expect(parseLawReference("CP art. 121-A").articles).toEqual(["121-A"]);
  });
});
