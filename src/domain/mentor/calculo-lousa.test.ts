import { describe, expect, it } from "vitest";
import { casosDe, ehCalculo, roteiroDeCaso } from "./calculo-lousa";
import { comandoDitado, fimDitado, linhaDitado, novoDitado } from "./ditado";

const MD = `**Caso 1 — Juros e montante.** R$ 8.000,00 a 1,5% a.m., juros simples, por 8 meses. Juros e montante?\n→ J = 8.000 × 0,015 × 8 = R$ 960,00; M = R$ 8.960,00.\n\n**Caso 6 — Capital a partir do montante.** M = R$ 6.600,00 após 5 meses a 4% a.m. Capital?\n→ 6.600 ÷ (1 + 0,04 × 5) = 6.600 ÷ 1,2 = R$ 5.500,00.\n\n**Caso 2 — Aprovados.** Em um curso, 27 dos 60 alunos foram aprovados. Qual a taxa?\n→ 27 ÷ 60 = 0,45 = 45%.`;
const textos = (r: string[], largo = true) => { const e = novoDitado(largo); for (const c of r) comandoDitado(e, c, 0); fimDitado(e); return linhaDitado(e).rabisco!.filter((x) => x.t === "texto").map((x) => (x as { s: string }).s); };

describe("exemplo de matemática vira conta desenhada", () => {
  it("lê os casos da aula", () => {
    const c = casosDe(MD);
    expect(c).toHaveLength(3);
    expect(c[0]!.resultado).toMatch(/^J = 8.000/);
  });
  it("juros: tabela de dados, contas empilhadas e resposta em caixa", () => {
    const r = roteiroDeCaso(casosDe(MD)[0]!)!;
    expect(r).toContain("Tabela: Dado, Valor");
    expect(r).toContain("Linha: Taxa, 1,5% a.m.");
    expect(r).toContain("Conta: J = 8.000 × 0,015 × 8");
    expect(r.at(-1)).toBe("Resposta: M = R$ 8.960,00");
    const t = textos(r);
    expect(t).toEqual(expect.arrayContaining(["Dado", "Valor", "Taxa"]));
  });
  it("cadeia de igualdades vira linhas com '=' embaixo uma da outra", () => {
    const r = roteiroDeCaso(casosDe(MD)[1]!)!;
    expect(r).toEqual(expect.arrayContaining(["Conta: 6.600 ÷ (1 + 0,04 × 5) = 6.600 ÷ 1,2", "Resposta: = R$ 5.500,00"]));
  });
  it("sem conta → null", () => {
    expect(ehCalculo("O agente responde por furto.")).toBe(false);
    expect(roteiroDeCaso({ titulo: "x", enunciado: "texto", resultado: "" })).toBeNull();
  });
  it("MMC no enunciado usa a tabela de fatoração", () => {
    const r = roteiroDeCaso({ titulo: "Caso 3 — MMC", enunciado: "Calcule o MMC de 12 e 18.", resultado: "12 = 2² × 3; 18 = 2 × 3²; MMC = 2² × 3² = 36" })!;
    expect(textos(r)).toEqual(expect.arrayContaining(["12", "18", "MMC = 36"]));
  });
});

import { casoDeTexto } from "./calculo-lousa";
describe("caso em texto puro", () => {
  it("lê parágrafo com seta", () => {
    const c = casoDeTexto("Caso 1 — Juros e montante. R$ 8.000,00 a 1,5% a.m., por 8 meses. Juros?\n→ J = 8.000 × 0,015 × 8 = R$ 960,00; M = R$ 8.960,00.");
    expect(c?.titulo).toBe("Caso 1 — Juros e montante");
    expect(roteiroDeCaso(c!)).not.toBeNull();
  });
});

import { roteiroDeExemplo } from "./catalogo-lousa";
describe("lista de contas vira tabela", () => {
  it("múltiplos de 5", () => {
    const r = roteiroDeExemplo(["- 5 × 1 = 5", "- 5 × 2 = 10", "- 5 × 3 = 15", "- 5 × 4 = 20"], "Múltiplos de 5", "Assim, 5, 10, 15, 20 são múltiplos de 5.")!;
    expect(r).toEqual(expect.arrayContaining(["Tabela: Conta, Resultado", "Linha: 5 × 2, 10", "Exemplo: Multiplicamos 5 por 1, 2, 3, 4"]));
    expect(r.join("|")).not.toMatch(/Passo/);
  });
});

import { roteiroDeConta, roteiroDeFatoracao } from "./calculo-lousa";
describe("fatoração e conta simples", () => {
  it("bloco de decomposição simultânea", () => {
    expect(roteiroDeFatoracao("12  18 | 2\n6   9 | 2\n3   9 | 3\n1   3 | 3\n1   1 |")).toEqual(["Título: MMC de 12 e 18", "MMC: 12 e 18"]);
    expect(roteiroDeFatoracao("texto qualquer")).toBeNull();
  });
  it("conta pedida", () => {
    expect(roteiroDeConta("Calcule 345 + 278.")).toEqual(["Título: Conta armada", "Armada: 345 + 278"]);
    expect(roteiroDeConta("O art. 12 prevê pena.")).toBeNull();
  });
  it("divisão, subtração e multiplicação armadas", () => {
    const e = novoDitado(true);
    for (const c of ["Armada: 845 − 378", "Armada: 123 × 45", "Divisão: 8456 ÷ 4"]) comandoDitado(e, c, 0);
    const s = linhaDitado(e).rabisco!.filter((x) => x.t === "texto").map((x) => (x as { s: string }).s);
    expect(s).toContain("Prova: 2114 × 4 = 8456");
    expect(s.length).toBeGreaterThan(30);
  });
});

import { roteiroDeSituacao, roteiroDeTexto } from "./calculo-lousa";
describe("exemplos sem conta", () => {
  it("situação → pergunta → resposta", () => {
    const r = roteiroDeCaso({ titulo: "Exemplo", enunciado: "Ana é ameaçada pelo vizinho.", pergunta: "O delegado pode agir de ofício?", resultado: "Não. A ação é condicionada à representação." })!;
    expect(r).toEqual(expect.arrayContaining(["Caixa: Situação", "Caixa: Pergunta", "Caixa: Resposta"]));
    expect(roteiroDeSituacao({ titulo: "x", enunciado: "", resultado: "" })).toBeNull();
  });
  it("texto corrido vira passos", () => {
    const r = roteiroDeTexto("Exemplo", "Uma escola tem grupos de 12 e 18 alunos. Queremos o menor encontro comum. Usamos a decomposição. O resultado é 36.")!;
    expect(r[0]).toBe("Título: Exemplo");
    expect(r).toContain("Caixa: Passo 1");
    expect(r.at(-1)).toMatch(/^Destaque: O resultado é 36/);
  });
});
