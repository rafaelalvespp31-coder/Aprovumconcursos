import Link from "next/link";
import { listExams, STATUS_LABEL } from "@/server/services/strategic";

export const metadata = { title: "Catálogo estratégico de concursos" };
export const dynamic = "force-dynamic";

export default async function EstrategicoPage() {
  const exams = await listExams().catch(() => []);
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="t-h2 font-bold">Catálogo estratégico de concursos</h1>
          <p className="mt-1 t-small text-tinta-suave">Alimenta o RAIO-X do edital. O aluno só vê o que estiver <b>Publicado</b>.</p>
        </div>
        <Link href="/admin/estrategico/importar" className="rounded-full bg-destaque px-4 py-2 t-small font-semibold text-white">Importar análise estratégica</Link>
      </div>
      <div className="mt-5 overflow-x-auto rounded-xl border border-linha">
        <table className="w-full min-w-[560px] text-left t-small">
          <thead className="bg-superficie font-semibold"><tr><th className="p-3">Concurso</th><th className="p-3">Provas</th><th className="p-3">Estado</th><th className="p-3">Atualizado</th></tr></thead>
          <tbody>
            {exams.length === 0 && <tr><td colSpan={4} className="p-4 text-tinta-suave">Nada cadastrado ainda. Use “Importar análise estratégica”.</td></tr>}
            {exams.map((e) => (
              <tr key={e.id} className="border-t border-linha">
                <td className="p-3"><Link className="font-semibold text-destaque hover:underline" href={`/admin/estrategico/${e.id}`}>{e.name}</Link>{e.organ && <div className="t-tiny text-tinta-suave">{e.organ}</div>}</td>
                <td className="p-3">{e.years.join(", ") || "—"}</td>
                <td className="p-3"><span className="rounded-full bg-superficie px-2 py-0.5 t-tiny font-semibold">{STATUS_LABEL[e.status]}</span></td>
                <td className="p-3">{new Date(e.updatedAt).toLocaleDateString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
