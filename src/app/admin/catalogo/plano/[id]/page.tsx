import Link from "next/link";
import { notFound } from "next/navigation";
import { Tag } from "@/components/ui";
import { disciplineLabel } from "@/ai/pedagogy";
import { requireAdmin } from "@/server/services/catalog";
import { getOutline, planView } from "@/server/services/outlines";
import { deleteOutlineAction, updateOutlineAction } from "../../actions";
import { EditPlan, SubtopicCommands } from "./plan-tools";

export const metadata = { title: "Plano de tópicos" };

const STATUS = {
  publicado: { label: "Publicado", tone: "verde" as const },
  rascunho: { label: "Rascunho", tone: "ambar" as const },
  pendente: { label: "Pendente", tone: "neutro" as const },
};

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const outline = await getOutline(id);
  if (!outline) notFound();
  const v = await planView(outline);
  const done = v.totals.publicado + v.totals.rascunho;
  const pct = v.totals.subtopics ? Math.round((v.totals.publicado / v.totals.subtopics) * 100) : 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/catalogo/plano" className="t-small text-destaque underline underline-offset-2">Plano de tópicos</Link>
        <h1 className="mt-1 t-h1">{outline.title}</h1>
        <p className="mt-1 t-small text-tinta-suave">
          {disciplineLabel(outline.disciplineMode) ?? outline.disciplineMode} · {v.totals.subtopics} subtópico(s): {v.totals.publicado} publicado(s), {v.totals.rascunho} em rascunho,{" "}
          {v.totals.pendente} pendente(s){v.totals.duplicados ? ` · ${v.totals.duplicados} duplicado(s)` : ""}
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
          <li>Cole no ChatGPT e copie a resposta inteira (peça “continue” se ela vier cortada).</li>
          <li>Cole em <strong>Catalogar aula</strong>: a aula já entra no tópico certo, na ordem do número. Aqui ela passa de “Pendente” para “Rascunho” ou “Publicado”.</li>
        </ol>
        <p className="mt-2 text-tinta-suave">
          {done ? `${done} de ${v.totals.subtopics} subtópicos já estão no catálogo.` : "Nenhum subtópico catalogado ainda."} Cada subtópico vira uma aula com um módulo por item.
        </p>
      </section>

      {v.totals.duplicados > 0 && (
        <section role="alert" aria-labelledby="duplicados" className="rounded-lg border-2 border-erro/50 bg-erro/5 px-4 py-3" data-testid="aviso-duplicados">
          <h2 id="duplicados" className="font-bold text-erro">
            ⚠ {v.totals.duplicados} {v.totals.duplicados === 1 ? "subtópico tem aula duplicada" : "subtópicos têm aula duplicada"}
          </h2>
          <p className="mt-1 t-small text-tinta-suave">
            Mais de uma aula do catálogo cobre o mesmo subtópico. Fique com uma (de preferência a publicada) e exclua ou arquive as outras na página de cada aula. Daqui
            para frente, catalogar de novo um subtópico atualiza a aula que já existe, sem duplicar.
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 t-small">
            {v.groups.flatMap((g) =>
              g.subtopics
                .filter((s) => s.duplicates.length > 1)
                .map((s) => (
                  <li key={s.ref}>
                    <span className="font-semibold">
                      {s.code ? `${s.code} ` : ""}
                      {s.title}:
                    </span>{" "}
                    {s.duplicates.map((d, i) => (
                      <span key={d.id}>
                        {i > 0 && " · "}
                        <Link href={`/admin/catalogo/${d.id}`} className="text-destaque underline underline-offset-2">
                          {d.title}
                        </Link>{" "}
                        <span className="text-tinta-fraca">({STATUS[d.status === "publicado" ? "publicado" : "rascunho"].label.toLowerCase()})</span>
                      </span>
                    ))}
                  </li>
                )),
            )}
          </ul>
        </section>
      )}

      {v.warnings.length > 0 && (
        <ul className="flex flex-col gap-1 rounded-md border border-alerta/30 bg-alerta-fundo px-4 py-3 t-small">
          {v.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
        </ul>
      )}

      {v.groups.map((g, gi) => (
        <section key={gi} aria-labelledby={`g-${gi}`} className="rounded-lg border border-linha" data-testid="plano-topico">
          <h2 id={`g-${gi}`} className="border-b border-linha bg-nevoa px-4 py-3 t-h2">
            <span className="t-tiny font-bold uppercase tracking-wide text-destaque">Tópico</span> {g.code ? `${g.code}. ` : ""}{g.title}
          </h2>
          <ul className="divide-y divide-linha">
            {g.subtopics.map((s) => (
              <li key={s.ref} className="flex flex-col gap-2 px-4 py-3" data-testid="plano-subtopico" data-status={s.status}>
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
                      <Link href={`/admin/catalogo/${s.topicId}`} className="t-small font-semibold text-destaque underline underline-offset-2">Abrir aula</Link>
                    ) : (
                      <Link href={`/admin/catalogo/enviar?plano=${outline.id}&sub=${s.ref}`} className="t-small font-semibold text-destaque underline underline-offset-2" data-testid="catalogar-subtopico">
                        Catalogar
                      </Link>
                    )}
                    <SubtopicCommands disciplineMode={outline.disciplineMode} group={{ code: g.code, title: g.title }} sub={{ code: s.code, title: s.title, items: s.items }} />
                  </div>
                </div>
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

      <EditPlan id={outline.id} initial={{ disciplineMode: outline.disciplineMode, title: outline.title, text: outline.sourceText }} update={updateOutlineAction} remove={deleteOutlineAction} />
    </div>
  );
}
