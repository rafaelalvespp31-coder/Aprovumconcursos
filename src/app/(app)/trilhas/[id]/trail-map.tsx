import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import { Tag } from "@/components/ui";
import { TripleProgress } from "@/components/progress";
import { STATE_LABELS, type UnitState } from "@/domain/progress/state-machine";
import { LEVELS, levelStatus } from "@/domain/progress/levels";
import type { LessonListItem, ModuleProgress } from "@/server/queries";

const STATE_ICON: Record<UnitState, { icon: IconName; cls: string }> = {
  nao_iniciada: { icon: "cadeado", cls: "text-tinta-fraca bg-papel border-linha" },
  disponivel: { icon: "play", cls: "text-destaque bg-nevoa border-azul/30" },
  em_andamento: { icon: "livro", cls: "text-destaque bg-nevoa border-azul/40" },
  aula_concluida: { icon: "livro", cls: "text-white bg-estudado border-transparent" },
  em_revisao: { icon: "revisoes", cls: "text-alerta bg-alerta-fundo border-alerta/30" },
  aguardando_dominio: { icon: "check", cls: "text-white bg-azul border-transparent" },
  dominada: { icon: "check", cls: "text-white bg-dominado border-transparent" },
  necessita_atualizacao: { icon: "alerta", cls: "text-alerta bg-alerta-fundo border-alerta/30" },
  pendente_validacao: { icon: "alerta", cls: "text-alerta bg-alerta-fundo border-alerta/30" },
};

/**
 * Mapa do estudo: módulos expansíveis, unidades em ordem, níveis aprovados (fácil,
 * médio, difícil), estado de aprendizagem,
 * pré-requisitos, questões, revisões e itens incompletos.
 */
export function TrailMap({
  modules,
  progress,
  titleByKey,
  review,
}: {
  modules: Array<{ id: string; title: string; lessons: LessonListItem[] }>;
  progress: Map<string, ModuleProgress>;
  titleByKey: Map<string, string>;
  review: boolean;
}) {
  const lessonTitle = new Map(modules.flatMap((m) => m.lessons.map((l) => [l.id, l.title] as const)));
  const current = modules.flatMap((m) => m.lessons).find((l) => l.state && ["disponivel", "em_andamento", "aula_concluida", "em_revisao"].includes(l.state));

  return (
    <div className="flex flex-col gap-3">
      {modules.map((m, mi) => {
        const p = progress.get(m.id);
        const hasCurrent = m.lessons.some((l) => l.id === current?.id);
        return (
          <details key={m.id} open={review || hasCurrent || mi === 0} className="group rounded-lg border border-linha bg-superficie">
            <summary className="flex cursor-pointer list-none flex-col gap-3 px-4 py-4 sm:px-5">
              <div className="flex items-start gap-3">
                <Icon name="chevronRight" className="mt-1 size-4 text-tinta-fraca transition-transform group-open:rotate-90" />
                <div className="min-w-0 flex-1">
                  <p className="t-h3">{m.title}</p>
                  <p className="t-tiny text-tinta-fraca">
                    {m.lessons.length} unidade(s), ~{m.lessons.reduce((s, l) => s + l.estimated_minutes, 0)} min (estimativa)
                  </p>
                </div>
              </div>
              {p && p.total > 0 && !review && (
                <div className="pl-7">
                  <TripleProgress counts={p} label={`Progresso em ${m.title}`} />
                </div>
              )}
            </summary>
            <ol className="border-t border-linha">
              {m.lessons.map((l, li) => {
                const st = l.state ? STATE_ICON[l.state] : STATE_ICON.nao_iniciada;
                const locked = !l.state || l.state === "nao_iniciada";
                const isCurrent = l.id === current?.id;
                const incomplete = l.status === "pending_validation";
                return (
                  <li key={l.id} className={`relative flex gap-3 px-4 py-4 sm:px-5 ${isCurrent ? "bg-nevoa/50" : ""}`}>
                    {/* Linha de conexão entre níveis */}
                    {li < m.lessons.length - 1 && <span className="absolute bottom-0 left-[2.05rem] top-14 w-px bg-linha sm:left-[2.3rem]" aria-hidden />}
                    <span className={`relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-full border ${st.cls}`} aria-hidden>
                      <Icon name={st.icon} className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="t-tiny font-semibold text-tinta-fraca">Unidade {li + 1}</span>
                        {review || locked ? (
                          <p className={`font-semibold ${locked && !review ? "text-tinta-suave" : ""}`}>{l.title}</p>
                        ) : (
                          <Link href={`/aula/${l.id}`} className="font-semibold text-tinta hover:text-destaque">{l.title}</Link>
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 t-small text-tinta-suave">{l.objective}</p>
                      {!review && (
                        <ol className="mt-2 flex flex-wrap gap-1.5" aria-label={`Níveis aprovados: ${l.levelsPassed} de 3`}>
                          {LEVELS.map((lv) => {
                            const st = levelStatus(l.levelsPassed, lv.n);
                            return (
                              <li
                                key={lv.key}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 t-tiny font-semibold ${st === "aprovado" ? "border-transparent bg-dominado text-white" : st === "liberado" && !locked ? "border-azul text-destaque" : "border-linha text-tinta-fraca"}`}
                              >
                                {st === "aprovado" ? <Icon name="check" className="size-3" /> : st === "bloqueado" || locked ? <Icon name="cadeado" className="size-3" /> : null}
                                {lv.label}
                                <span className="sr-only">: {st === "aprovado" ? "aprovado" : st === "liberado" && !locked ? "liberado" : "bloqueado"}</span>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {l.state && <Tag tone={l.state === "dominada" ? "verde" : l.state === "em_revisao" ? "ambar" : locked ? "neutro" : "azul"}>{STATE_LABELS[l.state]}</Tag>}
                        {isCurrent && <Tag tone="azul">Próximo passo</Tag>}
                        {l.reviewDue && <Tag tone="ambar">Revisão pendente</Tag>}
                        {incomplete && <Tag tone="ambar">Cobertura incompleta</Tag>}
                        {l.verification_pending && <Tag tone="ambar">Não verificado</Tag>}
                        <span className="inline-flex items-center gap-1 t-tiny text-tinta-fraca">
                          <Icon name="questoes" className="size-3.5" /> {l.status === "planned" ? "Questões ao preparar a aula" : `${l.questionCount} questão(ões)`}
                        </span>
                        <span className="t-tiny text-tinta-fraca">~{l.estimated_minutes} min</span>
                      </div>
                      {l.prerequisiteIds.length > 0 && (
                        <p className="mt-2 inline-flex items-start gap-1 t-tiny text-tinta-suave">
                          <Icon name="trilhas" className="mt-px size-3.5" />
                          Depende de: {l.prerequisiteIds.map((id) => lessonTitle.get(id) ?? "aula anterior").join("; ")}
                        </p>
                      )}
                      <details className="mt-2 t-small">
                        <summary className="cursor-pointer t-tiny font-semibold text-tinta-suave">{l.nodeKeys.length} item(ns) do seu conteúdo</summary>
                        <ul className="mt-1 list-disc pl-5 text-tinta-suave">{l.nodeKeys.map((k) => <li key={k}>{titleByKey.get(k) ?? k}</li>)}</ul>
                      </details>
                      {l.supplementary.length > 0 && (
                        <div className="mt-2 rounded-md bg-papel px-3 py-2 t-small">
                          <p className="font-semibold">Apoio pedagógico (fora do conteúdo informado)</p>
                          <ul className="list-disc pl-5 text-tinta-suave">{l.supplementary.map((s) => <li key={s.title}>{s.title} — {s.justification}</li>)}</ul>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </details>
        );
      })}
    </div>
  );
}
