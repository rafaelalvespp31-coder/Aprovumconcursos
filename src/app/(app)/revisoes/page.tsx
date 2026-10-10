import { getDueReviews } from "@/server/queries";
import { prioritizeReviews } from "@/domain/progress/review";
import { ButtonLink, EmptyState } from "@/components/ui";

export const metadata = { title: "Revisões" };

export default async function ReviewsPage() {
  const rows = await getDueReviews();
  const now = new Date();
  const titleOf = (r: (typeof rows)[number]) => (r.lessons as unknown as { title: string } | null)?.title ?? "Aula";
  const trailOf = (r: (typeof rows)[number]) => (r.study_trails as unknown as { title: string } | null)?.title ?? "";
  const recs = prioritizeReviews(
    rows.map((r) => ({
      unitId: r.lesson_id as string,
      title: titleOf(r),
      review: { step: r.step, ease: Number(r.ease), lapses: r.lapses, attempts: 0, lastReviewedAt: r.last_reviewed_at ? new Date(r.last_reviewed_at) : null, dueAt: new Date(r.due_at) },
      recentErrors: 0,
      importance: null,
    })),
    now,
  );
  const due = recs.filter((r) => r.due);
  const upcoming = rows.filter((r) => new Date(r.due_at) > now);

  return (
    <div>
      <h1 className="sr-only">Revisões</h1>
      <p className="mt-1 max-w-2xl text-tinta-suave">
        As revisões voltam em intervalos que crescem quando você acerta e diminuem quando erra. A ordem abaixo explica por que cada uma foi priorizada.
      </p>
      <section className="mt-6">
        <h2 className="t-h2">Para fazer agora</h2>
        {due.length === 0 ? (
          <div className="mt-3"><EmptyState title="Tudo em dia">Nenhuma revisão vencida no momento.</EmptyState></div>
        ) : (
          <ul className="mt-3 divide-y divide-linha rounded-lg border border-linha bg-superficie">
            {due.map((r) => (
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
      {upcoming.length > 0 && (
        <section className="mt-8">
          <h2 className="t-h2">Próximas</h2>
          <ul className="mt-3 divide-y divide-linha rounded-lg border border-linha bg-superficie">
            {upcoming.slice(0, 30).map((r) => (
              <li key={r.lesson_id as string} className="flex flex-wrap justify-between gap-2 px-4 py-2.5 t-small">
                <span>{titleOf(r)} <span className="text-tinta-fraca">({trailOf(r)})</span></span>
                <span className="text-tinta-suave">{new Date(r.due_at).toLocaleDateString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
