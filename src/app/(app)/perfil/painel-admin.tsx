"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ShieldCheck } from "lucide-react";

export type AdminItem = { href: string; label: string };

/** Um único botão "Painel do Admin" que abre todas as opções da equipe. */
export function PainelAdmin({ items }: { items: AdminItem[] }) {
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
        <span className="inline-flex items-center gap-2"><ShieldCheck className="h-5 w-5" aria-hidden /> Painel do Admin</span>
        <ChevronDown className={`h-5 w-5 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && (
        <ul id={id} className="mt-3 grid gap-2 sm:grid-cols-2" data-testid="painel-admin-lista">
          {items.map((i) => (
            <li key={i.href}>
              <Link href={i.href} className="flex min-h-11 items-center rounded-xl border border-[#D4D4D4] px-4 text-[13px] font-bold active:scale-95">{i.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
