import { requireAdmin } from "@/server/services/catalog";
import { getCampaignInfo, getCampaignStats, searchCampaignUsers } from "@/server/services/promo";
import { CampanhaControles } from "./controles";
import { concederManualAction, estenderAction, setCampanhaAtivaAction } from "./actions";

export const metadata = { title: "Campanha — O Caveira ficou maluco" };
export const dynamic = "force-dynamic";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" }) : "—");

/** Gestão da degustação premium global. Só administradores (requireAdmin + service_role no servidor). */
export default async function CampanhaPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireAdmin();
  const { q = "" } = await searchParams;
  const [info, stats, found] = await Promise.all([getCampaignInfo(), getCampaignStats(), searchCampaignUsers(q)]);
  if (!info) return <p className="t-small">Campanha não encontrada. Aplique a migração da campanha.</p>;
  return (
    <div>
      <h1 className="t-h1">CAMPANHA — O CAVEIRA FICOU MALUCO</h1>
      <section className="mt-4 rounded-lg border border-linha bg-superficie p-4" data-testid="campanha-controle">
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4 t-small">
          <div><dt className="t-tiny font-semibold uppercase text-tinta-fraca">Status</dt><dd className="font-bold">{info.active ? "ATIVA" : "DESATIVADA"}</dd></div>
          <div><dt className="t-tiny font-semibold uppercase text-tinta-fraca">Duração</dt><dd className="font-bold">{info.durationDays} dias · plano {info.planId}</dd></div>
          <div><dt className="t-tiny font-semibold uppercase text-tinta-fraca">Início</dt><dd className="font-bold">{fmt(info.activatedAt)}</dd></div>
          <div><dt className="t-tiny font-semibold uppercase text-tinta-fraca">Desativada em</dt><dd className="font-bold">{fmt(info.deactivatedAt)}</dd></div>
        </dl>
        <p className="mt-3 t-tiny text-tinta-suave">
          Ativar concede {info.durationDays} dias a todas as contas existentes (menos administradores) e a quem entrar ou se cadastrar enquanto estiver ativa. Desativar só impede novas concessões: prazos já concedidos não são apagados nem encurtados.
        </p>
        <CampanhaControles active={info.active} setActive={setCampanhaAtivaAction} />
      </section>

      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="campanha-indicadores">
        {(
          [
            ["Contemplados", stats.total],
            ["Acesso ativo", stats.ativos],
            ["Acesso expirado", stats.expirados],
            ["Popups vistas", stats.popupVistas],
            ["Popups pendentes", stats.popupPendentes],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="rounded-lg border border-linha bg-superficie p-3">
            <dt className="t-tiny font-semibold uppercase tracking-wide text-tinta-fraca">{label}</dt>
            <dd className="mt-1 text-2xl font-extrabold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-6" data-testid="campanha-busca">
        <h2 className="t-h3">Consulta individual</h2>
        <form className="mt-2 flex gap-2" action="/admin/campanha-caveira" method="get">
          <input name="q" defaultValue={q} placeholder="Nome ou e-mail (mín. 3 letras)" className="min-h-10 w-full max-w-sm rounded-md border border-linha bg-superficie px-3 t-small" />
          <button className="min-h-10 rounded-md bg-tinta px-4 t-small font-semibold text-white">Buscar</button>
        </form>
        {q && q.trim().length < 3 && <p className="mt-2 t-tiny text-tinta-suave">Digite ao menos 3 letras.</p>}
        {found.rows.length > 0 && (
          <div className="mt-3 overflow-x-auto rounded-lg border border-linha">
            <table className="w-full min-w-[760px] t-small">
              <thead className="bg-superficie-2 text-left t-tiny uppercase text-tinta-fraca">
                <tr>{["Aluno", "Plano original", "Concessão", "Expira", "Status", "Popup", "Ações"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-linha">
                {found.rows.map((r) => (
                  <tr key={r.grantId}>
                    <td className="px-3 py-2"><strong>{r.name ?? "—"}</strong><br /><span className="text-tinta-fraca">{r.email}</span></td>
                    <td className="px-3 py-2">{r.originalPlan}</td>
                    <td className="px-3 py-2">{fmt(r.startsAt)}<br /><span className="t-tiny text-tinta-fraca">{r.source}</span></td>
                    <td className="px-3 py-2">{fmt(r.expiresAt)}</td>
                    <td className="px-3 py-2 font-semibold">{r.status}</td>
                    <td className="px-3 py-2">{r.popupSeenAt ? `vista ${fmt(r.popupSeenAt)}` : "pendente"}</td>
                    <td className="px-3 py-2"><CampanhaControles grantId={r.grantId} extend={estenderAction} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {found.withoutGrant.length > 0 && (
          <ul className="mt-3 divide-y divide-linha rounded-lg border border-linha bg-superficie">
            {found.withoutGrant.map((u) => (
              <li key={u.userId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 t-small">
                <span><strong>{u.name ?? "—"}</strong> <span className="text-tinta-fraca">· {u.email} · sem concessão</span></span>
                <CampanhaControles userId={u.userId} grant={concederManualAction} />
              </li>
            ))}
          </ul>
        )}
        {q.trim().length >= 3 && !found.rows.length && !found.withoutGrant.length && <p className="mt-3 t-small text-tinta-suave">Nenhum aluno encontrado.</p>}
      </section>
    </div>
  );
}
