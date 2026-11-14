import Link from "next/link";
import { requireAdmin } from "@/server/services/catalog";
import { listStudents, studentSummary } from "@/server/services/students";

export const metadata = { title: "Painel do admin" };
export const dynamic = "force-dynamic";

/** Página principal do painel: visão geral com o total de alunos cadastrados na plataforma. */
export default async function AdminHome() {
  await requireAdmin();
  const students = await listStudents().catch(() => []);
  const c = studentSummary(students);
  return (
    <div>
      <h1 className="t-h1">Painel do admin</h1>
      <section className="mt-4 rounded-xl border border-[#E10600]/40 bg-superficie p-5" data-testid="admin-total-alunos">
        <p className="t-tiny font-semibold uppercase tracking-wide text-tinta-fraca">Alunos cadastrados na plataforma</p>
        <p className="mt-1 text-5xl font-extrabold tabular-nums">{c.total}</p>
        <p className="mt-1 t-small text-tinta-suave">Total de contas de alunos criadas.</p>
        <Link href="/admin/alunos" className="mt-4 inline-block t-small font-semibold text-destaque underline-offset-2 hover:underline">Ver todos os alunos →</Link>
      </section>
      <p className="mt-4 t-small"><Link href="/admin/catalogo" className="font-semibold text-destaque underline-offset-2 hover:underline">Ir para o Catálogo →</Link></p>
    </div>
  );
}
