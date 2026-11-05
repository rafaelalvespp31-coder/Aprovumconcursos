import { describe, expect, it } from "vitest";
import { UFS, bucketOf, byUf, countBuckets } from "./concursos";

describe("concursos", () => {
  it("tem os 26 estados e o DF", () => {
    expect(UFS).toHaveLength(27);
    expect(new Set(UFS.map(([u]) => u)).size).toBe(27);
  });
  it("agrupa a situação", () => {
    expect(bucketOf("inscricoes_abertas")).toBe("abertos");
    expect(bucketOf("edital_publicado")).toBe("andamento");
    expect(bucketOf("inscricoes_encerradas")).toBe("andamento");
    expect(bucketOf("prova_realizada")).toBe("concluidos");
    expect(bucketOf("previsto")).toBe("embreve");
    expect(bucketOf("autorizado")).toBe("embreve");
  });
  it("conta e separa por estado", () => {
    const l = [{ status: "previsto", uf: "MG" }, { status: "inscricoes_abertas", uf: "MG" }, { status: "encerrado", uf: "SP" }, { status: "previsto" }];
    expect(countBuckets(l)).toEqual({ abertos: 1, andamento: 0, concluidos: 1, embreve: 2 });
    expect(byUf(l).get("MG")).toHaveLength(2);
    expect(byUf(l).has("RJ")).toBe(false);
  });
});

import { inferUf } from "./concursos";
describe("inferUf", () => {
  it("acha o estado pelo nome ou pela sigla", () => {
    expect(inferUf("PC MG", "Policia Civil do Estado de Minas Gerais")).toBe("MG");
    expect(inferUf("Prefeitura de Natal", "Rio Grande do Norte")).toBe("RN");
    expect(inferUf("Polícia Penal do Mato Grosso do Sul")).toBe("MS");
  });
  it("não chuta quando é nacional ou ambíguo", () => {
    expect(inferUf("PRF 2027", "Polícia Rodoviária Federal")).toBeNull();
    expect(inferUf("Consórcio SP e MG")).toBeNull();
  });
});
