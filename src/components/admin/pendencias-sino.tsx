"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

interface Item { key: string; label: string; count: number; href: string; latestAt: string | null }
interface Data { total: number; items: Item[] }

const POLL_MS = 60_000;
const BASE_TITLE_KEY = "__adminBaseTitle";

function ago(iso: string | null): string {
  if (!iso) return "";
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "agora há pouco";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

/**
 * Sino do painel da equipe: mostra quantos pedidos de alunos esperam o admin, avisa quando chega um
 * novo (sem recarregar a página) e leva direto à tela que resolve cada um.
 */
export function PendenciasSino({ initial }: { initial: Data }) {
  const [data, setData] = useState<Data>(initial);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const prev = useRef<Record<string, number>>(Object.fromEntries(initial.items.map((i) => [i.key, i.count])));
  const box = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/pendencias", { cache: "no-store" });
      if (!r.ok) return;
      const next = (await r.json()) as Data;
      const novos = next.items.filter((i) => i.count > (prev.current[i.key] ?? 0));
      prev.current = Object.fromEntries(next.items.map((i) => [i.key, i.count]));
      setData(next);
      if (novos.length) setToast(`Novo pedido: ${novos.map((n) => n.label.toLowerCase()).join(", ")}`);
    } catch {
      /* sem rede: tenta de novo no próximo ciclo */
    }
  }, []);

  useEffect(() => {
    const tick = () => { if (document.visibilityState === "visible") void refresh(); };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [refresh]);

  // Número na aba do navegador: dá para ver de longe que há pedidos esperando.
  useEffect(() => {
    const w = window as unknown as Record<string, string | undefined>;
    w[BASE_TITLE_KEY] ??= document.title.replace(/^\(\d+\)\s*/, "");
    document.title = data.total > 0 ? `(${data.total}) ${w[BASE_TITLE_KEY]}` : (w[BASE_TITLE_KEY] as string);
  }, [data.total]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 9000);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const abertos = data.items.filter((i) => i.count > 0);
  return (
    <div ref={box} className="relative" data-testid="admin-sino">
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); void refresh(); }}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={data.total > 0 ? `Notificações: ${data.total} pedidos de alunos esperando a equipe` : "Notificações: nenhum pedido esperando"}
        className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-linha bg-superficie text-tinta hover:bg-fundo"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {data.total > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-destaque px-1.5 py-0.5 text-center t-tiny font-bold text-white" aria-hidden="true">
            {data.total > 99 ? "99+" : data.total}
          </span>
        )}
      </button>

      {open && (
        <div role="region" aria-label="Pedidos esperando a equipe" className="absolute right-0 z-50 mt-2 w-72 max-w-[calc(100vw-2.5rem)] rounded-lg border border-linha bg-superficie p-2 shadow-lg">
          {abertos.length === 0 ? (
            <p className="px-2 py-3 t-small text-tinta-suave">Nenhum pedido esperando a equipe.</p>
          ) : (
            <ul>
              {abertos.map((i) => (
                <li key={i.key}>
                  <Link href={i.href} onClick={() => setOpen(false)} className="flex min-h-11 items-center justify-between gap-3 rounded-md px-2 py-2 hover:bg-fundo">
                    <span className="t-small font-semibold">{i.label}<br /><span className="t-tiny font-normal text-tinta-suave">{ago(i.latestAt)}</span></span>
                    <span className="rounded-full bg-destaque px-2 py-0.5 t-tiny font-bold text-white">{i.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {toast && (
        <div role="status" aria-live="polite" className="fixed bottom-4 right-4 z-50 flex max-w-xs items-start gap-3 rounded-lg border border-destaque bg-superficie px-4 py-3 shadow-lg">
          <span className="t-small font-semibold">{toast}</span>
          <button type="button" onClick={() => setToast(null)} aria-label="Fechar aviso" className="min-h-8 min-w-8 rounded-md t-small text-tinta-suave hover:bg-fundo">×</button>
        </div>
      )}
    </div>
  );
}
