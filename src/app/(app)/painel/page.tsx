import { redirect } from "next/navigation";
import { getDashboard, getDueReviews, getTrailPlan, listTrails } from "@/server/queries";
import { DashboardView } from "./view";
import { BrandBanner } from "./brand-banner";
import { overdueDays, stageOf, trailCard, type PlanModule } from "./model";

export const metadata = { title: "Painel" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const sp = await searchParams;
  const [trails, reviews, dash] = await Promise.all([listTrails(), getDueReviews(), getDashboard()]);
  if (trails.length === 0 && !dash.profile?.onboarding_completed) redirect("/nova-trilha");

  const active = trails.filter((t) => t.status === "active").slice(0, 6);
  const plans = new Map<string, PlanModule[]>(
    await Promise.all(active.map(async (t) => [t.id, (await getTrailPlan(t.id)) as PlanModule[]] as const)),
  );
  const cards = active.map((t, i) => trailCard(t, plans.get(t.id) ?? [], i));

  const now = new Date();
  const due = reviews.filter((r) => new Date(r.due_at) <= now);
  const top = due[0];

  const c = dash.continueLesson;
  let continueLesson = null;
  if (c) {
    const plan = plans.get(c.trailId) ?? ((await getTrailPlan(c.trailId)) as PlanModule[]);
    const all = plan.flatMap((m) => m.lessons);
    const idx = all.findIndex((l) => l.id === c.id);
    const card = trailCard({ id: c.trailId, title: c.trailTitle }, plan, 0);
    continueLesson = {
      ...c,
      stage: stageOf(c.state, due.some((r) => r.lesson_id === c.id)),
      position: idx >= 0 ? idx + 1 : null,
      totalLessons: all.length || null,
      trailProgress: card.progress,
    };
  }

  return (
    <>
      <BrandBanner />
      {sp.senha === "alterada" && (
        <p role="status" className="mb-4 rounded-[14px] border border-[#D4D4D4] bg-[#F5F5F5] px-4 py-2 text-[13px] font-medium text-[#0A0A0A]">Senha alterada.</p>
      )}
      <DashboardView
        name={dash.profile?.display_name?.split(" ")[0] ?? null}
        goals={{ dailyQuestions: dash.profile?.daily_questions_goal ?? null, weeklyLessons: dash.profile?.weekly_lessons_goal ?? null }}
        today={dash.today}
        weekLessonsCompleted={dash.weekLessonsCompleted}
        days={dash.days}
        accuracy14d={dash.accuracy14d}
        answered14d={dash.answered14d}
        continueLesson={continueLesson}
        questions={dash.questions}
        reviews={{
          count: due.length,
          top: top ? { lessonId: top.lesson_id as string, title: (top.lessons as unknown as { title: string } | null)?.title ?? "Tema", overdueDays: overdueDays(top.due_at as string, now) } : null,
        }}
        trails={cards}
        pendingTrails={trails.filter((t) => t.status !== "active").map((t) => ({ id: t.id, title: t.title, status: t.status }))}
      />
    </>
  );
}
