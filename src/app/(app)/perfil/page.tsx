import { getDashboard, getProfile, getStudyStats } from "@/server/queries";
import { requireUser } from "@/server/auth";
import { computeGamification } from "@/domain/progress/gamification";
import { PastelCard } from "@/components/pastel/card";
import { signOut } from "../../(auth)/actions";
import { LogoutButton } from "../logout-button";
import { ProfileForm } from "./form";
import { PastelProfile } from "./pastel-profile";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [{ profile, subscription }, stats, dash] = await Promise.all([getProfile(), getStudyStats(), getDashboard()]);
  const plan = subscription?.plans as unknown as { name: string; max_active_trails: number; max_trail_builds_per_month: number; max_lesson_generations_per_month: number } | null;
  return (
    <PastelProfile
      p={{
        name: profile?.display_name ?? null,
        email: user.email ?? null,
        since: (profile as { created_at?: string } | null)?.created_at ?? null,
        gamification: computeGamification(stats),
        themesPassed: stats.themesPassed,
        goals: { dailyQuestions: profile?.daily_questions_goal ?? null, weeklyLessons: profile?.weekly_lessons_goal ?? null },
        today: { answered: dash.today.answered },
        weekLessonsCompleted: dash.weekLessonsCompleted,
      }}
    >
      <PastelCard noTilt className="p-6">
        <h2 className="mb-4 text-[13px] font-bold">Dados e metas</h2>
        <ProfileForm displayName={profile?.display_name ?? ""} dailyQuestions={profile?.daily_questions_goal ?? null} weeklyLessons={profile?.weekly_lessons_goal ?? null} />
      </PastelCard>
      <PastelCard noTilt className="p-6">
        <h2 className="mb-3 text-[13px] font-bold">Plano</h2>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-[13px]">
          <dt className="text-[#5C5C5C]">Plano atual</dt><dd className="font-semibold">{plan?.name ?? "Gratuito"}</dd>
          <dt className="text-[#5C5C5C]">Estudos ativos</dt><dd>{plan?.max_active_trails ?? "-"}</dd>
          <dt className="text-[#5C5C5C]">Novos estudos por mês</dt><dd>{plan?.max_trail_builds_per_month ?? "-"}</dd>
          <dt className="text-[#5C5C5C]">Aulas geradas por mês</dt><dd>{plan?.max_lesson_generations_per_month ?? "-"}</dd>
        </dl>
        <p className="mt-2 text-[11px] text-[#6B6B6B]">A contratação de planos pagos ainda não está disponível.</p>
      </PastelCard>
      <PastelCard noTilt className="p-6">
        <h2 className="mb-2 text-[13px] font-bold">Sessão</h2>
        <form action={signOut}><LogoutButton /></form>
      </PastelCard>
    </PastelProfile>
  );
}
