import { PastelProfile } from "@/app/(app)/perfil/pastel-profile";
import { PastelCard } from "@/components/pastel/card";
import { computeGamification } from "@/domain/progress/gamification";
import { dashboard, studyStats } from "../fixtures";

export default function Page() {
  return (
    <PastelProfile
      p={{
        name: "Rafael",
        email: "exemplo@nivelaprovado.dev",
        since: "2026-06-01T12:00:00Z",
        now: "2026-10-10T12:00:00Z",
        gamification: computeGamification(studyStats),
        themesPassed: studyStats.themesPassed,
        goals: dashboard.goals,
        today: { answered: dashboard.today.answered },
        weekLessonsCompleted: dashboard.weekLessonsCompleted,
      }}
    >
      <PastelCard noTilt className="p-6">
        <h2 className="text-[13px] font-bold">Dados e metas</h2>
        <p className="mt-2 text-[12px] text-[#6B6A8A]">No app, aqui ficam o formulário de nome e metas, o plano e a opção de sair.</p>
      </PastelCard>
    </PastelProfile>
  );
}
