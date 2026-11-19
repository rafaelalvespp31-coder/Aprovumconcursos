"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/** Avisa o servidor que alguém abriu o site (uma vez por aba). Não guarda nada no aparelho além disso. */
export function VisitaBeacon() {
  const path = usePathname();
  useEffect(() => {
    if (/^\/(admin|api|dev|business)(\/|$)/.test(path)) return;
    try {
      if (sessionStorage.getItem("aprovum_visita")) return;
      sessionStorage.setItem("aprovum_visita", "1");
    } catch { /* sem sessionStorage: conta mesmo assim */ }
    void fetch("/api/visita", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ path }), keepalive: true }).catch(() => undefined);
  }, [path]);
  return null;
}
