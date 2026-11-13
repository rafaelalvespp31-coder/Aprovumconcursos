import { describe, expect, it } from "vitest";
import { cleanPostitText, findQuoteSection, matchKey } from "./postit-quote";

const secs = [
  { id: "a", title: "Conceito", bodies: ["A **cadeia de custódia** é o conjunto de procedimentos.\n\n- Rastreabilidade\n- Idoneidade"] },
  { id: "b", title: "Etapas", bodies: ["| Etapa | Ação |\n|---|---|\n| Coleta | Recolher o vestígio |"] },
];

describe("postit-quote", () => {
  it("ignora markdown e pontuação, preserva acentos", () => {
    expect(matchKey("A cadeia de custódia, é o…")).toBe("acadeiadecustódiaéo");
    expect(matchKey("custodia")).not.toBe(matchKey("custódia"));
  });
  it("acha o trecho na seção certa", () => {
    expect(findQuoteSection("cadeia de custódia é o conjunto", secs)?.id).toBe("a");
    expect(findQuoteSection("Coleta Recolher o vestígio", secs)?.id).toBe("b");
  });
  it("prefere a seção indicada quando o trecho existe nela", () => {
    const dup = [...secs, { id: "c", title: "Outra", bodies: ["cadeia de custódia aparece de novo"] }];
    expect(findQuoteSection("cadeia de custódia", dup, "c")?.id).toBe("c");
  });
  it("rejeita trecho inventado", () => {
    expect(findQuoteSection("frase que não existe na aula", secs)).toBeNull();
    expect(findQuoteSection("a", secs)).toBeNull();
  });
  it("limpa controle e espaços", () => {
    expect(cleanPostitText("  a\u0000  b \n\n\n\n c ")).toBe("a b\n\nc");
  });

  it("aceita trecho em várias linhas quando cada linha existe na seção (conteúdo renderizado entre elas)", () => {
    const secs = [{ id: "t", title: "Mapa", bodies: ["| Caput | Matar alguém |\n\nCaixa extra da página\n\n| § 1º | Privilégio |"] }];
    expect(findQuoteSection("Caput | Matar alguém\n§ 1º | Privilégio", secs)?.id).toBe("t");
    expect(findQuoteSection("Caput | Matar alguém\n§ 9º | Inventado", secs)).toBeNull();
  });
});
