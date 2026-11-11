import Link from "next/link";
import { backfillExamLinks, isAwaiting, listExams, listRaioXRequests, STATUS_LABEL, studentLabel, type ExamListItem, type RaioXRequest } from "@/server/services/strategic";

export const metadata = { title: "Catálogo estratégico de concursos" };
export const dynamic = "force-dynamic";

export default async function EstrategicoPage() {
  await backfillExamLinks().catch(() => 0);
  const all = await listExams().catch(() => [] as ExamListItem[]);
  const pedidos = await listRaioXRequests({ onlyPending: true }).catch(() => [] as RaioXRequest[]);
  const byExam = new Map<string, RaioXRequest[]>();
  for (const r of pedidos) byExam.set(r.examId, [...(byExam.get(r.examId) ?? []), r]);
  const awaiting = all.filter(isAwaiting).sort((a, b) => b.requests - a.requests);
  const exams = all.filter((e) => !isAwaiting(e));
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="t-h2 font-bold">Catálogo estratégico de concursos</h1>
          <p className="mt-1 t-small text-tinta-suave">Alimenta o RAIO-X do edital. O aluno só vê o que estiver <b>Publicado</b>.</p>
        </div>
        <Link href="/admin/estrategico/importar" className="rounded-full bg-destaque px-4 py-2 t-small font-semibold text-white">Importar análise estratégica</Link>
      </div>
      <section className="mt-5 rounded-xl border-2 border-destaque p-4" aria-label="Aguardando análise">
        <h2 className="font-semibold">Aguardando análise ({awaiting.length})</h2>
        <p className="mt-1 t-small text-tinta-suave">Criados automaticamente quando um aluno envia o edital. Toque no concurso, copie o comando (já preenchido com o conteúdo programático), cole a resposta da IA e publique.</p>
        {awaiting.length === 0 ? <p className="mt-3 t-small text-tinta-suave">Nenhum edital esperando análise.</p> : (
          <ul className="mt-3 grid gap-2">
            {awaiting.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-superficie px-3 py-2">
                <Link className="font-semibold text-destaque hover:underline" href={`/admin/estrategico/${e.id}`}>{e.name}</Link>
                <span className="t-tiny text-tinta-suave">{e.requests} {e.requests === 1 ? "aluno" : "alunos"} · {new Date(e.updatedAt).toLocaleDateString("pt-BR")}</span>
                <Link href={`/admin/estrategico/importar?exam=${e.id}`} className="rounded-full bg-destaque px-3 py-1 t-tiny font-semibold text-white">Catalogar Raio-X</Link>
                <ul className="basis-full grid gap-1 border-t border-linha pt-2 t-tiny" aria-label={`Alunos que pediram ${e.name}`}>
                  {(byExam.get(e.id) ?? []).map((r) => (
                    <li key={r.prepId}><b>Pedido de:</b> {studentLabel(r)} · {[r.role, r.board, r.year].filter(Boolean).join(" · ") || "edital enviado"} · {new Date(r.createdAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })}</li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </section>
      <h2 className="mt-6 font-semibold">Concursos catalogados</h2>
      <div className="mt-2 overflow-x-auto rounded-xl border border-linha">
        <table className="w-full min-w-[560px] text-left t-small">
          <thead className="bg-superficie font-semibold"><tr><th className="p-3">Concurso</th><th className="p-3">Provas</th><th className="p-3">Alunos</th><th className="p-3">Estado</th><th className="p-3">Atualizado</th></tr></thead>
          <tbody>
            {exams.length === 0 && <tr><td colSpan={5} className="p-4 text-tinta-suave">Nada cadastrado ainda. Use “Importar análise estratégica”.</td></tr>}
            {exams.map((e) => (
              <tr key={e.id} className="border-t border-linha">
                <td className="p-3"><Link className="font-semibold text-destaque hover:underline" href={`/admin/estrategico/${e.id}`}>{e.name}</Link>{e.organ && <div className="t-tiny text-tinta-suave">{e.organ}</div>}</td>
                <td className="p-3">{e.years.join(", ") || "—"}</td>
                <td className="p-3">{e.requests}</td>
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
