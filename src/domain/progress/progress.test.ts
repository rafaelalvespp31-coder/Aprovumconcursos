import { describe, expect, it } from "vitest";
import {
  DEFAULT_CRITERIA,
  InvalidTransitionError,
  initialProgress,
  transition,
  type UnitProgress,
} from "./state-machine";
import { initialReviewState, prioritizeReviews, scheduleNext } from "./review";

const day = (n: number) => new Date(Date.UTC(2026, 0, 1 + n));
const quiz = (answered: number, correct: number, essential = 0, essentialCorrect = 0) => ({
  answered,
  correct,
  essentialAnswered: essential,
  essentialCorrect,
});

const readAndStart = (): UnitProgress => {
  let p = initialProgress(true);
  p = transition(p, { type: "START" }).progress;
  return transition(p, { type: "COMPLETE_READING" }).progress;
};

describe("máquina de estados de domínio", () => {
  it("leitura concluída não é domínio", () => {
    const p = readAndStart();
    expect(p.state).toBe("aula_concluida");
    expect(p.masteredAt).toBeNull();
  });

  it("não deixa iniciar unidade bloqueada", () => {
    expect(() => transition(initialProgress(false), { type: "START" })).toThrow(InvalidTransitionError);
  });

  it("exige leitura antes das questões quando configurado", () => {
    let p = transition(initialProgress(true), { type: "START" }).progress;
    const t = transition(p, { type: "QUIZ_EVALUATED", outcome: quiz(5, 5), at: day(0) });
    expect(t.progress.state).toBe("em_andamento");
    expect(t.unlocksNext).toBe(false);
    p = t.progress;
    const relaxed = transition(p, { type: "QUIZ_EVALUATED", outcome: quiz(5, 5), at: day(0) }, {
      ...DEFAULT_CRITERIA,
      requireLessonCompletion: false,
    });
    expect(relaxed.progress.state).toBe("aguardando_dominio");
  });

  it("aprovação libera a próxima unidade mas aguarda confirmação de domínio", () => {
    const t = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: quiz(4, 3), at: day(0) });
    expect(t.progress.state).toBe("aguardando_dominio");
    expect(t.unlocksNext).toBe(true);
  });

  it("reprovação explica o motivo e recomenda caminhos", () => {
    const t = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: quiz(4, 2), at: day(0) });
    expect(t.progress.state).toBe("em_revisao");
    expect(t.unlocksNext).toBe(false);
    expect(t.explanation).toMatch(/50%/);
    expect(t.recommendations.length).toBeGreaterThan(0);
  });

  it("errar conceito essencial impede avanço mesmo com boa média", () => {
    const t = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: quiz(5, 4, 1, 0), at: day(0) });
    expect(t.progress.state).toBe("em_revisao");
  });

  it("exige responder todas as questões de fixação do tema", () => {
    const partial = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: { ...quiz(8, 8), total: 10 }, at: day(0) });
    expect(partial.progress.state).toBe("em_revisao");
    expect(partial.unlocksNext).toBe(false);
    expect(partial.explanation).toMatch(/todas as 10 questões.*faltam 2/);
    const all = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: { ...quiz(10, 8), total: 10 }, at: day(0) });
    expect(all.progress.state).toBe("aguardando_dominio");
    expect(all.unlocksNext).toBe(true);
  });

  it("todas respondidas mas abaixo de 75% não libera", () => {
    const t = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: { ...quiz(10, 7), total: 10 }, at: day(0) });
    expect(t.progress.state).toBe("em_revisao");
    expect(t.explanation).toMatch(/70%/);
  });

  it("revisão de retenção não exige todas as questões", () => {
    const passed = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: { ...quiz(10, 10), total: 10 }, at: day(0) }).progress;
    const r = transition(passed, { type: "REVIEW_EVALUATED", outcome: { ...quiz(3, 3), total: 10 }, at: day(3) });
    expect(r.progress.state).toBe("dominada");
  });

  it("poucas questões não bastam", () => {
    const t = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: quiz(2, 2), at: day(0) });
    expect(t.progress.state).toBe("em_revisao");
    expect(t.explanation).toMatch(/pelo menos 4/);
  });

  it("domínio só é confirmado após revisão depois do intervalo de retenção", () => {
    const passed = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: quiz(4, 4), at: day(0) }).progress;
    const tooSoon = transition(passed, { type: "REVIEW_EVALUATED", outcome: quiz(3, 3), at: day(1) });
    expect(tooSoon.progress.state).toBe("aguardando_dominio");
    const later = transition(passed, { type: "REVIEW_EVALUATED", outcome: quiz(3, 3), at: day(3) });
    expect(later.progress.state).toBe("dominada");
    expect(later.progress.masteredAt).toEqual(day(3));
  });

  it("esquecimento volta para revisão sem bloquear unidades seguintes", () => {
    let p = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: quiz(4, 4), at: day(0) }).progress;
    p = transition(p, { type: "REVIEW_EVALUATED", outcome: quiz(3, 3), at: day(3) }).progress;
    const t = transition(p, { type: "REVIEW_EVALUATED", outcome: quiz(3, 1), at: day(20) });
    expect(t.progress.state).toBe("em_revisao");
    expect(t.unlocksNext).toBe(true);
  });

  it("revisitar unidade concluída não rebaixa o progresso", () => {
    const p = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: quiz(4, 4), at: day(0) }).progress;
    expect(transition(p, { type: "START" }).progress.state).toBe("aguardando_dominio");
  });

  it("atualização de conteúdo exige reconfirmar domínio", () => {
    let p = transition(readAndStart(), { type: "QUIZ_EVALUATED", outcome: quiz(4, 4), at: day(0) }).progress;
    p = transition(p, { type: "REVIEW_EVALUATED", outcome: quiz(3, 3), at: day(3) }).progress;
    p = transition(p, { type: "CONTENT_UPDATED" }).progress;
    expect(p.state).toBe("necessita_atualizacao");
    p = transition(p, { type: "CONTENT_VALIDATED" }).progress;
    expect(p.state).toBe("aguardando_dominio");
  });

  it("validação pendente preserva e restaura o estado anterior", () => {
    let p = readAndStart();
    p = transition(p, { type: "VALIDATION_REQUIRED" }).progress;
    expect(p.state).toBe("pendente_validacao");
    p = transition(p, { type: "CONTENT_VALIDATED" }).progress;
    expect(p.state).toBe("aula_concluida");
  });
});

describe("revisão espaçada", () => {
  it("aumenta o intervalo após acertos e reinicia após erro", () => {
    let s = initialReviewState(day(0));
    s = scheduleNext(s, 1, day(1));
    const first = s.dueAt.getTime() - day(1).getTime();
    s = scheduleNext(s, 1, day(5));
    const second = s.dueAt.getTime() - day(5).getTime();
    expect(second).toBeGreaterThan(first);
    s = scheduleNext(s, 0.2, day(20));
    expect(s.step).toBe(0);
    expect(s.lapses).toBe(1);
    expect(s.dueAt).toEqual(day(21));
  });

  it("prioriza com motivos explícitos", () => {
    const base = initialReviewState(day(0));
    const recs = prioritizeReviews(
      [
        { unitId: "a", title: "A", review: { ...base, dueAt: day(5) }, recentErrors: 0, importance: null },
        { unitId: "b", title: "B", review: { ...base, dueAt: day(1), lapses: 2 }, recentErrors: 3, importance: 0.9 },
      ],
      day(4),
    );
    expect(recs).toHaveLength(1);
    expect(recs[0]!.unitId).toBe("b");
    expect(recs[0]!.reasons.join(" ")).toMatch(/atrasada há 3 dia/);
    expect(recs[0]!.reasons.join(" ")).toMatch(/3 erro/);
  });
});
