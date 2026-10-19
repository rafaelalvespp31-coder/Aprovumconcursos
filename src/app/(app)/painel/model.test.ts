import { describe, expect, it } from "vitest";
import { buildActivities, buildSubjects, lessonPct, subjectStatus, timeAgo } from "./model";

const now = new Date("2026-10-19T15:00:00Z");

describe("painel: modelo", () => {
  it("andamento da aula: leitura + três níveis", () => {
    expect(lessonPct(false, 0)).toBe(0);
    expect(lessonPct(true, 0)).toBe(25);
    expect(lessonPct(true, 3)).toBe(100);
    expect(lessonPct(false, 9)).toBe(75);
  });

  it("tempo relativo em português", () => {
    expect(timeAgo("2026-10-19T14:59:30Z", now)).toBe("agora");
    expect(timeAgo("2026-10-19T14:40:00Z", now)).toBe("há 20 min");
    expect(timeAgo("2026-10-19T13:00:00Z", now)).toBe("há 2 horas");
    expect(timeAgo("2026-10-18T14:00:00Z", now)).toBe("há 1 dia");
  });

  it("situação da matéria", () => {
    expect(subjectStatus(["concluido", "concluido"])).toBe("concluido");
    expect(subjectStatus(["concluido", "nao_iniciado"])).toBe("andamento");
    expect(subjectStatus(["nao_iniciado"])).toBe("nao_iniciado");
  });

  it("matérias: soma aulas e aprovadas dos assuntos", () => {
    const s = buildSubjects(
      [{ name: "Direito Penal", studies: [{ id: "a", title: "Homicídio", status: "andamento" }, { id: "b", title: "Furto", status: "nao_iniciado" }] }],
      new Map([["a", 6], ["b", 2]]),
      new Map([["a", 3]]),
    );
    expect(s[0]).toMatchObject({ name: "Direito Penal", done: 3, total: 8, pct: 38, status: "andamento", studyId: "a", detail: "Homicídio e mais 1" });
  });

  it("atividades: agrupa questões por aula e dia e ordena pelas mais recentes", () => {
    const acts = buildActivities(
      [{ lessonId: "L1", trailId: "T1", state: "em_andamento", levelsPassed: 0, readingCompletedAt: null, updatedAt: "2026-10-19T11:00:00Z", lessonTitle: "Furto" }],
      [
        { at: "2026-10-19T13:00:00Z", correct: true, lessonId: "L1", lessonTitle: "Furto" },
        { at: "2026-10-19T12:50:00Z", correct: false, lessonId: "L1", lessonTitle: "Furto" },
      ],
      new Map([["T1", "Direito Penal"]]),
      new Map([["L1", "T1"]]),
      now,
    );
    expect(acts.map((a) => a.kind)).toEqual(["questoes", "aula"]);
    expect(acts[0]!.title).toBe("Você respondeu 2 questões de Furto (Direito Penal)");
    expect(acts[0]!.detail).toBe("1 acerto · há 2 horas");
    expect(acts[1]!.detail).toBe("Acessada há 4 horas");
  });
});
