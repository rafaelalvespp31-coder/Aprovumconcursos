import { describe, expect, it } from "vitest";
import { formulaParaTexto, limparMatematica } from "./math-text";

describe("limparMatematica", () => {
  it("não mexe em texto sem LaTeX", () => {
    const t = "Preço de R$ 100 e R$ 200. Use [colchetes] normais.";
    expect(limparMatematica(t)).toBe(t);
  });
  it("converte a decomposição simultânea em bloco alinhado", () => {
    const md = "Veja:\n\n\\[\n\\begin{array}{cc|c}\n12&18&2\\\\\n6&9&2\\\\\n3&9&3\\\\\n1&3&3\\\\\n1&1&\n\\end{array}\n\\]\n\nFim";
    const out = limparMatematica(md);
    expect(out).not.toMatch(/begin|\\\\/);
    expect(out).toContain("```text\n12  18 | 2\n 6   9 | 2\n 3   9 | 3\n 1   3 | 3\n 1   1 |\n```");
  });
  it("converte fórmula em bloco e em linha", () => {
    expect(limparMatematica("\\[\nMMC(12,18)=2\\times2\\times3\\times3=36\n\\]")).toContain("MMC(12,18)=2×2×3×3=36");
    expect(limparMatematica("→ \\(MMC(12,16)=48\\). Próxima: **48 min**")).toBe("→ MMC(12,16)=48. Próxima: **48 min**");
  });
  it("frações, potências e símbolos", () => {
    expect(formulaParaTexto("\\frac{3}{4} + \\frac{a+b}{2}")).toBe("3/4 + (a+b)/2");
    expect(formulaParaTexto("2^{3} \\cdot 3^2 \\div 6 \\leq 10")).toBe("2³ · 3² ÷ 6 ≤ 10");
  });
});

import { textoSemLatex } from "./math-text";
describe("textoSemLatex", () => {
  it("limpa enunciado e deixa texto comum intacto", () => {
    expect(textoSemLatex("Calcule \\(2^{3}\\times 5\\).")).toBe("Calcule 2³× 5.");
    expect(textoSemLatex("Sem fórmula (a) e [b]")).toBe("Sem fórmula (a) e [b]");
    expect(textoSemLatex(undefined)).toBe("");
  });
});

import { formulaParaTexto as _f } from "./math-text";
import { it as _it, expect as _expect } from "vitest";
_it("converte reticências, Delta, boxed e cdots", () => {
  _expect(_f("a_1+a_2+\\cdots+a_n")).toContain("…");
  _expect(_f("\\Delta = b^2")).toContain("Δ");
  _expect(_f("\\boxed{x=9}")).toBe("x=9");
});
