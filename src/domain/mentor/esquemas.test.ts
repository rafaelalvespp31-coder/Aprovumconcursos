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
