import { getProfile } from "@/server/queries";
import { requireUser } from "@/server/auth";
import { signOut } from "../../(auth)/actions";
import { LogoutButton } from "../logout-button";
import { ProfileForm } from "./form";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const { profile, subscription } = await getProfile();
  const plan = subscription?.plans as unknown as { name: string; max_active_trails: number; max_trail_builds_per_month: number; max_lesson_generations_per_month: number } | null;
  return (
    <div className="max-w-2xl">
      <h1 className="t-h1">Perfil</h1>
      <p className="mt-1 text-tinta-suave">{user.email}</p>

      <section className="mt-8">
        <h2 className="t-h2">Dados e metas</h2>
        <div className="mt-3">
          <ProfileForm displayName={profile?.display_name ?? ""} dailyQuestions={profile?.daily_questions_goal ?? null} weeklyLessons={profile?.weekly_lessons_goal ?? null} />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="t-h2">Plano</h2>
        <dl className="mt-3 grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 rounded-lg border border-linha bg-superficie p-4 t-small">
          <dt className="text-tinta-suave">Plano atual</dt><dd className="font-semibold">{plan?.name ?? "Gratuito"}</dd>
          <dt className="text-tinta-suave">Trilhas ativas</dt><dd>{plan?.max_active_trails ?? "-"}</dd>
          <dt className="text-tinta-suave">Construções de trilha por mês</dt><dd>{plan?.max_trail_builds_per_month ?? "-"}</dd>
          <dt className="text-tinta-suave">Aulas geradas por mês</dt><dd>{plan?.max_lesson_generations_per_month ?? "-"}</dd>
        </dl>
        <p className="mt-2 t-tiny text-tinta-fraca">A contratação de planos pagos ainda não está disponível.</p>
      </section>

      <section className="mt-10">
        <h2 className="t-h2">Sessão</h2>
        <form action={signOut} className="mt-2"><LogoutButton /></form>
      </section>
    </div>
  );
}
