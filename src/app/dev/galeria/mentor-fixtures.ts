import type { MentorCardState } from "@/components/mentor/types";
import type { MentorLesson, MentorSnapshot } from "@/domain/mentor/engine";

/** Estados do card do Mentor para a galeria (dados fictícios, nada é gravado). */
export const mentorDemos: Record<string, MentorCardState> = {
  ok: {
    state: "ok",
    name: "Rafael",
    pending: 4,
    completed: 2,
    items: [
      {
        id: "11111111-1111-4111-8111-000000000001",
        key: "aula_pendente:l-ext",
        kind: "aula_pendente",
        title: "Você tem uma aula para concluir",
        explanation: "Termine a teoria de Direito Penal — Extorsão.",
        reason: "Você iniciou esta aula e a leitura ainda não foi concluída (0% da aula).",
        href: "/aula/l-ext",
        actionLabel: "Continuar aula",
        subject: "Direito Penal",
        label: "Extorsão",
        progress: { pct: 0, label: "0% da aula (leitura e 0 de 3 níveis de questões)" },
        status: "nova",
      },
      {
        id: "11111111-1111-4111-8111-000000000002",
        key: "revisao_vencida:l-furto",
        kind: "revisao_vencida",
        title: "Revisão vencida",
        explanation: "Revise Direito Penal — Furto.",
        reason: "A revisão programada venceu há 2 dias.",
        href: "/aula/l-furto?revisao=1#questoes",
        actionLabel: "Revisar agora",
        subject: "Direito Penal",
        label: "Furto",
        progress: null,
        status: "nova",
      },
    ],
  },
  vazio: { state: "vazio", name: "Rafael", completed: 3 },
  sem_dados: { state: "sem_dados", name: "Rafael" },
  sessao: { state: "sessao" },
  erro: { state: "erro" },
};

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
  vazio: { now: NOW, lessons: [], performance: [], reviews: [], notebooks: [] },
};
