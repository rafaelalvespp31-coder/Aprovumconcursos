"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type PointerEvent } from "react";
import { ArrowUpRight, Bell, ChevronDown, ShieldCheck } from "lucide-react";

export type AdminItem = { href: string; label: string; badge?: number };
export type AdminNote = { id: string; title: string; detail: string; when: string; href: string };

const reduced = () => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Central da equipe: cartão escuro 3D (inclina com o mouse) com acesso direto ao painel e atalhos reais. */
export function PainelAdmin({ items, notes = [], admin = false }: { items: AdminItem[]; notes?: AdminNote[]; admin?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const out = (e: globalThis.PointerEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", esc);
    document.addEventListener("pointerdown", out);
    return () => { document.removeEventListener("keydown", esc); document.removeEventListener("pointerdown", out); };
  }, [open]);

  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse" || reduced()) return;
    const el = tilt.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--ry", `${((x - 0.5) * 8).toFixed(2)}deg`);
    el.style.setProperty("--rx", `${((0.5 - y) * 7).toFixed(2)}deg`);
    el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
  };
  const leave = () => {
    const el = tilt.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
  };

  const badge = notes.length > 0 && (
    <span
      className="pf-pulso inline-flex min-w-7 items-center justify-center rounded-full bg-white px-2 py-0.5 text-[12px] font-extrabold text-[#E10600]"
      data-testid="painel-admin-badge"
      aria-label={`${notes.length} ${admin ? "notificações" : "notificações novas"}`}
    >
      {notes.length}
    </span>
  );

  const head = (
    <div className="flex items-center gap-4">
      <span className="pf-escudo relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px] bg-white/10 text-white" aria-hidden>
        <ShieldCheck className="h-7 w-7" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">Central da equipe {badge}</span>
        <span className="mt-1 block font-[Space_Grotesk] text-[22px] font-[800] leading-none text-white">Painel do Admin</span>
        <span className="mt-1.5 block text-[12px] text-white/75">Visível só para a equipe do APROVUM.</span>
      </span>
    </div>
  );

  const shortcuts = items.filter((i) => !i.badge).slice(0, 3);

  const shell = (children: React.ReactNode) => (
    <div className="[perspective:900px]">
      <div
        ref={tilt}
        onPointerMove={move}
        onPointerLeave={leave}
        className="pf-admin relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#121212] via-[#1D0505] to-[#4A0505] p-5 text-white shadow-[0_24px_60px_-22px_rgba(225,6,0,0.6)]"
        style={{ transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))", transition: "transform 240ms cubic-bezier(0.22,1,0.36,1)" }}
        data-testid="area-equipe"
      >
        <div className="pointer-events-none absolute inset-0 opacity-[0.14]" style={{ backgroundImage: "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)", backgroundSize: "26px 26px", maskImage: "radial-gradient(circle at 80% 0%, black, transparent 70%)", WebkitMaskImage: "radial-gradient(circle at 80% 0%, black, transparent 70%)" }} aria-hidden />
        <div className="pointer-events-none absolute inset-0 mix-blend-soft-light" style={{ background: "radial-gradient(360px circle at var(--mx,70%) var(--my,0%), rgba(255,255,255,0.5), transparent 55%)" }} aria-hidden />
        <div className="relative">{children}</div>
      </div>
    </div>
  );

  const chips = (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Atalhos">
      {shortcuts.map((i) => (
        <li key={i.href}>
          <Link href={i.href} className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 text-[12px] font-bold text-white transition-[transform,background-color] duration-150 ease-out hover:bg-white/20 active:scale-[0.97]">
            {i.label}
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  );

  // Administrador: o cartão leva direto para a página do painel.
  if (admin) {
    return shell(
      <>
        <Link href="/admin" data-testid="painel-admin-btn" className="group flex items-center justify-between gap-3 rounded-[20px] outline-offset-4 active:scale-[0.99]" aria-label={`Painel do Admin${notes.length ? `, ${notes.length} notificações` : ""}`}>
          {head}
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E10600] text-white transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden>
            <ArrowUpRight className="h-5 w-5" />
          </span>
        </Link>
        {chips}
      </>,
    );
  }

  return shell(
    <div ref={box}>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)} data-testid="painel-admin-btn" className="flex w-full items-center justify-between gap-3 rounded-[20px] outline-offset-4 active:scale-[0.99]">
        {head}
        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E10600] transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`} aria-hidden>
          <ChevronDown className="h-5 w-5" />
        </span>
      </button>
      {open && (
        <div id={id} className="pf-dia-in mt-4 grid gap-3">
          {notes.length > 0 && (
            <section aria-label="Notificações" data-testid="painel-admin-notas" className="rounded-[18px] border border-white/15 bg-white/10 p-3">
              <h3 className="mb-2 flex items-center gap-2 text-[13px] font-extrabold text-white"><Bell className="h-4 w-4" aria-hidden /> Notificações ({notes.length})</h3>
              <ul className="grid gap-2">
                {notes.map((n) => (
                  <li key={n.id}>
                    <Link href={n.href} className="block rounded-[12px] bg-white px-3 py-2 text-[12.5px] text-[#0A0A0A] transition-transform duration-150 ease-out active:scale-[0.98]">
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
                <Link href={i.href} className="flex min-h-11 items-center justify-between gap-2 rounded-[14px] border border-white/20 bg-white/10 px-4 text-[13px] font-bold text-white transition-[transform,background-color] duration-150 ease-out hover:bg-white/20 active:scale-[0.97]">
                  {i.label}
                  {!!i.badge && <span className="rounded-full bg-[#E10600] px-2 text-[11px] font-extrabold text-white">{i.badge}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>,
  );
}
