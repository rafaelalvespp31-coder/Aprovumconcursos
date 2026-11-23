import { describe, expect, it } from "vitest";
import { resumirMaterias } from "./materias";

describe("resumirMaterias", () => {
  it("conta tópicos e os que têm aula, na ordem das matérias", () => {
    const r = resumirMaterias(
      [{ id: "a", name: "Português" }, { id: "b", name: "Informática" }, { id: "c", name: "Vazia" }],
      [
        { discipline_id: "a", match_status: "completa" },
        { discipline_id: "a", match_status: "nao_encontrado" },
        { discipline_id: "b", match_status: "parcial" },
        { discipline_id: "b", match_status: "conferencia" },
        { discipline_id: "b", match_status: null },
      ],
    );
    expect(r).toEqual([
      { id: "a", nome: "Português", total: 2, comAula: 1 },
      { id: "b", nome: "Informática", total: 3, comAula: 2 },
    ]);
  });
});
