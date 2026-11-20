"use client";

import { useEffect } from "react";
import { normalizeReferralCode } from "@/domain/referral/code";

/** Link de parceiro (?ref=CODIGO): avisa o servidor, que confere o código e guarda a origem. Indicação de aluno (APV-…) não passa por aqui. */
export function PartnerRefBeacon() {
  useEffect(() => {
    try {
      const ref = new URLSearchParams(window.location.search).get("ref");
      if (!ref || normalizeReferralCode(ref) !== null) return;
      void fetch("/api/parceiros/indicacao", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref, path: window.location.pathname }), keepalive: true }).catch(() => undefined);
    } catch {
      /* sem rastreio, o site segue normal */
    }
  }, []);
  return null;
}
