import { describe, expect, it } from "vitest";
import { casaCompleta, colocarNaCasa, conferir, exercicioAleatorio, lerExercicio, mdcDe, mmcDe, montarEsqueleto, passosMdc, passosMmc, ROTULOS, TIPOS_LOG, TIPOS_MAT, textoDaCasa, textoDoExercicio, tiposDaAula, type Esqueleto, type TipoEsqueleto } from "./quadro-esqueleto";
import { classificar, equivalentes, negar, parse, str } from "./quadro-logica";
import { materiaTemLousa, perfilDaAula } from "./quadro-perfil";
import type { Item, Medidor } from "./quadro-motor";

const med: Medidor = () => ({ asc: 0.7, desc: 0, w: 0.6 });
const TIPOS = Object.keys(ROTULOS) as TipoEsqueleto[];
const resolver = (e: Esqueleto): Item[] => e.casas.reduce<Item[]>((it, c) => colocarNaCasa(it, c, c.esperado, "azul", med, e.size), []);
const monta = (t: TipoEsqueleto, nums: number[], entrada?: string, larg = 360, alt = 340) => montarEsqueleto(t, { nums, entrada }, larg, med, alt);

describe("lousa só para Matemática e Raciocínio Lógico", () => {
  it("matérias com lousa", () => {
    for (const m of ["Matemática", "Raciocínio Lógico", "Matemática Financeira", "Raciocínio Lógico-Matemático"]) expect(materiaTemLousa(m), m).toBe(true);
    for (const m of ["Língua Portuguesa", "Direito Penal", "Informática", "Direito Processual Penal", "Ética e Cidadania", "Geopolítica", null, undefined]) expect(materiaTemLousa(m as string), String(m)).toBe(false);
  });
  it("perfil é de cálculo em toda aula dessas matérias", () => {
    expect(perfilDaAula({ aula: "Conceito de proposição lógica", materia: "Raciocínio Lógico" }).modo).toBe("calculo");
    expect(perfilDaAula({ aula: "Qualquer assunto novo", materia: "Matemática" }).modo).toBe("calculo");
    expect(perfilDaAula({ aula: "Crimes contra a pessoa", materia: "Direito Penal" }).modo).toBe("texto");
  });
});

describe("esqueletos: todos os tipos", () => {
  it("MMC e MDC", () => {
    expect(passosMmc([12, 18]).primos).toEqual([2, 2, 3, 3]);
    expect(passosMdc([12, 18]).primos).toEqual([2, 3]);
    expect(mmcDe([6, 8, 9])).toBe(72);
    expect(mdcDe([18, 27, 36])).toBe(9);
  });
  it("cada tipo: monta, tem passos explicados, cabe na tela, resolve e confere", () => {
    for (const t of TIPOS) for (let k = 0; k < 15; k++) {
      const ex = exercicioAleatorio(t);
      const lido = lerExercicio(t, ex.entrada ?? ex.nums.join(", "));
      if (!["proposicao", "principios", "simcomp"].includes(t)) expect(lido, `${t} ${JSON.stringify(ex)}`).toHaveProperty("ex");
      if (!("ex" in lido) && !["proposicao", "principios", "simcomp"].includes(t)) continue;
      const e = montarEsqueleto(t, ex, 360, med, 340);
      expect(e.passos.length, t).toBeGreaterThan(0);
      expect(e.passos.every((p) => p.casas.length > 0 && p.texto && p.porque && p.dica), `${t} passos`).toBe(true);
      expect(e.casas.length, t).toBe(e.passos.reduce((s, p) => s + p.casas.length, 0));
      const it = resolver(e);
      expect(conferir(it, e).every(Boolean), `${t} ${JSON.stringify(ex)}`).toBe(true);
      expect(e.casas.every((c) => casaCompleta(it, c)), `${t} completo`).toBe(true);
      const xs = e.casas.flatMap((c) => [c.x0, c.x1]);
      expect(Math.min(...xs), `${t} esquerda`).toBeGreaterThanOrEqual(0);
      expect(Math.max(...xs), `${t} direita ${JSON.stringify(ex)}`).toBeLessThanOrEqual(362);
      expect(textoDoExercicio(e), t).toBeTruthy();
    }
  });
  it("respostas finais corretas (matemática)", () => {
    expect(monta("soma", [478, 356]).resposta).toBe("478 + 356 = 834");
    expect(monta("sub", [532, 187]).resposta).toBe("532 − 187 = 345");
    expect(monta("mult", [23, 45]).resposta).toBe("23 × 45 = 1035");
    expect(monta("div", [2105, 5]).resposta).toBe("2105 ÷ 5 = 421");
    expect(monta("frac", [1, 2, 1, 3]).resposta).toBe("1/2 + 1/3 = 5/6");
    expect(monta("fracs", [3, 4, 1, 6]).resposta).toBe("3/4 − 1/6 = 7/12");
    expect(monta("pct", [80, 15]).resposta).toBe("15% de 80 = 12");
    expect(monta("regra3", [3, 12, 7]).resposta).toBe("x = 28");
    expect(monta("regra3i", [6, 10, 4]).resposta).toBe("x = 15");
    expect(monta("regra3c", [3, 4, 120, 5, 6]).resposta).toBe("x = 300");
    expect(monta("eq1", [3, 5, 20]).resposta).toBe("x = 5");
    expect(monta("eq2", [2, 5]).resposta).toBe("x' = 5 e x'' = 2");
    expect(monta("media", [5, 8, 7, 10]).resposta).toBe("Média = 7,5");
    expect(monta("jurosc", [1000, 10, 2]).resposta).toBe("Montante = 1210");
    expect(monta("sucessivas", [10, 1, 20, 0]).resposta).toContain("12% de desconto");
    expect(monta("comb", [7, 3]).resposta).toBe("C(7,3) = 35");
    expect(monta("convfd", [3, 4, 0]).resposta).toBe("3/4 = 0,75");
    expect(monta("convfd", [75, 2, 1]).resposta).toBe("0,75 = 3/4");
    expect(monta("decimal", [], "2,5×1,2").resposta).toBe("2,5 × 1,2 = 3");
    expect(monta("decimal", [], "2,35+1,4").resposta).toBe("2,35 + 1,4 = 3,75");
    expect(monta("primo", [91]).resposta).toBe("91 é COMPOSTO");
    expect(monta("primo", [97]).resposta).toBe("97 é PRIMO");
    expect(monta("divisib", [2340]).resposta).toBe("2340: 2, 3, 4, 5, 9, 10");
    expect(monta("ordem", [], "0,5;-2;3/4;1,2;-1,5").resposta).toBe("Em ordem: -2 < -1,5 < 0,5 < 0,75 < 1,2");
    expect(monta("classnum", [], "7;-3;0,5;√2;2/3").resposta).toBe("7: N; -3: Z; 0,5: Q; √2: I; 2/3: Q");
  });
  it("lógica: tabela-verdade, classificação, argumentos, negação", () => {
    expect(classificar(parse("p∨~p")!)).toBe("TAUTOLOGIA");
    expect(classificar(parse("p∧~p")!)).toBe("CONTRADIÇÃO");
    expect(classificar(parse("p→q")!)).toBe("CONTINGÊNCIA");
    expect(classificar(parse("~(p→q)↔(p∧~q)")!)).toBe("TAUTOLOGIA");
    expect(monta("tabela", [], "(p∨q)→r").resposta).toBe("(p∨q)→r é CONTINGÊNCIA");
    expect(monta("tabela", [], "(p∧q)→p").resposta).toContain("TAUTOLOGIA");
    expect(monta("argumento", [], "p→q;p/q").resposta).toBe("Argumento VÁLIDO");
    expect(monta("argumento", [], "p→q;q/p").resposta).toBe("Argumento INVÁLIDO");
    expect(monta("argumento", [], "p→q;q→r/p→r").resposta).toBe("Argumento VÁLIDO");
    expect(monta("valor", [], "p=V,q=F;(p∨q)→~q").resposta).toBe("(p∨q)→~q é V");
    expect(str(negar(parse("p∧q")!).f)).toBe("~p∨~q");
    expect(str(negar(parse("p→q")!).f)).toBe("p∧~q");
    expect(str(negar(parse("p↔q")!).f)).toBe("(p∧~q)∨(q∧~p)");
    expect(equivalentes(parse("p→q")!).map((x) => str(x.f))).toEqual(["~q→~p", "~p∨q"]);
    expect(monta("negacao", [], "p∧q").resposta).toBe("~(p∧q) = ~p∨~q");
    expect(monta("quant", [], "todo|policial|atento").resposta).toBe("Algum policial não é atento");
    expect(monta("tabela", [], "p→q").casas.filter((c) => c.opcoes).length).toBe(1);
  });
  it("conferência detecta casa errada e aceita a forma alternativa", () => {
    const e = monta("mult", [23, 45]);
    let it = resolver(e);
    it = colocarNaCasa(it, e.casas[0]!, "7", "azul", med, e.size);
    expect(conferir(it, e)[0]).toBe(false);
    expect(textoDaCasa(it, e.casas[0]!)).toBe("7");
    const d = monta("div", [2105, 5]);
    const alt = d.casas.find((c) => c.alt)!;
    expect(conferir(colocarNaCasa([], alt, alt.alt!, "azul", med, d.size), d)[alt.id]).toBe(true);
  });
  it("valida o que o aluno digita", () => {
    expect(lerExercicio("sub", "5, 9")).toHaveProperty("erro");
    expect(lerExercicio("regra3", "3, 10, 7")).toHaveProperty("erro");
    expect(lerExercicio("mmc", "12, 18")).toHaveProperty("ex");
    expect(lerExercicio("tabela", "(p∨q)→r")).toHaveProperty("ex");
    expect(lerExercicio("tabela", "xyz")).toHaveProperty("erro");
    expect(lerExercicio("tabela", "p->q")).toHaveProperty("ex");
    expect(lerExercicio("decimal", "2,5x1,2")).toHaveProperty("ex");
    expect(lerExercicio("argumento", "p→q;p/q")).toHaveProperty("ex");
  });
});

/** Todas as aulas catalogadas de Matemática e Raciocínio Lógico (catalog_topics), com a conta que abre primeiro. */
const CATALOGO: [string, string, TipoEsqueleto][] = [
  ["Matemática", "Comparação, ordenação e representação dos números na reta numérica", "ordem"],
  ["Matemática", "Expressões numéricas e operações com números reais", "expr"],
  ["Matemática", "Números naturais, inteiros, racionais, irracionais e reais", "classnum"],
  ["Matemática", "Operações fundamentais: adição, subtração, multiplicação e divisão", "soma"],
  ["Matemática", "Potenciação e radiciação", "pot"],
  ["Matemática", "Propriedades das operações: comutativa, associativa, distributiva e elemento neutro", "propr"],
  ["Matemática", "Representação dos números na forma fracionária e decimal", "convfd"],
  ["Matemática", "Conceito, representação e classificação de frações", "classfrac"],
  ["Matemática", "Conversão entre frações e números decimais", "convfd"],
  ["Matemática", "Frações equivalentes, simplificação e comparação", "fraceq"],
  ["Matemática", "Operações com frações: adição, subtração, multiplicação e divisão", "frac"],
  ["Matemática", "Operações com números decimais", "decimal"],
  ["Matemática", "Problemas envolvendo frações e números decimais", "fracde"],
  ["Matemática", "Critérios de divisibilidade", "divisib"],
  ["Matemática", "Máximo Divisor Comum (MDC)", "mdc"],
  ["Matemática", "Mínimo Múltiplo Comum (MMC)", "mmc"],
  ["Matemática", "Múltiplos e divisores de números naturais", "divisores"],
  ["Matemática", "Números primos e decomposição em fatores primos", "fat"],
  ["Matemática", "Aplicações de juros em situações-problema", "juros"],
  ["Matemática", "Aumentos e descontos percentuais", "aumdesc"],
  ["Matemática", "Capital, taxa, tempo e montante", "juros"],
  ["Matemática", "Conceito e cálculo de porcentagem", "pct"],
  ["Matemática", "Juros compostos", "jurosc"],
  ["Matemática", "Juros simples", "juros"],
  ["Matemática", "Porcentagem aplicada à resolução de problemas", "pct"],
  ["Matemática", "Variações percentuais sucessivas", "sucessivas"],
  ["Matemática", "Aplicações práticas de razão, proporção e proporcionalidade", "proporcao"],
  ["Matemática", "Conceito de razão e proporção", "proporcao"],
  ["Matemática", "Divisão proporcional", "razao"],
  ["Matemática", "Grandezas diretamente e inversamente proporcionais", "regra3"],
  ["Matemática", "Propriedades das proporções", "proporcao"],
  ["Matemática", "Regra de três composta", "regra3c"],
  ["Matemática", "Regra de três simples", "regra3"],
  ["Matemática", "Taxas de variação de grandezas", "variacao"],
  ["Raciocínio Lógico", "Conceito de proposição lógica", "proposicao"],
  ["Raciocínio Lógico", "Princípios fundamentais da lógica", "principios"],
  ["Raciocínio Lógico", "Proposições simples e compostas", "simcomp"],
];
describe("todas as aulas catalogadas têm esqueleto", () => {
  it.each(CATALOGO)("%s — %s", (mat, titulo, primeiro) => {
    const ts = tiposDaAula(titulo, mat);
    expect(ts[0], titulo).toBe(primeiro);
    // e todas as contas oferecidas funcionam
    expect(new Set(ts).size).toBe(ts.length);
  });
  it("a lista cobre todos os tipos de cada matéria", () => {
    expect(new Set(tiposDaAula("Assunto novo", "Matemática"))).toEqual(new Set(TIPOS_MAT));
    expect(new Set(tiposDaAula("Assunto novo", "Raciocínio Lógico"))).toEqual(new Set(TIPOS_LOG));
    for (const t of ["tabela", "valor", "negacao", "equiv", "argumento", "quant"] as TipoEsqueleto[]) expect(TIPOS_LOG).toContain(t);
  });
  it("lógica: tautologia, contradição e tabela-verdade estão nas aulas de lógica", () => {
    expect(tiposDaAula("Tabela-verdade", "Raciocínio Lógico")[0]).toBe("tabela");
    expect(tiposDaAula("Tautologia, contradição e contingência", "Raciocínio Lógico")[0]).toBe("tabela");
    expect(tiposDaAula("Negação de proposições e leis de De Morgan", "Raciocínio Lógico")[0]).toBe("negacao");
    expect(tiposDaAula("Equivalências lógicas", "Raciocínio Lógico")[0]).toBe("equiv");
    expect(tiposDaAula("Argumentos e silogismos", "Raciocínio Lógico")[0]).toBe("argumento");
    expect(tiposDaAula("Quantificadores", "Raciocínio Lógico")[0]).toBe("quant");
  });
});
