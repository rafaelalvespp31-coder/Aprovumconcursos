import Link from "next/link";
import { requireAdmin } from "@/server/services/catalog";
import { resumoVisitas } from "@/server/services/visitas";
import { listStudents, studentSummary } from "@/server/services/students";

export const metadata = { title: "Painel do admin" };
export const dynamic = "force-dynamic";

/** Página principal do painel: visão geral com o total de alunos cadastrados na plataforma. */
export default async function AdminHome() {
  await requireAdmin();
  const students = await listStudents().catch(() => []);
  const c = studentSummary(students);
  const v = await resumoVisitas();
  return (
    <div>
      <h1 className="t-h1">Painel do admin</h1>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <section className="rounded-xl border border-[#E10600]/40 bg-superficie p-5" data-testid="admin-total-alunos">
        <p className="t-tiny font-semibold uppercase tracking-wide text-tinta-fraca">Alunos cadastrados na plataforma</p>
        <p className="mt-1 text-5xl font-extrabold tabular-nums">{c.total}</p>
        <p className="mt-1 t-small text-tinta-suave">Total de contas de alunos criadas.</p>
        <Link href="/admin/alunos" className="mt-4 inline-block t-small font-semibold text-destaque underline-offset-2 hover:underline">Ver todos os alunos →</Link>
      </section>
      <section className="rounded-xl border border-white/20 bg-superficie p-5" data-testid="admin-visitantes">
        <p className="t-tiny font-semibold uppercase tracking-wide text-tinta-fraca">Visitantes no site</p>
        <p className="mt-1 text-5xl font-extrabold tabular-nums" data-testid="admin-visitantes-hoje">{v.hoje}</p>
        <p className="mt-1 t-small text-tinta-suave">Entraram hoje. Últimos 7 dias: <b className="tabular-nums text-tinta">{v.seteDias}</b> · Total: <b className="tabular-nums text-tinta">{v.total}</b></p>
        <p className="mt-3 t-tiny text-tinta-fraca">Conta cada pessoa uma vez por dia, sem robôs{v.desde ? ` (desde ${v.desde.split("-").reverse().join("/")})` : ""}.</p>
      </section>
      </div>
      <p className="mt-4 t-small"><Link href="/admin/catalogo" className="font-semibold text-destaque underline-offset-2 hover:underline">Ir para o Catálogo →</Link></p>
    </div>
  );
}
