"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

/**
 * Estado pequeno salvo no navegador (conveniências por aluno: barra recolhida, seções
 * já percorridas, cronômetro de foco). No servidor e sem armazenamento, vale o padrão.
 * Nunca guarda nada que precise ser confiável: o progresso real fica no banco.
 */
const EVENT = "na:stored";
/** Reserva em memória quando o navegador bloqueia o armazenamento. */
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return memory.get(key) ?? null;
  }
}

export function useStored<T>(key: string, fallback: T): [T, (next: T | null) => void] {
  const subscribe = useCallback(
    (cb: () => void) => {
      const onStorage = (e: Event) => {
        if (e instanceof StorageEvent ? e.key === key : (e as CustomEvent<string>).detail === key) cb();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(EVENT, onStorage);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(EVENT, onStorage);
      };
    },
    [key],
  );
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = useMemo(() => {
    if (raw === null) return fallback;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
    // `fallback` é tratado como constante pelo chamador.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw]);
  const set = useCallback(
    (next: T | null) => {
      try {
        if (next === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, JSON.stringify(next));
      } catch {
        if (next === null) memory.delete(key);
        else memory.set(key, JSON.stringify(next));
      }
      window.dispatchEvent(new CustomEvent(EVENT, { detail: key }));
    },
    [key],
  );
  return [value, set];
}
