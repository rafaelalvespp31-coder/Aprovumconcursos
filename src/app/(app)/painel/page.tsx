import { redirect } from "next/navigation";
import { getCoverage, getDashboard, getDueReviews, getTrailPlan, listTrails, moduleProgress } from "@/server/queries";
import { prioritizeReviews } from "@/domain/progress/review";
import { DashboardView } from "./view";

export const metadata = { title: "Painel" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const sp = await searchParams;
  const [trails, reviews, dash] = await Promise.all([listTrails(), getDueReviews(), getDashboard()]);
  if (trails.length === 0 && !dash.profile?.onboarding_completed) redirect("/nova-trilha");

  const active = trails.filter((t) => t.status === "active").slice(0, 6);
  const trailData = await Promise.all(
    active.map(async (t) => {
      const [plan, cov] = await Promise.all([getTrailPlan(t.id), getCoverage(t.id)]);
      return { id: t.id, title: t.title, modules: moduleProgress(plan, cov) };
    }),
  );
  const recs = prioritizeReviews(
    reviews.map((r) => ({
      unitId: r.lesson_id as string,
      title: (r.lessons as unknown as { title: string } | null)?.title ?? "Aula",
      review: { step: r.step, ease: Number(r.ease), lapses: r.lapses, attempts: 0, lastReviewedAt: r.last_reviewed_at ? new Date(r.last_reviewed_at) : null, dueAt: new Date(r.due_at) },
      recentErrors: 0,
      importance: null,
    })),
    new Date(),
  ).filter((r) => r.due);

  return (
    <DashboardView
      name={dash.profile?.display_name?.split(" ")[0] ?? null}
      notice={sp.senha === "alterada" ? "Senha alterada." : null}
      goals={{ dailyQuestions: dash.profile?.daily_questions_goal ?? null, weeklyLessons: dash.profile?.weekly_lessons_goal ?? null }}
      today={dash.today}
      weekLessonsCompleted={dash.weekLessonsCompleted}
      days={dash.days}
      accuracy14d={dash.accuracy14d}
      answered14d={dash.answered14d}
      continueLesson={dash.continueLesson}
      questions={dash.questions}
      reviews={recs}
      trails={trailData}
      pendingTrails={trails.filter((t) => t.status !== "active").map((t) => ({ id: t.id, title: t.title, status: t.status }))}
    />
  );
}
