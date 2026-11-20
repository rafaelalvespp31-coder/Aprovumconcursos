import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/server/services/catalog";
import { resumoVisitas } from "@/server/services/visitas";
import { listStudents, studentSummary } from "@/server/services/students";
import { getAdminPendencias } from "@/server/services/admin-pendencias";
import { NAV_GROUPS, type NavBadges } from "@/components/admin/nav-data";

export const metadata = { title: "Painel do admin" };
export const dynamic = "force-dynamic";

function Ico({ d, className = "size-5" }: { d: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
  );
}

function Stat({ label, value, note, testid }: { label: string; value: string; note: string; testid?: string }) {
  return (
    <div className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 backdrop-blur" data-testid={testid}>
      <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/55">{label}</p>
      <p className="mt-1.5 text-4xl font-extrabold tabular-nums tracking-tight text-white">{value}</p>
      <p className="mt-1 t-tiny text-white/60">{note}</p>
    </div>
  );
}
const StatSkeleton = () => <div className="h-[116px] animate-pulse rounded-2xl border border-white/12 bg-white/[0.06]" />;

// Os números pesados carregam à parte: o resto da página aparece na hora.
async function AlunosStat() {
  const students = await listStudents().catch(() => []);
  const c = studentSummary(students);
  return <Stat label="Alunos cadastrados" value={String(c.total)} note="Contas de alunos criadas" testid="admin-total-alunos" />;
}
async function VisitasStat() {
  const v = await resumoVisitas().catch(() => null);
  if (!v) return <Stat label="Visitantes hoje" value="—" note="Indisponível agora" />;
  return <Stat label="Visitantes hoje" value={String(v.hoje)} note={`7 dias: ${v.seteDias} · total: ${v.total}`} testid="admin-visitantes" />;
}
async function Atencao() {
  const pend = await getAdminPendencias().catch(() => null);
  const open = (pend?.items ?? []).filter((i) => i.count > 0);
  if (open.length === 0) return <p className="rounded-xl border border-linha bg-superficie px-4 py-3 t-small text-tinta-suave">Tudo em dia: nenhum pedido esperando a equipe.</p>;
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Pedidos esperando a equipe">
      {open.map((i) => (
        <li key={i.key}>
          <Link href={i.href} className="flex items-center gap-2 rounded-xl border border-[#E10600]/30 bg-[#E10600]/5 px-3.5 py-2 t-small font-semibold text-destaque transition hover:bg-[#E10600]/10">
            <span className="grid min-w-6 place-items-center rounded-full bg-[#E10600] px-1.5 py-0.5 text-[0.7rem] font-bold text-white">{i.count}</span>{i.label} →
          </Link>
        </li>
      ))}
    </ul>
  );
}
async function Selo({ k }: { k?: keyof NavBadges }) {
  if (!k) return null;
  const pend = await getAdminPendencias().catch(() => null);
  const n = pend?.items.find((i) => i.key === k)?.count ?? 0;
  return n > 0 ? <span className="rounded-full bg-[#E10600] px-2 py-0.5 text-[0.68rem] font-bold text-white">{n} novo{n > 1 ? "s" : ""}</span> : null;
}

const ATALHOS = [
  { href: "/admin/catalogo", label: "Catálogo" },
  { href: "/admin/parceiros", label: "Parceiros" },
  { href: "/admin/pagamentos", label: "Pagamentos" },
];

/** Página inicial do painel da equipe: central de comando com atalhos, números reais, pendências e todas as funções por assunto. */
export default async function AdminHome() {
  await requireAdmin();
  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl bg-tinta p-6 text-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.6)] sm:p-9" aria-label="Boas-vindas">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 size-[26rem] rounded-full bg-[#E10600]/35 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background:repeating-linear-gradient(135deg,#fff_0_1px,transparent_1px_22px)]" />
        <div className="relative grid gap-7 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <p className="text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[#ff5a52]">Painel da equipe</p>
            <h1 className="mt-2 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">Central de comando<br />da APROVUM</h1>
            <p className="mt-3 max-w-md t-small text-white/70">Conteúdo, alunos, vendas e parceiros em um só lugar. Os números abaixo são reais, direto do banco.</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {ATALHOS.map((a, i) => (
                <Link key={a.href} href={a.href} className={`rounded-xl px-4 py-2.5 t-small font-bold transition ${i === 0 ? "bg-[#E10600] text-white hover:bg-[#c80500]" : "border border-white/25 text-white hover:bg-white/10"}`}>{a.label}</Link>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Suspense fallback={<StatSkeleton />}><AlunosStat /></Suspense>
            <Suspense fallback={<StatSkeleton />}><VisitasStat /></Suspense>
          </div>
        </div>
      </section>

      <section className="mt-6" aria-label="Precisa de atenção">
        <h2 className="mb-2.5 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-tinta-fraca">Precisa de atenção</h2>
        <Suspense fallback={<div className="h-12 animate-pulse rounded-xl border border-linha bg-superficie" />}><Atencao /></Suspense>
      </section>

      {NAV_GROUPS.map((g) => (
        <section key={g.id} className="mt-9" aria-labelledby={`g-${g.id}`}>
          <div className="mb-3 flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-xl bg-tinta text-white"><Ico d={g.icon} className="size-[18px]" /></span>
            <h2 id={`g-${g.id}`} className="text-xl font-extrabold tracking-tight">{g.title}</h2>
            <span className="h-px flex-1 bg-linha" aria-hidden />
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="group relative flex h-full items-start gap-3.5 overflow-hidden rounded-2xl border border-linha bg-superficie p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-200 hover:-translate-y-0.5 hover:border-[#E10600]/50 hover:shadow-[0_12px_28px_-14px_rgba(0,0,0,0.35)] motion-reduce:transition-none motion-reduce:hover:translate-y-0">
                  <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] origin-top scale-y-0 bg-[#E10600] transition-transform duration-200 group-hover:scale-y-100" />
                  <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-tinta text-white transition group-hover:bg-[#E10600]"><Ico d={i.icon} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2"><span className="font-bold leading-tight">{i.label}</span><Suspense fallback={null}><Selo k={i.badge} /></Suspense></span>
                    <span className="mt-0.5 block t-small text-tinta-suave">{i.desc}</span>
                  </span>
                  <span aria-hidden className="mt-1 text-tinta-fraca transition group-hover:translate-x-0.5 group-hover:text-[#E10600]">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
