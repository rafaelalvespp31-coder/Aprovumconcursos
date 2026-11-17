import { describe, expect, it } from "vitest";
import { esquemaDe, figurasDe, linhaDeFala, novoEsquema, linhaTitulo, lousaSchema, pedeLousa, tituloDe } from "./lousa";

describe("pedeLousa", () => {
  it("abre só quando o aluno pede quadro, lousa ou desenho", () => {
    expect(pedeLousa("escreve no quadro a regra de três pra mim")).toBe(true);
    expect(pedeLousa("desenha um triângulo retângulo pra mim")).toBe(true);
    expect(pedeLousa("me dá um exemplo desenhado de porcentagem")).toBe(true);
    expect(pedeLousa("usa a lousa pra explicar isso")).toBe(true);
  });
  it("ignora pedidos de explicação e exemplo falado", () => {
    expect(pedeLousa("me ensina como calcular porcentagem")).toBe(false);
    expect(pedeLousa("dá um exemplo de regra de três")).toBe(false);
    expect(pedeLousa("explica passo a passo essa equação")).toBe(false);
    expect(pedeLousa("tudo bem com você hoje")).toBe(false);
    expect(pedeLousa("ok")).toBe(false);
  });
});

describe("lousaSchema", () => {
  it("aceita linhas e desenho e rejeita primitivas desconhecidas", () => {
    const ok = lousaSchema.safeParse({ mostrar: true, titulo: "x", linhas: [{ tipo: "conta", texto: "1+1=2" }, { tipo: "par", texto: "5 maçãs", dir: "R$ 20", circular: "20" }], desenho: [{ t: "linha", x1: 1, y1: 2, x2: 3, y2: 4 }] });
    expect(ok.success).toBe(true);
    expect(lousaSchema.safeParse({ mostrar: true, linhas: [], desenho: [{ t: "svg", raw: "<script>" }] }).success).toBe(false);
  });
});

describe("anunciaLousa", () => {
  it("detecta o Mentor anunciando que vai anotar", async () => {
    const { anunciaLousa } = await import("./lousa");
    expect(anunciaLousa("Vou anotar na lousa pra você ver")).toBe(true);
    expect(anunciaLousa("Olha aqui na lousa")).toBe(true);
    expect(anunciaLousa("Boa pergunta, vamos revisar o artigo quinto")).toBe(false);
  });
});

describe("roteiroDe", () => {
  it("monta o roteiro falado na ordem das linhas", async () => {
    const { roteiroDe } = await import("./lousa");
    const l = lousaSchema.parse({ mostrar: true, linhas: [{ tipo: "titulo", texto: "A" }, { tipo: "conta", texto: "2+2", fala: "Dois mais dois." }, { tipo: "resposta", texto: "4", fala: "Dá quatro." }], desenho: [] });
    const r = roteiroDe(l);
    expect(r.falas).toEqual(["", "Dois mais dois.", "Dá quatro."]);
    expect(r.texto).toBe("1. Dois mais dois.\n2. Dá quatro.");
    expect(r.total).toBe("Dois mais dois.".length + "Dá quatro.".length);
  });
});

describe("chaveLousa", () => {
  it("pedidos parecidos geram a mesma chave", async () => {
    const { chaveLousa, semelhancaChaves } = await import("./lousa");
    expect(chaveLousa("Me ensina regra de três")).toBe(chaveLousa("como faz regra de 3 pra mim?"));
    expect(semelhancaChaves(chaveLousa("regra de três com maçãs"), chaveLousa("regra de 3 maçãs"))).toBeGreaterThanOrEqual(0.8);
    expect(chaveLousa("porcentagem")).not.toBe(chaveLousa("regra de três"));
  });
});

describe("linhaDeChamada", () => {
  it("converte a chamada de função do Mentor em linha válida", async () => {
    const { linhaDeChamada } = await import("./lousa");
    expect(linhaDeChamada({ tipo: "conta", texto: "5x = 160", nivel: 3, caixa: true, cor: "verde" })).toMatchObject({ tipo: "conta", texto: "5x = 160", nivel: 3, caixa: true, cor: "verde" });
    expect(linhaDeChamada({ tipo: "figuras", texto: "5 maçãs:", emoji: "🍎", quantidade: 5 })?.figuras).toEqual([{ e: "🍎", n: 5 }]);
    expect(linhaDeChamada({ tipo: "html", texto: "x" })).toBeNull();
    expect(linhaDeChamada({ tipo: "conta", texto: "x", nivel: 99 })?.nivel).toBe(5);
  });
});

describe("lousa por transcrição", () => {
  it("título do pedido", () => {
    expect(tituloDe("me dá um exemplo de regra de três no quadro")).toBe("Regra de três");
    expect(tituloDe("escreve na lousa")).toBe("Explicação");
  });
  it("frase → linha", () => {
    expect(linhaDeFala("Bora, olha aqui!", true)).toBeNull();
    expect(linhaDeFala("Ficou claro?", false)).toBeNull();
    expect(linhaDeFala("Quanto custam 8 maçãs?", false)).toMatchObject({ tipo: "texto", sublinhar: "reta" });
    expect(linhaDeFala("5 vezes x é igual a 8 vezes 20", false)).toMatchObject({ tipo: "conta", texto: "5 · x = 8 · 20" });
    expect(linhaDeFala("Então x é igual a 32", false)).toMatchObject({ tipo: "resposta", caixa: true });
    expect(linhaDeFala("Se 5 maçãs custam 20 reais", true)).toMatchObject({ tipo: "texto", nivel: 0 });
  });
});

describe("esquema e canetas", () => {
  it("desenha as coisas citadas", () => {
    expect(figurasDe("Se 5 maçãs custam 20 reais")).toMatchObject({ tipo: "figuras", figuras: [{ e: "🍎", n: 5 }] });
    expect(figurasDe("São 40 funcionários")).toBeNull();
    expect(figurasDe("Quanto custam 8 maçãs?")?.figuras?.[0]?.n).toBe(8);
  });
  it("varia as canetas e destaca o que importa", () => {
    const cores = [0, 1, 2, 3].map((i) => linhaDeFala("5 vezes x é igual a 8 vezes 20", false, i)?.cor);
    expect(new Set(cores).size).toBeGreaterThan(2);
    expect(linhaDeFala("Se 5 maçãs custam 20 reais", true)?.realce?.[0]).toMatchObject({ cor: "vermelho" });
    expect(linhaTitulo("Regra de três").tipo).toBe("titulo");
  });
});

describe("esquema desenhado", () => {
  it("desenha formas e depois a grade da regra de três", () => {
    const c = novoEsquema();
    const a = esquemaDe("Se 5 maçãs custam 20 reais", c);
    expect(a?.tipo).toBe("desenho");
    expect(a?.rabisco?.filter((x) => x.t === "circ")).toHaveLength(5);
    const g = esquemaDe("Quanto custam 8 maçãs?", c);
    expect(g?.rabisco?.some((x) => x.t === "texto" && x.s === "x")).toBe(true);
    expect(g?.rabisco?.length).toBeLessThanOrEqual(10);
    expect(esquemaDe("5 vezes x é igual a 8 vezes 20", c)).toBeNull();
  });
});
