import { describe, expect, it } from "vitest";
import { esquemasDe, fimTempo, novoCtx } from "./esquemas";

describe("esquemas desenhados", () => {
  it("tabela de MMC", () => {
    const c = novoCtx("exemplo de mmc no quadro");
    const [d] = esquemasDe("Vamos achar o MMC de 12 e 18", c);
    const tx = d!.rabisco!.filter((x) => x.t === "texto").map((x) => (x as { s: string }).s);
    expect(tx).toContain("= 36");
    expect(d!.rabisco!.length).toBeLessThanOrEqual(48);
  });
  it("MDC usa só os primos comuns", () => {
    const [d] = esquemasDe("MDC de 12 e 18", novoCtx(""));
    expect((d!.rabisco!.filter((x) => x.t === "texto") as { s: string }[]).map((x) => x.s)).toContain("= 6");
  });
  it("conta armada, divisão, fração e porcentagem", () => {
    expect(esquemasDe("234 mais 158", novoCtx(""))[0]?.rabisco?.some((x) => x.t === "texto" && x.s === "392")).toBe(true);
    expect(esquemasDe("145 dividido por 4", novoCtx(""))[0]?.rabisco?.some((x) => x.t === "texto" && x.s === "36")).toBe(true);
    expect(esquemasDe("Pegue 3/4 da pizza", novoCtx(""))[0]?.rabisco?.filter((x) => x.t === "ret")).toHaveLength(4);
    expect(esquemasDe("40% do total", novoCtx(""))[0]?.rabisco?.filter((x) => x.t === "ret" && x.cor === "vermelho")).toHaveLength(4);
  });
  it("linha do tempo com os anos citados", () => {
    const c = novoCtx("");
    expect(esquemasDe("Em 1822 veio a Independência", c)).toEqual([]);
    esquemasDe("Em 1889 foi proclamada a República", c);
    const [d] = fimTempo(c);
    expect(d!.rabisco!.filter((x) => x.t === "circ")).toHaveLength(2);
  });
  it("não desenha conta armada dentro de equação com x", () => {
    expect(esquemasDe("5 vezes x é igual a 8 vezes 20", novoCtx(""))).toEqual([]);
  });
});

import { materiaDe, listaDe, etapaDe } from "./esquemas-materias";
describe("esquemas por matéria", () => {
  const casos: [string, string][] = [
    ["Isso é o iter criminis", "iter"], ["a pirâmide de Kelsen", "kelsen"], ["a separação dos poderes", "poderes"], ["os princípios da administração", "limpe"],
    ["o modelo OSI", "osi"], ["um megabyte tem 1024 kilobytes", "bytes"], ["as infrações gravíssimas valem 7 pontos", "inf"], ["os blocos econômicos", "blocos"],
    ["a tabela-verdade da conjunção", "tv"], ["juros compostos", "jc"], ["Bhaskara", "bh"], ["um triângulo de base 6 e altura 4", "tri"],
    ["um retângulo de 5 por 3", "ret"], ["x mais 3 é igual a 10", "bal"], ["o diagrama de Venn", "venn"], ["sujeito e predicado", "sp"], ["a crase", "crase"],
    ["o regime fechado, semiaberto e aberto", "reg"], ["as dimensões dos direitos humanos", "dh"], ["os pontos cardeais", "card"],
  ];
  for (const [f, nome] of casos) it(`desenha: ${nome}`, () => { const d = materiaDe(f, new Set()); expect(d?.tipo).toBe("desenho"); expect(d!.rabisco!.length).toBeGreaterThan(2); });
  it("não desenha tabela-verdade para conjunção gramatical", () => { expect(materiaDe("a conjunção liga as orações", new Set())).toBeNull(); });
  it("lista e etapas", () => {
    expect(listaDe("São três os poderes: legislativo, executivo e judiciário")?.rabisco?.length).toBeGreaterThanOrEqual(6);
    expect(etapaDe("Primeiro, a denúncia é oferecida")).toMatch(/^denúncia/);
    expect(etapaDe("A denúncia é oferecida")).toBeNull();
  });
  it("tudo dentro do limite e cada desenho só uma vez", () => {
    const u = new Set<string>();
    expect(materiaDe("o iter criminis", u)).not.toBeNull();
    expect(materiaDe("de novo o iter criminis", u)).toBeNull();
  });
});
