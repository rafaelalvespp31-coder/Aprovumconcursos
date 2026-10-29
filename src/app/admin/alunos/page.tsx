import { requireAdmin } from "@/server/services/catalog";
import { listStudents, studentSummary } from "@/server/services/students";
import { FREE_LIMITS } from "@/domain/plans/limits";
import { markPaidAction, resetPasswordAction, setPlanAction } from "./actions";
import { StudentsTable } from "./students-table";

export const metadata = { title: "Alunos" };

/** Alunos cadastrados, com plano, vencimento e pagamentos (só administradores). */
export default async function StudentsPage() {
  await requireAdmin();
  const students = await listStudents();
  const count = studentSummary(students);
  return (
    <div>
      <h1 className="t-h1">Alunos</h1>
      <p className="mt-1 max-w-3xl t-small text-tinta-suave">
        Toda conta nova começa no plano <strong>Gratuito</strong> ({FREE_LIMITS.lessonsPerDay} aula, {FREE_LIMITS.questionsPerDay} questões e {FREE_LIMITS.gameQuestionsPerDay} questões do Modo Jogo
        por dia). Planos pagos (Pro e Premium) são ilimitados até o vencimento; vencido, o aluno volta aos limites do gratuito.
      </p>
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
      <StudentsTable students={students} actions={{ setPlan: setPlanAction, markPaid: markPaidAction, resetPassword: resetPasswordAction }} />
    </div>
  );
}
