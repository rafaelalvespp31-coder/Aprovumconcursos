import Link from "next/link";
import { redirect } from "next/navigation";
import { getCoverage, getTrail, getTrailPlan, rulerStateOf } from "@/server/queries";
import { CoverageRuler, RulerLegend } from "@/components/coverage-ruler";
import { Button, ButtonLink, Notice, Tag } from "@/components/ui";
import { boardDisplayName, CONTENT_TYPE_OPTIONS, type ExamBoardSlug } from "@/domain/trail-input";
import { STATE_LABELS, type UnitState } from "@/domain/progress/state-machine";
import { archiveTrailAction, startTrailAction } from "./actions";

export const metadata = { title: "Trilha" };

const STATE_TONE: Partial<Record<UnitState, "azul" | "verde" | "ambar" | "neutro">> = {
  disponivel: "azul",
  em_andamento: "azul",
  aula_concluida: "azul",
  em_revisao: "ambar",
  aguardando_dominio: "azul",
  dominada: "verde",
  necessita_atualizacao: "ambar",
  pendente_validacao: "ambar",
};

function minutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
}

export default async function TrailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;
  const trail = await getTrail(id);
  if (trail.status === "pending" || trail.status === "processing") redirect(`/trilhas/${id}/processando`);

  if (trail.status === "failed") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="t-h1">{trail.title}</h1>
        <div className="mt-6">
          <Notice tone="erro" title="A construção desta trilha não foi concluída">
            O conteúdo está salvo. Você pode retomar o processamento a partir da etapa que falhou.
          </Notice>
        </div>
        <ButtonLink href={`/trilhas/${id}/processando`} className="mt-4">Ver e retomar</ButtonLink>
      </div>
    );
  }

  const [modules, coverage] = await Promise.all([getTrailPlan(id), getCoverage(id)]);
  const items = coverage.filter((c) => c.coverage?.requires_direct_coverage);
  const titleByKey = new Map(coverage.map((c) => [c.key, `${c.marker ? `${c.marker} ` : ""}${c.title}`]));
  const lessons = modules.flatMap((m) => m.lessons);
  const totalMinutes = lessons.reduce((s, l) => s + l.estimated_minutes, 0);
  const audit = trail.audit_report;
  const review = trail.status === "review";
  const nextLesson = lessons.find((l) => l.state && ["disponivel", "em_andamento", "aula_concluida", "em_revisao"].includes(l.state));
  const errors = audit?.issues.filter((i) => i.severity === "error") ?? [];
  const warnings = audit?.issues.filter((i) => i.severity === "warning") ?? [];
  const infos = audit?.issues.filter((i) => i.severity === "info") ?? [];
  const typeLabel = CONTENT_TYPE_OPTIONS.find((o) => o.value === trail.content_type)?.label;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="t-h1 break-words">{trail.title}</h1>
          <p className="mt-1 t-small text-tinta-suave">
            Banca {boardDisplayName(trail.board_slug as ExamBoardSlug, trail.other_board_name)}, {typeLabel?.toLowerCase()}
            {trail.archived_at && " (arquivada)"}
          </p>
        </div>
        {!review && nextLesson && <ButtonLink href={`/aula/${nextLesson.id}`}>Continuar: {nextLesson.title.slice(0, 40)}</ButtonLink>}
      </div>

      {erro && <div className="mt-4"><Notice tone="erro">{erro}</Notice></div>}

      <section className="mt-6 rounded-lg border border-linha bg-superficie p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="t-h3">{items.length} itens do conteúdo informado</p>
          <Link href={`/trilhas/${id}/cobertura`} className="t-small font-semibold text-azul underline underline-offset-2">
            Ver cobertura item a item
          </Link>
        </div>
        <div className="mt-3">
          <CoverageRuler
            size="lg"
            label="Cobertura da trilha"
            segments={items.map((c) => ({ key: c.key, state: rulerStateOf(c.coverage), title: c.title }))}
          />
        </div>
        <div className="mt-2">
          <RulerLegend states={["dominado", "praticado", "ensinado", "nao_verificado", "planejado", "pendente"]} />
        </div>
        <p className="mt-3 t-small text-tinta-suave">
          {modules.length} módulo(s), {lessons.length} aula(s). Carga estimada: cerca de {minutes(totalMinutes)} de estudo — é uma estimativa e varia de pessoa para pessoa.
        </p>
      </section>

      {review && (
        <section className="mt-6 flex flex-col gap-3">
          <h2 className="t-h2">Confira antes de começar</h2>
          <p className="text-tinta-suave">Veja se a estrutura corresponde ao que você colou. Itens marcados como apoio pedagógico não fazem parte do seu conteúdo: foram incluídos para facilitar o entendimento.</p>
          {errors.length > 0 ? (
            <Notice tone="erro" title={`${errors.length} problema(s) de cobertura`}>
              <ul className="list-disc pl-5">{errors.slice(0, 8).map((i, n) => <li key={n}>{i.message}</li>)}</ul>
            </Notice>
          ) : (
            <Notice tone="sucesso" title="Todos os itens identificados têm aula correspondente." />
          )}
          {warnings.length > 0 && (
            <Notice tone="alerta" title={`${warnings.length} ponto(s) para conferir`}>
              <ul className="list-disc pl-5">{warnings.slice(0, 8).map((i, n) => <li key={n}>{i.message}</li>)}</ul>
            </Notice>
          )}
          {infos.map((i, n) => <Notice key={n} tone="info">{i.message}</Notice>)}
          {(audit?.repairs?.length ?? 0) > 0 && (
            <details className="rounded-md border border-linha bg-superficie px-4 py-3 t-small">
              <summary className="cursor-pointer font-semibold">{audit!.repairs!.length} ajuste(s) automático(s) no planejamento</summary>
              <ul className="mt-2 list-disc pl-5 text-tinta-suave">{audit!.repairs!.map((r, n) => <li key={n}>{r.detail}</li>)}</ul>
            </details>
          )}
          {(audit?.ambiguities?.length ?? 0) > 0 && (
            <details className="rounded-md border border-linha bg-superficie px-4 py-3 t-small">
              <summary className="cursor-pointer font-semibold">{audit!.ambiguities!.length} trecho(s) ambíguo(s) no conteúdo</summary>
              <ul className="mt-2 list-disc pl-5 text-tinta-suave">{audit!.ambiguities!.map((a, n) => <li key={n}>{a.description}</li>)}</ul>
            </details>
          )}
          <form action={startTrailAction.bind(null, id)}>
            <Button type="submit" disabled={lessons.length === 0}>Começar a estudar</Button>
          </form>
        </section>
      )}

      <section className="mt-8">
        <h2 className="t-h2">Módulos e aulas</h2>
        <div className="mt-3 flex flex-col gap-3">
          {modules.map((m, mi) => (
            <details key={m.id} open={mi === 0 || review} className="group rounded-lg border border-linha bg-superficie">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <span className="t-h3">{m.title}</span>
                <span className="shrink-0 t-tiny text-tinta-fraca">{m.lessons.length} aula(s)</span>
              </summary>
              <ol className="divide-y divide-linha border-t border-linha">
                {m.lessons.map((l) => {
                  const locked = !l.state || l.state === "nao_iniciada";
                  return (
                    <li key={l.id} className="px-4 py-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          {review || locked ? (
                            <p className="font-semibold">{l.title}</p>
                          ) : (
                            <Link href={`/aula/${l.id}`} className="font-semibold text-azul underline-offset-2 hover:underline">{l.title}</Link>
                          )}
                          <p className="t-small text-tinta-suave">{l.objective}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {l.state && <Tag tone={STATE_TONE[l.state] ?? "neutro"}>{STATE_LABELS[l.state]}</Tag>}
                          <span className="t-tiny text-tinta-fraca">~{l.estimated_minutes} min</span>
                        </div>
                      </div>
                      <details className="mt-2 t-small">
                        <summary className="cursor-pointer text-tinta-suave">{l.nodeKeys.length} item(ns) do conteúdo nesta aula</summary>
                        <ul className="mt-1 list-disc pl-5 text-tinta-suave">
                          {l.nodeKeys.map((k) => <li key={k}>{titleByKey.get(k) ?? k}</li>)}
                        </ul>
                      </details>
                      {l.supplementary.length > 0 && (
                        <div className="mt-2 rounded-md bg-papel px-3 py-2 t-small">
                          <p className="font-semibold">Apoio pedagógico (fora do conteúdo informado)</p>
                          <ul className="list-disc pl-5 text-tinta-suave">
                            {l.supplementary.map((s) => <li key={s.title}>{s.title} — {s.justification}</li>)}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </details>
          ))}
        </div>
      </section>

      <form action={archiveTrailAction.bind(null, id, !trail.archived_at)} className="mt-10">
        <Button type="submit" variant="secundario">{trail.archived_at ? "Reativar trilha" : "Arquivar trilha"}</Button>
      </form>
    </div>
  );
}
