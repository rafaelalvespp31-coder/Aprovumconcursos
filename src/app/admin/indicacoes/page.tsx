import { requireAdmin } from "@/server/services/catalog";
import { listRewards } from "@/server/services/referral";
import { RewardButtons } from "./buttons";

export const metadata = { title: "Indicações" };
export const dynamic = "force-dynamic";

const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
const STATUS = { pendente: "A enviar", enviado: "Enviado", cancelado: "Cancelado" } as const;

/** Prêmios do programa de indicação (copo + camisa): quem ganhou, contato e controle de envio. */
export default async function IndicacoesPage() {
  await requireAdmin();
  const rewards = await listRewards().catch(() => []);
  const pend = rewards.filter((r) => r.status === "pendente").length;
  return (
    <div data-testid="admin-indicacoes">
      <h1 className="t-h1">INDICAÇÕES — COPO + CAMISA</h1>
      <p className="mt-2 max-w-2xl t-small text-tinta-suave">
        Quando um aluno indicado assina o plano anual ou vitalício, o indicador e o indicado entram aqui. Combine a entrega pelo WhatsApp e marque como enviado.
        {pend > 0 ? ` ${pend} para enviar.` : ""}
      </p>
      {rewards.length === 0 ? (
        <p className="mt-4 rounded-lg border border-linha bg-superficie p-4 t-small">Nenhum prêmio ainda.</p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-lg border border-linha bg-superficie">
          <table className="w-full min-w-[720px] text-left t-small">
            <thead className="border-b border-linha t-tiny uppercase text-tinta-fraca">
              <tr><th className="p-3">Aluno</th><th className="p-3">Motivo</th><th className="p-3">Contato</th><th className="p-3">Data</th><th className="p-3">Status</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {rewards.map((r) => (
                <tr key={r.id} className="border-b border-linha last:border-0 align-top">
                  <td className="p-3 font-semibold">{r.studentName ?? "—"}<div className="font-normal t-tiny text-tinta-fraca">{r.studentEmail ?? ""}</div></td>
                  <td className="p-3">{r.role === "indicador" ? "Indicou" : "Foi indicado por"} {r.otherName ?? "—"}<div className="t-tiny text-tinta-fraca">{r.item}</div></td>
                  <td className="p-3">{r.whatsapp ?? "—"}</td>
                  <td className="p-3">{fmt(r.createdAt)}</td>
                  <td className="p-3 font-bold">{STATUS[r.status]}</td>
                  <td className="p-3"><RewardButtons id={r.id} status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
