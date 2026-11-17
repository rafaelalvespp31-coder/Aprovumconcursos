import { describe, expect, it } from "vitest";
import { comandoDitado, fimDitado, frasesDe, linhaDitado, novoDitado } from "./ditado";

describe("ditado do desenho", () => {
  it("monta o esquema da extratividade em ordem", () => {
    const e = novoDitado(true, true);
    const cmds = ["Título: Extratividade da lei penal.", "Linha do tempo: do tempo do crime até hoje.", "Acompanhe a linha que estou fazendo.", "Caixa um: regra geral.", "Item: princípio da irretroatividade.", "Item: a lei penal não retroage.", "Caixa dois: retroatividade.", "Item: lei nova mais benéfica retroage.", "Caixa três: ultra-atividade.", "Item: lei mais benéfica continua aplicada.", "Caixa quatro: caso especial, abolitio criminis.", "Resumo: regra é a lei do tempo do crime."];
    const ok = cmds.map((c) => comandoDitado(e, c, 0));
    expect(ok).toEqual([true, true, false, true, true, true, true, true, true, true, true, true]);
    const l = linhaDitado(e);
    expect(l.rabisco!.some((x) => x.t === "texto")).toBe(false); // só desenho, sem letras
    expect(l.rabisco!.some((x) => x.t === "linha" && x.seta)).toBe(true); // a linha do tempo
    expect(l.larg).toBe(1000);
    expect(l.rabisco!.length).toBeLessThanOrEqual(200);
    // três colunas: a 4ª caixa vai para a linha de baixo
    const rets = l.rabisco!.filter((x) => x.t === "ret") as { x: number; y: number }[];
    expect(rets[0]!.y).toBe(rets[1]!.y);
    expect(rets[3]!.y).toBeGreaterThan(rets[0]!.y);
  });
  it("celular: coluna única", () => {
    const e = novoDitado(false);
    comandoDitado(e, "Caixa: regra geral.", 0); comandoDitado(e, "Caixa: exceção.", 0);
    const rets = linhaDitado(e).rabisco!.filter((x) => x.t === "ret") as { y: number }[];
    expect(rets[1]!.y).toBeGreaterThan(rets[0]!.y);
  });
  it("não quebra artigo e mantém os dois-pontos", () => {
    const { frases, resto } = frasesDe("Item: Art. 5º, XXXVI, CF. Item: outra coisa. Caixa dois");
    expect(frases).toEqual(["Item: Art. 5º, XXXVI, CF.", "Item: outra coisa."]);
    expect(resto).toBe("Caixa dois");
  });
  it("conversa solta é ignorada", () => { expect(comandoDitado(novoDitado(true), "Agora olha como isso funciona na prática", 0)).toBe(false); });
});

describe("ditado com letras (modo completo)", () => {
  it("so=false mantém os textos", () => {
    const e = novoDitado(true, false);
    comandoDitado(e, "Título: Extratividade da lei penal.", 0);
    expect(linhaDitado(e).rabisco!.some((x) => x.t === "texto")).toBe(true);
  });
});

describe("conta ditada como num quadro", () => {
  const textos = (e: ReturnType<typeof novoDitado>) => linhaDitado(e).rabisco!.filter((x) => x.t === "texto").map((x) => (x as { s: string }).s);
  it("regra de três: tabela, linhas, cruzar, conta e resposta", () => {
    const e = novoDitado(true);
    for (const c of ["Título: Regra de três.", "Tabela: maçãs, reais.", "Linha: 5, 20.", "Linha: 8, x.", "Cruzar.", "Conta: 5 vezes x igual a 8 vezes 20.", "Conta: x igual a 160 dividido por 5.", "Resposta: x igual a 32."]) comandoDitado(e, c, 0);
    const t = textos(e);
    expect(t).toEqual(expect.arrayContaining(["REGRA DE TRÊS", "maçãs", "20", "x", "5 · x = 8 · 20", "x = 160 ÷ 5", "x = 32"]));
    const l = linhaDitado(e).rabisco!;
    expect(l.filter((x) => x.t === "linha" && x.seta)).toHaveLength(2); // as duas setas cruzadas
    expect(l.some((x) => x.t === "circ")).toBe(true); // o x circulado
  });
  it("mmc, conta armada e divisão", () => {
    const e = novoDitado(false);
    comandoDitado(e, "MMC: 12 e 18.", 0); comandoDitado(e, "Armada: 234 mais 158.", 0); comandoDitado(e, "Divisão: 145 por 4.", 0); fimDitado(e);
    const t = textos(e);
    expect(t).toEqual(expect.arrayContaining(["MMC = 36", "392", "36"]));
  });
  it("tudo dentro dos limites do quadro", () => {
    const e = novoDitado(false);
    for (let i = 0; i < 8; i++) comandoDitado(e, `Conta: passo ${i} mais ${i}.`, 0);
    for (const x of linhaDitado(e).rabisco!) if (x.t === "texto") expect(x.y).toBeLessThanOrEqual(1000);
  });
});

describe("os 5 testes do comando mestre (ditado simulado)", () => {
  const tx = (e: ReturnType<typeof novoDitado>) => linhaDitado(e).rabisco!.filter((x) => x.t === "texto").map((x) => (x as { s: string }).s);
  it("1 · MMC de 12 e 18, divisão por divisão, até o resultado", () => {
    const e = novoDitado(true);
    comandoDitado(e, "Título: MMC de 12 e 18.", 0);
    comandoDitado(e, "MMC: 12 e 18.", 0);
    const antes = linhaDitado(e).rabisco!.length;
    expect(comandoDitado(e, "Vamos conversar sobre números primos.", 0)).toBe(false);
    expect(comandoDitado(e, "Vamos dividir por 2.", 0)).toBe(true);
    expect(linhaDitado(e).rabisco!.length).toBeGreaterThan(antes);
    comandoDitado(e, "Dividimos de novo por 2.", 0); comandoDitado(e, "Agora dividimos por 3.", 0);
    expect(tx(e)).not.toContain("MMC = 36"); // ainda não terminou
    comandoDitado(e, "E mais uma vez por 3.", 0);
    expect(tx(e)).toContain("MMC = 36"); // 1, 1: o resultado nasce sozinho
    expect(tx(e)).toContain("2 × 2 × 3 × 3");
  });
  it("2 · furto × roubo: duas cenas lado a lado", () => {
    const e = novoDitado(true);
    for (const c of ["Título: Furto e roubo.", "Coluna um: furto.", "Pessoa: ladrão.", "Objeto: bolsa.", "Seta: leva.", "Item: subtração sem violência.", "Coluna dois: roubo.", "Pessoa: ladrão.", "Arma.", "Pessoa: vítima.", "Item: grave ameaça ou violência."]) comandoDitado(e, c, 0);
    const l = linhaDitado(e).rabisco!;
    expect(l.filter((x) => x.t === "circ").length).toBeGreaterThanOrEqual(3); // cabeças
    const rets = l.filter((x) => x.t === "ret") as { x: number }[];
    expect(rets[0]!.x).toBeLessThan(rets[rets.length - 1]!.x); // colunas lado a lado
    expect(tx(e)).toEqual(expect.arrayContaining(["ladrão", "bolsa", "vítima"]));
  });
  it("3 · sujeito e predicado com colchetes sob a frase", () => {
    const e = novoDitado(false);
    for (const c of ["Título: Sujeito e predicado.", "Frase: O menino comeu a maçã.", "Sujeito: o menino.", "Predicado: comeu a maçã.", "Verbo: comeu.", "Objeto: a maçã."]) comandoDitado(e, c, 0);
    const l = linhaDitado(e).rabisco!;
    expect(l.filter((x) => x.t === "curva")).toHaveLength(5); // ondinha do título + 4 colchetes
    expect(tx(e)).toEqual(expect.arrayContaining(["O menino comeu a maçã", "Sujeito", "Predicado", "Verbo"]));
  });
  it("4 · cadeia alimentar com setas", () => {
    const e = novoDitado(true);
    comandoDitado(e, "Cadeia: capim, gafanhoto, sapo, cobra, gavião.", 0);
    const l = linhaDitado(e).rabisco!;
    expect(l.filter((x) => x.t === "circ")).toHaveLength(5);
    expect(l.filter((x) => x.t === "linha" && x.seta)).toHaveLength(4);
  });
  it("5 · pirâmide: a hierarquia cresce camada a camada", () => {
    const e = novoDitado(true);
    for (const c of ["Camada: Constituição.", "Camada: leis.", "Camada: decretos.", "Camada: portarias."]) comandoDitado(e, c, 0);
    const rets = linhaDitado(e).rabisco!.filter((x) => x.t === "ret") as { w: number; y: number }[];
    expect(rets).toHaveLength(4);
    expect(rets[3]!.w).toBeGreaterThan(rets[0]!.w);
    expect(rets[3]!.y).toBeGreaterThan(rets[0]!.y);
  });
});
