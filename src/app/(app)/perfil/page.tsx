import { getDashboard, getProfile, getStudyStats } from "@/server/queries";
import { requireUser } from "@/server/auth";
import { computeGamification } from "@/domain/progress/gamification";
import Link from "next/link";
import { PastelCard } from "@/components/pastel/card";
import { getBankRoles } from "@/server/services/bank";
import { signOut } from "../../(auth)/actions";
import { LogoutButton } from "../logout-button";
import { ProfileForm } from "./form";
import { PastelProfile } from "./pastel-profile";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [{ profile, subscription }, stats, dash, roles] = await Promise.all([getProfile(), getStudyStats(), getDashboard(), getBankRoles(user.id)]);
  const staff = roles.admin || roles.autor || roles.revisor;
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
      {staff && (
        <PastelCard noTilt className="p-6" testId="area-equipe">
          <h2 className="mb-1 text-[13px] font-bold">Área da equipe</h2>
          <p className="mb-4 text-[12px] text-[#5C5C5C]">Visível só para a equipe do APROVUM.</p>
          <div className="flex flex-wrap gap-2">
            {roles.admin && <Link href="/admin/catalogo/enviar" className="inline-flex min-h-11 items-center rounded-xl bg-[#E10600] px-4 text-[13px] font-bold text-white active:scale-95">Enviar aula (matéria)</Link>}
            <Link href="/banco/importar" className="inline-flex min-h-11 items-center rounded-xl bg-[#E10600] px-4 text-[13px] font-bold text-white active:scale-95">Enviar questões</Link>
            <Link href="/banco" className="inline-flex min-h-11 items-center rounded-xl bg-[#0A0A0A] px-4 text-[13px] font-bold text-white active:scale-95">Banco de questões</Link>
            {roles.admin && <Link href="/admin/catalogo" className="inline-flex min-h-11 items-center rounded-xl border border-[#D4D4D4] px-4 text-[13px] font-bold active:scale-95">Catálogo</Link>}
          </div>
        </PastelCard>
      )}
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
