"use client";

import { useCallback, useEffect, useState } from "react";

const POLL_MS = 4000;

/** Quantos alunos estão com a plataforma aberta neste instante (atualiza sozinho a cada 4 s). */
export function OnlineAgora() {
  const [d, setD] = useState<{ total: number; alunos: string[] } | null>(null);
  const [lista, setLista] = useState(false);

  const buscar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/online", { cache: "no-store" });
      if (r.ok) setD((await r.json()) as { total: number; alunos: string[] });
    } catch {
      /* sem rede: tenta no próximo ciclo */
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void buscar(), 0);
    const tick = () => { if (document.visibilityState === "visible") void buscar(); };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearTimeout(first); window.clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [buscar]);

  return (
    <section className="mt-4 rounded-lg border border-emerald-500/40 bg-superficie p-3" data-testid="alunos-online" aria-live="polite">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="relative flex size-3"><span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /><span className="relative inline-flex size-3 rounded-full bg-emerald-500" /></span>
          <span className="text-3xl font-extrabold tabular-nums" data-testid="alunos-online-total">{d ? d.total : "—"}</span>
          <span className="t-small font-semibold">aluno{d?.total === 1 ? "" : "s"} online agora <span className="font-normal text-tinta-fraca">· plataforma aberta, em tempo real</span></span>
        </div>
        {d && d.total > 0 && (
          <button type="button" onClick={() => setLista((v) => !v)} aria-expanded={lista} className="rounded-md border border-linha px-2 py-1 t-tiny font-semibold hover:bg-white/5">
            {lista ? "Ocultar nomes" : "Ver quem está online"}
          </button>
        )}
      </div>
      {lista && d && d.total > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {d.alunos.map((n, i) => <li key={`${n}-${i}`} className="rounded-full bg-emerald-500/15 px-2 py-0.5 t-tiny font-semibold text-emerald-300">{n}</li>)}
        </ul>
      )}
    </section>
  );
}
