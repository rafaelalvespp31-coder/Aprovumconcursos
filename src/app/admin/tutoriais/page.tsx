import { requireAdmin } from "@/server/services/catalog";
import { getEstatisticasTutoriais } from "@/server/services/tutorial";
import { tutorialPorId } from "@/domain/tutorial/roteiros";
import { AlternarTutorial } from "./controles";
import { definirTutorialAtivoAction } from "./actions";

export const metadata = { title: "Tutoriais — Operação APROVUM" };
export const dynamic = "force-dynamic";

/** Acompanhamento do tour guiado: números agregados, sem dados pessoais dos alunos. */
export default async function TutoriaisPage() {
  await requireAdmin();
  const lista = await getEstatisticasTutoriais();
  return (
    <div data-testid="admin-tutoriais">
      <h1 className="t-h1">TUTORIAIS — OPERAÇÃO APROVUM</h1>
      <p className="mt-2 max-w-2xl t-small">Quantos alunos começaram, concluíram ou pularam cada tutorial e em que passo mais param. Desativar um tutorial o esconde dos alunos na hora.</p>
      <div className="mt-5 overflow-x-auto rounded-lg border border-linha bg-superficie">
        <table className="w-full min-w-[720px] text-left t-small">
          <thead><tr className="border-b border-linha">
            <th className="p-3">Tutorial</th><th className="p-3">Iniciaram</th><th className="p-3">Concluíram</th><th className="p-3">Pularam</th><th className="p-3">Conclusão</th><th className="p-3">Onde mais abandonam</th><th className="p-3">Situação</th>
          </tr></thead>
          <tbody>
            {lista.map((t) => {
              const passo = t.abandonoMaior ? tutorialPorId(t.id)?.passos[t.abandonoMaior.passo - 1]?.titulo : null;
              return (
                <tr key={t.id} className="border-b border-linha last:border-0">
                  <td className="p-3 font-semibold">{t.titulo}</td>
                  <td className="p-3 tabular-nums">{t.iniciaram}</td>
                  <td className="p-3 tabular-nums">{t.concluiram}</td>
                  <td className="p-3 tabular-nums">{t.pularam}</td>
                  <td className="p-3 tabular-nums">{t.taxa}%</td>
                  <td className="p-3">{t.abandonoMaior ? `Passo ${t.abandonoMaior.passo}${passo ? ` · ${passo}` : ""} (${t.abandonoMaior.alunos})` : "—"}</td>
                  <td className="p-3"><AlternarTutorial id={t.id} ativo={t.ativo} acao={definirTutorialAtivoAction} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
