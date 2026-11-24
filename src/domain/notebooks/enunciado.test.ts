import { describe, expect, it } from "vitest";
import { perguntaPadrao, splitEnunciado } from "./enunciado";

const base = { caseContext: null, certoErrado: false };

describe("splitEnunciado", () => {
  it("separa título, assertivas e pergunta quando o enunciado tem linhas", () => {
    const r = splitEnunciado({ ...base, statement: "Sobre o delito de homicídio, analise as assertivas abaixo:\nI. Primeira.\nII. Segunda.\nAssinale a alternativa correta:" });
    expect(r.titulo).toBe("Sobre o delito de homicídio, analise as assertivas abaixo:");
    expect(r.base).toBe("I. Primeira.\nII. Segunda.");
    expect(r.pergunta).toBe("Assinale a alternativa correta:");
  });
  it("com texto-base cadastrado, o enunciado vira a pergunta", () => {
    const r = splitEnunciado({ statement: "Qual a consequência?", caseContext: "Um servidor obteve licença…", certoErrado: false });
    expect(r).toEqual({ titulo: null, base: "Um servidor obteve licença…", pergunta: "Qual a consequência?" });
  });
  it("uma linha sem ordem final fica toda no título, com a pergunta padrão", () => {
    const r = splitEnunciado({ ...base, statement: "Um servidor obteve licença com base em documento falso. A Administração deve:" });
    expect(r.titulo).toContain("A Administração deve:");
    expect(r.base).toBeNull();
    expect(r.pergunta).toBe(perguntaPadrao(false));
  });
  it("uma linha que termina numa ordem separa a pergunta", () => {
    const r = splitEnunciado({ ...base, statement: "Sobre o crime de furto, é correto afirmar. Assinale a alternativa correta." });
    expect(r.titulo).toBe("Sobre o crime de furto, é correto afirmar.");
    expect(r.pergunta).toBe("Assinale a alternativa correta.");
  });
  it("certo/errado usa a pergunta própria", () => {
    expect(splitEnunciado({ statement: "A anulação retroage.", caseContext: null, certoErrado: true }).pergunta).toBe("Julgue o item e marque Certo ou Errado:");
  });
  it("duas linhas sem ordem: a primeira é título e a segunda é base", () => {
    const r = splitEnunciado({ ...base, statement: "Leia o trecho:\nArt. 121. Matar alguém." });
    expect(r.titulo).toBe("Leia o trecho:");
    expect(r.base).toBe("Art. 121. Matar alguém.");
  });
});
