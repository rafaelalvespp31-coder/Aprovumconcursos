"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, CheckCheck, CreditCard, UserPlus } from "lucide-react";
import type { StudentActivity } from "@/server/services/student-activity";

const SEEN_KEY = "admin.alunos.visto";
const POLL_MS = 60_000;
const SSR = "__ssr__";
const subscribeSeen = (cb: () => void) => {
  window.addEventListener("storage", cb);
  window.addEventListener("alunos-visto", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("alunos-visto", cb);
  };
};
const readSeen = () => {
  try {
    return localStorage.getItem(SEEN_KEY) ?? "";
  } catch {
    return "";
  }
};
const TZ = { timeZone: "America/Sao_Paulo" } as const;
const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { ...TZ, dateStyle: "short", timeStyle: "short" });
const money = (c: number | null | undefined) => (c == null ? "" : ` · ${(c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);

function ago(iso: string): string {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.round(h / 24)} d`;
}

/**
 * Notificações da aba Alunos: contas novas e pagamentos de plano. O que é mais novo que a última
 * leitura fica destacado; chegou algo enquanto a página está aberta, avisa sem recarregar.
 */
export function AlunosNotificacoes({ initial }: { initial: StudentActivity[] }) {
  const [items, setItems] = useState(initial);
  const seenRaw = useSyncExternalStore(subscribeSeen, readSeen, () => SSR);
  const ready = seenRaw !== SSR;
  const seen = seenRaw && seenRaw !== SSR ? seenRaw : null;
  const [aberto, setAberto] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);
  const known = useRef(new Set(initial.map((i) => i.id)));

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/alunos-atividade", { cache: "no-store" });
      if (!r.ok) return;
      const next = ((await r.json()) as { items: StudentActivity[] }).items;
      const novos = next.filter((i) => !known.current.has(i.id));
      known.current = new Set(next.map((i) => i.id));
      setItems(next);
      if (novos.length) {
        const c = novos.filter((n) => n.kind === "cadastro").length;
        const p = novos.filter((n) => n.kind === "pago").length;
        setAviso([c ? `${c} novo${c > 1 ? "s" : ""} cadastro${c > 1 ? "s" : ""}` : "", p ? `${p} plano${p > 1 ? "s" : ""} pago${p > 1 ? "s" : ""}` : ""].filter(Boolean).join(" e "));
      }
    } catch {
      /* sem rede: tenta no próximo ciclo */
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const id = window.setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh]);

  useEffect(() => {
    if (!aviso) return;
    const t = window.setTimeout(() => setAviso(null), 9000);
    return () => window.clearTimeout(t);
  }, [aviso]);

  const naoLidas = ready ? items.filter((i) => !seen || i.at > seen).length : 0;
  const marcar = () => {
    const agora = new Date().toISOString();
    try {
      localStorage.setItem(SEEN_KEY, agora);
    } catch {
      /* ignora */
    }
    window.dispatchEvent(new Event("alunos-visto"));
  };

  return (
    <section className="mt-4 rounded-lg border border-linha bg-superficie" data-testid="alunos-notificacoes" aria-label="Notificações de alunos">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-linha px-3 py-2">
        <button type="button" onClick={() => setAberto((v) => !v)} aria-expanded={aberto} className="flex items-center gap-2 text-left">
          <Bell className="size-4" aria-hidden />
          <span className="t-small font-bold">Notificações</span>
          {naoLidas > 0 && (
            <span data-testid="alunos-nao-lidas" className="rounded-full bg-[#E10600] px-2 py-0.5 text-[11px] font-bold leading-none text-white">
              {naoLidas} nova{naoLidas > 1 ? "s" : ""}
            </span>
          )}
          <span className="t-tiny text-tinta-fraca">novos cadastros e planos pagos · últimos 30 dias</span>
        </button>
        {naoLidas > 0 && (
          <button type="button" onClick={marcar} className="inline-flex items-center gap-1 rounded-md border border-linha px-2 py-1 t-tiny font-semibold hover:bg-white/5">
            <CheckCheck className="size-3.5" aria-hidden /> Marcar como lidas
          </button>
        )}
      </header>
      {aviso && (
        <p role="status" className="border-b border-linha bg-[#E10600]/10 px-3 py-1.5 t-small font-semibold">
          Chegou agora: {aviso}.
        </p>
      )}
      {aberto &&
        (items.length === 0 ? (
          <p className="px-3 py-3 t-small text-tinta-suave">Nada novo nos últimos 30 dias.</p>
        ) : (
          <ul className="max-h-80 divide-y divide-linha overflow-y-auto">
            {items.map((i) => {
              const nova = ready && (!seen || i.at > seen);
              const quem = i.name ?? i.email ?? "Aluno";
              return (
                <li key={i.id} data-testid="alunos-notificacao" data-kind={i.kind} data-nova={nova ? "1" : undefined} className={`flex items-start gap-3 px-3 py-2 ${nova ? "bg-[#E10600]/[0.07]" : ""}`}>
                  <span className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full ${i.kind === "pago" ? "bg-emerald-500/15 text-emerald-400" : "bg-sky-500/15 text-sky-400"}`}>
                    {i.kind === "pago" ? <CreditCard className="size-3.5" aria-hidden /> : <UserPlus className="size-3.5" aria-hidden />}
                  </span>
                  <span className="min-w-0 flex-1 t-small">
                    <strong>{quem}</strong>{" "}
                    {i.kind === "pago" ? (
                      <>
                        assinou o plano <strong>{i.plan}</strong>
                        {money(i.amountCents)}
                      </>
                    ) : (
                      "criou uma conta"
                    )}
                    {i.name && i.email && <span className="block truncate t-tiny text-tinta-fraca">{i.email}</span>}
                  </span>
                  <span className="shrink-0 text-right t-tiny text-tinta-fraca" title={quando(i.at)}>
                    {ago(i.at)}
                    {nova && <span className="ml-1.5 inline-block size-2 rounded-full bg-[#E10600]" aria-label="não lida" />}
                  </span>
                </li>
              );
            })}
          </ul>
        ))}
    </section>
  );
}
