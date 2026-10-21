import { describe, expect, it } from "vitest";
import { appearsInLesson, coreStatement, normalizeForMatch } from "./in-lesson";

const aula = normalizeForMatch(`
## 11. Questões de fixação
**Questão 1.** Durante um roubo, o agente mata a vítima, mas é impedido de subtrair o objeto pretendido. Segundo a orientação do STF, a conduta pode configurar latrocínio consumado.
> **Gabarito: CERTO.**

**Questão 2 — Nível avançado.** Assinale a alternativa correta: A) O roubo impróprio exige violência anterior à subtração. B) A grave ameaça é irrelevante para o roubo próprio. C) O roubo próprio pode ocorrer mediante violência.
`);

describe("menu Questões: só as questões que estão no texto da aula", () => {
  it("ignora o cabeçalho do banco e encontra o enunciado no texto", () => {
    const st = "Questão autoral (APROVUM), inspirada no estilo das bancas — não é questão oficial.\n\nJulgue o item a seguir.\n\nDurante um roubo, o agente mata a vítima, mas é impedido de subtrair o objeto pretendido.";
    expect(coreStatement(st)).toBe("Durante um roubo, o agente mata a vítima, mas é impedido de subtrair o objeto pretendido.");
    expect(appearsInLesson({ statement: st }, aula)).toBe(true);
  });

  it("múltipla escolha com o tema acrescentado ao enunciado: reconhece pelas alternativas", () => {
    const q = {
      statement: "Sobre o roubo próprio e o roubo impróprio, assinale a alternativa correta:",
      options: ["O roubo impróprio exige violência anterior à subtração.", "A grave ameaça é irrelevante para o roubo próprio.", "Qualquer agressão posterior a um furto configura roubo impróprio."],
    };
    expect(appearsInLesson(q, aula)).toBe(true);
  });

  it("questão só do banco (fora do texto) não entra", () => {
    expect(appearsInLesson({ statement: "Sobre a extorsão mediante sequestro, é correto afirmar que o crime se consuma com a privação da liberdade." }, aula)).toBe(false);
    expect(appearsInLesson({ statement: "Assinale a alternativa correta:", options: ["Alternativa inexistente número um.", "Outra alternativa que não está na aula."] }, aula)).toBe(false);
  });
});
