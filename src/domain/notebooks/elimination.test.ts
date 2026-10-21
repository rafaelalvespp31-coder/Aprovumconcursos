import { describe, expect, it } from "vitest";
import { canConfirm, classifyTap, initialChoice, selectOption, toggleStrike } from "./elimination";

describe("eliminação de alternativas", () => {
  it("clique simples escolhe; outra alternativa troca a escolha", () => {
    let s = selectOption(initialChoice(), "A");
    expect(s.selected).toBe("A");
    expect(canConfirm(s)).toBe(true);
    s = selectOption(s, "B");
    expect(s.selected).toBe("B");
  });
  it("riscar a escolhida limpa a escolha e bloqueia a confirmação; restaurar volta a permitir escolher", () => {
    let s = selectOption(initialChoice(), "C");
    s = toggleStrike(s, "C");
    expect(s.selected).toBeNull();
    expect(s.struck.has("C")).toBe(true);
    expect(canConfirm(s)).toBe(false);
    // riscada não pode ser escolhida
    expect(selectOption(s, "C").selected).toBeNull();
    s = toggleStrike(s, "C");
    expect(s.struck.has("C")).toBe(false);
    expect(selectOption(s, "C").selected).toBe("C");
  });
  it("riscar outra alternativa mantém a escolha atual", () => {
    let s = selectOption(initialChoice(), "A");
    s = toggleStrike(s, "D");
    expect(s.selected).toBe("A");
    expect(canConfirm(s)).toBe(true);
  });
  it("sem escolha não confirma", () => {
    expect(canConfirm(initialChoice())).toBe(false);
  });
  it("classifica clique simples, duplo e de teclado", () => {
    expect(classifyTap(null, "A", 1000, false)).toBe("wait");
    expect(classifyTap({ id: "A", at: 1000 }, "A", 1200, false)).toBe("strike");
    expect(classifyTap({ id: "A", at: 1000 }, "A", 1400, false)).toBe("wait");
    expect(classifyTap({ id: "A", at: 1000 }, "B", 1100, false)).toBe("wait");
    expect(classifyTap(null, "A", 1000, true)).toBe("select-now");
  });
});
