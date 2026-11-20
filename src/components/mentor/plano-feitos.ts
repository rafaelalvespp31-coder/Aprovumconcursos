"use client";

import { useMemo, useSyncExternalStore } from "react";

/** Blocos do plano marcados como feitos, por data. Mesma chave do "Plano de hoje", então as duas telas concordam. */
const KEY = "aprovum_plano_feito_";
const subs = new Set<() => void>();

function snapshot(): string {
  try {
    const parts: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(KEY)) parts.push(`${k.slice(KEY.length)}=${localStorage.getItem(k) ?? ""}`);
    }
    return parts.sort().join(";");
  } catch {
    return "";
  }
}
function subscribe(cb: () => void) {
  subs.add(cb);
  window.addEventListener("storage", cb);
  return () => { subs.delete(cb); window.removeEventListener("storage", cb); };
}

/** Mapa AAAA-MM-DD → índices dos blocos feitos. Vazio no servidor (sem diferença na hidratação). */
export function useFeitos(): Record<string, number[]> {
  const snap = useSyncExternalStore(subscribe, snapshot, () => "");
  return useMemo(() => {
    const out: Record<string, number[]> = {};
    for (const part of snap.split(";")) {
      const [k, v] = [part.slice(0, 10), part.slice(11)];
      if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
      try {
        const a = JSON.parse(v);
        if (Array.isArray(a)) out[k] = a.filter((n): n is number => Number.isInteger(n));
      } catch { /* valor inválido: ignora */ }
    }
    return out;
  }, [snap]);
}

export function toggleFeito(dia: string, i: number): void {
  try {
    const atual: number[] = JSON.parse(localStorage.getItem(KEY + dia) ?? "[]");
    const lista = Array.isArray(atual) ? atual.filter((n) => Number.isInteger(n)) : [];
    const novo = lista.includes(i) ? lista.filter((x) => x !== i) : [...lista, i];
    localStorage.setItem(KEY + dia, JSON.stringify(novo));
    try { navigator.vibrate?.(12); } catch { /* sem vibração */ }
  } catch { /* sem armazenamento */ }
  subs.forEach((f) => f());
}
