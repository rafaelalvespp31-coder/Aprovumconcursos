import Link from "next/link";
import { redirect } from "next/navigation";
import { getCoverage, getTrail, getTrailPlan, listStudyPdfs, moduleProgress, rulerStateOf } from "@/server/queries";
import { PdfPanel } from "./pdf-panel";
import { TrailMap } from "./trail-map";
import { ArchiveTrail, DeleteTrail } from "./archive";
import { CoverageRuler, RulerLegend } from "@/components/coverage-ruler";
import { Button, ButtonLink, Notice } from "@/components/ui";
import { boardDisplayName, CONTENT_TYPE_OPTIONS, type ExamBoardSlug } from "@/domain/trail-input";
import { startTrailAction } from "./actions";

export const metadata = { title: "Estudo" };

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
  searchParams: Promise<{ erro?: string; catalogo?: string }>;
}) {
  const { id } = await params;
  const { erro, catalogo } = await searchParams;
  const trail = await getTrail(id);
  if (trail.status === "pending" || trail.status === "processing" || trail.status === "clarification") redirect(`/trilhas/${id}/processando`);

  if (trail.status === "failed") {
    return (
      <div className="mx-auto max-w-2xl">
        <h1 className="t-h1">{trail.title}</h1>
        <div className="mt-6">
          <Notice tone="erro" title="A preparação deste estudo não foi concluída">
            O conteúdo está salvo. Você pode retomar o processamento a partir da etapa que falhou.
          </Notice>
        </div>
        <ButtonLink href={`/trilhas/${id}/processando`} className="mt-4">Ver e retomar</ButtonLink>
      </div>
    );
  }

  const [modules, coverage, pdfs] = await Promise.all([getTrailPlan(id), getCoverage(id), listStudyPdfs(id)]);
  const items = coverage.filter((c) => c.coverage?.requires_direct_coverage);
  const titleByKey = new Map(coverage.map((c) => [c.key, `${c.marker ? `${c.marker} ` : ""}${c.title}`]));
  const lessons = modules.flatMap((m) => m.lessons);
  const totalMinutes = lessons.reduce((s, l) => s + l.estimated_minutes, 0);
  const audit = trail.audit_report;
  const review = trail.status === "review";
  const nextLesson = lessons.find((l) => l.state && ["disponivel", "em_andamento", "aula_concluida", "em_revisao"].includes(l.state));
  const errors = audit?.issues.filter((i) => i.severity === "error") ?? [];
  const infos = audit?.issues.filter((i) => i.severity === "info") ?? [];
  const typeLabel = CONTENT_TYPE_OPTIONS.find((o) => o.value === trail.content_type)?.label;
  const unitsDone = lessons.filter((l) => l.levelsPassed >= 3).length;
  const scope = trail.scope_summary;
  const aiItems = coverage.filter((c) => c.coverage?.requires_direct_coverage && c.origin === "ia").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="t-h1 flex items-center gap-2 break-words">
            {lessons.length > 0 && unitsDone >= lessons.length && (
              <span className="entrar flex size-9 shrink-0 items-center justify-center rounded-full bg-acerto-fundo text-lg ring-2 ring-acerto" role="img" aria-label="Estudado" title="Estudado: todas as aulas concluídas" data-testid="avatar-estudado">✅</span>
            )}
            {trail.title}
          </h1>
          <p className="mt-1 t-small text-tinta-suave">
            Banca {boardDisplayName(trail.board_slug as ExamBoardSlug, trail.other_board_name)}, {typeLabel?.toLowerCase()}
            {trail.archived_at && " (arquivado)"}
          </p>
        </div>
        {!review && nextLesson && <ButtonLink href={`/aula/${nextLesson.id}`}>Continuar: {nextLesson.title.slice(0, 40)}</ButtonLink>}
      </div>

      {erro && <div className="mt-4"><Notice tone="erro">{erro}</Notice></div>}
      {catalogo && trail.scope_summary?.catalog && trail.status === "review" && (
        <div className="mt-4">
          <Notice tone="sucesso" title="Pronto na hora: conteúdo revisado">
            Este pedido já estava no catálogo do APROVUM, então o estudo foi montado sem esperar a geração. Confira abaixo e comece.
          </Notice>
        </div>
      )}

      <section className="mt-6 rounded-lg border border-linha bg-superficie p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="t-h3">{items.length} itens do conteúdo informado</p>
          <Link href={`/trilhas/${id}/cobertura`} className="t-small font-semibold text-destaque underline underline-offset-2">
            Ver cobertura item a item
          </Link>
        </div>
        <div className="mt-3">
          <CoverageRuler
            size="lg"
            label="Cobertura do conteúdo"
            segments={items.map((c) => ({ key: c.key, state: rulerStateOf(c.coverage), title: c.title }))}
          />
        </div>
        <div className="mt-2">
          <RulerLegend states={["dominado", "praticado", "ensinado", "nao_verificado", "planejado", "pendente"]} />
        </div>
        <p className="mt-3 t-small text-tinta-suave">
          {lessons.length} unidade(s) didática(s){aiItems ? `, ${aiItems} item(ns) organizado(s) pela IA a partir do seu pedido` : ""}. Carga estimada: cerca de {minutes(totalMinutes)} de estudo — é uma estimativa e varia de pessoa para pessoa.
        </p>
      </section>

      {scope && (
        <section className="mt-6 rounded-lg border border-linha bg-superficie p-5" aria-labelledby="escopo-titulo">
          <h2 id="escopo-titulo" className="t-h3">
            Escopo identificado{scope.catalog && <span className="ml-2 inline-block rounded-full bg-azul px-2 py-0.5 align-middle t-tiny text-white">Revisado</span>}
          </h2>
          <p className="mt-1 font-semibold">{scope.subject}</p>
          <p className="mt-1 t-small text-tinta-suave">{scope.scopeStatement}</p>
          {trail.scope_answer && <p className="mt-2 t-small"><span className="font-semibold">Seu esclarecimento:</span> {trail.scope_answer}</p>}
          {scope.legalReferences.length > 0 && (
            <ul className="mt-2 list-disc pl-5 t-small">
              {scope.legalReferences.map((r) => <li key={r.norm + r.provisions}><span className="font-semibold">{r.norm}</span>: {r.provisions}</li>)}
            </ul>
          )}
          {scope.outOfScope.length > 0 && (
            <p className="mt-2 t-small text-tinta-suave"><span className="font-semibold text-tinta">Fora do escopo:</span> {scope.outOfScope.join("; ")}.</p>
          )}
          {scope.isLegal && aiItems > 0 && (
            <p className="mt-2 t-tiny text-tinta-fraca">A estrutura dos dispositivos foi organizada pela IA e fica marcada como não verificada: o texto legal só é transcrito quando você o cola.</p>
          )}
        </section>
      )}

      {!review && (
        <div className="mt-6">
          <PdfPanel trailId={id} ready={lessons.length > 0 && unitsDone === lessons.length} unitsDone={unitsDone} unitsTotal={lessons.length} pdfs={pdfs} />
        </div>
      )}

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
        <h2 className="t-h2">Unidades do estudo</h2>
        <p className="mt-1 mb-3 t-small text-tinta-suave">Cada unidade tem a aula completa e três níveis de avaliação (fácil, médio e difícil), com pelo menos 90% em cada um. A unidade seguinte abre quando a anterior é concluída; as já liberadas ficam sempre disponíveis para consulta.</p>
        <TrailMap modules={modules} progress={new Map(moduleProgress(modules, coverage).map((m) => [m.id, m]))} titleByKey={titleByKey} review={review} />
      </section>

      <div className="mt-10 flex flex-wrap gap-3">
        <ArchiveTrail trailId={id} archived={!!trail.archived_at} />
        <DeleteTrail trailId={id} />
      </div>
    </div>
  );
}
