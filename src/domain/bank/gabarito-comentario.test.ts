import { describe, expect, it } from "vitest";
import { splitCommentByOption } from "./option-notes";
import { parseSmart } from "./smart-import";

const alt = (l: string, certa: boolean, corpo: string) =>
  `Alternativa (${l}). ${certa ? "Essa é a nossa alternativa correta." : "Essa não é a nossa alternativa correta."} ${corpo}`;

const comentario = (gab: boolean) => [
  alt("a", false, "Na oração “[...] cuja superfície 'pareceria' intocada não estivesse ele a navegar”, a forma verbal \"parecia\" não se classifica como verbo intransitivo."),
  alt("b", false, "A forma verbal \"parecia\" não se classifica como verbo transitivo direto."),
  alt("c", false, "A forma verbal \"parecia\" não se classifica como verbo transitivo indireto."),
  alt("d", true, "De acordo com o contexto sintático, a forma verbal \"parecia\" se classifica como verbo de ligação."),
  alt("e", false, "A forma verbal \"parecia\" não se classifica como verbo de ação."),
  ...(gab ? ["Gabarito: letra D"] : []),
].join("\n\n");

const questao = (gab: boolean) => `Ano: 2026
Banca: Instituto Brasileiro de Apoio e Desenvolvimento Executivo - IBADE
Prova: IBADE - PC ES - Investigador de Polícia - 2026
De acordo com o contexto sintático, na oração “[...] cuja superfície pareceria intocada não estivesse ele a navegar”, como se classifica, quanto ao sentido, o verbo destacado?
A
Intransitivo.
B
Transitivo direto.
C
Transitivo indireto.
D
De ligação.
E
De ação.

${comentario(gab)}
`;

describe("gabarito e comentário por alternativa (Gran)", () => {
  it("'Gabarito: letra D' define a alternativa certa e fica fora do comentário", () => {
    const { drafts } = parseSmart(questao(true));
    expect(drafts).toHaveLength(1);
    const d = drafts[0]!;
    expect(d.options).toHaveLength(5);
    expect(d.options[4]!.text).toBe("De ação.");
    expect(d.answer).toBe("D");
    expect(d.answerSource).toBe("oficial");
    expect(d.comment).toMatch(/^Alternativa \(a\)\./);
    expect(d.comment).not.toMatch(/Gabarito: letra D/);
    expect(d.issues).not.toContain("gabarito_ausente");
  });

  it("sem 'Gabarito:', descobre a certa pelo próprio comentário ('Essa é a nossa alternativa correta')", () => {
    const d = parseSmart(questao(false)).drafts[0]!;
    expect(d.answer).toBe("D");
  });

  it("separa uma nota por alternativa e acha a certa, com ou sem 'Gabarito:'", () => {
    for (const gab of [true, false]) {
      const n = splitCommentByOption(comentario(gab))!;
      expect(n.answer).toBe("D");
      expect(Object.keys(n.byLabel)).toEqual(["A", "B", "C", "D", "E"]);
      expect(n.byLabel.D).toMatch(/^Essa é a nossa alternativa correta\. De acordo/);
      expect(n.byLabel.A).toMatch(/^Essa não é a nossa alternativa correta\./);
      expect(n.rest).toBe("");
    }
  });

  it("'Gabarito: letra C' e 'letra E' são letras, não Certo/Errado", () => {
    for (const l of ["C", "E"]) {
      const d = parseSmart(questao(true).replace("Gabarito: letra D", `Gabarito: letra ${l}`)).drafts[0]!;
      expect(d.answer).toBe(l);
    }
    expect(splitCommentByOption("Alternativa (c). Essa não é.\nAlternativa (e). Essa é.\nGabarito: letra E")!.answer).toBe("E");
  });

  it("não inventa gabarito quando o comentário não diz qual é a certa", () => {
    expect(splitCommentByOption("Alternativa (a). Explicação.\nAlternativa (b). Outra explicação.")!.answer).toBeNull();
  });

  it("gabarito 'Certo'/'Errado' em questão de julgamento continua funcionando", () => {
    const d = parseSmart(`Ano: 2025\nBanca: CEBRASPE\nProva: CEBRASPE - PF - Agente - 2025\nJulgue o item a seguir.\nO crime de furto é doloso.\n\nGabarito: Certo\n`).drafts[0]!;
    expect(d.type).toBe("certo_errado");
    expect(d.answer).toBe("certo");
  });
});
