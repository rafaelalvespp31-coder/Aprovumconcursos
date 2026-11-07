import { getDashboard, getProfile, getStudyStats } from "@/server/queries";
import { requireUser } from "@/server/auth";
import { computeGamification } from "@/domain/progress/gamification";
import Link from "next/link";
import { getPartnerStatus } from "@/server/services/partner";
import { getMyAvatarGender } from "@/server/services/avatar";
import { PastelCard } from "@/components/pastel/card";
import { getBankRoles } from "@/server/services/bank";
import { signOut } from "../../(auth)/actions";
import { LogoutButton } from "../logout-button";
import { ProfileForm } from "./form";
import { PainelAdmin, type AdminItem, type AdminNote } from "./painel-admin";
import { listRaioXRequests, studentLabel } from "@/server/services/strategic";
import { PastelProfile } from "./pastel-profile";
import { getPlanUsage } from "@/server/services/plans";
import { FREE_LIMITS, PERIOD_LABELS, PLAN_LABELS, effectivePlan, type BillingPeriod } from "@/domain/plans/limits";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [{ profile, subscription }, stats, dash, roles, usage, partner, avatarGender] = await Promise.all([getProfile(), getStudyStats(), getDashboard(), getBankRoles(user.id), getPlanUsage(user.id), getPartnerStatus(user.id), getMyAvatarGender(user.id).catch(() => null)]);
  const pedidos = roles.admin ? await listRaioXRequests({ onlyPending: true, limit: 50 }).catch(() => []) : [];
  const notes: AdminNote[] = pedidos.map((r) => ({
    id: r.prepId, title: `Novo pedido de Raio-X: ${r.examName}`,
    detail: `Aluno: ${studentLabel(r)}${[r.role, r.board, r.year].filter(Boolean).length ? ` · ${[r.role, r.board, r.year].filter(Boolean).join(" · ")}` : ""}`,
    when: new Date(r.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }), href: `/admin/estrategico/importar?exam=${r.examId}`,
  }));
  const staff = roles.admin || roles.autor || roles.revisor;
  const adminItems: AdminItem[] = [
    ...(roles.admin ? [{ href: "/admin/catalogo/enviar", label: "Catalogar aula" }] : []),
    { href: "/banco/importar", label: "Cadastrar questões" },
    { href: "/banco", label: "Banco de questões" },
    ...(roles.admin ? [
      { href: "/admin/catalogo", label: "Catálogo" }, { href: "/admin/catalogo/plano", label: "Plano de tópicos" }, { href: "/admin/catalogo/banners", label: "Banners" },
      { href: "/admin/fila", label: "Fila da IA" }, { href: "/admin/alunos", label: "Alunos e planos" }, { href: "/admin/avatares", label: "Avatares" },
      { href: "/admin/concursos", label: "Concursos" }, { href: "/admin/estrategico", label: "Estratégico", badge: notes.length }, { href: "/admin/editais", label: "Editais" }, { href: "/admin/redacao", label: "Redação Elite" },
      { href: "/admin/aprovados", label: "Aprovados" }, { href: "/admin/depoimentos", label: "Depoimentos" }, { href: "/admin/socio", label: "Sócio admin" },
    ] : []),
  ];
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
      {partner.isPartner && partner.active && (
        <PastelCard noTilt className="p-6" testId="area-socio">
          <h2 className="mb-1 text-[13px] font-bold">Sócio administrativo</h2>
          <p className="mb-4 text-[12px] text-[#5C5C5C]">Indicadores da plataforma liberados para você.</p>
          <Link href="/business" className="inline-flex min-h-11 items-center rounded-xl bg-[#0A0A0A] px-4 text-[13px] font-bold text-white active:scale-95">Abrir APROVUM BUSINESS</Link>
        </PastelCard>
      )}
      {staff && (
        <PastelCard noTilt className="p-6" testId="area-equipe">
          <h2 className="mb-1 text-[13px] font-bold">Painel do Admin</h2>
          <p className="mb-4 text-[12px] text-[#5C5C5C]">Visível só para a equipe do APROVUM.</p>
          <PainelAdmin items={adminItems} notes={notes} />
        </PastelCard>
      )}
      <PastelCard noTilt className="p-6">
        <h2 className="mb-4 text-[13px] font-bold">Dados e metas</h2>
        <ProfileForm whatsapp={(profile as { whatsapp?: string | null } | null)?.whatsapp ?? null} motto={(profile as { motto?: string | null } | null)?.motto ?? null} avatarGender={avatarGender} displayName={profile?.display_name ?? ""} dailyQuestions={profile?.daily_questions_goal ?? null} weeklyLessons={profile?.weekly_lessons_goal ?? null} />
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
