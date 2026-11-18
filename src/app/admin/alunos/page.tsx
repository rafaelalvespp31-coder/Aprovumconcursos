import { requireAdmin } from "@/server/services/catalog";
import { listStudents, studentSummary } from "@/server/services/students";
import { FREE_LIMITS } from "@/domain/plans/limits";
import { markPaidAction, resetPasswordAction, resolvePlanRequestAction, setGhostAction, setPlanAction } from "./actions";
import { StudentsTable } from "./students-table";
import { listOpenPlanRequests } from "@/server/services/plan-requests";
import { OFFERS } from "@/domain/plans/offers";
import { RequestsDone } from "./requests-done";
import { AlunosNotificacoes } from "./notificacoes";
import { listStudentActivity } from "@/server/services/student-activity";

export const metadata = { title: "Alunos" };

/** Alunos cadastrados, com plano, vencimento e pagamentos (só administradores). */
export default async function StudentsPage() {
  await requireAdmin();
  const students = await listStudents();
  const count = studentSummary(students);
  const requests = await listOpenPlanRequests().catch(() => []);
  const atividade = await listStudentActivity().catch(() => []);
  return (
    <div>
      <h1 className="t-h1">Alunos</h1>
      <p className="mt-1 max-w-3xl t-small text-tinta-suave">
        Toda conta nova começa no plano <strong>Gratuito</strong> ({FREE_LIMITS.lessonsPerDay} aula, {FREE_LIMITS.questionsPerDay} questões e {FREE_LIMITS.gameQuestionsPerDay} questões do Modo Jogo
        por dia). Planos pagos (Pro e Premium) são ilimitados até o vencimento; vencido, o aluno volta aos limites do gratuito.
      </p>
      <AlunosNotificacoes initial={atividade} />
      <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5" data-testid="alunos-resumo">
        {(
          [
            ["Cadastrados", count.total],
            ["Pagos ativos", count.pagos],
            ["Gratuitos", count.gratuitos],
            ["Vencendo em 7 dias", count.vencendo],
            ["Expirados", count.expirados],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="rounded-lg border border-linha bg-superficie p-3">
            <dt className="t-tiny font-semibold uppercase tracking-wide text-tinta-fraca">{label}</dt>
            <dd className="mt-1 text-2xl font-extrabold tabular-nums">{n}</dd>
          </div>
        ))}
      </dl>
      {requests.length > 0 && (
        <section className="mt-4 rounded-lg border border-[#E10600]/40 bg-superficie p-3" data-testid="pedidos-plano">
          <h2 className="t-small font-bold">Pedidos de plano ({requests.length})</h2>
          <p className="t-tiny text-tinta-suave">Alunos que escolheram um plano em &ldquo;Meu Plano&rdquo;. Confirme o pagamento, registre-o abaixo na tabela e marque o pedido como atendido.</p>
          <ul className="mt-2 divide-y divide-linha">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2 t-small">
                <span><strong>{r.name ?? r.email ?? "Aluno"}</strong> {r.name && r.email ? <span className="text-tinta-fraca">· {r.email}</span> : null} — {OFFERS[r.plan].label} ({OFFERS[r.plan].price}) · {new Date(r.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}</span>
                <RequestsDone id={r.id} action={resolvePlanRequestAction} />
              </li>
            ))}
          </ul>
        </section>
      )}
      <StudentsTable students={students} actions={{ setPlan: setPlanAction, markPaid: markPaidAction, resetPassword: resetPasswordAction, setGhost: setGhostAction }} />
    </div>
  );
}
