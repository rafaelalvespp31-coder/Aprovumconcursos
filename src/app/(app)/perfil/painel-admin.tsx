"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Bell, ChevronDown, ShieldCheck } from "lucide-react";

export type AdminItem = { href: string; label: string; badge?: number };
export type AdminNote = { id: string; title: string; detail: string; when: string; href: string };

/** Um único botão "Painel do Admin" que abre todas as opções da equipe. */
export function PainelAdmin({ items, notes = [] }: { items: AdminItem[]; notes?: AdminNote[] }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const out = (e: PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", esc);
    document.addEventListener("pointerdown", out);
    return () => { document.removeEventListener("keydown", esc); document.removeEventListener("pointerdown", out); };
  }, [open]);
  return (
    <div ref={box}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} data-testid="painel-admin-btn"
        className="inline-flex min-h-12 w-full items-center justify-between gap-3 rounded-xl bg-[#E10600] px-4 text-[14px] font-bold text-white active:scale-95 sm:w-auto sm:min-w-[260px]">
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5" aria-hidden /> Painel do Admin
          {notes.length > 0 && <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[12px] font-extrabold text-[#E10600]" data-testid="painel-admin-badge" aria-label={`${notes.length} notificações novas`}>{notes.length}</span>}
        </span>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <div id={id} className="mt-3 grid gap-3">
          {notes.length > 0 && (
            <section aria-label="Notificações" data-testid="painel-admin-notas" className="rounded-xl border border-[#E10600]/40 bg-[#FDECEC] p-3">
              <h3 className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-[#B30000]"><Bell className="h-4 w-4" aria-hidden /> Notificações ({notes.length})</h3>
              <ul className="grid gap-2">
                {notes.map((n) => (
                  <li key={n.id}>
                    <Link href={n.href} className="block rounded-lg bg-white px-3 py-2 text-[12.5px] active:scale-[.99]">
                      <b className="block text-[13px]">{n.title}</b>
                      <span className="block text-[#4D4D4D]">{n.detail}</span>
                      <span className="block text-[11px] text-[#5C5C5C]">{n.when}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <ul className="grid gap-2 sm:grid-cols-2" data-testid="painel-admin-lista">
            {items.map((i) => (
              <li key={i.href}>
                <Link href={i.href} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-[#D4D4D4] px-4 text-[13px] font-bold active:scale-95">
                  {i.label}
                  {!!i.badge && <span className="rounded-full bg-[#E10600] px-2 text-[11px] font-extrabold text-white">{i.badge}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
