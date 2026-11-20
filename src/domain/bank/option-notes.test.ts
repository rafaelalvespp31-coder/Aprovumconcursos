import { describe, expect, it } from "vitest";
import { splitCommentByOption } from "./option-notes";

describe("splitCommentByOption", () => {
  it("distribui as notas por alternativa e mantém a regra como comentário geral", () => {
    const r = splitCommentByOption(`- A) Errada. “Estensão” — grafia incorreta.
- B) Errada. “Extenção” — grafia incorreta.
- C) Errada. “Extenssão” — excesso de “s”.
- D) Errada. “Estenssão” — grafia incorreta.
- E) Correta. Extensão — grafia correta.
Regra-chave: A palavra é escrita com X e S: extensão.`);
    expect(r).not.toBeNull();
    expect(Object.keys(r!.byLabel)).toEqual(["A", "B", "C", "D", "E"]);
    expect(r!.byLabel.E).toBe("Correta. Extensão — grafia correta.");
    expect(r!.rest).toBe("Regra-chave: A palavra é escrita com X e S: extensão.");
  });
  it("aceita 'Alternativa A:' e linhas de continuação", () => {
    const r = splitCommentByOption("Comentário geral.\nAlternativa A: errada porque X\ncontinua aqui.\nAlternativa B: correta.");
    expect(r!.byLabel.A).toBe("errada porque X continua aqui.");
    expect(r!.rest).toBe("Comentário geral.");
  });
  it("texto comum sem letras não é separado", () => {
    expect(splitCommentByOption("A regra diz que a palavra é escrita com x. Portanto, extensão.")).toBeNull();
    expect(splitCommentByOption("a) só uma linha")).toBeNull();
  });
  it("modelo 'Gabarito: A) …': nota do gabarito certo + notas das erradas", () => {
    const r = splitCommentByOption(`Gabarito: A) z – x – z – s.
Preenchimento correto:
* Dezempenho → Z.
* Exigente → X.
* Visualizado → Z.
B) Errada. Troca o S de esgotamento por Z.
C) Errada. Usa X em desempenho.`);
    expect(r!.answer).toBe("A");
    expect(r!.byLabel.A).toBe("z – x – z – s.\nPreenchimento correto:\n* Dezempenho → Z.\n* Exigente → X.\n* Visualizado → Z.");
    expect(r!.byLabel.B).toBe("Errada. Troca o S de esgotamento por Z.");
    expect(r!.byLabel.C).toBe("Errada. Usa X em desempenho.");
    expect(r!.rest).toBe("");
  });
  it("só o bloco do gabarito já vira nota da alternativa certa", () => {
    const r = splitCommentByOption("Gabarito: A) z – x – z – s.\nPreenchimento correto:\n* Exigente → X.");
    expect(r!.answer).toBe("A");
    expect(Object.keys(r!.byLabel)).toEqual(["A"]);
  });
  it("'Gabarito: Certo' não é tratado como letra", () => {
    expect(splitCommentByOption("Gabarito: Certo. A regra é X.")).toBeNull();
  });
});
