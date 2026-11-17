import { describe, expect, it } from "vitest";
import { escolherQuadro, quadroDaSecao, type SecaoAula } from "./catalogo-lousa";
import { comandoDitado, linhaDitado, novoDitado } from "./ditado";

const S: SecaoAula[] = [
  { kind: "esquema", title: "Mapa do subtópico", body_markdown: "| Item | O que é | Regra-chave | Como cai |\n|---|---|---|---|\n| 9.8.1 Características | Oral, objetiva, individual | Arts. 202-213 | Compromisso |\n| 9.8.2 Classificação | Diretas, indiretas, informantes | Arts. 209, 401 | Limite 8 |\n| 9.8.3 Procedimento | Cross-examination, recusa, condução | Arts. 206-225 | Precatória |" },
  { kind: "quadro_comparativo", title: "Quadro comparativo", body_markdown: "| Autoridade | Papel |\n|---|---|\n| Polícia | Apreende em flagrante; lavra auto ou boletim |\n| MP | Oitiva informal; arquiva, remite ou representa |" },
  { kind: "comparacao", title: "Diferenciações que derrubam candidatos", body_markdown: "1. **Ciclista montado × desmontado:** condutor × pedestre.\n2. **Ciclovia × ciclofaixa:** separada fisicamente × faixa na pista." },
  { kind: "exemplos", title: "Casos práticos resolvidos", body_markdown: "**Caso 1 — Fase.** Qualquer.\n→ Pode.\n\n**Caso 2 — Júri.** Em plenário.\n→ 3 dias úteis." },
];
const roda = (r: string[]) => { const e = novoDitado(true); for (const c of r) comandoDitado(e, c, 0); return linhaDitado(e).rabisco!; };

describe("quadros prontos da aula catalogada", () => {
  it("tabela vira caixas com itens rotulados", () => {
    const q = quadroDaSecao(S[0]!, true)!;
    expect(q.roteiro[0]).toBe("Título: Mapa do subtópico");
    expect(q.roteiro.filter((c) => c.startsWith("Caixa")).length).toBe(3);
    expect(q.roteiro).toContain("Item: O que é: Oral, objetiva, individual");
    const r = roda(q.roteiro);
    expect(r.filter((x) => x.t === "ret").length).toBe(3);
    expect(r.filter((x) => x.t === "texto").map((x) => (x as { s: string }).s)).toContain("9.8.1"); // a numeração do subtópico não some
  });
  it("comparação e casos práticos viram caixas e destaques", () => {
    expect(quadroDaSecao(S[2]!, true)!.roteiro).toContain("Caixa: Ciclista montado × desmontado");
    const c = quadroDaSecao(S[3]!, false)!;
    expect(c.roteiro).toEqual(expect.arrayContaining(["Caixa: Caso 1 — Fase", "Exemplo: Qualquer", "Destaque: Pode"]));
  });
  it("escolhe a seção pelo pedido", () => {
    expect(escolherQuadro(S, "dá um exemplo prático no quadro", true)!.kind).toBe("exemplos");
    expect(escolherQuadro(S, "qual a diferença entre ciclovia e ciclofaixa", true)!.kind).toBe("comparacao");
    expect(escolherQuadro(S, "faz um esquema pra mim", true)!.kind).toBe("esquema");
  });
  it("nenhuma seção desenhável → null", () => {
    expect(escolherQuadro([{ kind: "explicacao", title: "x", body_markdown: "texto" }], "exemplo", true)).toBeNull();
  });
  it("tudo cabe no quadro (limites)", () => {
    for (const x of roda(quadroDaSecao(S[0]!, false)!.roteiro)) if (x.t === "texto") expect(x.y).toBeLessThanOrEqual(1000);
  });
});

import { validarRoteiro } from "./catalogo-lousa";
describe("roteiros escritos pela IA", () => {
  it("aceita esquema de direito e conta de matemática; recusa lixo", () => {
    const dir = ["Título: Extratividade da lei penal", "Linha do tempo: de fato até sentença", "Marco: Fato cometido", "Marco: Lei nova", "Caixa: Retroatividade", "Item: Lei nova benéfica alcança fatos passados", "Destaque: Vale até após o trânsito em julgado", "Caixa: Ultra-atividade", "Item: Lei revogada ainda vale para fatos antigos", "Resumo: A lei mais favorável ao réu sempre se aplica"];
    expect(validarRoteiro(dir)?.length).toBe(dir.length);
    const mat = ["Título: Regra de três", "Tabela: maçãs, reais", "Linha: 5, 20", "Linha: 8, x", "Cruzar", "Conta: 5 vezes x igual a 8 vezes 20", "Conta: x igual a 160 dividido por 5", "Resposta: x igual a 32"];
    expect(validarRoteiro(mat)).not.toBeNull();
    expect(validarRoteiro(["blá", "blá blá", "texto solto", "mais texto", "outra frase", "fim de papo", "nada"])).toBeNull();
  });
  it("quadro guardado para o tópico vence a conversão quando o pedido casa", () => {
    const g = [{ tipo: "calculo", titulo: "Regra de três", gatilhos: ["regra", "calcular"], roteiro: ["Título: Regra de três", "Tabela: a, b"] }];
    expect(escolherQuadro(S, "como calcular a regra de três", true, g)?.kind).toBe("calculo");
  });
});

import { roteiroDeExemplo } from "./catalogo-lousa";
describe("exemplo da aula vira quadro", () => {
  it("fatos com datas viram linha do tempo e caixas", () => {
    const r = roteiroDeExemplo(["Em janeiro, determinado crime possui pena de 1 a 4 anos.", "Em junho, uma lei aumenta a pena para 2 a 8 anos.", "O agente praticou o crime em março."])!;
    expect(r).toContain("Linha do tempo:");
    expect(r).toContain("Marco: Janeiro");
    expect(r).toContain("Marco: Junho");
    expect(r.filter((c) => c.startsWith("Caixa")).length).toBe(3);
    const e = novoDitado(true); for (const c of r) comandoDitado(e, c, 0);
    expect(e.itens.length).toBeGreaterThan(15);
  });
  it("sem datas vira passos; com 1 item não vira quadro", () => {
    expect(roteiroDeExemplo(["João pega a bolsa de Maria", "Maria percebe e grita"])!.filter((c) => c.startsWith("Caixa: Passo")).length).toBe(2);
    expect(roteiroDeExemplo(["só um"])).toBeNull();
  });
});

import { exemplosDaAula } from "./catalogo-lousa";
describe("exemplos escritos na própria aula", () => {
  const aula: SecaoAula[] = [{ kind: "explicacao", title: "Conflito de leis penais", body_markdown: `**1. Regra da irretroatividade**\n\nA lei penal nova não alcança fatos anteriores.\n\n**EXEMPLO:**\n\n- Em janeiro, crime possui pena de 1 a 4 anos.\n- Em junho, uma lei aumenta a pena para 2 a 8 anos.\n- O agente praticou o crime em março.\n\nA lei de junho não poderá ser utilizada para aumentar a punição pelo fato de março.\n\n**2. Regra da retroatividade benéfica**\n\n**EXEMPLO:**\n\n- Em janeiro, crime possui pena de 2 a 8 anos.\n- Em junho, uma lei reduz a pena para 1 a 4 anos.\n- O agente praticou o crime em março.\n\nA lei de junho poderá ser aplicada ao fato de março.` }];
  it("extrai cada exemplo com a regra e a conclusão", () => {
    const ex = exemplosDaAula(aula);
    expect(ex).toHaveLength(2);
    expect(ex[0]!.contexto).toBe("Regra da irretroatividade");
    expect(ex[0]!.itens).toHaveLength(3);
    expect(ex[1]!.conclusao).toMatch(/poderá ser aplicada/);
  });
  it("o Mentor escolhe o exemplo da regra pedida e desenha com a conclusão", () => {
    const q = escolherQuadro(aula, "dá um exemplo da retroatividade benéfica no quadro", true)!;
    expect(q.kind).toBe("exemplos");
    expect(q.roteiro.join(" ")).toMatch(/reduz a pena/);
    expect(q.roteiro.some((c) => c.startsWith("Destaque: A lei de junho poderá"))).toBe(true);
    expect(escolherQuadro(aula, "me dá um exemplo sobre irretroatividade", true)!.roteiro.join(" ")).toMatch(/aumenta a pena/);
  });
});
