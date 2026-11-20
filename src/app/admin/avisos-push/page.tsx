import { requireAdmin } from "@/server/services/catalog";
import { countPushDevices, listPushDevices } from "@/server/services/push";
import { AvisoForm } from "./form";
import { agendaConfig, agendaDeHoje } from "@/server/services/avisos-agenda";
import { AVISO_ROTULO, MOTIVACAO, NOVIDADES } from "@/domain/avisos-agenda";
import { salvarAgendaAction } from "./agenda-actions";

export const metadata = { title: "Avisos no celular" };
export const dynamic = "force-dynamic";

/** Envia uma notificação para o celular dos alunos que ativaram os avisos (chega mesmo com o app fechado). */
export default async function AvisosPushPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  await requireAdmin();
  const sp = await searchParams;
  const [c, devices, cfg, agenda] = await Promise.all([countPushDevices().catch(() => null), listPushDevices().catch(() => []), agendaConfig().catch(() => null), agendaDeHoje(false).catch(() => [])]);
  const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "ainda não recebeu");
  return (
    <div data-testid="admin-avisos-push">
      <h1 className="t-h1">AVISOS NO CELULAR</h1>
      <p className="mt-2 max-w-2xl t-small text-tinta-suave">
        Chega mesmo com o app fechado, para quem ativou em Perfil → Avisos no celular. {c ? <>Hoje: <strong>{c.users}</strong> aluno(s), <strong>{c.devices}</strong> aparelho(s).</> : null}
        {" "}Os avisos automáticos abaixo saem sozinhos, sem você digitar nada.
      </p>
      {sp.erro ? <p role="alert" className="mt-3 max-w-3xl rounded-md border border-red-300 bg-red-50 p-3 t-small text-red-800">{sp.erro}</p> : sp.ok ? <p role="status" className="mt-3 max-w-3xl rounded-md border border-green-300 bg-green-50 p-3 t-small text-green-800">{sp.ok}</p> : null}
      <section className="mt-6 max-w-3xl rounded-xl border border-linha bg-superficie p-4" aria-labelledby="auto">
        <h2 id="auto" className="t-h2">Avisos automáticos</h2>
        <p className="mt-1 t-small text-tinta-suave">
          Dentro da janela de horário, sai um aviso a cada intervalo, alternando uma frase motivacional ({MOTIVACAO.length} frases) com um aviso do APROVUM: concursos abertos e previstos, revisões, planos (só contas gratuitas), recado do Mentor e dicas do app ({NOVIDADES.length}). A ordem e as frases são sorteadas todo dia, sem repetir no dia.
        </p>
        {cfg ? (
          <form action={salvarAgendaAction} className="mt-3 flex flex-wrap items-end gap-3">
            <label className="flex items-center gap-2 t-small font-semibold"><input type="checkbox" name="ativo" defaultChecked={cfg.ativo} />Ligado</label>
            <label className="t-small">Um aviso a cada
              <select name="intervalo" defaultValue={cfg.intervalo} className="mt-1 block rounded-md border border-linha bg-nevoa px-3 py-2 t-small">{[1, 2, 3, 4, 6].map((n) => <option key={n} value={n}>{n === 1 ? "1 hora" : `${n} horas`}</option>)}</select>
            </label>
            <label className="t-small">Das<input name="horaIni" type="number" min={0} max={23} defaultValue={cfg.horaIni} className="mt-1 block w-20 rounded-md border border-linha bg-nevoa px-3 py-2 t-small" /></label>
            <label className="t-small">Até<input name="horaFim" type="number" min={1} max={23} defaultValue={cfg.horaFim} className="mt-1 block w-20 rounded-md border border-linha bg-nevoa px-3 py-2 t-small" /></label>
            <button className="rounded-md bg-tinta px-4 py-2 t-small font-semibold text-white hover:bg-tinta-suave">Salvar</button>
          </form>
        ) : <p className="mt-2 t-small text-tinta-suave">Configuração indisponível agora.</p>}
        <h3 className="mt-4 t-small font-bold">Agenda de hoje (horário de Brasília)</h3>
        {agenda.length === 0 ? (
          <p className="mt-1 t-small text-tinta-suave">A agenda de hoje é montada no primeiro disparo do dia, dentro da janela de horário.</p>
        ) : (
          <ul className="mt-2 grid gap-1.5">
            {agenda.map((a) => (
              <li key={a.slot} className="flex flex-wrap items-center gap-2 rounded-lg border border-linha px-3 py-2 t-small">
                <b className="tabular-nums">{String(a.hour).padStart(2, "0")}h</b>
                <span>{AVISO_ROTULO[a.kind]}</span>
                <span className="ml-auto t-tiny font-semibold text-tinta-fraca">{a.doneAt ? `${a.result ?? "enviado"}${a.sent != null ? ` · ${a.sent} aparelho(s)` : ""}` : "aguardando"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
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
