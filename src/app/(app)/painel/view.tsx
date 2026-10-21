"use client";

import Link from "next/link";
import type { UnitState } from "@/domain/progress/state-machine";
import type { PainelOverview } from "@/server/queries";
import type { Stage } from "./model";
import {
  ContinueBand,
  GamePromo,
  NextLessonCard,
  PainelFooter,
  PerformanceCard,
  ProgressCard,
  QuickAccess,
  type QuickItem,
} from "./widgets";

export interface DashboardData {
  name: string | null;
  goals: { dailyQuestions: number | null; weeklyLessons: number | null };
  today: { answered: number; correct: number };
  accuracy14d: number | null;
  answered14d: number;
  continueLesson: {
    id: string;
    title: string;
    objective: string;
    state: UnitState;
    stage: Stage;
    trailId: string;
    trailTitle: string;
    moduleTitle: string | null;
    position: number | null;
    totalLessons: number | null;
    trailProgress: number;
    estimatedMinutes: number;
  } | null;
  questions: { total: number; unanswered: number; marked: number };
  reviews: { count: number; top: { lessonId: string; title: string; overdueDays: number } | null };
  overview: PainelOverview;
  pendingTrails: Array<{ id: string; title: string; status: string }>;
  /** Prefixo de rotas (a galeria usa /dev/galeria). */
  basePath?: string;
}

const pctOf = (a: number, b: number) => (b ? Math.round((a / b) * 100) : null);

export function DashboardView(d: DashboardData) {
  const base = d.basePath ?? "";
  const o = d.overview;
  const c = d.continueLesson;
  const recentOfCurrent = c ? o.recent.find((r) => r.lessonId === c.id) : undefined;
  const subjectOfCurrent = recentOfCurrent?.subject ?? (c ? o.subjects.find((s) => s.studyId === c.trailId)?.name : undefined);
  const next = c
    ? {
        id: c.id,
        title: c.title,
        subject: subjectOfCurrent ?? c.trailTitle,
        context: c.moduleTitle ?? (subjectOfCurrent ? c.trailTitle : ""),
        objective: c.objective,
        position: c.position,
        pct: recentOfCurrent?.pct ?? 0,
        estimatedMinutes: c.estimatedMinutes,
      }
    : null;

  const qGoal = d.goals.dailyQuestions;
  const quick: QuickItem[] = [
    { id: "estudos", href: `${base}/trilhas`, label: "Estudos", desc: "Suas matérias e assuntos", state: o.subjects.length ? `${o.subjects.length} ${o.subjects.length === 1 ? "matéria" : "matérias"}` : null },
    { id: "jogo", href: `${base}/quiz`, label: "Modo Jogo", desc: "Complete a lei", state: null },
    { id: "questoes", href: `${base}/questoes`, label: "Questões", desc: "Cadernos de questões", state: null },
    {
      id: "revisoes",
      href: d.reviews.top ? `${base}/aula/${d.reviews.top.lessonId}?revisao=1#questoes` : `${base}/revisoes`,
      label: "Revisões",
      desc: d.reviews.top ? d.reviews.top.title : "Revisão espaçada",
      state: d.reviews.count ? `${d.reviews.count} ${d.reviews.count === 1 ? "pendente" : "pendentes"}` : "em dia",
    },
    { id: "evolucao", href: `${base}/desempenho`, label: "Evolução", desc: "Seu desempenho", state: d.accuracy14d !== null ? `${Math.round(d.accuracy14d * 100)}% em 14 dias` : null },
    { id: "perfil", href: `${base}/perfil`, label: "Meu Perfil", desc: "Metas e conquistas", state: qGoal ? `Hoje: ${d.today.answered}/${qGoal} questões` : "defina sua meta" },
  ];

  return (
    <div className="painel-ref space-y-4 lg:space-y-5" data-testid="painel">
      <div className="painel-textura" aria-hidden />

      {d.pendingTrails.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {d.pendingTrails.map((t) => (
            <Link key={t.id} href={`${base}/trilhas/${t.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#E6E7EB] bg-white px-3 py-1.5 text-[12px] font-medium text-[#3A3C42] hover:border-[#E50914]">
              {t.title} — {t.status === "review" ? "pronto para começar" : t.status === "failed" ? "falhou: tente de novo" : "em preparação"}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5 xl:grid-cols-[minmax(0,1.43fr)_minmax(0,1fr)]">
        <ProgressCard
          passed={o.totals.lessonsPassed}
          total={o.totals.lessonsTotal}
          subjectsInProgress={o.subjects.filter((s) => s.status === "andamento").length}
          lessonsRead={o.totals.lessonsRead}
          answered={o.totals.answered}
        />
        <NextLessonCard lesson={next} base={base} hasStudies={o.subjects.length > 0} />

        <div className="flex min-w-0 flex-col gap-4 md:col-span-2 lg:gap-5 xl:col-span-1">
          <ContinueBand lessons={o.recent.filter((r) => r.lessonId !== c?.id)} base={base} />
        </div>
        <div className="grid min-w-0 grid-cols-1 content-start gap-4 md:col-span-2 md:grid-cols-2 lg:gap-5 xl:col-span-1 xl:grid-cols-1">
          <GamePromo base={base} />
          <PerformanceCard
            accuracy={pctOf(o.totals.correct, o.totals.answered)}
            accuracy14d={d.accuracy14d === null ? null : Math.round(d.accuracy14d * 100)}
            completion={pctOf(o.totals.lessonsPassed, o.totals.lessonsTotal)}
            streak={o.totals.streak}
            base={base}
          />
        </div>
      </div>

      <QuickAccess items={quick} />
      <PainelFooter />
    </div>
  );
}
