import { adminStats, listCategories } from "@/server/services/redacao";
import { RUBRICAS_PADRAO } from "@/domain/redacao/rubricas";
import { AlternarCategoria, NovaCategoria, NovoTema } from "@/components/redacao/admin-forms";

export const metadata = { title: "Admin · Redação Elite" };
export const dynamic = "force-dynamic";

const dt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

/** Painel da equipe: indicadores agregados, falhas, uso de IA, categorias e propostas. Não exibe o texto privado das redações. */
export default async function AdminRedacaoPage() {
  const [s, cats] = await Promise.all([adminStats(), listCategories()]);
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-5 py-6" data-testid="admin-redacao">
      <h1 className="text-[22px] font-extrabold">Redação Elite</h1>
      <p className="text-[13px] text-tinta-suave">Indicadores agregados. O conteúdo das redações dos alunos é privado e não é exibido aqui.</p>

      <section className="grid gap-3 sm:grid-cols-4">
        {[["Redações (total)", s.totalRedacoes], ["Avaliações (30 dias)", s.ultimos30.avaliacoes], ["Concluídas", s.ultimos30.concluidas], ["Falhas", s.ultimos30.falhas]].map(([t, n]) => (
          <div key={t as string} className="rounded-lg border border-linha p-3"><p className="text-[12px] text-tinta-suave">{t}</p><p className="text-[22px] font-extrabold">{n}</p></div>
        ))}
        <div className="rounded-lg border border-linha p-3"><p className="text-[12px] text-tinta-suave">Aproveitamento médio</p><p className="text-[22px] font-extrabold">{s.ultimos30.mediaPct === null ? "—" : `${s.ultimos30.mediaPct}%`}</p></div>
        <div className="rounded-lg border border-linha p-3"><p className="text-[12px] text-tinta-suave">Chamadas de IA (30 d)</p><p className="text-[22px] font-extrabold">{s.ia.chamadas}</p><p className="text-[12px] text-tinta-suave">{s.ia.falhas} com falha</p></div>
        <div className="rounded-lg border border-linha p-3"><p className="text-[12px] text-tinta-suave">Tokens (entrada / saída)</p><p className="text-[16px] font-extrabold">{s.ia.tokensIn.toLocaleString("pt-BR")} / {s.ia.tokensOut.toLocaleString("pt-BR")}</p></div>
        <div className="rounded-lg border border-linha p-3"><p className="text-[12px] text-tinta-suave">Custo estimado (30 d)</p><p className="text-[16px] font-extrabold">{s.ia.custoUsd ? `US$ ${s.ia.custoUsd.toFixed(2)}` : "não configurado"}</p></div>
      </section>

      <section>
        <h2 className="mb-2 text-[16px] font-bold">Limites de utilização</h2>
        <p className="text-[13.5px]">Correções por aluno por dia: <b>{s.limiteDiario}</b> (variável <code>REDACAO_LIMITE_DIA</code>). Teto diário de gasto: <b>{s.orcamentoDia ? `US$ ${s.orcamentoDia}` : "sem teto"}</b> (variável <code>REDACAO_ORCAMENTO_DIA_USD</code>). Administradores não têm limite diário.</p>
      </section>

      <section>
        <h2 className="mb-2 text-[16px] font-bold">Falhas de processamento recentes</h2>
        {s.falhas.length === 0 ? <p className="text-[13.5px] text-tinta-suave">Nenhuma falha registrada.</p> : (
          <ul className="flex flex-col divide-y divide-linha rounded-lg border border-linha">
            {s.falhas.map((f) => <li key={f.id} className="p-3 text-[13px]"><b>{dt(f.created_at)}</b> · {f.modality} · {f.attempts} tentativa(s)<br />{f.error}</li>)}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-[16px] font-bold">Categorias de tema</h2>
        <NovaCategoria />
        <ul className="mt-3 grid gap-1 sm:grid-cols-2">
          {s.categorias.map((c) => <li key={c.id} className="flex items-center justify-between rounded-md border border-linha px-3 py-1.5 text-[13.5px]"><span className={c.active ? "" : "text-tinta-suave line-through"}>{c.name}</span><AlternarCategoria id={c.id} ativa={c.active} /></li>)}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-[16px] font-bold">Propostas de redação da equipe</h2>
        <NovoTema categorias={cats} />
        <ul className="mt-3 flex flex-col divide-y divide-linha rounded-lg border border-linha">
          {s.temasEquipe.length === 0 ? <li className="p-3 text-[13.5px] text-tinta-suave">Nenhuma proposta cadastrada.</li> : s.temasEquipe.map((t) => <li key={t.id} className="p-3 text-[13.5px]"><b>{t.title}</b> <span className="text-tinta-suave">· {dt(t.created_at)}</span></li>)}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-[16px] font-bold">Rubricas em uso</h2>
        <ul className="flex flex-col gap-2">
          {RUBRICAS_PADRAO.map((r) => (
            <li key={r.key} className="rounded-lg border border-linha p-3 text-[13.5px]">
              <b>{r.name}</b> · v{r.version} · máx. {r.max} {r.estimated ? "· estimada" : "· matriz oficial"}
              <br /><span className="text-tinta-suave">{r.criteria.map((c) => `${c.label} (${c.max})`).join("; ")}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-[12.5px] text-tinta-suave">Quando o aluno cola os critérios do edital, a correção usa esses critérios (rubrica “edital_personalizado”). Rubricas por banca cadastradas pela equipe ainda não têm tela própria.</p>
      </section>
    </div>
  );
}
