import { describe, expect, it } from "vitest";
import { comandoDitado, frasesDe, linhaDitado, novoDitado } from "./ditado";

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
    comandoDitado(e, "MMC: 12 e 18.", 0); comandoDitado(e, "Armada: 234 mais 158.", 0); comandoDitado(e, "Divisão: 145 por 4.", 0);
    const t = textos(e);
    expect(t).toEqual(expect.arrayContaining(["MMC = 36", "392", "36"]));
  });
  it("tudo dentro dos limites do quadro", () => {
    const e = novoDitado(false);
    for (let i = 0; i < 8; i++) comandoDitado(e, `Conta: passo ${i} mais ${i}.`, 0);
    for (const x of linhaDitado(e).rabisco!) if (x.t === "texto") expect(x.y).toBeLessThanOrEqual(1000);
  });
});
