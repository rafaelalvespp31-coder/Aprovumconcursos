"use client";

import { useCallback, useEffect, useState } from "react";

export type EstadoPush = "carregando" | "sem-suporte" | "ios-instalar" | "bloqueado" | "desligado" | "ligado";

const b64 = (v: string) => {
  const pad = "=".repeat((4 - (v.length % 4)) % 4);
  const raw = atob((v + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
};
export const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;

/** Estado e ações dos avisos Web Push deste aparelho (chegam com o app fechado). */
export function usePush() {
  const [estado, setEstado] = useState<EstadoPush>("carregando");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let vivo = true;
    (async () => {
      const set = (e: EstadoPush) => { if (vivo) setEstado(e); };
      if (isIos() && !isStandalone()) return set("ios-instalar");
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return set("sem-suporte");
      if (Notification.permission === "denied") return set("bloqueado");
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        set(sub && Notification.permission === "granted" ? "ligado" : "desligado");
      } catch {
        set("desligado");
      }
    })();
    return () => { vivo = false; };
  }, []);

  const ligar = useCallback(async () => {
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
      setMsg("Avisos ativados neste aparelho.");
    } catch {
      setMsg("Não foi possível ativar agora. Tente de novo em instantes.");
    } finally {
      setBusy(false);
    }
  }, []);

  const desligar = useCallback(async () => {
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
      setMsg("Avisos desativados neste aparelho.");
    } catch {
      setMsg("Não foi possível desativar agora.");
    } finally {
      setBusy(false);
    }
  }, []);

  return { estado, msg, busy, ligar, desligar };
}
