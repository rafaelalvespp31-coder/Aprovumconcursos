import { redirect } from "next/navigation";
import { getLatestJob, getTrail } from "@/server/queries";
import { JobRunner, type PublicJob } from "@/components/job-runner";
import { STAGE_LABELS } from "@/server/pipeline/build-trail";
import { EmptyState, ButtonLink } from "@/components/ui";
import { ClarifyForm } from "./clarify-form";

export const metadata = { title: "Preparando estudo" };

export default async function ProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trail = await getTrail(id);
  if (trail.status === "review" || trail.status === "active") redirect(`/trilhas/${id}`);
  const job = await getLatestJob(id, "build_trail");
  if (!job) {
    return <EmptyState title="Nenhum processamento encontrado" action={<ButtonLink href="/nova-trilha">Novo estudo</ButtonLink>}>Este estudo não tem preparação em andamento.</EmptyState>;
  }
  if (trail.status === "clarification" && trail.scope_question) {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="t-h1">{trail.title}</h1>
        <div className="mt-6">
          <ClarifyForm trailId={id} question={trail.scope_question.question} options={trail.scope_question.options} />
        </div>
      </div>
    );
  }
  const initial: PublicJob = {
    id: job.id, kind: job.kind, stage: job.stage, status: job.status, progress: job.progress,
    error: job.error_message, errorCode: job.error_code, attempts: job.attempts, maxAttempts: job.max_attempts,
  };
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-h1">{trail.title}</h1>
      <p className="mt-1 text-tinta-suave">
        Identificamos o assunto, delimitamos o escopo e dividimos o conteúdo em unidades didáticas, com um mapa do que precisa ser ensinado.
      </p>
      <div className="mt-6">
        <JobRunner initial={initial} stageLabels={STAGE_LABELS} doneHref={`/trilhas/${id}`} title="Preparando seu estudo" />
      </div>
    </div>
  );
}
