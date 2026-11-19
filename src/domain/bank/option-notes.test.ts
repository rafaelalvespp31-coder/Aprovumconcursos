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
});
