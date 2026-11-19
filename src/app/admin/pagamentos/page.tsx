import Link from "next/link";
import { requireAdmin } from "@/server/services/catalog";
import { listAdminPayments, type AdminPagamento, type PagamentoSituacao } from "@/server/services/admin-payments";

export const metadata = { title: "Pagamentos" };
export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const brl = (c: number) => `R$ ${(c / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

const ROTULO: Record<PagamentoSituacao, string> = {
  pago: "Pago", pix_aguardando: "PIX gerado (aguardando)", pix_expirado: "PIX expirado", recusado: "Recusado",
  reembolsado: "Reembolsado", cancelado: "Cancelado", pendente: "Em análise",
};
const COR: Record<PagamentoSituacao, string> = {
  pago: "text-green-700", pix_aguardando: "text-amber-700", pix_expirado: "text-tinta-fraca", recusado: "text-red-700",
  reembolsado: "text-tinta-fraca", cancelado: "text-tinta-fraca", pendente: "text-amber-700",
};
const FILTROS: { key: string; label: string; ok: (p: AdminPagamento) => boolean }[] = [
  { key: "todos", label: "Todos", ok: () => true },
  { key: "pagos", label: "Pagos", ok: (p) => p.situacao === "pago" },
  { key: "pix", label: "PIX não pago", ok: (p) => p.situacao === "pix_aguardando" || p.situacao === "pix_expirado" },
  { key: "recusados", label: "Recusados", ok: (p) => p.situacao === "recusado" },
];

/** Quem pagou, quem gerou PIX e não pagou e quem teve o cartão recusado (com o motivo). */
export default async function PagamentosPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  await requireAdmin();
  const { f } = await searchParams;
  const filtro = FILTROS.find((x) => x.key === f) ?? FILTROS[0]!;
  const todos = await listAdminPayments().catch(() => null);
  if (!todos) return <p className="rounded-lg border border-linha bg-superficie p-4 t-small">Não foi possível carregar os pagamentos agora.</p>;
  const lista = todos.filter(filtro.ok);
  const total = todos.filter((p) => p.situacao === "pago").reduce((s, p) => s + p.valorCents, 0);
  return (
    <div data-testid="admin-pagamentos">
      <h1 className="t-h1">PAGAMENTOS</h1>
      <p className="mt-2 max-w-2xl t-small text-tinta-suave">
        Cada tentativa de compra: pagas, PIX gerados e cartões recusados, com o motivo. Total pago nas últimas {todos.length} tentativas: <strong>{brl(total)}</strong>.
      </p>
      <nav aria-label="Filtro" className="mt-4 flex flex-wrap gap-2">
        {FILTROS.map((x) => (
          <Link key={x.key} href={x.key === "todos" ? "/admin/pagamentos" : `/admin/pagamentos?f=${x.key}`} aria-current={x.key === filtro.key ? "page" : undefined}
            className={`rounded-full border px-3 py-1 t-small font-semibold ${x.key === filtro.key ? "border-destaque bg-destaque text-white" : "border-linha bg-superficie"}`}>
            {x.label} ({todos.filter(x.ok).length})
          </Link>
        ))}
      </nav>
      {lista.length === 0 ? (
        <p className="mt-4 rounded-lg border border-linha bg-superficie p-4 t-small">Nenhum pagamento aqui ainda.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-linha bg-superficie">
          <table className="w-full min-w-[860px] text-left t-small">
            <thead className="border-b border-linha t-tiny uppercase text-tinta-fraca">
              <tr><th className="p-3">Aluno</th><th className="p-3">Plano</th><th className="p-3">Forma</th><th className="p-3">Situação</th><th className="p-3">Motivo</th><th className="p-3">Data</th></tr>
            </thead>
            <tbody>
              {lista.map((p) => (
                <tr key={p.id} className="border-b border-linha last:border-0 align-top">
                  <td className="p-3 font-semibold">{p.nome ?? "—"}<div className="font-normal t-tiny text-tinta-fraca">{p.email ?? ""}{p.whatsapp ? ` · ${p.whatsapp}` : ""}</div></td>
                  <td className="p-3">{p.plano}<div className="t-tiny text-tinta-fraca">{brl(p.valorCents)}</div></td>
                  <td className="p-3">{p.forma}</td>
                  <td className={`p-3 font-bold ${COR[p.situacao]}`}>{ROTULO[p.situacao]}</td>
                  <td className="p-3">{p.motivo || "—"}</td>
                  <td className="p-3 whitespace-nowrap">{fmt(p.criadoEm)}{p.mpId ? <div className="t-tiny text-tinta-fraca">MP {p.mpId}</div> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
