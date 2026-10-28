import { describe, expect, it } from "vitest";
import { DEFAULT_MENTOR_CONFIG, lessonAfter, recommend, sortRecommendations, topicStats, type MentorAttempt, type MentorLesson, type MentorSnapshot } from "./engine";

const NOW = "2026-10-28T12:00:00.000Z";
const lesson = (over: Partial<MentorLesson> = {}): MentorLesson => ({
  id: "l1", trailId: "t1", trailTitle: "Crimes contra o patrimônio", subject: "Direito Penal", title: "Extorsão", order: 1,
  state: "nao_iniciada", readingDone: false, levelsPassed: 0, updatedAt: "2026-10-27T12:00:00.000Z", prerequisiteIds: [],
  questionsByLevel: { facil: 12, medio: 12, dificil: 12 }, ...over,
});
const snap = (over: Partial<MentorSnapshot> = {}): MentorSnapshot => ({ now: NOW, lessons: [], performance: [], reviews: [], notebooks: [], ...over });
const attempts = (right: number, wrong: number, extra: MentorAttempt[] = []): MentorAttempt[] => [
  ...Array.from({ length: right }, () => ({ correct: true, questionValid: true })),
  ...Array.from({ length: wrong }, () => ({ correct: false, questionValid: true })),
  ...extra,
];
const topic = (a: MentorAttempt[], key = "banco:furto", label = "Furto") => ({ key, label, subject: "Direito Penal", href: "/questoes", attempts: a });

describe("motor do Mentor", () => {
  it("1. aula iniciada e incompleta → continuar a aula (com o progresso real)", () => {
    const r = recommend(snap({ lessons: [lesson({ state: "em_andamento" })] }));
    expect(r.top[0]).toMatchObject({ kind: "aula_pendente", rule: "A", href: "/aula/l1", actionLabel: "Continuar aula", progress: { pct: 0 } });
    expect(r.top[0]!.reason).toContain("leitura ainda não foi concluída");
  });

  it("2. leitura concluída com questões pendentes → questões do próximo nível (só se existirem)", () => {
    const r = recommend(snap({ lessons: [lesson({ state: "aula_concluida", readingDone: true, levelsPassed: 1 })] }));
    expect(r.top[0]).toMatchObject({ kind: "questoes_pendentes", rule: "B", href: "/aula/l1#questoes", progress: { pct: 50 } });
    expect(r.top[0]!.explanation).toContain("nível médio");
    const semQuestoes = recommend(snap({ lessons: [lesson({ state: "aula_concluida", readingDone: true, levelsPassed: 1, questionsByLevel: { facil: 12, medio: 0, dificil: 12 } })] }));
    expect(semQuestoes.all.find((x) => x.kind === "questoes_pendentes")).toBeUndefined();
  });

  it("3. abaixo de 70% com amostra suficiente → reforço", () => {
    const r = recommend(snap({ performance: [topic(attempts(5, 7))] }));
    expect(r.top[0]).toMatchObject({ kind: "reforco", rule: "C" });
    expect(r.top[0]!.reason).toContain("5 de 12");
  });

  it("4. abaixo de 70% com amostra insuficiente → praticar mais, nunca 'baixo desempenho'", () => {
    const r = recommend(snap({ performance: [topic(attempts(2, 5))] }));
    expect(r.all.some((x) => x.kind === "reforco")).toBe(false);
    expect(r.top[0]).toMatchObject({ kind: "praticar_mais" });
    expect(r.top[0]!.reason).toContain("pelo menos 10");
  });

  it("5. entre 70% e 84% → consolidação", () => {
    const r = recommend(snap({ performance: [topic(attempts(8, 2))] }));
    expect(r.top[0]).toMatchObject({ kind: "consolidacao" });
    expect(topicStats([topic(attempts(84, 16))])[0]!.band).toBe("consolidacao");
  });

  it("6. 85% ou mais → manutenção (e conta como sem pendências)", () => {
    const r = recommend(snap({ performance: [topic(attempts(17, 3))] }));
    expect(r.top[0]).toMatchObject({ kind: "manutencao" });
    expect(r.allDone).toBe(true);
    expect(topicStats([topic(attempts(85, 15))])[0]!.band).toBe("manutencao");
  });

  it("7. questões anuladas, omitidas ou sem correção não contam", () => {
    const extra: MentorAttempt[] = [
      ...Array.from({ length: 6 }, () => ({ correct: false, questionValid: false })),
      { correct: false, questionValid: true, omitted: true },
      { correct: null, questionValid: true },
    ];
    const [t] = topicStats([topic(attempts(9, 1, extra))]);
    expect(t).toMatchObject({ valid: 10, correct: 9, pct: 90, band: "manutencao" });
  });

  it("8. aluno sem histórico → dados insuficientes, nenhuma recomendação inventada", () => {
    const r = recommend(snap());
    expect(r.insufficientData).toBe(true);
    expect(r.top).toEqual([]);
  });

  it("9. tudo concluído → sem pendências (nada de recomendar aula concluída)", () => {
    const r = recommend(snap({ lessons: [lesson({ state: "aguardando_dominio", readingDone: true, levelsPassed: 3 })] }));
    expect(r.allDone).toBe(true);
    expect(r.top).toEqual([]);
    expect(r.completedLessons.map((l) => l.id)).toEqual(["l1"]);
  });

  it("10. revisão sem data válida não vira 'vencida'; com data passada, sim", () => {
    const r = recommend(snap({ reviews: [{ lessonId: "l1", title: "Extorsão", subject: "Direito Penal", dueAt: null }, { lessonId: "l2", title: "Furto", subject: "Direito Penal", dueAt: "data-ruim" }] }));
    expect(r.all.filter((x) => x.kind === "revisao_vencida")).toEqual([]);
    const v = recommend(snap({ reviews: [{ lessonId: "l2", title: "Furto", subject: "Direito Penal", dueAt: "2026-10-25T12:00:00.000Z" }] }));
    expect(v.top[0]).toMatchObject({ kind: "revisao_vencida", rule: "D", href: "/aula/l2?revisao=1#questoes" });
    expect(v.top[0]!.reason).toContain("3 dias");
  });

  it("11. empate de prioridade → desempate fixo (tipo, título, chave), sempre igual", () => {
    const lessons = [lesson({ id: "b", title: "Roubo", state: "em_andamento" }), lesson({ id: "a", title: "Furto", state: "em_andamento" })];
    const r1 = recommend(snap({ lessons }));
    const r2 = recommend(snap({ lessons: [...lessons].reverse() }));
    expect(r1.top.map((x) => x.key)).toEqual(["aula_pendente:a", "aula_pendente:b"]);
    expect(r2.top.map((x) => x.key)).toEqual(r1.top.map((x) => x.key));
    expect(sortRecommendations([...r1.all].reverse()).map((x) => x.key)).toEqual(r1.all.map((x) => x.key));
  });

  it("limita a 3 principais e no máximo 2 do mesmo tipo", () => {
    const lessons = ["a", "b", "c", "d"].map((id, i) => lesson({ id, title: `Aula ${id}`, order: i + 1, state: "em_andamento" }));
    const r = recommend(snap({ lessons, reviews: [{ lessonId: "x", title: "Revisão X", subject: null, dueAt: "2026-10-20T00:00:00.000Z" }] }));
    expect(r.top).toHaveLength(DEFAULT_MENTOR_CONFIG.maxResults);
    expect(r.top.filter((x) => x.kind === "aula_pendente")).toHaveLength(2);
    expect(r.top.some((x) => x.kind === "revisao_vencida")).toBe(true);
  });

  it("15. dados inconsistentes (ids repetidos, data inválida, nível fora do intervalo) não quebram nem duplicam", () => {
    const r = recommend(snap({ lessons: [lesson({ state: "em_andamento", updatedAt: "nao-e-data" }), lesson({ state: "em_andamento" }), lesson({ id: "z", levelsPassed: 7, readingDone: true })] }));
    expect(r.all.filter((x) => x.key === "aula_pendente:l1")).toHaveLength(1);
    expect(r.completedLessons.map((l) => l.id)).toEqual(["z"]);
  });

  it("E. sem pendências → próxima aula liberada, respeitando pré-requisitos e a ordem", () => {
    const lessons = [
      lesson({ id: "l1", order: 1, state: "aguardando_dominio", readingDone: true, levelsPassed: 3 }),
      lesson({ id: "l3", order: 3, title: "Usurpação", prerequisiteIds: ["l2"] }),
      lesson({ id: "l2", order: 2, title: "Extorsão mediante sequestro" }),
    ];
    const r = recommend(snap({ lessons }));
    expect(r.top[0]).toMatchObject({ kind: "proxima_aula", rule: "E", href: "/aula/l2" });
    expect(lessonAfter(lessons, "l1")?.id).toBe("l2");
    // Com uma pendência relevante, não sugere aula nova.
    const comPendencia = recommend(snap({ lessons: [...lessons, lesson({ id: "p", trailId: "t2", state: "em_andamento" })] }));
    expect(comPendencia.all.some((x) => x.kind === "proxima_aula")).toBe(false);
  });

  it("B2. caderno começado e não terminado → continuar o caderno (com números reais)", () => {
    const r = recommend(snap({ notebooks: [{ id: "n1", title: "Direito Penal", answered: 22, available: 40 }, { id: "n2", title: "Feito", answered: 10, available: 10 }] }));
    expect(r.top).toHaveLength(1);
    expect(r.top[0]).toMatchObject({ kind: "caderno_pendente", href: "/questoes/cadernos/n1", progress: { pct: 55 } });
    expect(r.top[0]!.reason).toContain("22 de 40");
  });
});
