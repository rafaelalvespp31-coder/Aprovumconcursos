import { describe, expect, it } from "vitest";
import { canConfirm, classifyTap, initialChoice, selectOption, strikeKeeping, toggleStrike } from "./elimination";

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
  it("classifica clique simples (escolhe na hora), duplo (risca) e de teclado", () => {
    expect(classifyTap(null, "A", 1000, false)).toBe("select-now");
    expect(classifyTap({ id: "A", at: 1000 }, "A", 1200, false)).toBe("strike");
    expect(classifyTap({ id: "A", at: 1000 }, "A", 1400, false)).toBe("select-now");
    expect(classifyTap({ id: "A", at: 1000 }, "B", 1100, false)).toBe("select-now");
    expect(classifyTap(null, "A", 1000, true)).toBe("select-now");
    expect(classifyTap({ id: "A", at: 1000 }, "A", 1100, true)).toBe("select-now");
  });
  it("duplo toque: o 1º escolhe, o 2º risca e desfaz a escolha; outro duplo restaura", () => {
    let s = initialChoice();
    s = selectOption(s, "C"); // 1º toque
    expect(s.selected).toBe("C");
    s = toggleStrike(s, "C"); // 2º toque
    expect(s.selected).toBeNull();
    expect(s.struck.has("C")).toBe(true);
    s = selectOption(s, "C"); // 1º toque do próximo duplo: riscada não é escolhida
    expect(s.selected).toBeNull();
    s = toggleStrike(s, "C"); // 2º toque restaura
    expect(s.struck.has("C")).toBe(false);
  });
  it("duplo toque numa alternativa não perde a escolha que já havia em outra", () => {
    let s = selectOption(initialChoice(), "A"); // escolha anterior
    s = selectOption(s, "B"); // 1º toque do duplo em B
    s = strikeKeeping(s, "B", "A"); // 2º toque
    expect(s.selected).toBe("A");
    expect(s.struck.has("B")).toBe(true);
    // sem escolha anterior: fica sem escolha
    let t = selectOption(initialChoice(), "C");
    t = strikeKeeping(t, "C", null);
    expect(t.selected).toBeNull();
    // restaurar uma riscada não mexe na escolha
    let u = selectOption(initialChoice(), "A");
    u = toggleStrike(u, "D");
    u = strikeKeeping(selectOption(u, "D"), "D", "A");
    expect(u.selected).toBe("A");
    expect(u.struck.has("D")).toBe(false);
  });
});
