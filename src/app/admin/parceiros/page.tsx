import Link from "next/link";
import { requireAdmin } from "@/server/services/catalog";
import { partnersList } from "@/server/services/parceiros-admin";
import { createPartnerAction, setPartnerStatusAction, windowAction } from "./actions";
import { CopyButton } from "./copy-button";
import { PartnerForm } from "./partner-form";
import { Flash, brl } from "./ui";

export const metadata = { title: "APROVUM PARCEIROS" };
export const dynamic = "force-dynamic";

const PER = 10;

/** APROVUM PARCEIROS: indicadores reais, cadastro, busca, filtro e paginação. Só administrador. */
export default async function ParceirosPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; p?: string; ok?: string; erro?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const status = sp.status === "ativo" || sp.status === "inativo" ? sp.status : undefined;
  const page = Math.max(1, Number(sp.p) || 1);
  const data = await partnersList({ q: sp.q, status, page, perPage: PER }).catch(() => null);
  if (!data) return <p className="rounded-lg border border-linha bg-superficie p-4 t-small">Não foi possível carregar os parceiros agora.</p>;
  const { rows, total, kpis, windowDays } = data;
  const pages = Math.max(1, Math.ceil(total / PER));
  const href = (n: number) => `/admin/parceiros?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(status ? { status } : {}), p: String(n) })}`;
  const cards: Array<[string, string]> = [
    ["Parceiros", String(kpis.partners)], ["Ativos", String(kpis.active)], ["Indicações", String(kpis.referrals)], ["Vendas aprovadas", String(kpis.sales)],
    ["Faturamento originado", brl(kpis.grossCents)], ["Descontos concedidos", brl(kpis.discountCents)], ["Comissões devidas", brl(kpis.commissionDueCents)],
  ];
  return (
    <div data-testid="admin-parceiros">
      <h1 className="t-h1">APROVUM PARCEIROS</h1>
      <p className="mt-2 max-w-2xl t-small text-tinta-suave">Parceiros de divulgação, cupons e vendas originadas. Dados reais do checkout; o preço dos planos não muda.</p>
      <Flash ok={sp.ok} erro={sp.erro} />
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {cards.map(([k, v]) => (
          <div key={k} className="rounded-lg border border-linha bg-superficie p-3"><dt className="t-tiny uppercase text-tinta-fraca">{k}</dt><dd className="mt-1 t-h3">{v}</dd></div>
        ))}
      </dl>

      <details className="mt-4 rounded-lg border border-linha bg-superficie p-4">
        <summary className="cursor-pointer t-small font-semibold">Cadastrar parceiro</summary>
        <div className="mt-3"><PartnerForm action={createPartnerAction} submit="Cadastrar parceiro" /></div>
      </details>

      <form className="mt-4 flex flex-wrap items-end gap-2" role="search">
        <label className="t-small">Buscar<input name="q" defaultValue={sp.q ?? ""} placeholder="Nome ou cupom" className="mt-1 block rounded-md border border-linha bg-fundo px-3 py-2 t-small" /></label>
        <label className="t-small">Situação
          <select name="status" defaultValue={status ?? ""} className="mt-1 block rounded-md border border-linha bg-fundo px-3 py-2 t-small"><option value="">Todas</option><option value="ativo">Ativos</option><option value="inativo">Inativos</option></select>
        </label>
        <button className="rounded-md border border-linha px-3 py-2 t-small font-semibold">Filtrar</button>
      </form>

      {rows.length === 0 ? (
        <p className="mt-4 rounded-lg border border-linha bg-superficie p-4 t-small">{total === 0 && kpis.partners === 0 ? "Nenhum parceiro cadastrado ainda." : "Nenhum parceiro encontrado com esse filtro."}</p>
      ) : (
        <div className="mt-3 overflow-x-auto rounded-lg border border-linha bg-superficie">
          <table className="w-full min-w-[920px] text-left t-small">
            <thead className="border-b border-linha t-tiny uppercase text-tinta-fraca"><tr><th className="p-3">Parceiro</th><th className="p-3">Cupom</th><th className="p-3">Desconto</th><th className="p-3">Comissão</th><th className="p-3">Indicações</th><th className="p-3">Vendas</th><th className="p-3">Faturamento</th><th className="p-3">Status</th><th className="p-3">Ações</th></tr></thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-linha align-top last:border-0">
                  <td className="p-3 font-semibold">{p.name}</td>
                  <td className="p-3"><b>{p.code ?? "—"}</b>{p.code && p.link ? <div className="mt-1 flex gap-1"><CopyButton text={p.code} label="Copiar cupom" /><CopyButton text={p.link} label="Copiar link" /></div> : null}</td>
                  <td className="p-3">{p.discountPct}%</td><td className="p-3">{p.commissionPct}%</td><td className="p-3">{p.referrals}</td><td className="p-3">{p.sales}</td><td className="p-3">{brl(p.grossCents)}</td>
                  <td className={`p-3 font-semibold ${p.status === "ativo" ? "text-green-700" : "text-tinta-fraca"}`}>{p.status === "ativo" ? "Ativo" : "Inativo"}</td>
                  <td className="p-3">
                    <div className="flex flex-wrap gap-1">
                      <Link href={`/admin/parceiros/${p.id}`} className="rounded-md border border-linha px-2 py-1 t-tiny font-semibold hover:bg-fundo">Ver / editar</Link>
                      <form action={setPartnerStatusAction}><input type="hidden" name="partnerId" value={p.id} /><input type="hidden" name="back" value="list" /><input type="hidden" name="to" value={p.status === "ativo" ? "inativo" : "ativo"} /><button className="rounded-md border border-linha px-2 py-1 t-tiny font-semibold hover:bg-fundo">{p.status === "ativo" ? "Suspender" : "Ativar"}</button></form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pages > 1 && (
        <nav className="mt-3 flex items-center gap-3 t-small" aria-label="Paginação">
          {page > 1 ? <Link href={href(page - 1)} className="underline">Anterior</Link> : <span className="text-tinta-fraca">Anterior</span>}
          <span>Página {page} de {pages}</span>
          {page < pages ? <Link href={href(page + 1)} className="underline">Próxima</Link> : <span className="text-tinta-fraca">Próxima</span>}
        </nav>
      )}

      <section className="mt-6 rounded-lg border border-linha bg-superficie p-4" aria-label="Regras de atribuição">
        <h2 className="t-h3">Regras de atribuição</h2>
        <ul className="mt-2 list-disc pl-5 t-small text-tinta-suave">
          <li>O link <code>?ref=CÓDIGO</code> guarda a origem e vincula ao aluno quando ele entra. O desconto só vale quando o aluno clica em Aplicar no pagamento.</li>
          <li>Prioridade: o cupom digitado decide o desconto e a origem. A venda só herda a indicação do link se for o mesmo cupom e estiver dentro da janela.</li>
          <li>Uma indicação por parceiro e visitante; o vínculo com o aluno nunca é sobrescrito.</li>
          <li>Venda só conta como aprovada após confirmação do Mercado Pago (webhook). Pendente não conta; estorno e cancelamento ficam registrados.</li>
          <li>Cupom não acumula com outro e vale só na contratação em que foi aplicado (sem desconto automático em renovações).</li>
        </ul>
        <form action={windowAction} className="mt-3 flex flex-wrap items-end gap-2">
          <label className="t-small">Janela de atribuição (dias)<input name="days" type="number" min="1" max="365" defaultValue={windowDays} className="mt-1 block w-28 rounded-md border border-linha bg-fundo px-3 py-2 t-small" /></label>
          <button className="rounded-md border border-linha px-3 py-2 t-small font-semibold">Salvar janela</button>
        </form>
      </section>
    </div>
  );
}
