"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import type { Notice } from "@/server/services/notebooks";

const ROTATE_MS = 8000;

/** Carrossel de avisos da plataforma (tabela app_notices, só os ativos no período). */
export function NoticesCard({ notices, base }: { notices: Notice[]; base: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = notices.length;
  const go = (n: number) => setI(((n % total) + total) % total);

  useEffect(() => {
    if (total < 2 || paused) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => setI((x) => (x + 1) % total), ROTATE_MS);
    return () => clearInterval(t);
  }, [total, paused]);

  const n = notices[Math.min(i, total - 1)];
  const href = (h: string) => (h.startsWith("/") ? `${base}${h}` : h);

  return (
    <section className="pc min-w-0 p-4 sm:p-6" aria-labelledby="avisos-titulo" aria-roledescription="carrossel" data-testid="avisos-card">
      <div className="flex items-center justify-between gap-3">
        <h2 id="avisos-titulo" className="flex items-center gap-3 text-[19px] font-extrabold tracking-[-0.01em] text-[#08090B] sm:text-[21px]">
          <Megaphone className="h-6 w-6 -scale-x-100 text-[#E50914]" aria-hidden />
          Avisos
        </h2>
        {total > 1 && (
          <span className="text-[12.5px] font-semibold text-[#64666D]" aria-live="polite">
            {i + 1} de {total}
          </span>
        )}
      </div>

      {n ? (
        <>
          <div className="cq-aviso mt-4" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}>
            {n.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.image} alt="" className="cq-aviso-arte" />
            )}
            <div className="cq-aviso-veu" aria-hidden />
            <div className="relative z-[1] flex min-h-[200px] max-w-[62%] flex-col justify-center gap-1.5 py-5 pl-5 pr-2 sm:pl-7" key={n.id}>
              {n.kicker && <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85 sm:text-[12px]">{n.kicker}</p>}
              <p className="font-[Space_Grotesk] text-[21px] font-[800] uppercase leading-[1.02] tracking-[-0.01em] text-white sm:text-[24px]">
                {n.title} {n.highlight && <span className="text-[#FF1E26]">{n.highlight}</span>}
              </p>
              <p className="text-[12.5px] leading-snug text-white/80 sm:text-[13px]">{n.body}</p>
              <Link href={href(n.href)} className="cq-aviso-cta mt-2 self-start">
                {n.ctaLabel} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
            {total > 1 && (
              <button type="button" onClick={() => go(i + 1)} className="cq-aviso-seta" aria-label="Próximo aviso">
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            )}
          </div>
          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={() => go(i - 1)} disabled={total < 2} className="cq-seta" aria-label="Aviso anterior">
              <ChevronLeft className="h-5 w-5" aria-hidden />
            </button>
            <div className="flex items-center gap-2.5">
              {notices.map((x, k) => (
                <button key={x.id} type="button" onClick={() => go(k)} className="cq-ponto" aria-label={`Aviso ${k + 1}: ${x.title} ${x.highlight ?? ""}`.trim()} aria-current={k === i ? "true" : undefined} />
              ))}
            </div>
            <button type="button" onClick={() => go(i + 1)} disabled={total < 2} className="cq-seta" aria-label="Próximo aviso">
              <ChevronRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </>
      ) : (
        <p className="mt-4 rounded-[14px] border border-dashed border-[#DADBE0] bg-[#FBFBFC] px-5 py-8 text-center text-[13px] text-[#64666D]">Nenhum aviso no momento.</p>
      )}
    </section>
  );
}
