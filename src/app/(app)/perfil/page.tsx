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
import { getPlanUsage } from "@/server/services/plans";
import { FREE_LIMITS, PERIOD_LABELS, PLAN_LABELS, effectivePlan, type BillingPeriod } from "@/domain/plans/limits";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [{ profile, subscription }, stats, dash, roles, usage] = await Promise.all([getProfile(), getStudyStats(), getDashboard(), getBankRoles(user.id), getPlanUsage(user.id)]);
  const staff = roles.admin || roles.autor || roles.revisor;
  const sub = subscription as unknown as { plan_id: string; status: string; current_period_end?: string | null; billing_period?: string | null } | null;
  const eff = effectivePlan(sub ? { planId: sub.plan_id, status: sub.status, currentPeriodEnd: sub.current_period_end ?? null } : null);
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
            {roles.admin && <Link href="/admin/catalogo/enviar" className="inline-flex min-h-11 items-center rounded-xl bg-[#E10600] px-4 text-[13px] font-bold text-white active:scale-95">Catalogar aula</Link>}
            <Link href="/banco/importar" className="inline-flex min-h-11 items-center rounded-xl bg-[#E10600] px-4 text-[13px] font-bold text-white active:scale-95">Cadastrar questões</Link>
            <Link href="/banco" className="inline-flex min-h-11 items-center rounded-xl bg-[#0A0A0A] px-4 text-[13px] font-bold text-white active:scale-95">Banco de questões</Link>
            {roles.admin && <Link href="/admin/catalogo" className="inline-flex min-h-11 items-center rounded-xl border border-[#D4D4D4] px-4 text-[13px] font-bold active:scale-95">Catálogo</Link>}
            {roles.admin && <Link href="/admin/alunos" className="inline-flex min-h-11 items-center rounded-xl border border-[#D4D4D4] px-4 text-[13px] font-bold active:scale-95">Alunos e planos</Link>}
          </div>
        </PastelCard>
      )}
      <PastelCard noTilt className="p-6">
        <h2 className="mb-4 text-[13px] font-bold">Dados e metas</h2>
        <ProfileForm displayName={profile?.display_name ?? ""} dailyQuestions={profile?.daily_questions_goal ?? null} weeklyLessons={profile?.weekly_lessons_goal ?? null} />
      </PastelCard>
      <PastelCard noTilt className="p-6" testId="plano">
        <h2 id="plano" className="mb-3 text-[13px] font-bold">Plano</h2>
        <dl className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-[13px]">
          <dt className="text-[#5C5C5C]">Plano atual</dt>
          <dd className="font-semibold">
            {PLAN_LABELS[eff.planId]}
            {eff.paid && sub?.billing_period ? ` · ${PERIOD_LABELS[sub.billing_period as BillingPeriod] ?? ""}` : ""}
          </dd>
          {eff.paid && (
            <>
              <dt className="text-[#5C5C5C]">Válido até</dt>
              <dd>{sub?.current_period_end ? new Date(sub.current_period_end).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "sem vencimento"}</dd>
            </>
          )}
          {eff.state === "expirado" && (
            <>
              <dt className="text-[#5C5C5C]">Plano pago</dt>
              <dd className="font-semibold text-[#C8000C]">vencido em {new Date(sub!.current_period_end!).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</dd>
            </>
          )}
          {!usage.unlimited && (
            <>
              <dt className="text-[#5C5C5C]">Questões hoje</dt>
              <dd>
                restam {usage.questionsLeft} de {FREE_LIMITS.questionsPerDay}
              </dd>
              <dt className="text-[#5C5C5C]">Modo Jogo hoje</dt>
              <dd>
                restam {usage.gameLeft} de {FREE_LIMITS.gameQuestionsPerDay}
              </dd>
            </>
          )}
        </dl>
        <p className="mt-3 text-[12px] text-[#4D4D4D]">
          {usage.unlimited
            ? "Seu plano é ilimitado: aulas, questões e Modo Jogo sem limite diário."
            : `No plano gratuito você estuda ${FREE_LIMITS.lessonsPerDay} aula, ${FREE_LIMITS.questionsPerDay} questões e ${FREE_LIMITS.gameQuestionsPerDay} questões do Modo Jogo por dia. Os planos pagos (mensal, semestral ou anual) liberam tudo sem limite: fale com a equipe do APROVUM para assinar.`}
        </p>
      </PastelCard>
      <PastelCard noTilt className="p-6">
        <h2 className="mb-2 text-[13px] font-bold">Sessão</h2>
        <form action={signOut}><LogoutButton /></form>
      </PastelCard>
    </PastelProfile>
  );
}
