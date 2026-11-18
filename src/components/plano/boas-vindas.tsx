"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "aprovum.boasvindas.visto";
const POLL_MS = 20_000;

/** Card de boas-vindas: aparece uma vez para cada plano que o aluno assina (cartão, PIX ou liberação da equipe). */
export function BoasVindas() {
  const [dados, setDados] = useState<{ id: string; plano: string } | null>(null);

  const checar = useCallback(async () => {
    try {
      const r = await fetch("/api/boas-vindas", { cache: "no-store" });
      if (!r.ok) return;
      const p = ((await r.json()) as { pagamento: { id: string; plano: string } | null }).pagamento;
      if (!p) return;
      let visto = "";
      try { visto = localStorage.getItem(KEY) ?? ""; } catch { /* ignora */ }
      if (visto.split(",").includes(p.id)) return;
      setDados((cur) => cur ?? p);
    } catch {
      /* sem rede: tenta no próximo ciclo */
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void checar(), 1500);
    const tick = () => { if (document.visibilityState === "visible") void checar(); };
    const id = window.setInterval(tick, POLL_MS);
    const on = () => void checar();
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("boas-vindas:checar", on);
    return () => { window.clearTimeout(first); window.clearInterval(id); document.removeEventListener("visibilitychange", tick); window.removeEventListener("boas-vindas:checar", on); };
  }, [checar]);

  const fechar = () => {
    if (dados) {
      try {
        const antes = (localStorage.getItem(KEY) ?? "").split(",").filter(Boolean).slice(-9);
        localStorage.setItem(KEY, [...antes, dados.id].join(","));
      } catch { /* ignora */ }
    }
    setDados(null);
  };

  useEffect(() => {
    if (!dados) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dados]);

  if (!dados) return null;
  return (
    <div role="dialog" aria-modal="true" aria-labelledby="bv-titulo" data-testid="boas-vindas" className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-5 backdrop-blur-sm" onClick={fechar}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl border border-[#E10600]/60 bg-[#0b0b0d] p-6 text-center text-white shadow-[0_0_60px_rgba(225,6,0,.35)]">
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#ff4d47]">Plano ativado · {dados.plano}</p>
        <h2 id="bv-titulo" className="mt-3 text-3xl font-extrabold leading-tight">Bem-vindo à elite!</h2>
        <p className="mt-3 text-base text-white/85">Desfrute da melhor plataforma de concursos do Brasil.</p>
        <p className="mt-4 text-xl font-extrabold text-[#ff4d47]">Aqui se forja os melhores!</p>
        <button type="button" autoFocus onClick={fechar} className="mt-6 min-h-12 w-full rounded-xl bg-[#E10600] px-4 text-base font-extrabold uppercase tracking-wide text-white active:scale-[.97]">
          Começar a forjar minha aprovação
        </button>
      </div>
    </div>
  );
}
