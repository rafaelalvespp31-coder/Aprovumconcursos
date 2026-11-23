import { describe, expect, it } from "vitest";
import { agruparCatalogo } from "./materias";

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
