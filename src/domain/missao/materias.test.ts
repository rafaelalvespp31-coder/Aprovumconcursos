import { describe, expect, it } from "vitest";
import { agruparCatalogo, dividirPorGrupo, fatiasDeAssuntos, filtrarMaterias, grupoDaMateria, type MateriaCatalogo } from "./materias";

describe("agruparCatalogo", () => {
  const nomes: Record<string, string> = { a: "Direito Penal", b: "Informática" };
  it("agrupa por matéria e assunto, do maior para o menor", () => {
    const r = agruparCatalogo(
      [
        { discipline_mode: "a", topic_group: "Crimes" },
        { discipline_mode: "a", topic_group: "Crimes" },
        { discipline_mode: "a", topic_group: "Penas" },
        { discipline_mode: "b", topic_group: null },
      ],
      (s) => nomes[s],
    );
    expect(r).toEqual([
      { slug: "a", nome: "Direito Penal", aulas: 3, assuntos: [{ titulo: "Crimes", aulas: 2 }, { titulo: "Penas", aulas: 1 }] },
      { slug: "b", nome: "Informática", aulas: 1, assuntos: [{ titulo: "Aulas avulsas", aulas: 1 }] },
    ]);
  });
  it("matéria sem rótulo vira 'Outras matérias'", () => {
    expect(agruparCatalogo([{ discipline_mode: "x", topic_group: "G" }], () => undefined)[0]!.nome).toBe("Outras matérias");
  });
});

const m = (slug: string, nome: string, assuntos: string[]): MateriaCatalogo => ({ slug, nome, aulas: assuntos.length, assuntos: assuntos.map((t) => ({ titulo: t, aulas: 1 })) });

describe("grupos e busca", () => {
  it("separa básicas e específicas", () => {
    expect(grupoDaMateria("lingua_portuguesa")).toBe("basicas");
    expect(grupoDaMateria("informatica")).toBe("basicas");
    expect(grupoDaMateria("direito_penal")).toBe("especificas");
    expect(grupoDaMateria("ctb_codigo_de_transito_brasileiro")).toBe("especificas");
    expect(grupoDaMateria("qualquer_nova")).toBe("especificas");
    const g = dividirPorGrupo([m("matematica", "Matemática", ["a"]), m("direito_penal", "Direito Penal", ["b"])]);
    expect(g.basicas.map((x) => x.slug)).toEqual(["matematica"]);
    expect(g.especificas.map((x) => x.slug)).toEqual(["direito_penal"]);
  });
  it("busca pelo nome ou por assunto, sem acento e em qualquer ordem", () => {
    const todas = [m("lingua_portuguesa", "Língua Portuguesa", ["Sintaxe", "Crase"]), m("direito_penal", "Direito Penal", ["Crimes contra a pessoa"])];
    expect(filtrarMaterias(todas, "").length).toBe(2);
    expect(filtrarMaterias(todas, "LINGUA").map((x) => x.slug)).toEqual(["lingua_portuguesa"]);
    expect(filtrarMaterias(todas, "pessoa crimes").map((x) => x.slug)).toEqual(["direito_penal"]);
    expect(filtrarMaterias(todas, "crase penal")).toEqual([]);
  });
  it("fatias da barra somam 1 e juntam o resto", () => {
    const f = fatiasDeAssuntos(Array.from({ length: 10 }, (_, i) => ({ titulo: `t${i}`, aulas: 1 })), 7);
    expect(f.length).toBe(8);
    expect(f.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
    expect(fatiasDeAssuntos([], 7)).toEqual([]);
  });
});
