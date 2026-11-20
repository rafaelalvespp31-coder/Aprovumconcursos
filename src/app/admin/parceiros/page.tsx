import { requireAdmin } from "@/server/services/catalog";
import { partnersOverview } from "@/server/services/coupons";
import { OFFERS, isOfferKey } from "@/domain/plans/offers";

export const metadata = { title: "APROVUM PARCEIROS" };
export const dynamic = "force-dynamic";

const brl = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const ROT: Record<string, string> = { iniciado: "Aguardando pagamento", aprovado: "Pago", recusado: "Recusado", cancelado: "Cancelado", reembolsado: "Reembolsado" };
const COR: Record<string, string> = { iniciado: "text-amber-700", aprovado: "text-green-700", recusado: "text-red-700", cancelado: "text-tinta-fraca", reembolsado: "text-tinta-fraca" };

/** Parceiros oficiais: cupom, link exclusivo, utilizações e pagamentos aprovados. */
export default async function ParceirosPage() {
  await requireAdmin();
  const data = await partnersOverview().catch(() => null);
  if (!data) return <p className="rounded-lg border border-linha bg-superficie p-4 t-small">Não foi possível carregar os parceiros agora.</p>;
  const { partners, recent } = data;
  return (
    <div data-testid="admin-parceiros">
      <h1 className="t-h1">APROVUM PARCEIROS</h1>
      <p className="mt-2 max-w-2xl t-small text-tinta-suave">
        Parceiros oficiais, cupons e resultados reais do checkout. Só entram aqui os usos registrados no pagamento; o preço dos planos não muda.
      </p>
      {partners.length === 0 ? (
        <p className="mt-4 rounded-lg border border-linha bg-superficie p-4 t-small">Nenhum parceiro cadastrado ainda.</p>
      ) : (
        <div className="mt-4 grid gap-4">
          {partners.map((p) => (
            <section key={p.id} className="rounded-lg border border-linha bg-superficie p-4" aria-label={p.name}>
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="t-h3">{p.name}</h2>
                <span className={`t-tiny font-bold uppercase ${p.status === "ativo" ? "text-green-700" : "text-tinta-fraca"}`}>{p.status === "ativo" ? "Ativo" : "Inativo"} · comissão {p.commissionPct}%</span>
              </div>
              <ul className="mt-3 grid gap-2">
                {p.coupons.map((c) => (
                  <li key={c.id} className="rounded-md border border-linha p-3 t-small">
                    <b>{c.code}</b> · {c.discountPct}% de desconto · {c.status === "ativo" ? "ativo" : "inativo"} · {c.maxUses === null ? "utilizações ilimitadas" : `limite ${c.maxUses}`} · {c.expiresAt ? `até ${fmt(c.expiresAt)}` : "sem expiração"} · {c.stackable ? "acumula com outros cupons" : "não acumula com outros cupons"}
                    <div className="mt-1 break-all t-tiny text-tinta-suave">Link exclusivo: <a className="underline" href={c.link}>{c.link}</a></div>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                {([["Utilizações", String(p.uses)], ["Pagamentos aprovados", String(p.approved)], ["Reembolsados", String(p.refunded)], ["Receita (aprovada)", brl(p.grossCents)], ["Comissão a pagar", brl(p.commissionCents)]] as const).map(([k, v]) => (
                  <div key={k} className="rounded-md bg-fundo p-3"><dt className="t-tiny uppercase text-tinta-fraca">{k}</dt><dd className="t-h3">{v}</dd></div>
                ))}
              </dl>
              <p className="mt-2 t-tiny text-tinta-fraca">Descontos concedidos em pagamentos aprovados: {brl(p.discountCents)}.</p>
            </section>
          ))}
        </div>
      )}
      <h2 className="mt-6 t-h3">Últimas utilizações</h2>
      {recent.length === 0 ? (
        <p className="mt-2 rounded-lg border border-linha bg-superficie p-4 t-small">Nenhuma utilização ainda. Elas aparecem aqui assim que um aluno aplicar o cupom no pagamento.</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-lg border border-linha bg-superficie">
          <table className="w-full min-w-[760px] text-left t-small">
            <thead className="border-b border-linha t-tiny uppercase text-tinta-fraca"><tr><th className="p-3">Data</th><th className="p-3">Parceiro</th><th className="p-3">Cupom</th><th className="p-3">Plano</th><th className="p-3">Original</th><th className="p-3">Desconto</th><th className="p-3">Pago</th><th className="p-3">Situação</th></tr></thead>
            <tbody>
              {recent.map((r) => (
                <tr key={r.id} className="border-b border-linha last:border-0">
                  <td className="p-3 whitespace-nowrap">{fmt(r.createdAt)}</td><td className="p-3">{r.partner}</td><td className="p-3">{r.code}</td>
                  <td className="p-3">{isOfferKey(r.offer) ? OFFERS[r.offer].label : r.offer}</td><td className="p-3">{brl(r.originalCents)}</td><td className="p-3">−{brl(r.discountCents)}</td><td className="p-3">{brl(r.finalCents)}</td>
                  <td className={`p-3 font-semibold ${COR[r.status] ?? ""}`}>{ROT[r.status] ?? r.status}{r.approvedAt ? <div className="font-normal t-tiny text-tinta-fraca">{fmt(r.approvedAt)}</div> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
