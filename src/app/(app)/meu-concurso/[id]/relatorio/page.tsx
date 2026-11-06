import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { reanalyzeIfStale } from "@/server/services/edital";
import { getPreparationTree, type TreeTopic } from "@/server/services/edital-view";
import "@/components/aprovum-ai/aprovum-ai.css";

export const metadata = { title: "Relatório do edital" };
export const dynamic = "force-dynamic";

const MARK: Record<TreeTopic["status"], { s: string; t: string }> = {
  completa: { s: "✓", t: "Aula disponível" },
  parcial: { s: "◐", t: "Cobertura parcial" },
  conferencia: { s: "?", t: "Conferir" },
  nao_encontrado: { s: "✕", t: "Aula ainda não disponível" },
  pendente: { s: "·", t: "Aguardando" },
};

export default async function RelatorioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/meu-concurso/${id}/relatorio`);
  if (await reanalyzeIfStale(user.id, id).catch(() => false)) redirect(`/aprovum-ai/${id}`);
  const tree = await getPreparationTree(user.id, id).catch(() => null);
  if (!tree) notFound();
  const { prep, disciplines, totals } = tree;
  return (
    <div className="ai-root mx-auto w-full max-w-3xl" data-testid="ai-relatorio">
      <Link href={`/meu-concurso/${id}`} className="ai-sub" style={{ display: "inline-block", marginBottom: 8 }}>← Voltar para Meu Concurso</Link>
      <header className="ai-rep-head">
        <h1>{prep.title}</h1>
        <p>{prep.fileName.length > 40 ? "Edital enviado" : prep.fileName} · {prep.pageCount ?? "—"} páginas · {disciplines.length} disciplinas · {totals.topics} tópicos · cobertura {prep.stats.coveragePct ?? 0}%</p>
        <ul className="ai-leg" aria-label="Legenda">
          {Object.values(MARK).slice(0, 4).map((m) => <li key={m.t}><b>{m.s}</b> {m.t}</li>)}
        </ul>
      </header>
      <div className="ai-rep-list">
        {disciplines.map((d) => {
          const ok = d.topics.filter((t) => t.status === "completa" || t.status === "parcial").length;
          return (
            <details key={d.id} className="ai-disc ai-rep">
              <summary>
                <div>
                  <h2>{d.name}</h2>
                  <small>{d.topics.length} tópicos · {ok} com aula{d.page ? ` · p. ${d.page}` : ""}</small>
                </div>
                <span className="ai-rep-chev" aria-hidden>⌄</span>
              </summary>
              <ol>
                {d.topics.map((t) => (
                  <li key={t.id} data-st={t.status} data-d={Math.min(t.depth, 4)}>
                    <b title={MARK[t.status].t}>{MARK[t.status].s}</b>
                    <span>{t.code && <code>{t.code}</code>}{t.title}
                      {t.lessons.length > 0 && <em> — {t.lessons.map((l) => l.title).join("; ")}</em>}
                      {t.lessons.length === 0 && t.page ? <em> — edital p. {t.page}</em> : null}
                    </span>
                  </li>
                ))}
              </ol>
            </details>
          );
        })}
      </div>
    </div>
  );
}
