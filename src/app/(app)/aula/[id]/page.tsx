import Link from "next/link";
import { getLatestJob, getLessonForStudy } from "@/server/queries";
import { Markdown } from "@/components/markdown";
import { Button, ButtonLink, Notice, Tag } from "@/components/ui";
import { JobRunner, type PublicJob } from "@/components/job-runner";
import { SECTION_LABELS, type LessonSectionKind } from "@/ai/pedagogy";
import { STATE_LABELS } from "@/domain/progress/state-machine";
import { CompleteReading, Quiz, StartOnView } from "./client";
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
      <Link href={`/trilhas/${lesson.trail_id}`} className="t-small text-azul underline underline-offset-2">{lesson.study_trails.title}</Link>
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

  const readingDone = !!progress?.reading_completed_at;
  const notTaught = nodes.filter((n) => !n.taught);

  return (
    <article className="mx-auto max-w-3xl">
      <StartOnView lessonId={id} />
      {header}

      <div className="mt-5 flex flex-col gap-3">
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
            {lesson.unverified_claims.length > 0 && (
              <ul className="mt-2 list-disc pl-5">{lesson.unverified_claims.slice(0, 6).map((c) => <li key={c}>{c}</li>)}</ul>
            )}
          </Notice>
        )}
      </div>

      <details className="mt-5 rounded-md border border-linha bg-superficie px-4 py-3 t-small">
        <summary className="cursor-pointer font-semibold">Itens do conteúdo que esta aula cobre ({nodes.length})</summary>
        <ul className="mt-2 flex flex-col gap-1">
          {nodes.map((n) => (
            <li key={n.key} className="flex items-start justify-between gap-3">
              <span>{n.marker && <span className="mr-1 font-semibold text-azul">{n.marker}</span>}{n.title}</span>
              <Tag tone={n.taught ? "azul" : "ambar"}>{n.taught ? "Ensinado" : "Pendente"}</Tag>
            </li>
          ))}
        </ul>
      </details>

      {lesson.supplementary.length > 0 && (
        <p className="mt-4 t-small text-tinta-suave">
          Inclui apoio pedagógico fora do seu conteúdo: {lesson.supplementary.map((s) => s.title).join("; ")}.
        </p>
      )}

      <div className="leitura mt-8">
        {sections.map((s) => {
          const label = SECTION_LABELS[s.kind as LessonSectionKind] ?? s.title;
          if (s.kind === "texto_legal") {
            return (
              <section key={s.id} className="my-6 rounded-md border border-linha-forte bg-superficie p-4 not-italic">
                <p className="m-0 font-sans t-tiny font-semibold text-tinta-suave">Texto legal, conforme o conteúdo informado</p>
                <div className="mt-2"><Markdown>{s.body_markdown}</Markdown></div>
              </section>
            );
          }
          return (
            <section key={s.id}>
              <h2 className="flex flex-wrap items-center gap-2">
                {s.title || label}
                {s.verification_status === "pendente" && <Tag tone="ambar">Não verificado</Tag>}
              </h2>
              <Markdown>{s.body_markdown}</Markdown>
            </section>
          );
        })}
        {references.length > 0 && (
          <section>
            <h2>Referências</h2>
            <ul>
              {references.map((r) => (
                <li key={r.citation}>
                  {r.citation} {!r.verified && <Tag tone="ambar">Não verificado</Tag>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <div className="mt-8">
        <CompleteReading lessonId={id} done={readingDone} />
      </div>

      <section className="mt-10" aria-labelledby="questoes">
        <h2 id="questoes" className="t-h2">{context === "revisao" ? "Questões de revisão" : "Questões de fixação"}</h2>
        <p className="mt-1 t-small text-tinta-suave">
          Questões originais, elaboradas para treino no estilo da banca escolhida. Não são questões oficiais de prova.
        </p>
        <div className="mt-4">
          {questions.length === 0 ? (
            <Notice tone="alerta">Esta aula ainda não tem questões. Tente preparar a aula novamente mais tarde.</Notice>
          ) : !readingDone && context === "fixacao" ? (
            <Notice tone="info">Conclua a leitura para liberar as questões de fixação.</Notice>
          ) : (
            <Quiz lessonId={id} questions={questions} context={context} nextLessonId={next?.id ?? null} />
          )}
        </div>
      </section>

      <nav aria-label="Aulas" className="mt-12 flex flex-wrap justify-between gap-3 border-t border-linha pt-5">
        {prev ? <ButtonLink href={`/aula/${prev.id}`} variant="secundario">Aula anterior</ButtonLink> : <span />}
        {next && <ButtonLink href={`/aula/${next.id}`} variant="secundario">Próxima aula</ButtonLink>}
      </nav>
    </article>
  );
}
