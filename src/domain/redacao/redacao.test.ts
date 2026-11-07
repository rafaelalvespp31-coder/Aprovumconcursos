import { describe, expect, it } from "vitest";
import { ajustar, classificar, revisarPontuacao, tetoNormaCulta } from "./consistencia";
import { compararErros, compararNotas, insights, tendencia, type AvaliacaoResumo } from "./progresso";
import { RUBRICA_CONCURSO, RUBRICA_ENEM, rubricaDaModalidade } from "./rubricas";
import { contar, linhasEstimadas, localizar, paragrafoDe, validarParaEnvio } from "./texto";
import type { Analise } from "./schemas";

const analise = (o: Partial<Analise> = {}): Analise => ({
  tema: { compreensao: "x", aderencia: "adequado", tipoTextual: "adequado" },
  estrutura: { introducao: { nivel: "bom", avaliacao: "x" }, desenvolvimento: { nivel: "bom", avaliacao: "x" }, conclusao: { nivel: "bom", avaliacao: "x" }, tese: { presente: true, observacao: "x" }, paragrafos: [] },
  coesaoCoerencia: { nivel: "bom", avaliacao: "x" },
  argumentacao: { nivel: "bom", avaliacao: "x", repertorio: { presente: true, avaliacao: "x" }, argumentosSuperficiais: [], contradicoes: [] },
  propostaIntervencao: { exigida: true, presente: true, agente: true, acao: true, meio: true, finalidade: true, detalhamento: true, respeitaDireitosHumanos: true, observacao: "x" },
  nota_zero: { aplica: false },
  ...o,
});
const todas = (rub: typeof RUBRICA_ENEM, v: number) => rub.criteria.map((c) => ({ key: c.key, pontuacao: v, justificativa: "j" }));

describe("texto", () => {
  it("conta palavras e caracteres", () => expect(contar("um dois  três")).toEqual({ words: 3, chars: 13 }));
  it("estima linhas por parágrafo", () => expect(linhasEstimadas("a".repeat(76) + "\n\nb")).toBe(3));
  it("localiza trecho exato e não repete a mesma posição", () => {
    const t = "Ele foi ao mercado. Ele foi ao mercado.";
    const a = localizar(t, "Ele foi")!;
    const b = localizar(t, "Ele foi", [a])!;
    expect(a.start).toBe(0);
    expect(b.start).toBe(20);
  });
  it("localiza com espaços e caixa diferentes e devolve posição no original", () => {
    const t = "A  violência\nurbana cresce.";
    const r = localizar(t, "a violência urbana")!;
    expect(t.slice(r.start, r.end)).toBe("A  violência\nurbana");
  });
  it("não inventa posição para trecho inexistente", () => expect(localizar("texto curto", "outra coisa")).toBeNull());
  it("acha o parágrafo do deslocamento", () => expect(paragrafoDe("p1\np2\np3", 4)).toBe(1));
  it("exige conteúdo mínimo e respeita o máximo", () => {
    expect(validarParaEnvio("curto").ok).toBe(false);
    expect(validarParaEnvio("palavra ".repeat(80)).ok).toBe(true);
    expect(validarParaEnvio("a ".repeat(7000)).ok).toBe(false);
  });
});

describe("consistência da pontuação", () => {
  it("ajusta ao degrau válido do ENEM sem arredondar para cima", () => expect(ajustar(150, RUBRICA_ENEM.criteria[0]!)).toBe(120));
  it("teto da norma culta cai com os desvios", () => {
    expect(tetoNormaCulta(1)).toBe(200);
    expect(tetoNormaCulta(6)).toBe(120);
    expect(tetoNormaCulta(30)).toBe(40);
  });
  it("soma as competências sem média arbitrária", () => {
    const r = revisarPontuacao({ rubrica: RUBRICA_ENEM, pontuacoes: [{ key: "c1", pontuacao: 160, justificativa: "a" }, { key: "c2", pontuacao: 120, justificativa: "b" }, { key: "c3", pontuacao: 120, justificativa: "c" }, { key: "c4", pontuacao: 160, justificativa: "d" }, { key: "c5", pontuacao: 200, justificativa: "e" }], analise: analise(), desviosObjetivos: 3 });
    expect(r.total).toBe(760);
    expect(r.max).toBe(1000);
  });
  it("limita C1 pelos desvios apontados e registra o ajuste", () => {
    const r = revisarPontuacao({ rubrica: RUBRICA_ENEM, pontuacoes: todas(RUBRICA_ENEM, 200), analise: analise(), desviosObjetivos: 12 });
    expect(r.criterios[0]!.score).toBe(80);
    expect(r.notes.join(" ")).toMatch(/12 desvio/);
  });
  it("proposta de intervenção ausente zera a C5; tangência limita C2", () => {
    const r = revisarPontuacao({ rubrica: RUBRICA_ENEM, pontuacoes: todas(RUBRICA_ENEM, 200), analise: analise({ tema: { compreensao: "x", aderencia: "tangencia", tipoTextual: "adequado" }, propostaIntervencao: { ...analise().propostaIntervencao, presente: false } }), desviosObjetivos: 0 });
    expect(r.criterios.find((c) => c.key === "c5")!.score).toBe(0);
    expect(r.criterios.find((c) => c.key === "c2")!.score).toBe(40);
  });
  it("fuga ao tema no ENEM zera tudo", () => {
    const r = revisarPontuacao({ rubrica: RUBRICA_ENEM, pontuacoes: todas(RUBRICA_ENEM, 160), analise: analise({ tema: { compreensao: "x", aderencia: "fuga", tipoTextual: "adequado" } }), desviosObjetivos: 0 });
    expect(r.total).toBe(0);
    expect(r.zeroReason).toMatch(/Fuga/);
  });
  it("critério ausente vira 0 e é avisado", () => {
    const r = revisarPontuacao({ rubrica: RUBRICA_CONCURSO, pontuacoes: [{ key: "tema_genero", pontuacao: 18, justificativa: "ok" }], analise: analise(), desviosObjetivos: 0 });
    expect(r.criterios.filter((c) => c.score === 0).length).toBe(3);
    expect(r.notes.length).toBeGreaterThan(0);
  });
  it("nunca passa do máximo", () => expect(ajustar(999, RUBRICA_CONCURSO.criteria[0]!)).toBe(20));
  it("classifica e escolhe rubrica", () => {
    expect(classificar(900, 1000)).toBe("Excelente");
    expect(classificar(100, 1000)).toBe("Precisa de reforço");
    expect(rubricaDaModalidade("enem").key).toBe("enem");
    expect(rubricaDaModalidade("relatorio").estimated).toBe(true);
  });
});

const av = (id: string, dia: number, c1: number, erros: string[] = []): AvaliacaoResumo => ({ id, createdAt: `2026-01-${String(dia).padStart(2, "0")}`, modality: "enem", score: c1 * 5, max: 1000, competencias: [{ key: "c1", label: "Competência I — Norma culta", score: c1, max: 200 }], erros: erros.map((categoria) => ({ categoria, tipo: "erro_objetivo" })) });

describe("evolução", () => {
  it("não conclui com menos de 3 redações", () => {
    const r = insights([av("a", 1, 100), av("b", 2, 120)]);
    expect(r.suficiente).toBe(false);
    expect(r.faltam).toBe(1);
    expect(r.itens).toEqual([]);
  });
  it("detecta melhora e erro recorrente", () => {
    const r = insights([av("a", 1, 80, ["concordancia"]), av("b", 2, 120, ["concordancia"]), av("c", 3, 160, ["concordancia"])]);
    expect(r.itens.some((i) => i.tipo === "positivo" && /Norma culta/.test(i.texto))).toBe(true);
    expect(r.itens.some((i) => /concordância/.test(i.texto))).toBe(true);
  });
  it("tendência exige 5 pontos percentuais", () => {
    expect(tendencia([50, 52, 54])).toBe("estavel");
    expect(tendencia([50, 60, 70])).toBe("melhorando");
    expect(tendencia([70, 60, 50])).toBe("piorando");
    expect(tendencia([50, 60])).toBeNull();
  });
  it("compara versões pelos trechos", () => {
    const r = compararErros(
      { texto: "Os aluno faltou. Houveram erros.", erros: [{ id: "1", categoria: "concordancia", trecho: "Os aluno" }, { id: "2", categoria: "concordancia", trecho: "Houveram erros" }] },
      { texto: "Os alunos faltaram. Houveram erros. Mas, porém, falhou.", erros: [{ id: "3", categoria: "concordancia", trecho: "Houveram erros" }, { id: "4", categoria: "vocabulario", trecho: "Mas, porém" }] },
    );
    expect(r.corrigidos.map((e) => e.id)).toEqual(["1"]);
    expect(r.permaneceram.map((e) => e.id)).toEqual(["2"]);
    expect(r.novos.map((e) => e.id)).toEqual(["4"]);
  });
  it("só calcula diferença de nota na mesma escala", () => {
    expect(compararNotas(av("a", 1, 100), av("b", 2, 160)).delta).toBe(300);
    expect(compararNotas({ ...av("a", 1, 100), max: 100 }, av("b", 2, 160)).delta).toBeNull();
  });
});

import { ApontamentosSchema, DiagnosticoSchema, PontuacaoSchema } from "./schemas";

describe("esquemas de saída da IA", () => {
  const ap = { trecho: "Os jovem", categoria: "concordancia", tipo: "erro_objetivo", gravidade: "grave", problema: "x", explicacao: "y" };
  it("aceita apontamento válido e rejeita categoria/tipo inventados", () => {
    expect(ApontamentosSchema.safeParse({ apontamentos: [ap] }).success).toBe(true);
    expect(ApontamentosSchema.safeParse({ apontamentos: [{ ...ap, categoria: "inventada" }] }).success).toBe(false);
    expect(ApontamentosSchema.safeParse({ apontamentos: [{ ...ap, tipo: "bonito" }] }).success).toBe(false);
  });
  it("pontuação exige ao menos um critério e nota não negativa", () => {
    expect(PontuacaoSchema.safeParse({ criterios: [] }).success).toBe(false);
    expect(PontuacaoSchema.safeParse({ criterios: [{ key: "c1", pontuacao: -1, justificativa: "j" }] }).success).toBe(false);
  });
  it("diagnóstico exige plano de 1 a 5 prioridades", () => {
    const base = { semProblemasRelevantes: true, resumo: "r", fezBem: [], fezMal: [], precisaMelhorar: [], paragrafosMelhorar: [], frasesReformular: [], argumentosSuperficiais: [], errosRecorrentes: [], conteudoEstudar: [], proximaRedacao: [], prioridade: "p", ondeMelhorar: [], naoMudar: [], pontosPositivos: [], pontosNegativos: [], oportunidades: [] };
    expect(DiagnosticoSchema.safeParse({ ...base, plano: [] }).success).toBe(false);
    expect(DiagnosticoSchema.safeParse({ ...base, plano: [{ prioridade: 1, acao: "a", porque: "b" }] }).success).toBe(true);
  });
});
