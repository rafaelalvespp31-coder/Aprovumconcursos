"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";

type Estado = "carregando" | "sem-suporte" | "ios-instalar" | "bloqueado" | "desligado" | "ligado";

const b64 = (v: string) => {
  const pad = "=".repeat((4 - (v.length % 4)) % 4);
  const raw = atob((v + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

/** Liga os avisos no celular (Web Push): chegam mesmo com o app fechado, para quem instalou o ícone na tela inicial. */
export function AvisosPush() {
  const [estado, setEstado] = useState<Estado>("carregando");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (isIos() && !standalone()) return setEstado("ios-instalar");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setEstado("sem-suporte");
      if (Notification.permission === "denied") return setEstado("bloqueado");
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setEstado(sub && Notification.permission === "granted" ? "ligado" : "desligado");
      } catch {
        setEstado("desligado");
      }
    })();
  }, []);

  const ligar = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setEstado(perm === "denied" ? "bloqueado" : "desligado");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const { key } = (await (await fetch("/api/push/key", { cache: "no-store" })).json()) as { key: string };
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) }));
      const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
      if (!r.ok) throw new Error();
      setEstado("ligado");
    } catch {
      setMsg("Não foi possível ativar agora. Tente de novo em instantes.");
    } finally {
      setBusy(false);
    }
  };

  const desligar = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => undefined);
        await sub.unsubscribe();
      }
      setEstado("desligado");
    } catch {
      setMsg("Não foi possível desativar agora.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="avisos-push">
      <p className="mb-3 text-[12px] text-[#5C5C5C]">Receba no celular lembretes de revisão e novidades da APROVUM, mesmo com o app fechado.</p>
      {estado === "ios-instalar" && (
        <p className="rounded-xl border border-[#E4E4E4] bg-[#F7F7F8] p-3 text-[13px]">No iPhone, primeiro toque em <b>Compartilhar</b> e em <b>Adicionar à Tela de Início</b>. Depois abra o app pelo ícone e ative os avisos aqui.</p>
      )}
      {estado === "sem-suporte" && <p className="text-[13px] text-[#5C5C5C]">Este navegador não aceita avisos no celular.</p>}
      {estado === "bloqueado" && <p className="text-[13px] text-[#5C5C5C]">Os avisos estão bloqueados neste aparelho. Libere nas configurações do navegador/app para a APROVUM e volte aqui.</p>}
      {(estado === "desligado" || estado === "ligado") && (
        <button type="button" onClick={estado === "ligado" ? desligar : ligar} disabled={busy} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-[13px] font-bold active:scale-95 disabled:opacity-60 ${estado === "ligado" ? "border border-[#D8D8D8]" : "bg-[#0A0A0A] text-white"}`}>
          {estado === "ligado" ? <BellOff className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />}
          {busy ? "Aguarde…" : estado === "ligado" ? "Desativar avisos neste aparelho" : "Ativar avisos no celular"}
        </button>
      )}
      {estado === "ligado" && <p className="mt-2 text-[12px] font-semibold text-green-700">Avisos ativos neste aparelho.</p>}
      {msg && <p className="mt-2 text-[12px] text-red-700" role="alert">{msg}</p>}
    </div>
  );
}
