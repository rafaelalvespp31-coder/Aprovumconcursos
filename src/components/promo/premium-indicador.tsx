"use client";

import { useEffect, useState } from "react";
import { promoRemainingLabel } from "@/domain/plans/promo";

/** Faixa discreta do painel: degustação ativa, dias restantes e data real de expiração (vem do banco). */
export function PremiumIndicador({ expiresAt, campaignName }: { expiresAt: string; campaignName: string }) {
  const [agora, setAgora] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setAgora(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);
  if (new Date(expiresAt).getTime() <= agora.getTime()) return null;
  const fim = new Date(expiresAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-[#E10600]/40 bg-[#0b0b0b] px-3.5 py-2 text-white shadow-[0_0_24px_rgb(225_6_0/.18)]" data-testid="premium-indicador" role="status" aria-live="polite" title={campaignName}>
      <span className="size-2 shrink-0 animate-pulse rounded-full bg-[#ff3b30]" aria-hidden />
      <span className="t-tiny font-extrabold uppercase tracking-[.14em]">Degustação premium ativa</span>
      <span className="t-tiny font-extrabold uppercase tracking-wide text-[#ff3b30]">Caveira liberou! {promoRemainingLabel(expiresAt, agora)}</span>
      <span className="t-tiny text-white/60">Até {fim}</span>
    </div>
  );
}
