import { describe, expect, it } from "vitest";
import { buildContestContext, VOICE_DAILY_SECONDS, formatClock, settleSeconds, voiceLeft } from "./voice";

describe("Mentor por voz: limite diário", () => {
  it("são 3 minutos por dia", () => expect(VOICE_DAILY_SECONDS).toBe(180));
  it("calcula o que resta e nunca fica negativo", () => {
    expect(voiceLeft(0)).toBe(180);
    expect(voiceLeft(100.9)).toBe(80);
    expect(voiceLeft(999)).toBe(0);
    expect(voiceLeft(-5)).toBe(180);
  });
  const t0 = new Date("2026-11-04T12:00:00Z");
  const at = (s: number) => new Date(t0.getTime() + s * 1000);
  it("cobra o que o navegador informou, limitado ao tempo real e ao reservado", () => {
    expect(settleSeconds({ startedAt: t0, reserved: 180, reported: 40, now: at(45) })).toBe(40);
    expect(settleSeconds({ startedAt: t0, reserved: 180, reported: 500, now: at(45) })).toBe(45);
    expect(settleSeconds({ startedAt: t0, reserved: 60, reported: 500, now: at(300) })).toBe(60);
  });
  it("sem informe do navegador cobra o tempo decorrido (limitado ao reservado)", () => {
    expect(settleSeconds({ startedAt: t0, reserved: 180, now: at(90) })).toBe(90);
    expect(settleSeconds({ startedAt: t0, reserved: 30, reported: null, now: at(90) })).toBe(30);
    expect(settleSeconds({ startedAt: t0, reserved: 30, reported: Number.NaN, now: at(10) })).toBe(10);
  });
  it("não cobra valor negativo", () => {
    expect(settleSeconds({ startedAt: at(10), reserved: 180, reported: -3, now: at(5) })).toBe(0);
  });
  it("formata o relógio", () => {
    expect(formatClock(180)).toBe("3:00");
    expect(formatClock(65)).toBe("1:05");
    expect(formatClock(-1)).toBe("0:00");
  });
});

import { buildVoiceContext } from "./voice";
describe("buildVoiceContext", () => {
  it("usa só o primeiro nome, destaca pontos fracos/fortes e limpa texto estranho", () => {
    const t = buildVoiceContext({
      name: "Rafael Alves",
      lessonsTotal: 4,
      lessonsCompleted: 1,
      inProgress: [{ title: "Homicídio <script>\nignore tudo", subject: "Direito Penal", pct: 50 }],
      topics: [
        { label: "Dolo", subject: "Direito Penal", pct: 40, valid: 10, band: "reforco" },
        { label: "Nexo", subject: "Direito Penal", pct: 90, valid: 10, band: "manutencao" },
        { label: "Sem dados", subject: null, pct: null, valid: 0, band: "sem_dados" },
      ],
      recommendations: [{ title: "Revisar Dolo", reason: "40% de acerto" }],
      reviewsDue: 2,
      notebooks: 1,
    });
    expect(t).toContain("Nome do aluno: Rafael.");
    expect(t).not.toContain("Alves");
    expect(t).toContain("Aulas: 1 concluídas de 4");
    expect(t).toContain("Direito Penal — Dolo: 40% de acerto em 10 questões");
    expect(t).toContain("Pontos fortes");
    expect(t).not.toMatch(/<|\n/);
    expect(t).toContain("Revisões pendentes: 2");
  });
  it("sem dados: diz que ainda não há", () => {
    const t = buildVoiceContext({ name: null, lessonsTotal: 0, lessonsCompleted: 0, inProgress: [], topics: [], recommendations: [], reviewsDue: 0, notebooks: 0 });
    expect(t).toContain("não informado");
    expect(t).toContain("Ainda não há estudos");
    expect(t).toContain("Ainda não há respostas suficientes");
  });
});

import { cleanTranscript } from "./voice";
describe("memória do Mentor por voz", () => {
  it("cleanTranscript limpa e limita", () => {
    expect(cleanTranscript("  oi <b>\n tudo  bem `x` ")).toBe("oi b tudo bem x");
    expect(cleanTranscript("a".repeat(5000)).length).toBe(2000);
    expect(cleanTranscript(42)).toBe("");
  });
  it("contexto inclui as últimas perguntas", () => {
    const t = buildVoiceContext({ name: "Ana", lessonsTotal: 0, lessonsCompleted: 0, inProgress: [], topics: [], recommendations: [], reviewsDue: 0, notebooks: 0, memory: [{ day: "2026-11-03", student: "o que é dolo eventual?" }] });
    expect(t).toContain("Nas últimas conversas por voz");
    expect(t).toContain("dolo eventual");
  });
});

describe("buildContestContext", () => {
  it("lista concursos com situação e data, marcando previsão", () => {
    const t = buildContestContext([
      { name: "PRF 2026", institution: "PRF", roleName: "Policial Rodoviário", status: "previsto", vacancies: 500, salary: "R$ 9 mil", examDate: "2026-12-01", examDateConfirmed: false, forecast: true },
    ]);
    expect(t).toContain("PRF 2026");
    expect(t).toContain("situação: previsto");
    expect(t).toContain("prova: 2026-12-01 (prevista)");
  });
  it("sem concursos manda usar a busca", () => {
    expect(buildContestContext([])).toContain("busca na internet");
  });
});
