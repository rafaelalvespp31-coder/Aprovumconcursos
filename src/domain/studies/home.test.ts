import { describe, expect, it } from "vitest";
import { buildStudiesHome, formatDuration, formatLastAccess, timeAgo, type StudiesRaw } from "./home";

const base: StudiesRaw = {
  name: "Rafael",
  streak: { current: 3, last7: [false, true, true, true, false, true, true] },
  trails: [
    { id: "t1", title: "Atos administrativos", status: "active", last_studied_at: "2026-10-15T12:00:00Z", updated_at: "2026-10-15T12:00:00Z", folder_id: null, catalogTopicIds: ["c1"] },
    { id: "t2", title: "Inquérito policial", status: "active", last_studied_at: "2026-10-14T12:00:00Z", updated_at: "2026-10-14T12:00:00Z", folder_id: "f1", catalogTopicIds: [] },
  ],
  folders: [{ id: "f1", name: "Processo Penal" }],
  lessons: [
    { id: "l1", trail_id: "t1", title: "Anulação", objective: "Distinguir", estimated_minutes: 25, sort_order: 1 },
    { id: "l2", trail_id: "t2", title: "Prazo", objective: "Prazos", estimated_minutes: 20, sort_order: 1 },
    { id: "lx", trail_id: "outro", title: "De outro aluno", objective: "", estimated_minutes: 5, sort_order: 1 },
  ],
  progress: [
    { lesson_id: "l1", trail_id: "t1", state: "em_andamento", levels_passed: 1, updated_at: "2026-10-15T12:00:00Z" },
    { lesson_id: "l2", trail_id: "t2", state: "dominada", levels_passed: 3, updated_at: "2026-10-14T12:00:00Z" },
  ],
  questions: [
    { id: "q1", lesson_id: "l1" },
    { id: "q2", lesson_id: "l1" },
    { id: "q3", lesson_id: "l2" },
    { id: "qx", lesson_id: "lx" },
  ],
  attempts: [
    { question_id: "q1", created_at: "2026-10-15T13:24:00Z", time_spent_seconds: 90 },
    { question_id: "q3", created_at: "2026-10-14T10:00:00Z", time_spent_seconds: 60 },
  ],
  catalog: [
    { id: "c1", discipline: "Direito Administrativo", questions: 30 },
    { id: "c2", discipline: "Direito Administrativo", questions: 10 },
    { id: "c3", discipline: "Direito Penal", questions: 12 },
  ],
};

describe("página de Estudos: dados reais agregados", () => {
  it("progresso geral, aulas, tempo e último acesso vêm das respostas e aulas do aluno", () => {
    const h = buildStudiesHome(base);
    expect(h.overall).toEqual({ answered: 2, total: 3 }); // qx é de aula fora dos estudos
    expect(h.lessons).toEqual({ done: 1, total: 2 });
    expect(h.questionSeconds).toBe(150);
    expect(h.lastAccess).toBe("2026-10-15T13:24:00Z");
  });

  it("aula em andamento: a mais recente ainda não concluída, com a matéria do catálogo", () => {
    const h = buildStudiesHome(base);
    expect(h.current).toMatchObject({ lessonId: "l1", trailId: "t1", discipline: "Direito Administrativo", minutes: 25 });
    expect(h.studies[0]).toMatchObject({ id: "t1", inProgress: true, answered: 1, totalQuestions: 2 });
    // Sem catálogo, a matéria é a pasta do aluno.
    expect(h.studies[1]).toMatchObject({ id: "t2", discipline: "Processo Penal", lessonsDone: 1, lessonsTotal: 1 });
  });

  it("temas do catálogo para 'Escolha seu novo estudo': só os com título, com o andamento real do aluno", () => {
    const h = buildStudiesHome({
      ...base,
      catalog: [
        { id: "c1", discipline: "Direito Administrativo", questions: 30, title: "Atos administrativos", minutes: 60 },
        { id: "c2", discipline: "Direito Administrativo", questions: 10, title: "Agentes públicos" },
        { id: "c3", discipline: "Direito Penal", questions: 12 },
      ],
    });
    expect(h.themes.map((t) => t.id)).toEqual(["c2", "c1"]); // c3 sem título fica de fora; ordem por matéria e título
    expect(h.themes[1]).toMatchObject({ title: "Atos administrativos", minutes: 60, study: { trailId: "t1", answered: 1, totalQuestions: 2, pct: 50, done: false } });
    expect(h.themes[0]).toMatchObject({ minutes: 0, study: null });
  });

  it("catálogo por matéria com aulas, questões e o que o aluno concluiu", () => {
    const done = buildStudiesHome({ ...base, progress: base.progress.map((p) => ({ ...p, levels_passed: 3 })) });
    expect(done.subjects).toEqual([
      { discipline: "Direito Administrativo", topics: 2, questions: 40, done: 1 },
      { discipline: "Direito Penal", topics: 1, questions: 12, done: 0 },
    ]);
    expect(done.current).toBeNull();
  });

  it("sem estudos: tudo zerado, sem aula em andamento", () => {
    const h = buildStudiesHome({ ...base, trails: [], lessons: [], progress: [], questions: [], attempts: [] });
    expect(h.overall).toEqual({ answered: 0, total: 0 });
    expect(h.current).toBeNull();
    expect(h.studies).toEqual([]);
    expect(h.lastAccess).toBeNull();
  });

  it("formatos de tempo", () => {
    expect(formatDuration(0)).toBe("—");
    expect(formatDuration(9000)).toBe("2h 30min");
    expect(formatDuration(600)).toBe("10min");
    const now = new Date("2026-10-15T15:00:00Z");
    expect(formatLastAccess("2026-10-15T13:24:00Z", now)).toBe("Hoje, 10:24");
    expect(formatLastAccess("2026-10-14T13:24:00Z", now)).toBe("Ontem, 10:24");
    expect(timeAgo("2026-10-15T13:00:00Z", now)).toBe("há 2h");
    expect(timeAgo(null, now)).toBe("ainda não estudado");
  });
});
