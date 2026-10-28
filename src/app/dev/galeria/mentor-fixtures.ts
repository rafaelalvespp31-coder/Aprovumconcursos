import { recommend, type MentorLesson, type MentorSnapshot } from "@/domain/mentor/engine";
import { reconcile } from "@/domain/mentor/history";
import type { MentorData, MentorPanelState } from "@/components/mentor/types";

const NOW = "2026-10-28T12:00:00.000Z";
const L = (over: Partial<MentorLesson>): MentorLesson => ({
  id: "l-ext", trailId: "t1", trailTitle: "Crimes contra o patrimônio", subject: "Direito Penal", title: "Extorsão", order: 1,
  state: "nao_iniciada", readingDone: false, levelsPassed: 0, updatedAt: "2026-10-27T12:00:00.000Z", prerequisiteIds: [],
  questionsByLevel: { facil: 12, medio: 12, dificil: 12 }, ...over,
});
const tries = (right: number, wrong: number) => [
  ...Array.from({ length: right }, () => ({ correct: true, questionValid: true })),
  ...Array.from({ length: wrong }, () => ({ correct: false, questionValid: true })),
];

/** Situações do aluno para a página do Mentor na galeria. */
export const mentorSnapshots: Record<string, MentorSnapshot> = {
  ok: {
    now: NOW,
    lessons: [
      L({ state: "em_andamento" }),
      L({ id: "l-furto", title: "Furto", order: 2, state: "aula_concluida", readingDone: true, levelsPassed: 1 }),
      L({ id: "l-roubo", title: "Roubo", order: 3, state: "dominada", readingDone: true, levelsPassed: 3 }),
    ],
    performance: [{ key: "banco:roubo", label: "Roubo", subject: "Direito Penal", href: "/questoes", attempts: tries(5, 7) }],
    reviews: [{ lessonId: "l-roubo", title: "Roubo", subject: "Direito Penal", dueAt: "2026-10-26T12:00:00.000Z" }],
    notebooks: [{ id: "nb1", title: "Caderno de Penal", answered: 22, available: 40 }],
  },
  em_dia: {
    now: NOW,
    lessons: [L({ state: "dominada", readingDone: true, levelsPassed: 3 })],
    performance: [{ key: "banco:roubo", label: "Roubo", subject: "Direito Penal", href: "/questoes", attempts: tries(18, 2) }],
    reviews: [],
    notebooks: [],
  },
  sem_dados: { now: NOW, lessons: [], performance: [], reviews: [], notebooks: [] },
};
mentorSnapshots.vazio = mentorSnapshots.sem_dados!;

/** O que o Mentor mostraria para cada situação, calculado pelo motor real (ids fictícios). */
export function mentorDemoData(key: string): MentorData {
  const snapshot = mentorSnapshots[key] ?? mentorSnapshots.ok!;
  const result = recommend(snapshot);
  const { visible } = reconcile(result.all, [], new Date(snapshot.now));
  return {
    name: "Rafael",
    result,
    visible: visible.map((v, n) => ({ ...v, storedId: `11111111-1111-4111-8111-00000000000${n + 1}` })),
    lessons: snapshot.lessons,
  };
}

/** Estados do Mentor flutuante na galeria (?mentor=ok|em_dia|sem_dados|sessao|erro). */
export const mentorPanelDemos: Record<string, MentorPanelState> = {
  ok: { state: "ok", ...mentorDemoData("ok") },
  em_dia: { state: "ok", ...mentorDemoData("em_dia") },
  sem_dados: { state: "ok", ...mentorDemoData("sem_dados") },
  sessao: { state: "sessao" },
  erro: { state: "erro" },
};
