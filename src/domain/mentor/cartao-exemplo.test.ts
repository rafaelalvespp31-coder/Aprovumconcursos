import { describe, expect, it } from "vitest";
import { baseLegalDe, iconeDe, montarCartao, palavraChaveDe, temaDe } from "./cartao-exemplo";

describe("cartão visual de exemplo", () => {
  it("tema por matéria", () => {
    expect(temaDe("Direito Penal")).toBe("direito");
    expect(temaDe("Língua Portuguesa")).toBe("portugues");
    expect(temaDe("Matemática")).toBe("matematica");
    expect(temaDe("Informática")).toBe("informatica");
    expect(temaDe(null, "art. 5º da CF")).toBe("direito");
  });
  it("base legal e palavra-chave", () => {
    expect(baseLegalDe("Aplica-se o art. 3º do Código Penal.")).toBe("Art. 3º do Código Penal");
    expect(baseLegalDe("conforme a Lei 8.666/93")).toBe("Lei 8.666/93");
    expect(baseLegalDe("sem referência")).toBeNull();
    expect(palavraChaveDe("Aplica-se a **ultratividade** aos fatos")).toBe("ultratividade");
  });
  it("ícone combina com o assunto", () => {
    expect(iconeDe("Leis temporárias e excepcionais", "direito")).toBe("Hourglass");
    expect(iconeDe("Uso da vírgula", "portugues")).toBe("PenLine");
    expect(iconeDe("Juros simples", "matematica")).toBe("Calculator");
  });
  it("monta o cartão", () => {
    const c = montarCartao({ subject: "Direito Penal", titulo: "Leis temporárias e excepcionais", situacao: "Lei criada para a pandemia é revogada depois.", pergunta: "Ela ainda vale para fatos antigos?", resposta: "Sim. É a **ultratividade** (art. 3º do Código Penal)." });
    expect(c).toMatchObject({ tema: "direito", palavra: "ULTRATIVIDADE", base: "Art. 3º do Código Penal", icone: "Hourglass" });
  });
});

describe("tema de matemática pelo assunto", () => {
  it("regra de três, MMC e juros contam como matemática", () => {
    expect(temaDe("Razão, Proporção e Regra de Três")).toBe("matematica");
    expect(temaDe("Mínimo Múltiplo Comum (MMC)")).toBe("matematica");
    expect(temaDe("Múltiplos, Divisores e Divisibilidade")).toBe("matematica");
    expect(temaDe("Direito Penal Crimes contra o patrimônio")).toBe("direito");
  });
});
