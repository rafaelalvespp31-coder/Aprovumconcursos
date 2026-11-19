import { describe, expect, it } from "vitest";
import { extractPractice, practiceToMarkdown } from "./practice";

const MD = `Texto do tema.

:::exemplo
Situação: Ana é ameaçada
e registra a ocorrência.
Pergunta: Pode instaurar de ofício?
Resposta: **Não.** Depende de representação.
:::

Depois do exemplo.`;

describe("Na prática", () => {
  it("separa o bloco do texto e lê os campos (com várias linhas)", () => {
    const { body, cases } = extractPractice(MD);
    expect(body).toBe("Texto do tema.\n\nDepois do exemplo.");
    expect(cases).toEqual([{ situation: "Ana é ameaçada\ne registra a ocorrência.", question: "Pode instaurar de ofício?", answer: "**Não.** Depende de representação." }]);
  });
  it("aceita vários blocos e ignora bloco incompleto sem perder o texto", () => {
    const md = `:::exemplo\nSituação: A\nResposta: B\n:::\n\n:::exemplo\nsó texto\n:::`;
    const { body, cases } = extractPractice(md);
    expect(cases).toHaveLength(1);
    expect(body).toContain("só texto");
  });
  it("vira texto comum fora da aula", () => {
    const out = practiceToMarkdown(MD);
    expect(out).not.toContain(":::");
    expect(out).toContain("> **Na prática:** Ana é ameaçada");
    expect(out).toContain("> **Resposta:** **Não.**");
  });
  it("texto sem bloco fica igual", () => {
    expect(practiceToMarkdown("abc")).toBe("abc");
    expect(extractPractice("abc")).toEqual({ body: "abc", cases: [] });
  });
});

describe("tirinha tolerante", () => {
  it("corta legenda longa e corrige cenário/personagem fora da lista em vez de descartar a tirinha", async () => {
    const { lenientStrip } = await import("./visual");
    const long = "x".repeat(120);
    const r = lenientStrip(JSON.stringify([{ cenario: "Residência", legenda: long, personagens: [{ p: "Policial", lado: "dir", pose: "bracos_cruzados", humor: "neutro" }], fala: { quem: 5, texto: long } }]));
    expect(r).toBeDefined();
    expect(r![0]!.legenda!.length).toBeLessThanOrEqual(90);
    expect(r![0]!.fala!.quem).toBe(0);
    expect(lenientStrip("não é json")).toBeUndefined();
  });
  it("repara JSON de IA com aspas curvas, vírgula sobrando e chave faltando", async () => {
    const { lenientStrip, parseJsonLoose } = await import("./visual");
    expect(parseJsonLoose('[{"a": 1,},]')).toEqual([{ a: 1 }]);
    const r = lenientStrip('[{“cenario”: “casa”, “legenda”: “Busca na casa”, “personagens”: [{“p”: “policial_penal”,}], “fala”: {“quem”: 0, “texto”: “Mandado”}');
    expect(r?.[0]?.cenario).toBe("casa");
    expect(r?.[0]?.fala?.texto).toBe("Mandado");
  });
});
