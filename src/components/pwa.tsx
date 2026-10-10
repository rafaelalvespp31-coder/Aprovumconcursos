"use client";

import { useEffect, useSyncExternalStore } from "react";

/** Registra o service worker (apenas em produção, para não interferir no dev). */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
      // Sem SW o app continua funcionando online.
    });
  }, []);
  return null;
}

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

/** Indicador de conectividade. */
export function ConnectivityBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="bg-alerta-fundo px-4 py-2 text-center t-small text-tinta">
      Você está sem conexão. Aulas já abertas continuam disponíveis para leitura; respostas e geração de conteúdo precisam de internet.
    </div>
  );
}
