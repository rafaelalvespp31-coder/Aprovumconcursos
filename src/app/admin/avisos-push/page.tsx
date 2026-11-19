import { requireAdmin } from "@/server/services/catalog";
import { countPushDevices, listPushDevices } from "@/server/services/push";
import { AvisoForm } from "./form";

export const metadata = { title: "Avisos no celular" };
export const dynamic = "force-dynamic";

/** Envia uma notificação para o celular dos alunos que ativaram os avisos (chega mesmo com o app fechado). */
export default async function AvisosPushPage() {
  await requireAdmin();
  const [c, devices] = await Promise.all([countPushDevices().catch(() => null), listPushDevices().catch(() => [])]);
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "ainda não recebeu");
  return (
    <div data-testid="admin-avisos-push">
      <h1 className="t-h1">AVISOS NO CELULAR</h1>
      <p className="mt-2 max-w-2xl t-small text-tinta-suave">
        Chega mesmo com o app fechado, para quem ativou em Perfil → Avisos no celular. {c ? <>Hoje: <strong>{c.users}</strong> aluno(s), <strong>{c.devices}</strong> aparelho(s).</> : null}
        {" "}Lembretes de revisão saem sozinhos todo dia às 8h, e você recebe um aviso a cada novo plano pago.
      </p>
      <AvisoForm />
      <section className="mt-8 max-w-3xl" aria-labelledby="aparelhos">
        <h2 id="aparelhos" className="t-h2">Quem vai receber</h2>
        <p className="mt-1 t-small text-tinta-suave">Cada linha é um aparelho com o aviso ativo. O aviso vai para todos eles (ou só para o público escolhido).</p>
        {devices.length === 0 ? (
          <p className="mt-3 t-small text-tinta-suave">Nenhum aparelho com aviso ativo ainda.</p>
        ) : (
          <div className="mt-3 overflow-x-auto rounded-[14px] border border-linha">
            <table className="w-full min-w-[520px] text-left text-[14px]">
              <thead className="bg-nevoa text-[12px] uppercase tracking-wide text-tinta-suave">
                <tr><th className="px-3 py-2">Aluno</th><th className="px-3 py-2">Aparelho</th><th className="px-3 py-2">Ativou em</th><th className="px-3 py-2">Último aviso recebido</th></tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.id} className="border-t border-linha">
                    <td className="px-3 py-2 font-semibold">{d.student}</td>
                    <td className="px-3 py-2">{d.device}</td>
                    <td className="px-3 py-2">{fmt(d.since)}</td>
                    <td className="px-3 py-2">{fmt(d.lastSentAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
