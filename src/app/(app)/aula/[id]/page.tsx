import Link from "next/link";
import { getLatestJob, getLessonForStudy, getNextInSubject } from "@/server/queries";
import { Button, ButtonLink, Notice, Tag } from "@/components/ui";
import { JobRunner, type PublicJob } from "@/components/job-runner";
import { STATE_LABELS } from "@/domain/progress/state-machine";
import { LessonReader } from "./reader";
import { generateLessonAction } from "./actions";

export const metadata = { title: "Aula" };

const LESSON_STAGES: Record<string, string> = {
  queued: "Na fila",
  lesson: "Escrevendo a aula",
  questions: "Elaborando as questões de fixação",
  done: "Aula pronta",
};

export default async function LessonPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ erro?: string; revisao?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  const data = await getLessonForStudy(id);
  const { lesson, sections, references, questions, progress, nodes, siblings } = data;
  const idx = siblings.findIndex((s) => s.id === id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  const locked = !progress || progress.state === "nao_iniciada";
  const context = sp.revisao ? "revisao" : "fixacao";

  const header = (
    <header>
      <Link href={`/trilhas/${lesson.trail_id}`} className="t-small text-destaque underline underline-offset-2">{lesson.study_trails.title}</Link>
      <h1 className="mt-1 t-h1">{lesson.title}</h1>
      <p className="mt-1 text-tinta-suave">{lesson.objective}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 t-tiny text-tinta-fraca">
        {progress && <Tag tone="azul">{STATE_LABELS[progress.state]}</Tag>}
        <span>Estimativa: ~{lesson.estimated_minutes} min</span>
      </div>
    </header>
  );

  if (locked) {
    return (
      <div className="mx-auto max-w-3xl">
        {header}
        <div className="mt-6">
          <Notice tone="info" title="Aula ainda não liberada">
            Conclua a aula anterior para liberar esta. As aulas já liberadas continuam disponíveis para consulta a qualquer momento.
          </Notice>
        </div>
        {prev && <ButtonLink href={`/aula/${prev.id}`} variant="secundario" className="mt-4">Abrir a aula anterior</ButtonLink>}
      </div>
    );
  }

  const hasContent = sections.length > 0 && (lesson.status === "ready" || lesson.status === "pending_validation");
  if (!hasContent) {
    const job = await getLatestJob(lesson.trail_id, "generate_lesson", id);
    const active = job && (job.status === "queued" || job.status === "running" || (job.status === "failed" && lesson.status !== "planned"));
    return (
      <div className="mx-auto max-w-3xl">
        {header}
        <div className="mt-6 flex flex-col gap-4">
          {sp.erro && <Notice tone="erro">{sp.erro}</Notice>}
          {active && job ? (
            <JobRunner
              initial={{ id: job.id, kind: job.kind, stage: job.stage, status: job.status, progress: job.progress, error: job.error_message, attempts: job.attempts, maxAttempts: job.max_attempts } as PublicJob}
              stageLabels={LESSON_STAGES}
              doneHref={`/aula/${id}`}
              title="Preparando esta aula"
            />
          ) : (
            <>
              <p className="text-tinta-suave">
                Esta aula será escrita agora, com base nos {nodes.length} item(ns) do seu conteúdo listados abaixo, seguida de questões de fixação.
              </p>
              <ul className="list-disc pl-5 t-small text-tinta-suave">{nodes.map((n) => <li key={n.key}>{n.marker ? `${n.marker} ` : ""}{n.title}</li>)}</ul>
              <form action={generateLessonAction.bind(null, id)}>
                <Button type="submit">Preparar aula</Button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  const notTaught = nodes.filter((n) => !n.taught);
  const nextInSubject = await getNextInSubject(lesson.trail_id, next ? { id: next.id, title: next.title } : null).catch(() => null);
  const notices = (
    <>
      {data.catalog && (
        <Notice tone={data.catalog.outdated ? "alerta" : "info"} title={data.catalog.outdated ? "Conteúdo atualizado no catálogo" : "Conteúdo revisado"}>
          {data.catalog.outdated
            ? "A equipe publicou uma versão revisada deste conteúdo depois que você começou. Revise com atenção: para estudar a versão nova, crie o estudo de novo com o mesmo pedido."
            : "Esta unidade vem do catálogo revisado pela equipe do APROVUM."}
        </Notice>
      )}
      {lesson.status === "pending_validation" && (
        <Notice tone="alerta" title="Cobertura incompleta nesta aula">
          {notTaught.length > 0
            ? `Estes itens não foram tratados pela aula e continuam pendentes: ${notTaught.map((n) => n.title).join("; ")}.`
            : "A aula está em validação."}
        </Notice>
      )}
      {lesson.verification_pending && (
        <Notice tone="alerta" title="Contém informação não verificada">
          Trechos de doutrina, jurisprudência ou interpretação foram escritos sem conferência em fonte oficial. Use-os como orientação e confira a redação vigente antes da prova.
          {lesson.unverified_claims.length > 0 && <ul className="mt-2 list-disc pl-5">{lesson.unverified_claims.slice(0, 6).map((c) => <li key={c}>{c}</li>)}</ul>}
        </Notice>
      )}
      {lesson.supplementary.length > 0 && (
        <p className="t-small text-tinta-suave">Inclui apoio pedagógico fora do seu conteúdo: {lesson.supplementary.map((s) => s.title).join("; ")}.</p>
      )}
      {references.length > 0 && (
        <details className="rounded-md border border-linha bg-superficie px-4 py-3 t-small">
          <summary className="cursor-pointer font-semibold">Referências usadas ({references.length})</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {references.map((r) => (
              <li key={r.citation} className="flex items-start justify-between gap-3">
                <span>{r.citation}</span>
                <Tag tone={r.verified ? "verde" : "ambar"}>{r.verified ? "Do seu conteúdo" : "Não verificado"}</Tag>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );

  return (
    <LessonReader
      lesson={{
        id,
        title: lesson.title,
        objective: lesson.objective,
        trailId: lesson.trail_id,
        trailTitle: lesson.study_trails.title,
        estimatedMinutes: lesson.estimated_minutes,
        stateLabel: progress ? STATE_LABELS[progress.state] : null,
      }}
      sections={sections}
      nodes={nodes}
      questions={questions}
      markedQuestionIds={data.markedQuestionIds}
      annotations={data.annotations}
      clarifications={data.clarifications}
      levelsPassed={progress?.levels_passed ?? 0}
      readingDone={!!progress?.reading_completed_at}
      context={context}
      prevId={prev?.id ?? null}
      nextId={next?.id ?? null}
      nextHref={nextInSubject?.href ?? null}
      nextLabel={nextInSubject?.label ?? null}
      notices={notices}
    />
  );
}
