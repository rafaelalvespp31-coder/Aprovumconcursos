import { describe, expect, it } from "vitest";
import { comandoDitado, frasesDe, linhaDitado, novoDitado } from "./ditado";

describe("ditado do desenho", () => {
  it("monta o esquema da extratividade em ordem", () => {
    const e = novoDitado(true);
    const cmds = ["Título: Extratividade da lei penal.", "Linha do tempo: do tempo do crime até hoje.", "Acompanhe a linha que estou fazendo.", "Caixa um: regra geral.", "Item: princípio da irretroatividade.", "Item: a lei penal não retroage.", "Caixa dois: retroatividade.", "Item: lei nova mais benéfica retroage.", "Caixa três: ultra-atividade.", "Item: lei mais benéfica continua aplicada.", "Caixa quatro: caso especial, abolitio criminis.", "Resumo: regra é a lei do tempo do crime."];
    const ok = cmds.map((c) => comandoDitado(e, c, 0));
    expect(ok).toEqual([true, true, false, true, true, true, true, true, true, true, true, true]);
    const l = linhaDitado(e);
    const textos = l.rabisco!.filter((x) => x.t === "texto").map((x) => (x as { s: string }).s).join(" ");
    expect(textos).toContain("EXTRATIVIDADE");
    expect(textos).toContain("REGRA GERAL");
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
