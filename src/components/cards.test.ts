import { describe, expect, it } from "vitest";
import { parseFlashcards } from "./flashcards";
import { parseTrueFalse } from "./true-false-cards";

describe("cartões interativos", () => {
  it("flashcards: pergunta na frente, resposta no verso", () => {
    const c = parseFlashcards("**Quem arquiva o IP?**\n→ O **MP** (art. 28).\n\n**Prazo preso?**\n→ 10 dias.\n\nTexto solto sem resposta.");
    expect(c).toEqual([
      { front: "Quem arquiva o IP?", back: "O **MP** (art. 28)." },
      { front: "Prazo preso?", back: "10 dias." },
    ]);
  });
  it("certo ou errado: lê o gabarito e a explicação; ignora o que não tem CERTO/ERRADO", () => {
    const t = parseTrueFalse("**Afirmação 1.** O IP é dispensável.\n→ CERTO. O MP pode denunciar sem ele.\n\n**Afirmação 2.** Sigilo absoluto.\n→ **ERRADO**: SV 14.\n\n**Caso.** algo\n→ resposta comum");
    expect(t.map((x) => [x.title, x.truth, x.explanation])).toEqual([
      ["Afirmação 1", true, "O MP pode denunciar sem ele."],
      ["Afirmação 2", false, "SV 14."],
    ]);
  });
});
