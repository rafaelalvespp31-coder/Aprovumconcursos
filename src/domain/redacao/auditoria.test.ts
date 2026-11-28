import { describe, expect, it } from "vitest";
import { autoridadeDe, criteriosParaAuditar, descontosSemJustificativa, gravidadeDaDivergencia, reconciliar } from "./auditoria";
import { classeDoProblema, RUBRICA_CONCURSO, RUBRICA_ENEM } from "./rubricas";
import { linhaDe } from "./texto";

const p = (key: string, pontuacao: number, justificativa = "justificativa suficientemente longa para o critério") => ({ key, pontuacao, justificativa });
const enem = (v: number[]) => RUBRICA_ENEM.criteria.map((c, i) => p(c.key, v[i]!));

describe("dupla avaliação e auditoria", () => {
  it("classifica a divergência: 1 nível leve, 2 níveis relevante (ENEM)", () => {
    const c = RUBRICA_ENEM.criteria[0]!;
    expect(gravidadeDaDivergencia(120, 120, c)).toBe("nenhuma");
    expect(gravidadeDaDivergencia(120, 160, c)).toBe("leve");
    expect(gravidadeDaDivergencia(80, 160, c)).toBe("relevante");
  });
  it("leva à auditoria só os critérios com divergência relevante", () => {
    expect(criteriosParaAuditar(RUBRICA_ENEM, enem([160, 160, 160, 160, 160]), enem([160, 80, 120, 160, 40]))).toEqual(["c2", "c5"]);
  });
  it("sem divergência: mantém a nota e não pede revisão humana", () => {
    const r = reconciliar(RUBRICA_ENEM, enem([160, 120, 120, 160, 160]), enem([160, 120, 120, 160, 160]));
    expect(r.pontuacoes.map((x) => x.pontuacao)).toEqual([160, 120, 120, 160, 160]);
    expect(r.revisaoHumana).toBe(false);
  });
  it("divergência leve: prevalece o especialista do critério (sem média)", () => {
    const r = reconciliar(RUBRICA_ENEM, enem([120, 160, 120, 160, 160]), enem([160, 120, 120, 160, 160]));
    expect(r.pontuacoes.find((x) => x.key === "c1")!.pontuacao).toBe(120); // língua portuguesa → avaliador 1
    expect(r.pontuacoes.find((x) => x.key === "c2")!.pontuacao).toBe(120); // banca → avaliador 2
    expect(r.revisaoHumana).toBe(false);
  });
  it("divergência relevante com auditor: usa o veredito dentro do intervalo e pede revisão humana", () => {
    const r = reconciliar(RUBRICA_ENEM, enem([160, 200, 160, 160, 160]), enem([160, 80, 160, 160, 160]), [{ key: "c2", pontuacao: 120, motivo: "tema desenvolvido, repertório pouco produtivo" }]);
    expect(r.pontuacoes.find((x) => x.key === "c2")!.pontuacao).toBe(120);
    expect(r.revisaoHumana).toBe(true);
  });
  it("veredito fora do intervalo é limitado; sem auditor adota a menor nota", () => {
    const fora = reconciliar(RUBRICA_ENEM, enem([160, 200, 160, 160, 160]), enem([160, 80, 160, 160, 160]), [{ key: "c2", pontuacao: 200 + 0, motivo: "x" }, { key: "c2", pontuacao: 40, motivo: "y" }]);
    expect(fora.pontuacoes.find((x) => x.key === "c2")!.pontuacao).toBeGreaterThanOrEqual(80);
    const sem = reconciliar(RUBRICA_ENEM, enem([160, 200, 160, 160, 160]), enem([160, 80, 160, 160, 160]));
    expect(sem.pontuacoes.find((x) => x.key === "c2")!.pontuacao).toBe(80);
    expect(sem.divergencias.find((d) => d.key === "c2")!.decididoPor).toBe("menor_nota");
    expect(sem.revisaoHumana).toBe(true);
  });
  it("critério avaliado por um só avaliador usa a nota disponível", () => {
    const r = reconciliar(RUBRICA_CONCURSO, [p("norma_culta", 20)], []);
    expect(r.pontuacoes).toHaveLength(1);
    expect(r.notas.join(" ")).toMatch(/apenas um/);
  });
  it("autoridade: norma culta e coesão são do avaliador de língua portuguesa", () => {
    expect(autoridadeDe("c1")).toBe("lingua");
    expect(autoridadeDe("norma_culta")).toBe("lingua");
    expect(autoridadeDe("c3")).toBe("banca");
    expect(autoridadeDe("criterio_do_edital")).toBe("banca");
  });
  it("aponta desconto sem justificativa suficiente", () => {
    expect(descontosSemJustificativa(RUBRICA_ENEM, [p("c1", 120, "ok")])).toHaveLength(1);
    expect(descontosSemJustificativa(RUBRICA_ENEM, [p("c1", 200, "ok")])).toHaveLength(0);
  });
});

describe("classes de problema (A–K) e linha estimada", () => {
  it("mapeia categoria + tipo para a classe", () => {
    expect(classeDoProblema("concordancia", "erro_objetivo")).toBe("A");
    expect(classeDoProblema("ortografia", "erro_objetivo")).toBe("B");
    expect(classeDoProblema("pontuacao", "erro_objetivo")).toBe("C");
    expect(classeDoProblema("sintaxe", "problema_construcao")).toBe("D");
    expect(classeDoProblema("coesao", "problema_construcao")).toBe("E");
    expect(classeDoProblema("coerencia", "problema_construcao")).toBe("F");
    expect(classeDoProblema("argumentacao", "fragilidade_argumentativa")).toBe("G");
    expect(classeDoProblema("adequacao_tema", "problema_construcao")).toBe("H");
    expect(classeDoProblema("genero", "problema_construcao")).toBe("I");
    expect(classeDoProblema("estrutura", "problema_construcao")).toBe("J");
  });
  it("sugestão de melhoria nunca vira erro: estilística/oportunidade = K", () => {
    expect(classeDoProblema("gramatica", "estilistica")).toBe("K");
    expect(classeDoProblema("pontuacao", "oportunidade")).toBe("K");
  });
  it("calcula a linha estimada do deslocamento", () => {
    const t = "a".repeat(150) + "\nsegundo parágrafo";
    expect(linhaDe(t, 0)).toBe(1);
    expect(linhaDe(t, 80)).toBe(2);
    expect(linhaDe(t, t.indexOf("segundo"))).toBe(3);
  });
});
