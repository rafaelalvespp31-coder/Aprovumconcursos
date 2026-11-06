import { listCatalogGaps } from "@/server/services/edital-view";

export const metadata = { title: "Editais · lacunas do catálogo" };
export const dynamic = "force-dynamic";

export default async function AdminEditais() {
  const { gaps, preparations } = await listCatalogGaps(150).catch(() => ({ gaps: [], preparations: 0 }));
  return (
    <div>
      <h1 className="t-h2 font-bold">Assuntos de editais sem aula</h1>
      <p className="mt-1 t-small text-tinta-suave">{preparations} preparações concluídas. Ordenado pelo que mais aparece nos editais enviados.</p>
      <div className="mt-5 overflow-x-auto rounded-xl border border-linha">
        <table className="w-full min-w-[560px] text-left t-small">
          <thead className="bg-superficie font-semibold"><tr><th className="p-3">Assunto</th><th className="p-3">Disciplina</th><th className="p-3">Editais</th><th className="p-3">Alunos</th></tr></thead>
          <tbody>
            {gaps.length === 0 && <tr><td colSpan={4} className="p-4 text-tinta-suave">Nenhuma lacuna registrada.</td></tr>}
            {gaps.map((g, i) => (
              <tr key={i} className="border-t border-linha"><td className="p-3">{g.title}</td><td className="p-3">{g.discipline}</td><td className="p-3 font-semibold">{g.editais}</td><td className="p-3">{g.alunos}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
