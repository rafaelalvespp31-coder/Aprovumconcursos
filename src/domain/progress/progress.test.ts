import { describe, expect, it } from "vitest";
import {
  DEFAULT_CRITERIA,
  InvalidTransitionError,
  initialProgress,
  transition,
  type UnitProgress,
} from "./state-machine";
import { initialReviewState, prioritizeReviews, scheduleNext } from "./review";
import { levelForDifficulty, levelStatus, requiredCorrect } from "./levels";

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

const level = (p: UnitProgress, n: 1 | 2 | 3, answered: number, correct: number, at = day(0), total = answered) =>
  transition(p, { type: "QUIZ_EVALUATED", outcome: { ...quiz(answered, correct), total }, at, level: n });

/** Aprova os três níveis com 10/10. */
const passAll = (p: UnitProgress, at = day(0)) => {
  let cur = p;
  for (const n of [1, 2, 3] as const) cur = level(cur, n, 10, 10, at).progress;
  return cur;
};

describe("máquina de estados de domínio (três níveis, 90%)", () => {
  it("leitura concluída não é domínio", () => {
    const p = readAndStart();
    expect(p.state).toBe("aula_concluida");
    expect(p.levelsPassed).toBe(0);
    expect(p.masteredAt).toBeNull();
  });

  it("não deixa iniciar unidade bloqueada", () => {
    expect(() => transition(initialProgress(false), { type: "START" })).toThrow(InvalidTransitionError);
  });

  it("exige leitura antes das questões quando configurado", () => {
    const p = transition(initialProgress(true), { type: "START" }).progress;
    const t = level(p, 1, 10, 10);
    expect(t.progress.levelsPassed).toBe(0);
    expect(t.explanation).toMatch(/Conclua a leitura/);
    const relaxed = transition(p, { type: "QUIZ_EVALUATED", outcome: { ...quiz(10, 10), total: 10 }, at: day(0), level: 1 }, {
      ...DEFAULT_CRITERIA,
      requireLessonCompletion: false,
    });
    expect(relaxed.progress.levelsPassed).toBe(1);
  });

  it("fácil → médio → difícil, em ordem; só o difícil libera a próxima unidade", () => {
    let p = readAndStart();
    const skip = level(p, 2, 10, 10);
    expect(skip.progress.levelsPassed).toBe(0);
    expect(skip.explanation).toMatch(/Conclua o nível fácil/);

    let t = level(p, 1, 10, 9);
    expect(t.progress.levelsPassed).toBe(1);
    expect(t.unlocksNext).toBe(false);
    expect(t.explanation).toMatch(/nível médio foi liberado/);
    p = t.progress;
    t = level(p, 2, 10, 10);
    expect(t.progress.levelsPassed).toBe(2);
    p = t.progress;
    t = level(p, 3, 10, 9);
    expect(t.progress.levelsPassed).toBe(3);
    expect(t.progress.state).toBe("aguardando_dominio");
    expect(t.unlocksNext).toBe(true);
  });

  it("abaixo de 90% não aprova o nível e indica a recuperação, sem reiniciar nada", () => {
    const p = level(readAndStart(), 1, 10, 10).progress;
    const t = level(p, 2, 10, 8);
    expect(t.progress.levelsPassed).toBe(1);
    expect(t.progress.state).toBe("aula_concluida");
    expect(t.explanation).toMatch(/80%.*90%/);
    expect(t.recommendations[0]).toMatch(/recuperação/);
  });

  it("errar conceito essencial impede o nível mesmo com 90%", () => {
    const t = transition(readAndStart(), {
      type: "QUIZ_EVALUATED",
      outcome: { answered: 10, correct: 9, essentialAnswered: 2, essentialCorrect: 1, total: 10 },
      at: day(0),
      level: 1,
    });
    expect(t.progress.levelsPassed).toBe(0);
  });

  it("exige responder todas as questões do nível", () => {
    const t = level(readAndStart(), 1, 8, 8, day(0), 10);
    expect(t.progress.levelsPassed).toBe(0);
    expect(t.explanation).toMatch(/todas as 10 questões.*faltam 2/);
  });

  it("reavaliar um nível já aprovado não altera o progresso", () => {
    const p = level(readAndStart(), 1, 10, 10).progress;
    const t = level(p, 1, 10, 2);
    expect(t.progress.levelsPassed).toBe(1);
    expect(t.explanation).toMatch(/já foi aprovado/);
  });

  it("sem nível informado, avalia o próximo nível pendente", () => {
    const p = level(readAndStart(), 1, 10, 10).progress;
    const t = transition(p, { type: "QUIZ_EVALUATED", outcome: { ...quiz(10, 10), total: 10 }, at: day(0) });
    expect(t.progress.levelsPassed).toBe(2);
  });

  it("revisão de retenção não exige todas as questões", () => {
    const passed = passAll(readAndStart());
    const r = transition(passed, { type: "REVIEW_EVALUATED", outcome: { ...quiz(3, 3), total: 30 }, at: day(3) });
    expect(r.progress.state).toBe("dominada");
  });

  it("domínio só é confirmado após revisão depois do intervalo de retenção", () => {
    const passed = passAll(readAndStart());
    const tooSoon = transition(passed, { type: "REVIEW_EVALUATED", outcome: quiz(3, 3), at: day(1) });
    expect(tooSoon.progress.state).toBe("aguardando_dominio");
    const later = transition(passed, { type: "REVIEW_EVALUATED", outcome: quiz(3, 3), at: day(3) });
    expect(later.progress.state).toBe("dominada");
    expect(later.progress.masteredAt).toEqual(day(3));
  });

  it("esquecimento volta para revisão sem bloquear unidades seguintes nem apagar os níveis", () => {
    let p = passAll(readAndStart());
    p = transition(p, { type: "REVIEW_EVALUATED", outcome: quiz(3, 3), at: day(3) }).progress;
    const t = transition(p, { type: "REVIEW_EVALUATED", outcome: quiz(3, 1), at: day(20) });
    expect(t.progress.state).toBe("em_revisao");
    expect(t.progress.levelsPassed).toBe(3);
    expect(t.unlocksNext).toBe(true);
  });

  it("revisitar unidade concluída não rebaixa o progresso", () => {
    const p = passAll(readAndStart());
    expect(transition(p, { type: "START" }).progress.state).toBe("aguardando_dominio");
  });

  it("atualização de conteúdo exige reconfirmar domínio", () => {
    let p = passAll(readAndStart());
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

describe("níveis", () => {
  it("90% em N questões exige ⌈0,9·N⌉ acertos", () => {
    expect(requiredCorrect(10)).toBe(9);
    expect(requiredCorrect(12)).toBe(11);
    expect(requiredCorrect(5)).toBe(5);
  });
  it("dificuldade → nível e situação de cada nível", () => {
    expect([1, 2, 3, 4, 5].map(levelForDifficulty)).toEqual(["facil", "facil", "medio", "dificil", "dificil"]);
    expect([1, 2, 3].map((n) => levelStatus(1, n as 1 | 2 | 3))).toEqual(["aprovado", "liberado", "bloqueado"]);
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

describe("nível com poucas questões", () => {
  it("responder todas basta quando o nível tem menos questões que o mínimo geral", async () => {
    const { evaluateQuiz, DEFAULT_CRITERIA } = await import("./state-machine");
    expect(evaluateQuiz({ answered: 2, correct: 2, essentialAnswered: 0, essentialCorrect: 0, total: 2 }, DEFAULT_CRITERIA).passed).toBe(true);
    expect(evaluateQuiz({ answered: 2, correct: 2, essentialAnswered: 0, essentialCorrect: 0 }, DEFAULT_CRITERIA).passed).toBe(false);
  });
});
