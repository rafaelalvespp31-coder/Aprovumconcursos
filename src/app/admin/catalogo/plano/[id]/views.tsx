import Link from "next/link";
import { notFound } from "next/navigation";
import { Tag } from "@/components/ui";
import { disciplineLabel } from "@/ai/pedagogy";
import { getOutline, planView } from "@/server/services/outlines";
import { deleteOutlineAction, removeDuplicateLessonAction, removeOutlineSubtopicAction, updateOutlineAction } from "../../actions";
import { EditPlan, HidePublished, RemoveFromPlanButton, RemoveLessonButton, SubtopicCommands, TopicBulk } from "./plan-tools";
import { DuplicatesCenter } from "./duplicates-center";

const STATUS = {
  publicado: { label: "Publicado", tone: "verde" as const },
  rascunho: { label: "Rascunho", tone: "ambar" as const },
  pendente: { label: "Pendente", tone: "neutro" as const },
};

/** Plano de tópicos aberto: comandos por subtópico. Mesma tela para o administrador e para o sócio liberado. */
export async function PlanView({ id, base, admin }: { id: string; base: string; admin: boolean }) {
  const outline = await getOutline(id);
  if (!outline) notFound();
  const v = await planView(outline);
  const done = v.totals.publicado + v.totals.rascunho;
  const pct = v.totals.subtopics ? Math.round((v.totals.publicado / v.totals.subtopics) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`${base}/plano`} className="t-small text-destaque underline underline-offset-2">Plano de tópicos</Link>
        <h1 className="mt-1 t-h1">{outline.title}</h1>
        <p className="mt-1 t-small text-tinta-suave">
          {disciplineLabel(outline.disciplineMode) ?? outline.disciplineMode} · {v.totals.subtopics} subtópico(s): {v.totals.publicado} publicado(s), {v.totals.rascunho} em rascunho,{" "}
          {v.totals.pendente} pendente(s){v.dupes.total ? ` · ${v.dupes.total} duplicada(s)` : ""}
        </p>
        <div className="mt-2 h-2 max-w-md overflow-hidden rounded-full bg-nevoa" aria-label={`Publicados: ${pct}%`}>
          <div className="h-full bg-dominado" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <section className="rounded-lg border border-linha p-4 t-small" aria-labelledby="como">
        <h2 id="como" className="font-semibold">Como catalogar cada subtópico</h2>
        <ol className="mt-2 list-decimal pl-5 text-tinta-suave">
          <li>Clique em <strong>Copiar comando</strong> no subtópico (ou em <strong>Catalogar</strong>, que abre o painel com o comando pronto).</li>
          <li>Aula grande? Use o <strong>Comando 1</strong> (a aula) e, na mesma conversa, o <strong>Comando 2</strong> (as questões); cole as duas respostas nos dois campos de “Catalogar aula”.</li>
          <li>Cole na IA e copie a resposta inteira (peça “continue” se ela vier cortada).</li>
          <li>Cole em <strong>Catalogar aula</strong>: a aula já entra no tópico certo, na ordem do número. Aqui ela passa de “Pendente” para “Rascunho” ou “Publicado”.</li>
        </ol>
        <p className="mt-2 text-tinta-suave">
          {done ? `${done} de ${v.totals.subtopics} subtópicos já estão no catálogo.` : "Nenhum subtópico catalogado ainda."} Cada subtópico vira uma aula com um módulo por item.
        </p>
      </section>

      <DuplicatesCenter dupes={v.dupes} base={base} admin={admin} />

      <HidePublished publicados={v.totals.publicado}>
      {v.groups.map((g, gi) => (
        <section key={gi} data-completo={g.subtopics.length > 0 && g.subtopics.every((x) => x.status === "publicado") ? 1 : undefined} aria-labelledby={`g-${gi}`} className={`rounded-lg border ${v.dupes.flagged.includes(`g:${gi}`) ? "dup-flag-box" : "border-linha"}`} data-testid="plano-topico">
          <h2 id={`g-${gi}`} className="bg-nevoa px-4 pt-3 pb-1 t-h2">
            <span className="t-tiny font-bold uppercase tracking-wide text-destaque">Tópico</span> {g.code ? `${g.code}. ` : ""}{g.title}
            {v.dupes.flagged.includes(`g:${gi}`) && <span className="dup-ribbon" data-testid="topico-duplicado">DUPLICADO</span>}
          </h2>
          {g.subtopics.length > 0 && <div className="border-b border-linha bg-nevoa px-4 pb-3"><TopicBulk outlineId={outline.id} gi={gi} label={`${g.code ? `${g.code}. ` : ""}${g.title}`} /></div>}
          <ul className="divide-y divide-linha">
            {g.subtopics.map((s) => (
              <li key={s.ref} id={`sub-${s.ref}`} className={`flex flex-col gap-2 px-4 py-3 ${v.dupes.flagged.includes(s.ref) ? "dup-flag-row" : ""}`} data-testid="plano-subtopico" data-status={s.status}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {s.code && <span className="mr-1.5 tabular-nums text-tinta-suave">{s.code}</span>}
                      {s.title}
                    </p>
                    <p className="t-tiny text-tinta-fraca">Aula com {s.items.length} módulo(s) do edital + visão geral, casos práticos e revisão</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Tag tone={STATUS[s.status].tone}>{STATUS[s.status].label}</Tag>
                    {s.duplicates.length > 1 && (
                      <span className="rounded-full bg-erro px-2 py-0.5 t-tiny font-bold text-white" data-testid="subtopico-duplicado" title={`${s.duplicates.length} aulas cobrem este subtópico`}>
                        Duplicado ({s.duplicates.length})
                      </span>
                    )}
                    {s.topicId ? (
                      admin ? (
                        <Link href={`/admin/catalogo/${s.topicId}`} className="t-small font-semibold text-destaque underline underline-offset-2">Abrir aula</Link>
                      ) : s.status !== "publicado" ? (
                        <Link href={`${base}/${s.topicId}`} className="rounded-full bg-destaque px-3 py-1 t-small font-bold text-white" data-testid="corrigir-rascunho">Abrir para corrigir</Link>
                      ) : (
                        <span className="t-small font-semibold text-tinta-suave">Já no catálogo</span>
                      )
                    ) : (
                      <Link href={`${base}/enviar?plano=${outline.id}&sub=${s.ref}`} className="t-small font-semibold text-destaque underline underline-offset-2" data-testid="catalogar-subtopico">
                        Catalogar
                      </Link>
                    )}
                    <SubtopicCommands disciplineMode={outline.disciplineMode} group={{ code: g.code, title: g.title }} sub={{ code: s.code, title: s.title, items: s.items }} />
                  </div>
                </div>
                {admin && v.dupes.flagged.includes(s.ref) && (s.duplicates.length > 1 || s.topicId) && (
                  <ul className="flex flex-col gap-1.5 rounded-md border border-erro/40 bg-erro/5 p-2" data-testid="remover-duplicadas">
                    {(s.duplicates.length > 1 ? s.duplicates : [{ id: s.topicId!, title: s.title, status: s.status }]).map((l) => (
                      <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 t-small">
                        <span className="min-w-0 break-words">
                          <b>{l.title}</b> <span className="text-tinta-suave">· {l.status === "publicado" ? "no ar" : l.status}</span>
                        </span>
                        <span className="flex items-center gap-3">
                          <Link href={`/admin/catalogo/${l.id}`} className="font-semibold text-destaque underline underline-offset-2">Abrir</Link>
                          <RemoveLessonButton id={l.id} title={l.title} remove={removeDuplicateLessonAction} />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {v.dupes.flagged.includes(s.ref) && v.dupes.outline.some((o) => o.kind === "subtopico" && o.refs.includes(s.ref)) && (
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-erro/40 bg-erro/5 p-2 t-small" data-testid="repetido-no-plano">
                    <span><b>Repetido no sumário do plano.</b> Deixe só uma vez.</span>
                    <RemoveFromPlanButton outlineId={outline.id} refId={s.ref} title={`${s.code ? `${s.code} ` : ""}${s.title}`} remove={removeOutlineSubtopicAction} />
                  </div>
                )}
                {s.items.length > 0 && (
                  <details className="t-small">
                    <summary className="cursor-pointer text-tinta-suave">Ver os {s.items.length} módulos</summary>
                    <ol className="mt-1 pl-5 text-tinta-suave">
                      {s.items.map((it, i) => (
                        <li key={i}>{it.code ? `${it.code} ` : ""}{it.title}</li>
                      ))}
                    </ol>
                  </details>
                )}
              </li>
            ))}
            {!g.subtopics.length && <li className="px-4 py-3 t-small text-tinta-suave">Sem subtópicos neste tópico.</li>}
          </ul>
        </section>
      ))}
      </HidePublished>

      <EditPlan id={outline.id} initial={{ disciplineMode: outline.disciplineMode, title: outline.title, text: outline.sourceText }} update={updateOutlineAction} remove={deleteOutlineAction} />
    </div>
  );
}
