import { MentorPlanoHoje } from "@/components/mentor/mentor-plano-hoje";
import type { StudyPlan } from "@/domain/mentor/plan";

export const dynamic = "force-dynamic";

const dia = (weekday: number) => ({
  weekday, label: "Dia", theme: "Aula nova + questões + revisão", minutes: 130, questions: 24,
  blocks: [
    { kind: "aula" as const, subject: "Língua Portuguesa", minutes: 50, detail: "Aula nova (2 pendentes nessa matéria)." },
    { kind: "questoes" as const, subject: "Direito Constitucional", minutes: 40, detail: "14 questões de Direito Constitucional." },
    { kind: "revisao" as const, subject: "Informática", minutes: 25, detail: "Zere as revisões vencidas." },
    { kind: "simulado" as const, subject: "Todas as matérias", minutes: 15, detail: "Mini-simulado de 10 questões, no tempo." },
  ],
});
const plan: StudyPlan = { contest: "PRF", daysToExam: 42, weeklyMinutes: 810, weeklyQuestions: 124, days: [1, 2, 3, 4, 5, 6, 0].map(dia), notes: ["Você tem 2 revisões vencidas: comece por elas."] };

/** Galeria: plano do dia do Mentor (dados de exemplo, tema escuro). */
export default function Page() {
  return (
    <main style={{ background: "#0b0b0d", minHeight: "100vh", padding: 14 }}>
      <MentorPlanoHoje plan={plan} />
    </main>
  );
}
