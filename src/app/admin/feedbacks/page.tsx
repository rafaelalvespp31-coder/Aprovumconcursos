import { contarDispensas, listarFeedbacks } from "@/server/services/lesson-feedback";
import { evolucaoMensal, filtrarFeedbacks, porAula, porMateria, resumoGeral, MIN_AVALIACOES_ALERTA, MEDIA_ALERTA, type FiltroFeedback } from "@/domain/feedback/feedback";
import { Estrelas, FeedbackLista } from "@/components/admin/feedback-lista";

export const metadata = { title: "Admin · Feedbacks dos alunos" };
export const dynamic = "force-dynamic";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const fmt = (n: number | null) => (n === null ? "—" : n.toFixed(2).replace(".", ","));
const mesBR = (m: string) => `${m.slice(5)}/${m.slice(0, 4)}`;

/** Central de feedbacks pós-aula. Só administradores (layout) — dados reais, sem exemplos. */
export default async function AdminFeedbacksPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const [todos, dispensas] = await Promise.all([listarFeedbacks(), contarDispensas()]);
  const nota = Number(one(sp.nota));
  const filtro: FiltroFeedback = { q: one(sp.q), aula: one(sp.aula), materia: one(sp.materia), nota: nota >= 1 && nota <= 5 ? nota : null, de: one(sp.de), ate: one(sp.ate), comentario: one(sp.comentario) === "com" ? "com" : one(sp.comentario) === "sem" ? "sem" : "" };
  const lista = filtrarFeedbacks(todos, filtro);
  const r = resumoGeral(todos);
  const aulas = porAula(todos);
  const materias = porMateria(todos).sort((a, b) => b.total - a.total);
  const piores = aulas.filter((a) => a.negativas > 0).sort((a, b) => b.negativas - a.negativas).slice(0, 5);
  const melhores = aulas.filter((a) => a.positivas > 0).sort((a, b) => b.positivas - a.positivas).slice(0, 5);
  const alertas = aulas.filter((a) => a.alerta).sort((a, b) => a.media - b.media);
  const evolucao = evolucaoMensal(todos);
  const recentes = todos.filter((t) => t.comment).slice(0, 5);
  const opcoesAulas = [...new Set(todos.map((t) => t.lessonTitle))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const opcoesMaterias = [...new Set(todos.map((t) => t.subject).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const campo = "min-h-10 rounded-md border border-linha-forte bg-white px-2 text-[14px]";

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-6" data-testid="admin-feedbacks">
      <div>
        <h1 className="text-[22px] font-extrabold">Feedbacks dos alunos</h1>
        <p className="text-[13px] text-tinta-suave">Avaliações enviadas após a conclusão das aulas. {dispensas} aluno(s) pularam a avaliação (não contam como nota).</p>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6" aria-label="Indicadores">
        {[["Avaliações", String(r.total)], ["Média geral", r.media === null ? "—" : `${fmt(r.media)} ★`], ["5 estrelas", String(r.cinco)], ["4 estrelas", String(r.quatro)], ["3 estrelas", String(r.tres)], ["1 ou 2 estrelas", String(r.baixas)]].map(([t, n]) => (
          <div key={t} className="rounded-lg border border-linha p-3"><p className="text-[12px] text-tinta-suave">{t}</p><p className="text-[22px] font-extrabold">{n}</p></div>
        ))}
      </section>

      {alertas.length > 0 && (
        <section aria-label="Alertas" className="rounded-lg border-2 border-destaque/40 bg-nevoa p-3" data-testid="feedback-alertas">
          <h2 className="text-[15px] font-bold text-destaque">Aulas que precisam de atenção</h2>
          <p className="text-[12.5px] text-tinta-suave">Média abaixo de {MEDIA_ALERTA} com pelo menos {MIN_AVALIACOES_ALERTA} avaliações.</p>
          <ul className="mt-2 flex flex-col gap-1 text-[13.5px]">{alertas.map((a) => <li key={a.chave}><b>{a.rotulo}</b> — média {fmt(a.media)} em {a.total} avaliações ({a.negativas} negativas)</li>)}</ul>
        </section>
      )}

      <form method="get" className="grid gap-2 rounded-lg border border-linha p-3 sm:grid-cols-3" data-testid="feedback-filtros">
        <input name="q" defaultValue={filtro.q} placeholder="Buscar aluno, aula, matéria ou comentário" className={`${campo} sm:col-span-3`} aria-label="Buscar" />
        <select name="aula" defaultValue={filtro.aula} className={campo} aria-label="Aula"><option value="">Todas as aulas</option>{opcoesAulas.map((a) => <option key={a}>{a}</option>)}</select>
        <select name="materia" defaultValue={filtro.materia} className={campo} aria-label="Matéria"><option value="">Todas as matérias</option>{opcoesMaterias.map((a) => <option key={a}>{a}</option>)}</select>
        <select name="nota" defaultValue={filtro.nota ? String(filtro.nota) : ""} className={campo} aria-label="Estrelas"><option value="">Todas as notas</option>{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} estrela{n > 1 ? "s" : ""}</option>)}</select>
        <label className="flex items-center gap-2 text-[12.5px] text-tinta-suave">De <input type="date" name="de" defaultValue={filtro.de} className={`${campo} flex-1`} /></label>
        <label className="flex items-center gap-2 text-[12.5px] text-tinta-suave">Até <input type="date" name="ate" defaultValue={filtro.ate} className={`${campo} flex-1`} /></label>
        <select name="comentario" defaultValue={filtro.comentario} className={campo} aria-label="Comentário"><option value="">Com ou sem comentário</option><option value="com">Com comentário</option><option value="sem">Sem comentário</option></select>
        <div className="flex gap-2 sm:col-span-3">
          <button type="submit" className="min-h-10 rounded-md bg-destaque px-5 font-semibold text-white">Filtrar</button>
          <a href="/admin/feedbacks" className="inline-flex min-h-10 items-center rounded-md border border-linha-forte px-4 font-semibold">Limpar</a>
        </div>
      </form>

      <section>
        <h2 className="mb-2 text-[16px] font-bold">Avaliações ({lista.length}{lista.length !== todos.length ? ` de ${todos.length}` : ""})</h2>
        <FeedbackLista itens={lista} />
      </section>

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Análise de qualidade">
        <div>
          <h2 className="mb-2 text-[16px] font-bold">Média por matéria</h2>
          {materias.length === 0 ? <p className="text-[13px] text-tinta-suave">Sem dados ainda.</p> : <ul className="divide-y divide-linha rounded-lg border border-linha text-[13.5px]">{materias.map((m) => <li key={m.chave} className="flex items-center justify-between gap-2 px-3 py-2"><span>{m.rotulo}</span><span className="whitespace-nowrap"><Estrelas n={Math.round(m.media)} /> <b>{fmt(m.media)}</b> <span className="text-tinta-fraca">({m.total})</span></span></li>)}</ul>}
        </div>
        <div>
          <h2 className="mb-2 text-[16px] font-bold">Média por aula</h2>
          {aulas.length === 0 ? <p className="text-[13px] text-tinta-suave">Sem dados ainda.</p> : <ul className="max-h-72 divide-y divide-linha overflow-y-auto rounded-lg border border-linha text-[13.5px]">{[...aulas].sort((a, b) => a.media - b.media).map((m) => <li key={m.chave} className="flex items-center justify-between gap-2 px-3 py-2"><span className={m.alerta ? "font-semibold text-destaque" : ""}>{m.rotulo}</span><span className="whitespace-nowrap"><b>{fmt(m.media)}</b> <span className="text-tinta-fraca">({m.total})</span></span></li>)}</ul>}
        </div>
        <div>
          <h2 className="mb-2 text-[16px] font-bold">Mais avaliações negativas</h2>
          {piores.length === 0 ? <p className="text-[13px] text-tinta-suave">Nenhuma avaliação negativa.</p> : <ul className="divide-y divide-linha rounded-lg border border-linha text-[13.5px]">{piores.map((m) => <li key={m.chave} className="flex justify-between gap-2 px-3 py-2"><span>{m.rotulo}</span><b>{m.negativas}</b></li>)}</ul>}
        </div>
        <div>
          <h2 className="mb-2 text-[16px] font-bold">Mais avaliações positivas</h2>
          {melhores.length === 0 ? <p className="text-[13px] text-tinta-suave">Nenhuma avaliação positiva.</p> : <ul className="divide-y divide-linha rounded-lg border border-linha text-[13.5px]">{melhores.map((m) => <li key={m.chave} className="flex justify-between gap-2 px-3 py-2"><span>{m.rotulo}</span><b>{m.positivas}</b></li>)}</ul>}
        </div>
        <div>
          <h2 className="mb-2 text-[16px] font-bold">Evolução mensal</h2>
          {evolucao.length === 0 ? <p className="text-[13px] text-tinta-suave">Sem dados ainda.</p> : <ul className="divide-y divide-linha rounded-lg border border-linha text-[13.5px]">{evolucao.map((e) => <li key={e.mes} className="flex justify-between gap-2 px-3 py-2"><span>{mesBR(e.mes)}</span><span>média <b>{fmt(e.media)}</b> · {e.total} avaliação(ões)</span></li>)}</ul>}
        </div>
        <div>
          <h2 className="mb-2 text-[16px] font-bold">Comentários recentes</h2>
          {recentes.length === 0 ? <p className="text-[13px] text-tinta-suave">Nenhum comentário ainda.</p> : <ul className="flex flex-col gap-2 text-[13.5px]">{recentes.map((c) => <li key={c.id} className="rounded-lg border border-linha p-2.5"><Estrelas n={c.rating} /> <span className="text-tinta-suave">{c.lessonTitle}</span><p className="mt-1">“{c.comment}”</p></li>)}</ul>}
        </div>
      </section>
    </div>
  );
}
