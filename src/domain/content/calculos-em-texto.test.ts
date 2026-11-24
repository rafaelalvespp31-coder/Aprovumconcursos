import { describe, expect, it } from "vitest";
import { converterCalculosEmTexto as conv } from "./calculos-em-texto";
import { parseCalculo } from "./calc-visual";

const bloco = (md: string) => [...md.matchAll(/```(\w+)\n([^\n]+)\n```/g)].map((m) => [m[1], m[2]]);

describe("converterCalculosEmTexto", () => {
  it("MMC e MDC em linha viram bloco conta", () => {
    expect(bloco(conv("Texto.\n\nMMC(6,8)=24\n\nFim."))).toEqual([["conta", "mmc 6 8"]]);
    expect(bloco(conv("a\n\nMDC(12,18) = 6.\n\nb"))).toEqual([["conta", "mdc 12 18"]]);
    expect(bloco(conv("a\n\nMMC(12,20)=2²×3×5=60\n\nb"))).toEqual([["conta", "mmc 12 20"]]);
  });
  it("resultado que não confere deixa o texto intacto", () => {
    const md = "a\n\nMMC(6,8)=25\n\nb";
    expect(conv(md)).toBe(md);
  });
  it("fatoração de um número vira bloco fatoracao", () => {
    expect(bloco(conv("x\n\n72=2³×3²\n\ny"))).toEqual([["conta", "fatoracao 72"]]);
    expect(bloco(conv("x\n\n150 = 2 × 3 × 5 × 5\n\ny"))).toEqual([["conta", "fatoracao 150"]]);
    const errada = "x\n\n72=2²×3²\n\ny";
    expect(conv(errada)).toBe(errada);
  });
  it("tabela de decomposição simultânea em ```text vira mmc", () => {
    const md = "```text\n24  36  60 | 2\n12  18  30 | 2\n 6   9  15 | 2\n 3   9  15 | 3\n 1   3   5 | 3\n 1   1   5 | 5\n 1   1   1 |\n```";
    expect(bloco(conv(md))).toEqual([["conta", "mmc 24 36 60"]]);
    const mdc = "```text\n12  18 | 2\n 6   9 | 3\n 2   3 |\n```";
    expect(bloco(conv(mdc))).toEqual([["conta", "mdc 12 18"]]);
  });
  it("some a repetição do resultado logo depois do bloco", () => {
    const md = "```text\n12  18 | 2\n 6   9 | 2\n 3   9 | 3\n 1   3 | 3\n 1   1 |\n```\n\nMultiplicando os fatores utilizados:\n\nMMC(12,18)=2×2×3×3=36\n\n**Resposta: 36.**";
    const r = conv(md);
    expect(r).not.toContain("Multiplicando");
    expect(r).not.toContain("2×2×3×3");
    expect(r).toContain("**Resposta: 36.**");
  });
  it("operações simples e frações", () => {
    expect(bloco(conv("a\n\n12 × 13 = 156\n\nb"))).toEqual([["conta", "multiplicacao 12 13"]]);
    expect(bloco(conv("a\n\n25 + 13 = 38\n\nb"))).toEqual([["conta", "soma 25 13"]]);
    expect(bloco(conv("a\n\n1,5 + 2,25 = 3,75\n\nb"))).toEqual([["conta", "soma 1,5 2,25"]]);
    expect(bloco(conv("a\n\n432 ÷ 12 = 36\n\nb"))).toEqual([["conta", "divisao 432 12"]]);
    expect(bloco(conv("a\n\n3/4 + 1/2 = 5/4\n\nb"))).toEqual([["fracao", "3/4 + 1/2"]]);
    expect(bloco(conv("a\n\n√144 = 12\n\nb"))).toEqual([["raiz", "144"]]);
    const errado = "a\n\n12 × 13 = 157\n\nb";
    expect(conv(errado)).toBe(errado);
  });
  it("não mexe em itens de lista, citações, código de outras linguagens nem linha no meio do parágrafo", () => {
    for (const md of ["- 12 × 13 = 156.", "> 12 × 13 = 156", "Calcule:\n12 × 13 = 156\nagora", "```js\n12 × 13 = 156\n```", "1. 25 + 13 = 38"]) expect(conv(md)).toBe(md);
  });
  it("todo bloco gerado é aceito pelo motor do caderno", () => {
    const md = ["MMC(6,8)=24", "72=2³×3²", "12 × 13 = 156", "25 + 13 = 38", "3/4 + 1/2 = 5/4", "√144 = 12", "17=17", "MDC(12,18)=6"].join("\n\n");
    for (const [lang, corpo] of bloco(conv(md))) expect(parseCalculo(lang!, corpo!), `${lang} ${corpo}`).not.toBeNull();
  });
  it("fatoração mostra o resultado com expoente", () => {
    expect(parseCalculo("conta", "fatoracao 72")?.resultado).toContain("2³ × 3²");
    expect(parseCalculo("conta", "fatoracao 7")?.resultado).toBeDefined();
  });
});
