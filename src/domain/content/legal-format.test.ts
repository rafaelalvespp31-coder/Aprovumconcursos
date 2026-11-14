import { describe, expect, it } from "vitest";
import { highlightLegal, legalLevel, legalParagraphs, splitLegalLabel } from "./legal-format";

describe("texto legal organizado", () => {
  it("junta linhas quebradas e separa os dispositivos", () => {
    const md = "Art. 245:\nArt. 245. As buscas serão executadas\nde dia, salvo se o morador consentir.\n§ 1º Se a autoridade der a busca,\ndeclarará sua qualidade.\n§ 2º Em caso de desobediência, será arrombada a porta.";
    expect(legalParagraphs(md).split("\n\n")).toEqual([
      "Art. 245:",
      "Art. 245. As buscas serão executadas de dia, salvo se o morador consentir.",
      "§ 1º Se a autoridade der a busca, declarará sua qualidade.",
      "§ 2º Em caso de desobediência, será arrombada a porta.",
    ]);
  });
  it("reconhece rótulo e nível", () => {
    expect(splitLegalLabel("§ 2º Em caso")).toEqual({ label: "§ 2º", rest: "Em caso" });
    expect(splitLegalLabel("Art. 245. As buscas")).toEqual({ label: "Art. 245", rest: "As buscas" });
    expect(legalLevel("I -")).toBe("inciso");
    expect(legalLevel("a)")).toBe("alinea");
    expect(splitLegalLabel("Sem rótulo aqui")).toBeNull();
  });
  it("marca vermelho e azul sem perder texto", () => {
    const p = highlightLegal("A busca é vedada à noite, salvo mandado, em 24 horas.");
    expect(p.map((x) => x.t).join("")).toBe("A busca é vedada à noite, salvo mandado, em 24 horas.");
    expect(p.find((x) => x.t === "vedada")?.k).toBe("r");
    expect(p.find((x) => x.t === "salvo")?.k).toBe("a");
    expect(p.find((x) => x.t === "24 horas")?.k).toBe("r");
  });
});

describe("pena no mesmo card", () => {
  it("anexa a pena ao dispositivo anterior", () => {
    const md = "**Art. 159, § 1º:** Se o sequestro dura mais de 24 horas:\n\n**Pena:** reclusão, de doze a vinte anos.\n\n**Art. 159, § 2º:** Se resulta lesão grave:\n\n**Pena:** reclusão, de dezesseis a vinte e quatro anos.";
    const ps = legalParagraphs(md).split("\n\n");
    expect(ps).toHaveLength(2);
    expect(ps[0]).toContain("⁂PENA⁂**Pena:** reclusão, de doze a vinte anos.");
  });
});
