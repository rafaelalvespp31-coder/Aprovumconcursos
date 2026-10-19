import { redirect } from "next/navigation";
import { getDashboard, getDueReviews, getPainelOverview, getTrailPlan, listTrails } from "@/server/queries";
import { DashboardView } from "./view";
import { HeroBanner } from "./hero-banner";
import { overdueDays, stageOf, type PlanModule } from "./model";

export const metadata = { title: "Painel" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const sp = await searchParams;
  const [trails, reviews, dash, overview] = await Promise.all([listTrails(), getDueReviews(), getDashboard(), getPainelOverview()]);
  if (trails.length === 0 && !dash.profile?.onboarding_completed) redirect("/nova-trilha");

  const now = new Date();
  const due = reviews.filter((r) => new Date(r.due_at) <= now);
  const top = due[0];

  const c = dash.continueLesson;
  let continueLesson = null;
  if (c) {
    const plan = (await getTrailPlan(c.trailId)) as PlanModule[];
    const all = plan.flatMap((m) => m.lessons);
    const idx = all.findIndex((l) => l.id === c.id);
    continueLesson = {
      ...c,
      stage: stageOf(c.state, due.some((r) => r.lesson_id === c.id)),
      position: idx >= 0 ? idx + 1 : null,
      totalLessons: all.length || null,
      trailProgress: 0,
    };
  }
  const name = dash.profile?.display_name?.split(" ")[0] ?? null;

  return (
    <>
      <HeroBanner name={name} />
      {sp.senha === "alterada" && (
        <p role="status" className="mb-4 rounded-[14px] border border-[#E6E7EB] bg-white px-4 py-2 text-[13px] font-medium text-[#08090B]">Senha alterada.</p>
      )}
      <DashboardView
        name={name}
        goals={{ dailyQuestions: dash.profile?.daily_questions_goal ?? null, weeklyLessons: dash.profile?.weekly_lessons_goal ?? null }}
        today={dash.today}
        accuracy14d={dash.accuracy14d}
        answered14d={dash.answered14d}
        continueLesson={continueLesson}
        questions={dash.questions}
        reviews={{
          count: due.length,
          top: top ? { lessonId: top.lesson_id as string, title: (top.lessons as unknown as { title: string } | null)?.title ?? "Tema", overdueDays: overdueDays(top.due_at as string, now) } : null,
        }}
        overview={overview}
        pendingTrails={trails.filter((t) => t.status !== "active").map((t) => ({ id: t.id, title: t.title, status: t.status }))}
      />
    </>
  );
}
