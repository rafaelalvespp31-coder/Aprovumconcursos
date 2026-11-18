"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CreditCard } from "lucide-react";
import type { StudentActivity } from "@/server/services/student-activity";

const KEY = "admin.assinaturas.visto";
const POLL_MS = 20_000;
const money = (c: number | null | undefined) => (c == null ? "" : ` · ${(c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);

interface Aviso { id: string; quem: string; plan: string; valor: string }

/**
 * Aviso global do painel da equipe: toda vez que um aluno assina um plano aparece uma notificação
 * (em qualquer tela do admin), inclusive de assinaturas que chegaram com a página fechada.
 */
export function AssinaturaAviso() {
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const visto = useRef<string | null>(null);

  const checar = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/alunos-atividade", { cache: "no-store" });
      if (!r.ok) return;
      const pagos = ((await r.json()) as { items: StudentActivity[] }).items.filter((i) => i.kind === "pago");
      if (visto.current === null) {
        try { visto.current = localStorage.getItem(KEY); } catch { /* ignora */ }
      }
      const base = visto.current;
      const maisNovo = pagos.reduce((m, p) => (p.at > m ? p.at : m), base ?? "");
      if (base !== null) {
        const novos = pagos.filter((p) => p.at > base).sort((a, b) => a.at.localeCompare(b.at)).slice(-5);
        if (novos.length) {
          setAvisos((cur) => [...cur, ...novos.filter((n) => !cur.some((c) => c.id === n.id)).map((n) => ({ id: n.id, quem: n.name ?? n.email ?? "Aluno", plan: n.plan ?? "plano", valor: money(n.amountCents) }))].slice(-5));
        }
      }
      // Primeira vez neste navegador: só marca o ponto de partida, sem avisar o histórico.
      const novoBase = maisNovo || new Date().toISOString();
      visto.current = novoBase;
      try { localStorage.setItem(KEY, novoBase); } catch { /* ignora */ }
    } catch {
      /* sem rede: tenta no próximo ciclo */
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void checar(), 0);
    const tick = () => { if (document.visibilityState === "visible") void checar(); };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearTimeout(first); window.clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [checar]);

  if (!avisos.length) return null;
  return (
    <div className="fixed right-4 top-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" data-testid="assinatura-avisos">
      {avisos.map((a) => (
        <div key={a.id} role="status" aria-live="polite" className="flex items-start gap-3 rounded-lg border border-emerald-500/50 bg-superficie px-4 py-3 shadow-lg">
          <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"><CreditCard className="size-4" aria-hidden /></span>
          <span className="min-w-0 flex-1 t-small"><strong>{a.quem}</strong> assinou o plano <strong>{a.plan}</strong>{a.valor}</span>
          <button type="button" onClick={() => setAvisos((c) => c.filter((x) => x.id !== a.id))} aria-label="Fechar aviso" className="min-h-8 min-w-8 rounded-md t-small text-tinta-suave hover:bg-fundo">×</button>
        </div>
      ))}
    </div>
  );
}
