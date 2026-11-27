import { describe, expect, it } from "vitest";
import { casaCompleta, colocarNaCasa, conferir, exercicioAleatorio, mdcDe, mmcDe, montarEsqueleto, passosMdc, passosMmc, ROTULOS, textoDaCasa, tiposDaAula, validarNums, type Esqueleto, type TipoEsqueleto } from "./quadro-esqueleto";
import type { Item, Medidor } from "./quadro-motor";

const med: Medidor = () => ({ asc: 0.7, desc: 0, w: 0.6 });
const TIPOS = Object.keys(ROTULOS) as TipoEsqueleto[];
const resolver = (e: Esqueleto): Item[] => e.casas.reduce<Item[]>((it, c) => colocarNaCasa(it, c, c.esperado, "azul", med, e.size), []);

describe("esqueletos da lousa", () => {
  it("MMC e MDC: passos e resultado", () => {
    expect(passosMmc([12, 18]).primos).toEqual([2, 2, 3, 3]);
    expect(passosMdc([12, 18]).primos).toEqual([2, 3]);
    expect(mmcDe([6, 8, 9])).toBe(72);
    expect(mdcDe([18, 27, 36])).toBe(9);
    expect(passosMdc([8, 9]).primos).toEqual([]);
  });
  it("todos os tipos: monta, tem passos com casas e a resposta confere", () => {
    for (const t of TIPOS) for (let k = 0; k < 12; k++) {
      const nums = exercicioAleatorio(t);
      expect(validarNums(t, nums), `${t} ${nums}`).toBeNull();
      const e = montarEsqueleto(t, nums, 360, med, 340);
      expect(e.passos.length, t).toBeGreaterThan(0);
      expect(e.passos.every((p) => p.casas.length > 0 && p.texto && p.porque && p.dica), t).toBe(true);
      expect(e.casas.length, t).toBe(e.passos.reduce((s, p) => s + p.casas.length, 0));
      const it = resolver(e);
      expect(conferir(it, e).every(Boolean), `${t} ${nums}`).toBe(true);
      expect(e.casas.every((c) => casaCompleta(it, c))).toBe(true);
      // tudo cabe na largura do celular
      const xs = e.casas.flatMap((c) => [c.x0, c.x1]);
      expect(Math.min(...xs), t).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs), t).toBeLessThanOrEqual(360);
    }
  });
  it("respostas finais corretas", () => {
    expect(montarEsqueleto("soma", [478, 356], 360, med).resposta).toBe("478 + 356 = 834");
    expect(montarEsqueleto("sub", [532, 187], 360, med).resposta).toBe("532 − 187 = 345");
    expect(montarEsqueleto("mult", [23, 45], 360, med).resposta).toBe("23 × 45 = 1035");
    expect(montarEsqueleto("div", [756, 6], 360, med).resposta).toBe("756 ÷ 6 = 126");
    expect(montarEsqueleto("div", [2105, 5], 360, med).resposta).toBe("2105 ÷ 5 = 421");
    expect(montarEsqueleto("frac", [1, 2, 1, 3], 360, med).resposta).toBe("1/2 + 1/3 = 5/6");
    expect(montarEsqueleto("frac", [1, 4, 1, 4], 360, med).resposta).toContain("1/2");
    expect(montarEsqueleto("pct", [80, 15], 360, med).resposta).toBe("15% de 80 = 12");
    expect(montarEsqueleto("regra3", [3, 12, 7], 360, med).resposta).toBe("x = 28");
    expect(montarEsqueleto("eq1", [3, 5, 20], 360, med).resposta).toBe("x = 5");
    expect(montarEsqueleto("media", [5, 8, 7, 10], 360, med).resposta).toBe("Média = 7,5");
  });
  it("conferência detecta casa errada e aceita a forma alternativa da divisão", () => {
    const e = montarEsqueleto("mult", [23, 45], 360, med);
    let it = resolver(e);
    it = colocarNaCasa(it, e.casas[0]!, "7", "azul", med, e.size);
    expect(conferir(it, e)[0]).toBe(false);
    expect(textoDaCasa(it, e.casas[0]!)).toBe("7");
    const d = montarEsqueleto("div", [2105, 5], 360, med);
    const alt = d.casas.find((c) => c.alt)!;
    expect(conferir(colocarNaCasa([], alt, alt.alt!, "azul", med, d.size), d)[alt.id]).toBe(true);
  });
  it("aulas escolhem os tipos certos", () => {
    expect(tiposDaAula("MMC e MDC")[0]).toBe("mmc");
    expect(tiposDaAula("Regra de três e proporção")[0]).toBe("regra3");
    expect(tiposDaAula("Equações")[0]).toBe("eq1");
    expect(tiposDaAula("Matemática")).toContain("div");
  });
  it("valida números digitados", () => {
    expect(validarNums("sub", [5, 9])).not.toBeNull();
    expect(validarNums("regra3", [3, 10, 7])).not.toBeNull();
    expect(validarNums("mmc", [12, 18])).toBeNull();
  });
});
