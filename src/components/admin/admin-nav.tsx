"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LogoMark } from "@/components/logo";

import { NAV_GROUPS, type NavBadges } from "./nav-data";
export type { NavBadges };

const GROUPS = [{ title: "Visão geral", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10", items: [{ href: "/admin", label: "Painel", desc: "", icon: "M3 12l9-9 9 9M5 10v10h5v-6h4v6h5V10", badge: undefined as keyof NavBadges | undefined }] }, ...NAV_GROUPS];

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={d} /></svg>
  );
}

/** Menu lateral do painel da equipe: grupos por assunto, página atual destacada, avisos em vermelho. No celular vira uma gaveta. */
export function AdminNav({ badges }: { badges: NavBadges }) {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  // Entre dois links que começam igual (/admin/catalogo e /admin/catalogo/enviar), vale o mais específico.
  const all = GROUPS.flatMap((g) => g.items.map((i) => i.href));
  const active = all.filter((h) => path === h || (h !== "/admin" && path.startsWith(h + "/"))).sort((a, b) => b.length - a.length)[0] ?? "";
  const here = GROUPS.flatMap((g) => g.items).find((i) => i.href === active)?.label ?? "Painel";
  return (
    <>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b border-white/10 bg-tinta px-4 py-3 text-white lg:hidden">
        <span className="flex items-center gap-2"><LogoMark className="size-7" /><span className="t-small font-semibold">{here}</span></span>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls="admin-menu" className="rounded-md border border-white/25 px-3 py-1.5 t-small font-semibold" data-testid="admin-menu-botao">
          {open ? "Fechar" : "Menu"}
        </button>
      </div>
      <aside
        id="admin-menu"
        className={`${open ? "block" : "hidden"} border-b border-white/10 bg-tinta text-white lg:sticky lg:top-0 lg:block lg:h-dvh lg:w-64 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r`}
      >
        <div className="hidden items-center gap-2.5 px-5 pb-4 pt-5 lg:flex">
          <LogoMark className="size-9" />
          <span className="leading-none">
            <span className="block font-[Space_Grotesk] text-[1.05rem] font-bold tracking-[0.04em]">APRO<span className="text-[#F80000]">V</span>UM</span>
            <span className="mt-1 block text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-white/50">Painel da equipe</span>
          </span>
        </div>
        <nav aria-label="Administração" className="px-3 pb-6 pt-2">
          {GROUPS.map((g) => (
            <div key={g.title} className="mt-4 first:mt-0">
              <p className="flex items-center gap-2 px-2 pb-1.5 text-[0.68rem] font-bold uppercase tracking-[0.14em] text-white/45"><Icon d={g.icon} />{g.title}</p>
              <ul className="grid gap-0.5">
                {g.items.map((i) => {
                  const on = i.href === active;
                  const n = i.badge ? badges[i.badge] : 0;
                  return (
                    <li key={i.href}>
                      <Link
                        href={i.href}
                        onClick={() => setOpen(false)}
                        aria-current={on ? "page" : undefined}
                        className={`flex items-center justify-between rounded-lg border-l-2 px-3 py-2 t-small font-medium transition-colors ${on ? "border-[#E10600] bg-white/10 text-white" : "border-transparent text-white/75 hover:bg-white/5 hover:text-white"}`}
                      >
                        <span className="flex items-center gap-2.5"><span className={`grid size-7 shrink-0 place-items-center rounded-md ${on ? "bg-[#E10600] text-white" : "bg-white/8 text-white/70"}`}><Icon d={i.icon} /></span>{i.label}</span>
                        {n > 0 && <span className="rounded-full bg-[#E10600] px-1.5 py-0.5 text-[0.65rem] font-bold leading-none text-white" aria-label={`${n} pendentes`}>{n}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
          <Link href="/painel" onClick={() => setOpen(false)} className="mt-6 flex items-center justify-center rounded-lg border border-white/20 px-3 py-2 t-small font-semibold text-white/85 hover:bg-white/10">← Voltar ao app</Link>
        </nav>
      </aside>
    </>
  );
}
