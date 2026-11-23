import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analiseDoBanco, comandoAnaliseParaCargo, lerAnalise, tomPrioridade } from "./analise";

const modelo = readFileSync(join(__dirname, "__fixtures__/analise-pcmg.txt"), "utf8");

describe("lerAnalise (modelo ANÁLISE COMPLETA DO EDITAL)", () => {
  const r = lerAnalise(modelo);
  if (!r.ok) throw new Error(r.erros.join("; "));
  const a = r.analise;

  it("lê o título e a estrutura da prova", () => {
    expect(a.titulo).toBe("ANÁLISE COMPLETA DO EDITAL — PCMG | INVESTIGADOR");
    expect(a.estrutura.blocos).toEqual([
      { nome: "Conhecimentos Básicos", disciplinas: 4, questoes: 30, percentual: 42.86 },
      { nome: "Conhecimentos Específicos", disciplinas: 8, questoes: 40, percentual: 57.14 },
    ]);
    expect(a.estrutura.total).toEqual({ disciplinas: 12, questoes: 70 });
    expect(a.estrutura.notas).toHaveLength(4);
  });

  it("lê as 12 disciplinas com bloco, questões, prioridade, focos e estratégia", () => {
    expect(a.disciplinas).toHaveLength(12);
    const lp = a.disciplinas[0]!;
    expect(lp).toMatchObject({ ordem: 1, nome: "LÍNGUA PORTUGUESA", bloco: "CONHECIMENTOS BÁSICOS", questoes: 10, prioridade: "MUITO ALTA", percentual: 14.29 });
    expect(lp.focos).toHaveLength(6);
    expect(lp.focos[0]).toBe("Interpretação e compreensão de textos");
    expect(lp.estrategia.startsWith("Resolver questões diariamente.")).toBe(true);
    expect(lp.descricao.startsWith("É uma das disciplinas")).toBe(true);
    const ext = a.disciplinas.find((d) => d.nome.startsWith("LEGISLAÇÃO PENAL"))!;
    expect(ext.prioridade).toBe("ALTA COMPLEXIDADE E GRANDE EXTENSÃO");
    expect(ext.bloco).toBe("CONHECIMENTOS ESPECÍFICOS");
    expect(a.disciplinas.every((d) => d.focos.length > 0 && d.estrategia && d.prioridade)).toBe(true);
    expect(a.disciplinas.reduce((s, d) => s + (d.questoes ?? 0), 0)).toBe(70);
  });

  it("lê a classificação, os grupos de dificuldade e a organização do estudo", () => {
    expect(a.distribuicao.classificacao.map((c) => [c.nivel, c.disciplinas.length])).toEqual([["MUITO ALTA", 2], ["ALTA", 6], ["ESTRATÉGICA", 4]]);
    expect(a.dificuldades.map((g) => g.grupo)).toHaveLength(4);
    expect(a.dificuldades[1]!.disciplinas).toHaveLength(5);
    expect(a.organizacao.horas).toHaveLength(12);
    expect(a.organizacao.horas[0]).toEqual({ disciplina: "Português", horas: 4 });
    expect(a.organizacao.totalHoras).toBe(30);
    expect(a.organizacao.ciclo.map((c) => c.etapa)).toEqual(["APRENDIZADO", "FIXAÇÃO", "CORREÇÃO", "REVISÃO", "SIMULADO"]);
  });

  it("lê material e conclusão", () => {
    expect(a.material.itens).toHaveLength(7);
    expect(a.material.itens[0]!.titulo).toBe("CONTEÚDO PROGRAMÁTICO LITERAL");
    expect(a.conclusao.decisoes).toHaveLength(5);
    expect(a.conclusao.recomendacao).toHaveLength(9);
    expect(a.conclusao.recomendacao[0]).toContain("Transformar o programa");
    expect(a.conclusao.observacao).toContain("Edital nº 04/2024");
  });

  it("confere os números: aponta que as horas somam 28,5h e não 30h (inconsistência do próprio texto)", () => {
    expect(r.avisos).toEqual(["As horas semanais somam 28.5h, mas o total declarado é 30h."]);
    expect(r.resumo).toEqual({ disciplinas: 12, questoes: 70, blocos: 2, grupos: 4, horas: 30 });
  });
});

describe("lerAnalise: erros e variações", () => {
  it("pede o texto quando vem vazio ou sem a seção de disciplinas", () => {
    expect(lerAnalise("oi").ok).toBe(false);
    const r = lerAnalise("Um texto qualquer ".repeat(30));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros[0]).toContain("ANÁLISE POR DISCIPLINA");
  });

  it("avisa quando as questões não batem com o total", () => {
    const quebrado = modelo.replace("1. LÍNGUA PORTUGUESA — 10 QUESTÕES", "1. LÍNGUA PORTUGUESA — 12 QUESTÕES");
    const r = lerAnalise(quebrado);
    expect(r.ok && r.avisos.some((a) => a.includes("somam 72 questões"))).toBe(true);
  });

  it("aceita tabelas em markdown com barras e títulos com #", () => {
    const md = modelo.replace(/\t/g, " | ").replace(/^(Bloco|Disciplina) \|/gm, "| $1 |").replace(/^1\. ESTRUTURA/m, "## 1. ESTRUTURA");
    const r = lerAnalise(md);
    expect(r.ok).toBe(true);
  });

  it("aceita disciplina sem número de questões, com aviso", () => {
    const r = lerAnalise(modelo.replace("1. LÍNGUA PORTUGUESA — 10 QUESTÕES", "1. LÍNGUA PORTUGUESA — QUESTÕES NÃO INFORMADAS"));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.analise.disciplinas[0]!.questoes).toBeNull();
      expect(r.avisos.some((a) => a.includes("número de questões não informado"))).toBe(true);
    }
  });
});

describe("auxiliares", () => {
  it("tomPrioridade", () => {
    expect(tomPrioridade("MUITO ALTA")).toBe(1);
    expect(tomPrioridade("ALTA")).toBe(2);
    expect(tomPrioridade("ALTA COMPLEXIDADE E GRANDE EXTENSÃO")).toBe(2);
    expect(tomPrioridade("ESTRATÉGICA")).toBe(3);
    expect(tomPrioridade("CONTEÚDO TÉCNICO")).toBe(4);
  });
  it("comando traz o cargo e o modelo", () => {
    const c = comandoAnaliseParaCargo("Investigador");
    expect(c).toContain("cargo: Investigador");
    expect(c).toContain("ANÁLISE POR DISCIPLINA");
  });
  it("analiseDoBanco só aceita a versão conhecida", () => {
    expect(analiseDoBanco(null)).toBeNull();
    expect(analiseDoBanco({ versao: 9, disciplinas: [{}] })).toBeNull();
    const r = lerAnalise(modelo);
    if (r.ok) expect(analiseDoBanco(JSON.parse(JSON.stringify(r.analise)))?.disciplinas).toHaveLength(12);
  });
});
