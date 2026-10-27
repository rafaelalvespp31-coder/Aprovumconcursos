import Link from "next/link";
import { Fragment } from "react";
import { groupByTopic } from "@/domain/catalog/topic-group";
import { EditableRow } from "./editable-row";
import { ButtonLink, EmptyState, Tag } from "@/components/ui";
import { LEVELS } from "@/domain/progress/levels";
import { LAWS } from "@/domain/catalog/match";
import { DISCIPLINE_LABELS, DISCIPLINE_MODES, type DisciplineMode } from "@/ai/pedagogy";
import { listTopics, MIN_BANK_PER_LEVEL, requireAdmin } from "@/server/services/catalog";
import { deleteImpactAction, deleteTopicAction } from "./actions";
import { DeleteTopic } from "./delete-topic";

export const metadata = { title: "Catálogo" };

const COLS = 8;

const STATUS: Record<string, { label: string; tone: "verde" | "ambar" | "neutro" }> = {
  publicado: { label: "Publicado", tone: "verde" },
  rascunho: { label: "Rascunho", tone: "ambar" },
  arquivado: { label: "Arquivado", tone: "neutro" },
};

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  // A verificação fica também na página: layout e página renderizam em paralelo.
  await requireAdmin();
  const sp = await searchParams;
  const all = await listTopics();
  const q = (sp.q ?? "").trim().toLowerCase();
  const topics = all.filter((t) => (!sp.status || t.status === sp.status) && (!q || t.title.toLowerCase().includes(q) || (t.topicGroup ?? "").toLowerCase().includes(q)));
  const groups = DISCIPLINE_MODES.map((m) => ({ mode: m, label: DISCIPLINE_LABELS[m as DisciplineMode], topics: topics.filter((t) => (t.disciplineMode === m) || (m === "outra" && !(DISCIPLINE_MODES as readonly string[]).includes(t.disciplineMode))) })).filter((g) => g.topics.length).map((g) => ({ ...g, hasGroups: g.topics.some((t) => t.topicGroup) }));
  const counts = { publicado: all.filter((t) => t.status === "publicado").length, rascunho: all.filter((t) => t.status === "rascunho").length };
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="t-h1">Catálogo revisado</h1>
          <p className="mt-1 text-tinta-suave">
            {counts.publicado} publicado(s) · {counts.rascunho} rascunho(s). Pedidos cobertos por temas publicados viram estudos na hora, sem IA.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/catalogo/plano" variant="secundario">Plano de tópicos</ButtonLink>
          <ButtonLink href="/admin/catalogo/enviar">Catalogar aula</ButtonLink>
        </div>
      </div>
      <p className="mt-2 t-small text-tinta-suave">Use “Editar” em cada aula para corrigir o tema e o tipo e para colocá-la num tópico do edital (ex.: 4. Ilicitude › 4.1). Aulas do mesmo tópico aparecem juntas, na ordem do subtópico.</p>
      <form className="mt-5 flex flex-wrap gap-2 t-small" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Buscar pelo título ou tópico" className="min-h-10 rounded-md border border-linha-forte px-3" aria-label="Buscar pelo título ou tópico" />
        <select name="status" defaultValue={sp.status ?? ""} className="min-h-10 rounded-md border border-linha-forte px-3" aria-label="Situação">
          <option value="">Todas as situações</option>
          <option value="publicado">Publicados</option>
          <option value="rascunho">Rascunhos</option>
          <option value="arquivado">Arquivados</option>
        </select>
        <button className="min-h-10 rounded-md border border-linha-forte px-3 font-semibold">Filtrar</button>
      </form>
      {topics.length === 0 ? (
        <div className="mt-6">
          <EmptyState title="Nenhum tema aqui ainda" action={<ButtonLink href="/admin/catalogo/enviar">Catalogar a primeira aula</ButtonLink>}>
            Comece pelos temas mais pedidos — a Fila da IA mostra o que os alunos estão estudando.
          </EmptyState>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.mode} aria-labelledby={`m-${g.mode}`}>
              <h2 id={`m-${g.mode}`} className="t-h2">{g.label} <span className="t-small font-normal text-tinta-fraca">({g.topics.length})</span></h2>
            <div className="mt-2 overflow-x-auto rounded-lg border border-linha">
              <table className="w-full min-w-[720px] t-small">
                <thead className="bg-nevoa text-left">
                  <tr>
                    <th className="px-3 py-2">Tema</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Módulos</th>
                    <th className="px-3 py-2">Questões no banco</th>
                    <th className="px-3 py-2">Situação</th>
                    <th className="px-3 py-2">Atualizado</th>
                    <th className="px-3 py-2"><span className="sr-only">Excluir</span></th>
                    <th className="px-3 py-2"><span className="sr-only">Editar</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-linha">
                  {groupByTopic(g.topics).map((tg) => (
                    <Fragment key={tg.key ?? "avulsas"}>
                      {(tg.key || g.hasGroups) && (
                        <tr className="bg-nevoa/60" data-testid="grupo-topico">
                          <th colSpan={COLS} scope="colgroup" className="px-3 py-2 text-left">
                            {tg.key ? (
                              <>
                                <span className="t-tiny font-bold uppercase tracking-wide text-destaque">Tópico</span>{" "}
                                <span className="font-semibold">{tg.code ? `${tg.code}. ` : ""}{tg.title}</span>{" "}
                                <span className="t-tiny font-normal text-tinta-fraca">({tg.items.length} {tg.items.length === 1 ? "aula" : "aulas"})</span>
                              </>
                            ) : (
                              <span className="t-tiny font-bold uppercase tracking-wide text-tinta-fraca">Aulas avulsas (sem tópico)</span>
                            )}
                          </th>
                        </tr>
                      )}
                      {tg.items.map((t) => (
                        <EditableRow
                          key={t.id}
                          cols={COLS}
                          topic={{ id: t.id, title: t.title, kind: t.kind, lawCode: t.lawCode, articles: t.articles, topicGroup: t.topicGroup, topicGroupCode: t.topicGroupCode, subtopicCode: t.subtopicCode }}
                          cells={
                            <>
                              <td className={`px-3 py-2 ${tg.key ? "pl-6" : ""}`}>
                                {t.subtopicCode && <span className="mr-1.5 t-tiny font-bold tabular-nums text-tinta-suave">{t.subtopicCode}</span>}
                                <Link href={`/admin/catalogo/${t.id}`} className="font-semibold text-destaque underline-offset-2 hover:underline">{t.title}</Link>
                                {t.origin === "promovido" && <span className="ml-2 t-tiny text-tinta-fraca">(promovido da IA)</span>}
                              </td>
                              <td className="px-3 py-2">
                                {t.kind === "dispositivo" ? `${LAWS.find((l) => l.code === t.lawCode)?.name.split(" (")[0] ?? t.lawCode}, art. ${t.articles.join(", ")}` : "Tema"}
                              </td>
                              <td className="px-3 py-2 tabular-nums">{t.modules || "—"}</td>
                              <td className="px-3 py-2 tabular-nums">
                                {LEVELS.map((l) => {
                                  const n = t.questions[l.key] ?? 0;
                                  return (
                                    <span key={l.key} className={`mr-2 ${n < MIN_BANK_PER_LEVEL ? "text-erro" : ""}`}>
                                      {l.label[0]}: {n}
                                    </span>
                                  );
                                })}
                                {LEVELS.some((l) => (t.questions[l.key] ?? 0) < MIN_BANK_PER_LEVEL) && (
                                  <Link href={`/admin/catalogo/${t.id}#addq`} className="ml-1 t-tiny font-semibold text-destaque underline underline-offset-2">Adicionar questões</Link>
                                )}
                              </td>
                              <td className="px-3 py-2">
                                <Tag tone={STATUS[t.status]!.tone}>{STATUS[t.status]!.label}{t.version ? ` v${t.version}` : ""}</Tag>
                              </td>
                              <td className="px-3 py-2 text-tinta-fraca">{new Date(t.updatedAt).toLocaleDateString("pt-BR")}</td>
                              <td className="px-3 py-2"><DeleteTopic compact id={t.id} title={t.title} actions={{ impact: deleteImpactAction, remove: deleteTopicAction }} /></td>
                            </>
                          }
                        />
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
