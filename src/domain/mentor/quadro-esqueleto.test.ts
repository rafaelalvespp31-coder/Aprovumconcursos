import { describe, expect, it } from "vitest";
import { colocarNaCasa, conferir, exercicioAleatorio, mmcDe, montarEsqueleto, passosMmc, textoDaCasa } from "./quadro-esqueleto";
import type { Item, Medidor } from "./quadro-motor";

const med: Medidor = () => ({ asc: 0.7, desc: 0, w: 0.6 });

describe("esqueletos da lousa", () => {
  it("MMC: passos e resultado", () => {
    expect(passosMmc([12, 18]).primos).toEqual([2, 2, 3, 3]);
    expect(passosMmc([12, 18]).linhas.at(-1)).toEqual([1, 1]);
    expect(mmcDe([12, 18])).toBe(36);
    expect(mmcDe([6, 8, 9])).toBe(72);
  });
  it("monta o dispositivo do MMC e confere o preenchimento", () => {
    const e = montarEsqueleto("mmc", [12, 18], 360, med);
    // 4 linhas de números (2 casas) + 4 primos + resultado
    expect(e.casas.length).toBe(4 * 2 + 4 + 1);
    let itens: Item[] = [];
    expect(conferir(itens, e).every((x) => !x)).toBe(true);
    for (const c of e.casas) itens = colocarNaCasa(itens, c, c.esperado, "azul", med, e.size);
    expect(conferir(itens, e).every(Boolean)).toBe(true);
    // errou uma casa
    const c0 = e.casas[0]!;
    itens = colocarNaCasa(itens, c0, "7", "azul", med, e.size);
    expect(conferir(itens, e)[0]).toBe(false);
    expect(textoDaCasa(itens, c0)).toBe("7");
  });
  it("multiplicação armada: parciais deslocadas e total", () => {
    const e = montarEsqueleto("mult", [23, 45], 360, med);
    expect(e.casas.map((c) => c.esperado)).toEqual(["115", "92", "1035"]);
    expect(e.casas[1]!.slots).toBe(e.casas[0]!.slots - 1);
    const um = montarEsqueleto("mult", [23, 5], 360, med);
    expect(um.casas.map((c) => c.esperado)).toEqual(["115"]);
  });
  it("cabe na largura do celular", () => {
    for (const nums of [[6, 8, 9], [12, 15, 20]]) {
      const e = montarEsqueleto("mmc", nums, 340, med);
      const xs = e.casas.flatMap((c) => [c.x0, c.x1]);
      expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs)).toBeLessThanOrEqual(340);
    }
  });
  it("exercício aleatório", () => {
    expect(exercicioAleatorio("mmc").length).toBeGreaterThanOrEqual(2);
    expect(exercicioAleatorio("mult")).toHaveLength(2);
  });
});
