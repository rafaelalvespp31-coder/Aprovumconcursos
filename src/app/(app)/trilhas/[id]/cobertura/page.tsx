import Link from "next/link";
import { getCoverage, getTrail, getTrailPlan, rulerStateOf } from "@/server/queries";
import { CoverageRuler, RULER_LABELS } from "@/components/coverage-ruler";
import { Tag } from "@/components/ui";
import { computeCoverage } from "@/domain/content/coverage";
import type { ExtractedNode } from "@/domain/content/extract";
import type { NodeKind } from "@/domain/content/types";
import { CONTAINER_KINDS } from "@/domain/content/types";

export const metadata = { title: "Cobertura" };

export default async function CoveragePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ filtro?: string }> }) {
  const { id } = await params;
  const { filtro = "todos" } = await searchParams;
  const [trail, rows, modules] = await Promise.all([getTrail(id), getCoverage(id), getTrailPlan(id)]);
  const lessonsByKey = new Map<string, Array<{ id: string; title: string }>>();
  for (const l of modules.flatMap((m) => m.lessons)) {
    for (const k of l.nodeKeys) lessonsByKey.set(k, [...(lessonsByKey.get(k) ?? []), { id: l.id, title: l.title }]);
  }

  // Agregação hierárquica (um item só está coberto se todo o seu escopo estiver).
  const keyById = new Map(rows.map((r) => [r.id, r.key]));
  const domainNodes: ExtractedNode[] = rows.map((r, i) => ({
    key: r.key, kind: r.kind as NodeKind, marker: r.marker, title: r.title, sourceText: "", span: { start: i, end: i + 1 },
    parentKey: r.parent_id ? keyById.get(r.parent_id) ?? null : null, depth: r.depth, order: i, path: "",
    requiresDirectCoverage: r.coverage.requires_direct_coverage,
  }));
  const agg = computeCoverage(domainNodes, new Map(rows.map((r) => [r.key, {
    planned: r.coverage.planned, taught: r.coverage.taught, mastered: r.coverage.mastered,
    questionsAvailable: r.coverage.questions_available, questionsAnswered: r.coverage.questions_answered,
    verification: r.coverage.verification_status, lastVerifiedAt: r.coverage.last_verified_at,
  }])));

  const filters: Record<string, (r: (typeof rows)[number]) => boolean> = {
    todos: () => true,
    pendentes: (r) => !CONTAINER_KINDS.has(r.kind as NodeKind) && !r.coverage.taught,
    incompletos: (r) => agg.get(r.key)?.status === "incompleto",
    dominados: (r) => agg.get(r.key)?.status === "dominado",
  };
  const shown = rows.filter(filters[filtro] ?? filters.todos!);
  const items = rows.filter((r) => r.coverage.requires_direct_coverage);

  return (
    <div>
      <Link href={`/trilhas/${id}`} className="t-small text-destaque underline underline-offset-2">{trail.title}</Link>
      <h1 className="mt-1 t-h1">Cobertura do conteúdo</h1>
      <p className="mt-1 max-w-2xl text-tinta-suave">
        Cada item do conteúdo que você informou, com o que já foi planejado, ensinado, praticado e dominado. Um item só conta como coberto quando todo o seu escopo foi ensinado.
      </p>
      <div className="mt-5">
        <CoverageRuler size="lg" label="Cobertura" segments={items.map((r) => ({ key: r.key, state: rulerStateOf(r.coverage), title: r.title }))} />
      </div>

      <nav aria-label="Filtrar itens" className="mt-5 flex flex-wrap gap-2">
        {[["todos", "Todos"], ["pendentes", "Sem aula ensinada"], ["incompletos", "Incompletos"], ["dominados", "Dominados"]].map(([k, label]) => (
          <Link
            key={k}
            href={`?filtro=${k}`}
            aria-current={filtro === k ? "page" : undefined}
            className="rounded-full border border-linha-forte px-3 py-1 t-small font-semibold text-tinta-suave aria-[current=page]:border-azul aria-[current=page]:bg-nevoa aria-[current=page]:text-destaque"
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-4 overflow-x-auto rounded-lg border border-linha bg-superficie">
        <table className="w-full min-w-[720px] t-small">
          <thead className="bg-papel text-left text-tinta-suave">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">Item</th>
              <th scope="col" className="px-3 py-2 font-semibold">Situação</th>
              <th scope="col" className="px-3 py-2 font-semibold">Aula</th>
              <th scope="col" className="px-3 py-2 font-semibold">Questões</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linha">
            {shown.map((r) => {
              const a = agg.get(r.key);
              const container = CONTAINER_KINDS.has(r.kind as NodeKind) || !r.coverage.requires_direct_coverage;
              return (
                <tr key={r.key} className={container ? "bg-papel/60" : ""}>
                  <td className="px-3 py-2 align-top" style={{ paddingLeft: `${12 + Math.min(r.depth, 5) * 14}px` }}>
                    <span className={container ? "font-semibold" : ""}>
                      {r.marker && <span className="mr-1.5 font-semibold text-destaque">{r.marker}</span>}
                      {r.title}
                    </span>
                  </td>
                  <td className="px-3 py-2 align-top">
                    {container ? (
                      <span className="text-tinta-suave">{a ? `${a.scopeTaught}/${a.scopeSize} ensinados` : ""}</span>
                    ) : (
                      <Tag tone={a?.status === "dominado" ? "verde" : r.coverage.taught ? "azul" : "neutro"}>{RULER_LABELS[rulerStateOf(r.coverage)]}</Tag>
                    )}
                  </td>
                  <td className="px-3 py-2 align-top">
                    {(lessonsByKey.get(r.key) ?? []).map((l) => (
                      <Link key={l.id} href={`/aula/${l.id}`} className="block text-destaque underline-offset-2 hover:underline">{l.title}</Link>
                    ))}
                    {!container && !lessonsByKey.has(r.key) && <span className="font-semibold text-erro">Sem aula</span>}
                  </td>
                  <td className="px-3 py-2 align-top tabular-nums text-tinta-suave">
                    {container ? "" : `${r.coverage.questions_answered}/${r.coverage.questions_available}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {shown.length === 0 && <p className="px-4 py-6 text-center text-tinta-suave">Nenhum item neste filtro.</p>}
      </div>
    </div>
  );
}
