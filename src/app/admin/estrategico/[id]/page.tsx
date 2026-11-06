import Link from "next/link";
import { notFound } from "next/navigation";
import { loadExam, nextStatuses, STATUS_LABEL, type ExamStatus } from "@/server/services/strategic";
import { denominator } from "@/domain/strategic/analysis";
import { deleteExamAction, setStatusAction } from "../actions";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const metadata = { title: "Concurso estratégico" };

const KIND: Record<string, string> = { minima_aprovacao: "Nota mínima para aprovação", corte_primeira_fase: "Corte da 1ª fase", ultimo_classificado: "Último classificado", ultimo_convocado: "Último convocado", ultimo_dentro_vagas: "Último dentro das vagas" };

export default async function ExamAdminPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const exam = await loadExam(id, { onlyPublished: false });
  if (!exam) notFound();
  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/estrategico" className="t-small text-tinta-suave hover:underline">← Catálogo estratégico</Link>
        <h1 className="mt-2 t-h2 font-bold">{exam.name}</h1>
        <p className="t-small text-tinta-suave">{exam.organ ?? "—"} · Estado: <b className={exam.status === "publicado" ? "text-[#1d7a46]" : undefined}>{STATUS_LABEL[exam.status]}{exam.status === "publicado" ? " ✓ visível para os alunos no Raio-X" : ""}</b>{exam.positions.length ? ` · Cargos: ${exam.positions.join(", ")}` : ""}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {nextStatuses(exam.status).map((to: ExamStatus) => (
            <form key={to} action={async () => { "use server"; await setStatusAction(id, to); }}>
              <button className={`rounded-full px-4 py-2 t-small font-semibold ${to === "publicado" ? "bg-destaque text-white" : "border border-linha"}`}>{to === "publicado" ? "Publicar análise" : `Mover para ${STATUS_LABEL[to]}`}</button>
            </form>
          ))}
          <form action={async () => { "use server"; await deleteExamAction(id); redirect("/admin/estrategico"); }}>
            <button className="rounded-full border border-[#C81018] px-4 py-2 t-small font-semibold text-[#C81018]">Excluir</button>
          </form>
        </div>
        {exam.limitations && <p className="mt-3 rounded-lg bg-superficie p-3 t-small"><b>Limitações da análise:</b> {exam.limitations}</p>}
      </div>

      <section><h2 className="font-semibold">Provas</h2>
        <div className="mt-2 grid gap-3">
          {exam.editions.map((e) => (
            <div key={e.id} className="rounded-xl border border-linha p-3 t-small">
              <b>{e.year}{e.board ? ` · ${e.board}` : ""}</b> — total {denominator(e)} questões {e.totalQuestions ? "" : "(soma das disciplinas)"}{e.countingRule ? ` · ${e.countingRule}` : ""}
              <ul className="mt-2 grid gap-1">
                {e.subjects.map((s) => <li key={s.name}>{s.name}: {s.questions} questões{s.annulled ? ` (${s.annulled} anuladas)` : ""} · {s.topics.length} assuntos</li>)}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section><h2 className="font-semibold">Notas de corte</h2>
        <div className="mt-2 overflow-x-auto rounded-xl border border-linha">
          <table className="w-full min-w-[640px] text-left t-small">
            <thead className="bg-superficie font-semibold"><tr><th className="p-2">Ano</th><th className="p-2">Cargo / modalidade</th><th className="p-2">Tipo</th><th className="p-2">Nota</th><th className="p-2">Fonte</th></tr></thead>
            <tbody>
              {exam.cutoffs.length === 0 && <tr><td colSpan={5} className="p-3 text-tinta-suave">Nota de corte ainda não catalogada.</td></tr>}
              {exam.cutoffs.map((c) => (
                <tr key={c.id} className="border-t border-linha"><td className="p-2">{c.editionYear}</td><td className="p-2">{c.position ?? "—"} · {c.modality}</td><td className="p-2">{KIND[c.kind] ?? c.kind}</td><td className="p-2 font-semibold">{c.score}{c.maxScore ? ` / ${c.maxScore}` : ""}</td><td className="p-2">{c.source?.name ?? "—"}{c.sourcePage ? ` (p. ${c.sourcePage})` : ""}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section><h2 className="font-semibold">Recomendações ({exam.recommendations.length})</h2>
        <ul className="mt-2 grid gap-1 t-small">{exam.recommendations.map((r, i) => <li key={i}><b>{r.priority}</b> · {r.subject ? `${r.subject} — ` : ""}{r.topic}: {r.justification}</li>)}</ul>
      </section>
    </div>
  );
}
