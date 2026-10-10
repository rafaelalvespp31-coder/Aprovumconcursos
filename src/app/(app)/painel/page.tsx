import Link from "next/link";
import { redirect } from "next/navigation";
import { getCoverage, getDueReviews, getTrailPlan, listTrails, rulerStateOf, getProfile } from "@/server/queries";
import { CoverageRuler } from "@/components/coverage-ruler";
import { ButtonLink, Notice } from "@/components/ui";
import { prioritizeReviews } from "@/domain/progress/review";

export const metadata = { title: "Painel" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ senha?: string }> }) {
  const sp = await searchParams;
  const [trails, reviews, { profile }] = await Promise.all([listTrails(), getDueReviews(), getProfile()]);
  if (trails.length === 0 && !profile?.onboarding_completed) redirect("/nova-trilha");

  const active = trails.filter((t) => t.status === "active").slice(0, 4);
  const pending = trails.filter((t) => t.status !== "active");
  const details = await Promise.all(
    active.map(async (t) => {
      const [plan, cov] = await Promise.all([getTrailPlan(t.id), getCoverage(t.id)]);
      const lessons = plan.flatMap((m) => m.lessons);
      const next = lessons.find((l) => l.state && ["disponivel", "em_andamento", "aula_concluida", "em_revisao"].includes(l.state));
      return { trail: t, next, cov: cov.filter((c) => c.coverage?.requires_direct_coverage) };
    }),
  );
  const now = new Date();
  const recs = prioritizeReviews(
    reviews.map((r) => ({
      unitId: r.lesson_id as string,
      title: (r.lessons as unknown as { title: string } | null)?.title ?? "Aula",
      review: { step: r.step, ease: Number(r.ease), lapses: r.lapses, attempts: 0, lastReviewedAt: r.last_reviewed_at ? new Date(r.last_reviewed_at) : null, dueAt: new Date(r.due_at) },
      recentErrors: 0,
      importance: null,
    })),
    now,
  ).filter((r) => r.due);
  const first = details.find((d) => d.next);
  const name = profile?.display_name?.split(" ")[0];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="t-h1">{name ? `Olá, ${name}` : "Seu painel"}</h1>
        {sp.senha === "alterada" && <div className="mt-3"><Notice tone="sucesso">Senha alterada.</Notice></div>}
      </div>

      {first?.next ? (
        <section className="rounded-lg border border-azul/30 bg-nevoa p-5">
          <p className="t-small text-tinta-suave">Próxima aula em {first.trail.title}</p>
          <p className="mt-1 t-h2">{first.next.title}</p>
          <p className="mt-1 t-small text-tinta-suave">{first.next.objective}</p>
          <ButtonLink href={`/aula/${first.next.id}`} className="mt-4">Continuar estudando</ButtonLink>
        </section>
      ) : (
        active.length === 0 && pending.length === 0 && (
          <Notice tone="info" title="Nenhuma trilha em andamento">
            <ButtonLink href="/nova-trilha" className="mt-2">Criar uma trilha</ButtonLink>
          </Notice>
        )
      )}

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="t-h2">Revisões de hoje</h2>
          <Link href="/revisoes" className="t-small font-semibold text-azul underline underline-offset-2">Todas as revisões</Link>
        </div>
        {recs.length === 0 ? (
          <p className="mt-2 text-tinta-suave">Nenhuma revisão pendente agora.</p>
        ) : (
          <ul className="mt-3 divide-y divide-linha rounded-lg border border-linha bg-superficie">
            {recs.slice(0, 5).map((r) => (
              <li key={r.unitId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{r.title}</p>
                  <p className="t-small text-tinta-suave">{r.reasons.join(" ")}</p>
                </div>
                <ButtonLink href={`/aula/${r.unitId}?revisao=1#questoes`} variant="secundario">Revisar</ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="t-h2">Trilhas em andamento</h2>
          <Link href="/nova-trilha" className="t-small font-semibold text-azul underline underline-offset-2">Nova trilha</Link>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          {details.map(({ trail, cov }) => (
            <Link key={trail.id} href={`/trilhas/${trail.id}`} className="rounded-lg border border-linha bg-superficie p-4 hover:border-azul">
              <p className="font-semibold">{trail.title}</p>
              <div className="mt-3">
                <CoverageRuler size="sm" label={`Cobertura de ${trail.title}`} segments={cov.map((c) => ({ key: c.key, state: rulerStateOf(c.coverage) }))} />
              </div>
              <p className="mt-2 t-tiny text-tinta-fraca">
                {cov.filter((c) => c.coverage.mastered).length} de {cov.length} itens dominados
              </p>
            </Link>
          ))}
          {pending.map((t) => (
            <Link key={t.id} href={`/trilhas/${t.id}`} className="rounded-lg border border-dashed border-linha-forte bg-superficie p-4 hover:border-azul">
              <p className="font-semibold">{t.title}</p>
              <p className="mt-1 t-small text-tinta-suave">
                {t.status === "review" ? "Pronta para conferência" : t.status === "failed" ? "Construção interrompida" : "Em construção"}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
