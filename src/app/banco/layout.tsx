import Link from "next/link";
import { LogoMark } from "@/components/logo";
import { requireBankStaff } from "@/server/services/bank";
import { BankNav } from "./nav";

export const metadata = { title: "Banco de questões", robots: { index: false, follow: false } };

/** Painel da equipe do banco de questões: só autores, revisores e administradores (os demais recebem 404). */
export default async function BankLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireBankStaff();
  const roleLabel = staff.roles.admin ? "Admin" : [staff.roles.autor && "Autor", staff.roles.revisor && "Revisor"].filter(Boolean).join(" · ");
  return (
    <div className="min-h-dvh bg-[#09090b] text-white [color-scheme:dark]">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_at_top,rgba(225,6,0,0.18),transparent_70%)]" aria-hidden />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#09090b]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link href="/banco" className="flex items-center gap-2.5">
            <LogoMark className="size-8" />
            <span className="leading-none">
              <span className="block font-[Space_Grotesk] text-[15px] font-bold tracking-[0.06em]">
                APRO<span className="text-[#ff1e1e]">V</span>UM
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.2em] text-white/50">Banco de questões</span>
            </span>
          </Link>
          <div className="flex items-center gap-2 text-[12px]">
            <span className="rounded-full border border-[#ff2a2a]/40 bg-[#ff2a2a]/10 px-2 py-0.5 font-semibold text-[#ff9b9b]">{roleLabel}</span>
            <Link href="/painel" className="rounded-md px-2 py-1 text-white/60 hover:text-white">Voltar ao app</Link>
          </div>
        </div>
        <BankNav admin={staff.roles.admin} />
      </header>
      <main className="relative mx-auto max-w-6xl px-4 py-6 sm:py-8">{children}</main>
    </div>
  );
}
