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
