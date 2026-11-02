import { describe, expect, it } from "vitest";
import fixture from "../../../tests/fixtures/mind-map-homicidio.json";
import { acronymFor, buildMindMap, splitTitle } from "./mind-map";

describe("mapa mental", () => {
  const map = buildMindMap(fixture);

  it("separa título e dispositivo legal", () => {
    expect(splitTitle("Homicídio (CP, art. 121)")).toEqual({ title: "Homicídio", subtitle: "CP – art. 121" });
    expect(splitTitle("Atos administrativos")).toEqual({ title: "Atos administrativos", subtitle: null });
    expect(map.title).toBe("Homicídio");
  });

  it("monta os blocos do esquema com a pena", () => {
    expect(map.blocks[0]).toEqual({ title: "Caput", detail: "Matar alguém (homicídio simples)", value: "Reclusão de 6 a 20 anos" });
    expect(map.blocks.find((b) => b.title === "§ 3º")?.value).toBe("Detenção de 1 a 3 anos");
  });

  it("cria mnemônico pelas iniciais de uma lista de termos e ignora exemplos/tirinhas", () => {
    expect(map.mnemonics[0]).toMatchObject({ acronym: "CMDIFP", label: "Classificação doutrinária" });
    expect(map.mnemonics[0]!.terms).toEqual(["comum", "material", "de dano", "instantâneo de efeitos permanentes", "de forma livre", "plurissubsistente"]);
    expect(JSON.stringify(map)).not.toMatch(/Tirinha|cenario|Carimbo/);
  });

  it("acronymFor exige de 3 a 7 termos com letras", () => {
    expect(acronymFor(["Torpe", "Cruel", "Covarde", "Recurso", "Crime"])).toBe("TCCRC");
    expect(acronymFor(["a", "b"])).toBeNull();
    expect(acronymFor(["§ 1º", "texto", "outro"])).toBeNull();
  });

  it("resumo, pegadinhas, o que lembrar, introdução, dica e módulos", () => {
    expect(map.summary[0]).toEqual({ q: "Pena do homicídio simples?", a: "6 a 20 anos de reclusão" });
    expect(map.traps[0]).toEqual({ claim: "O feminicídio é qualificadora do inciso VI do § 2º.", truth: "Errado desde a Lei 14.994/2024: é o crime autônomo do art. 121-A." });
    expect(map.remember[0]).toBe("Dizer a pena do caput, do § 2º, do § 2º-D e do § 3º sem consultar");
    expect(map.intro).toMatch(/^Tipo objetivo: a conduta matar/);
    expect(map.tip).toMatch(/^usar veneno ou fogo/);
    expect(map.modules.map((m) => m.title)).toEqual(["Visão geral e lei seca", "O crime de homicídio", "Doutrina, jurisprudência e bancas", "Revisão final"]);
  });
});

describe("mapa mental sem esquema", () => {
  it("usa o quadro comparativo como blocos principais", () => {
    const map = buildMindMap({
      title: "Memórias do computador",
      sections: [{ kind: "quadro_comparativo", title: "RAM × ROM", body: "| Memória | Volátil? | Uso |\n|---|---|---|\n| **RAM** | Sim | Programas em execução |\n| **ROM** | Não | Firmware |" }],
    });
    expect(map.blocks).toEqual([
      { title: "RAM", detail: "Sim", value: "Programas em execução" },
      { title: "ROM", detail: "Não", value: "Firmware" },
    ]);
    expect(map.comparisons).toEqual([]);
  });
});
