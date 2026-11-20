import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/server/services/catalog";
import { partnerDetail } from "@/server/services/parceiros-admin";
import { OFFERS, isOfferKey } from "@/domain/plans/offers";
import { commissionStepAction, setPartnerStatusAction, updatePartnerAction } from "../actions";
import { CopyButton } from "../copy-button";
import { DeleteButton } from "../delete-button";
import { PartnerForm } from "../partner-form";
import { Flash, PageHead, Pill, Stat, brl } from "../ui";

export const metadata = { title: "Parceiro · APROVUM PARCEIROS" };
export const dynamic = "force-dynamic";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—");
const ROT: Record<string, string> = { iniciado: "Aguardando pagamento", aprovado: "Pago", recusado: "Recusado", cancelado: "Cancelado", reembolsado: "Reembolsado" };
const COM: Record<string, string> = { nenhuma: "—", calculada: "Calculada", aprovada: "Aprovada", paga: "Paga", cancelada: "Cancelada" };

export default async function ParceiroDetalhe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const d = await partnerDetail(id).catch(() => null);
  if (!d) notFound();
  const { partner: p, sales } = d;
  return (
    <div data-testid="admin-parceiro-detalhe">
      <Link href="/admin/parceiros" className="t-small font-semibold text-tinta-suave hover:text-tinta">← APROVUM PARCEIROS</Link>
      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <PageHead title={p.name} sub={undefined} />
        <div className="flex items-center gap-2">
          <form action={setPartnerStatusAction}><input type="hidden" name="partnerId" value={p.id} /><input type="hidden" name="to" value={p.status === "ativo" ? "inativo" : "ativo"} /><button className="rounded-md border border-linha px-3 py-1.5 t-small font-semibold">{p.status === "ativo" ? "Suspender parceiro" : "Ativar parceiro"}</button></form>
        <DeleteButton partnerId={p.id} name={p.name} />
        </div>
      </div>
      <Flash ok={sp.ok} erro={sp.erro} />
      {p.code && p.link ? (
        <p className="mt-3 break-all t-small">Cupom <b>{p.code}</b> <CopyButton text={p.code} label="Copiar cupom" /> · Link exclusivo: <a className="underline" href={p.link}>{p.link}</a> <CopyButton text={p.link} label="Copiar link" /></p>
      ) : null}
      <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {([["Indicações", String(p.referrals)], ["Vendas aprovadas", String(p.sales)], ["Faturamento", brl(p.grossCents)], ["Descontos", brl(p.discountCents)], ["Comissão devida", brl(p.commissionDueCents)]] as const).map(([k, v], i) => <Stat key={k} label={k} value={v} accent={i === 2} />)}
      </dl>
      <details className="mt-5 rounded-xl border border-linha bg-superficie p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <summary className="cursor-pointer t-small font-semibold">Editar parceiro e cupom</summary>
        <div className="mt-3"><PartnerForm action={updatePartnerAction} p={p} submit="Salvar alterações" /></div>
      </details>
      <h2 className="mt-6 t-h3">Histórico de vendas</h2>
      {sales.length === 0 ? (
        <p className="mt-2 rounded-lg border border-linha bg-superficie p-4 t-small">Nenhuma venda ainda. Elas aparecem aqui quando um aluno usa o cupom no pagamento.</p>
      ) : (
        <div className="mt-2 overflow-x-auto rounded-xl border border-linha bg-superficie shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <table className="w-full min-w-[1100px] text-left t-small">
            <thead className="border-b border-linha bg-nevoa t-tiny uppercase tracking-wide text-tinta-fraca"><tr><th className="p-3">Indicação</th><th className="p-3">Contratação</th><th className="p-3">Aluno</th><th className="p-3">Plano</th><th className="p-3">Original</th><th className="p-3">Desconto</th><th className="p-3">Pago</th><th className="p-3">Cupom / origem</th><th className="p-3">Pagamento</th><th className="p-3">Mercado Pago</th><th className="p-3">Comissão</th></tr></thead>
            <tbody>
              {sales.map((r) => (
                <tr key={r.id} className="border-b border-linha align-top last:border-0">
                  <td className="p-3 whitespace-nowrap">{fmt(r.referredAt)}</td><td className="p-3 whitespace-nowrap">{fmt(r.boughtAt)}</td><td className="p-3">{r.student}</td>
                  <td className="p-3">{isOfferKey(r.offer) ? OFFERS[r.offer].label : r.offer}</td><td className="p-3">{brl(r.originalCents)}</td><td className="p-3">−{brl(r.discountCents)}</td><td className="p-3">{brl(r.finalCents)}</td>
                  <td className="p-3">{r.code}<div className="t-tiny text-tinta-fraca">{r.source === "link" ? "link de indicação" : "cupom digitado"}</div></td>
                  <td className="p-3"><Pill kind={r.status}>{ROT[r.status] ?? r.status}</Pill>{r.refundedAt ? <div className="font-normal t-tiny text-tinta-fraca">estorno em {fmt(r.refundedAt)}</div> : null}</td>
                  <td className="p-3 t-tiny">{r.mpPaymentId ?? "—"}</td>
                  <td className="p-3">
                    {COM[r.commissionStatus] ?? r.commissionStatus}{r.commissionCents > 0 ? ` · ${brl(r.commissionCents)}` : ""}
                    {r.status === "aprovado" && (r.commissionStatus === "calculada" || r.commissionStatus === "aprovada") ? (
                      <form action={commissionStepAction} className="mt-1"><input type="hidden" name="partnerId" value={p.id} /><input type="hidden" name="redemptionId" value={r.id} /><input type="hidden" name="to" value={r.commissionStatus === "calculada" ? "aprovada" : "paga"} /><button className="rounded-md border border-linha px-2 py-1 t-tiny font-semibold hover:bg-nevoa">{r.commissionStatus === "calculada" ? "Aprovar" : "Marcar paga"}</button></form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
