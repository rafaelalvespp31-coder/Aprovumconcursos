import { describe, expect, it } from "vitest";
import { contaCaderno } from "./caderno-conta";
import type { Cell, Worked } from "./hand-math";

/** O que está escrito na célula no passo `at` (o que o aluno veria). */
function visivel(c: Cell, at: number): string {
  if (c.alt) { const ativo = [...c.alt].reverse().find((s) => at >= s.p && (s.pe === undefined || at < s.pe)); return ativo?.t ?? ""; }
  if (c.p !== undefined && at < c.p) return "";
  if (c.pe !== undefined && at >= c.pe) return "";
  return c.t;
}
const linhaFinal = (w: Worked) => w.rows[w.rows.length - 1]!.cells.map((c) => visivel(c, w.steps.length - 1)).join("");
const maxP = (w: Worked) => Math.max(0, ...w.rows.flatMap((r) => r.cells.map((c) => Math.max(c.p ?? 0, ...(c.alt?.map((s) => s.p) ?? [0])))));

describe("contas de caderno: o que aparece no último passo é o resultado certo", () => {
  it("soma com vai-um", () => {
    const w = contaCaderno("soma", [478, 356])!;
    expect(linhaFinal(w)).toBe("834");
    expect(w.steps[0]).toContain("Arme a conta");
    expect(w.steps[1]).toContain("Vamos começar pela direita");
    expect(w.steps[1]).toContain("8 + 6 = 14");
    expect(w.rows[0]!.cells.map((c) => visivel(c, 1)).join("")).toBe("1");
  });
  it("soma de vários números e vai-um final", () => {
    for (const n of [[999, 1], [5, 7, 9], [1234, 8766, 5]]) expect(linhaFinal(contaCaderno("soma", n)!)).toBe(String(n.reduce((a, b) => a + b)));
  });
  it("subtração com empréstimo simples e através de zeros", () => {
    const a = contaCaderno("subtracao", [503, 278])!;
    expect(linhaFinal(a).trim()).toBe("225");
    expect(a.steps.join(" ")).toContain("Os zeros do caminho viram 9");
    expect(linhaFinal(contaCaderno("subtracao", [45, 12])!).trim()).toBe("33");
    expect(linhaFinal(contaCaderno("subtracao", [1000, 1])!).trim()).toBe("999");
    expect(contaCaderno("subtracao", [3, 5])).toBeNull();
  });
  it("multiplicação armada com 'vai' e linhas parciais (248 × 36)", () => {
    const w = contaCaderno("multiplicacao", [248, 36])!;
    expect(linhaFinal(w).trim()).toBe("8928");
    expect(w.steps.join("\n")).toContain("6 × 8 = 48. Escreva 8 e \"vai 4\"");
    expect(w.steps.join("\n")).toContain("6 × 4 = 24, mais 4 que veio = 28");
    expect(w.steps.join("\n")).toContain("1.488 + 7.440 = 8.928");
    expect(w.rows.map((r) => r.cells.map((c) => visivel(c, w.steps.length - 1)).join("").trim())).toContain("1488");
    expect(w.rows.map((r) => r.cells.map((c) => visivel(c, w.steps.length - 1)).join("").trim())).toContain("7440");
    expect(maxP(w)).toBeLessThan(w.steps.length);
  });
  it("multiplicação por um algarismo e por zero no meio", () => {
    expect(linhaFinal(contaCaderno("multiplicacao", [12, 3])!).trim()).toBe("36");
    expect(linhaFinal(contaCaderno("multiplicacao", [123, 205])!).trim()).toBe("25215");
    expect(linhaFinal(contaCaderno("multiplicacao", [0, 7])!).trim()).toBe("0");
  });
  it("divisão armada: quociente, produto e resto", () => {
    const w = contaCaderno("divisao", [1488, 6])!;
    expect(w.quotientCells!.map((q) => q.t).join("")).toBe("248");
    expect(w.side!.quotient).toBe("248");
    const e = contaCaderno("divisao", [12, 3])!;
    expect(e.quotientCells!.map((q) => q.t).join("")).toBe("4");
    expect(e.steps.join(" ")).toContain("12 ÷ 3 = 4");
    expect(contaCaderno("divisao", [7, 2])!.result).toContain("resto 1");
    expect(contaCaderno("divisao", [3, 7])!.quotientCells![0]!.t).toBe("0");
    expect(contaCaderno("divisao", [5, 0])).toBeNull();
  });
  it("todas as células aparecem em algum passo existente e há um foco por passo (varredura)", () => {
    for (let a = 1; a < 400; a += 37) for (let b = 1; b < 60; b += 7) {
      for (const [op, nums] of [["soma", [a, b]], ["multiplicacao", [a, b]], ["divisao", [a, b]], ["subtracao", [Math.max(a, b), Math.min(a, b)]]] as const) {
        const w = contaCaderno(op, [...nums])!;
        expect(maxP(w), `${op} ${nums}`).toBeLessThan(w.steps.length);
        if (op === "soma") expect(linhaFinal(w).trim()).toBe(String(a + b));
        if (op === "multiplicacao") expect(linhaFinal(w).trim()).toBe(String(a * b));
        if (op === "subtracao") expect(linhaFinal(w).trim()).toBe(String(Math.max(a, b) - Math.min(a, b)));
        if (op === "divisao") expect(w.quotientCells!.map((q) => q.t).join("").replace(/^0+(?=\d)/, "")).toBe(String(Math.floor(a / b)));
      }
    }
  });
  it("MMC/MDC ganham o passo de armar e linhas por passo", () => {
    const w = contaCaderno("mmc", [12, 18])!;
    expect(w.steps.length).toBe(w.rows.length + 1);
    expect(w.steps[0]).toContain("barra");
    expect(w.result).toContain("36");
  });
  it("casas decimais alinhadas (soma e subtração com vírgula)", () => {
    const w = contaCaderno("soma", [1250, 325], 2)!;
    expect(w.rows[w.rows.length - 1]!.cells.map((c) => visivel(c, w.steps.length - 1)).join("").trim()).toBe("15,75");
    expect(w.steps[0]).toContain("vírgula embaixo da vírgula");
    expect(w.steps.join(" ")).toContain("Centésimos");
    expect(w.result).toBe("12,50 + 3,25 = 15,75");
    const s = contaCaderno("subtracao", [1000, 275], 2)!;
    expect(s.rows[2]!.cells.map((c) => visivel(c, s.steps.length - 1)).join("").trim()).toBe("7,25");
    const z = contaCaderno("soma", [5, 25], 2)!; // 0,05 + 0,25
    expect(z.rows[z.rows.length - 1]!.cells.map((c) => visivel(c, z.steps.length - 1)).join("").trim()).toBe("0,30");
    expect(contaCaderno("multiplicacao", [12, 3], 1)).toBeNull();
  });
});
