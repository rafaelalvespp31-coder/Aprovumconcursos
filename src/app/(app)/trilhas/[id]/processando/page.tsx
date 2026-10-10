import { redirect } from "next/navigation";
import { getLatestJob, getTrail } from "@/server/queries";
import { JobRunner, type PublicJob } from "@/components/job-runner";
import { STAGE_LABELS } from "@/server/pipeline/build-trail";
import { EmptyState, ButtonLink } from "@/components/ui";

export const metadata = { title: "Construindo trilha" };

export default async function ProcessingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const trail = await getTrail(id);
  if (trail.status === "review" || trail.status === "active") redirect(`/trilhas/${id}`);
  const job = await getLatestJob(id, "build_trail");
  if (!job) {
    return <EmptyState title="Nenhum processamento encontrado" action={<ButtonLink href="/nova-trilha">Criar trilha</ButtonLink>}>Esta trilha não tem construção em andamento.</EmptyState>;
  }
  const initial: PublicJob = {
    id: job.id, kind: job.kind, stage: job.stage, status: job.status, progress: job.progress,
    error: job.error_message, attempts: job.attempts, maxAttempts: job.max_attempts,
  };
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-h1">{trail.title}</h1>
      <p className="mt-1 text-tinta-suave">
        O conteúdo é lido e estruturado aqui mesmo; a análise e o planejamento das aulas são feitos por partes, para que nenhum item fique de fora.
      </p>
      <div className="mt-6">
        <JobRunner initial={initial} stageLabels={STAGE_LABELS} doneHref={`/trilhas/${id}`} title="Construindo sua trilha" />
      </div>
    </div>
  );
}
