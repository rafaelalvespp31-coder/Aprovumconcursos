"use client";

import { useEffect, useRef, useState } from "react";
import { Timer, Pause } from "lucide-react";
import { formatHMS, tickClock, touchClock, type ClockState } from "@/domain/study-clock";

const dayKey = () => `na:estudo-hoje:${new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" })}`;
const read = (k: string) => {
  try {
    return Number(localStorage.getItem(k)) || 0;
  } catch {
    return 0;
  }
};

/**
 * Horas líquidas de estudo do dia, no topo das telas de estudo. Só conta com a aba visível e com
 * interação (mouse, toque, teclado, rolagem); 10 min inerte para o relógio e desconta o tempo parado.
 * O total do dia fica neste aparelho (localStorage).
 */
export function StudyClock() {
  const [key, setKey] = useState(dayKey);
  const [state, setState] = useState<ClockState>({ seconds: 0, idleFor: 0, paused: false });
  const ref = useRef(state);
  // eslint-disable-next-line react-hooks/refs
  ref.current = state;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState((s) => ({ ...s, seconds: read(key) }));
  }, [key]);

  useEffect(() => {
    const touch = () => setState((s) => touchClock(s));
    const evs = ["pointerdown", "pointermove", "keydown", "scroll", "wheel", "touchstart"] as const;
    evs.forEach((e) => window.addEventListener(e, touch, { passive: true, capture: true }));
    const id = setInterval(() => {
      const k = dayKey();
      if (k !== key) return setKey(k);
      if (document.visibilityState !== "visible") return;
      setState((s) => {
        const n = tickClock(s);
        if (n.seconds !== s.seconds) {
          try {
            localStorage.setItem(key, String(n.seconds));
          } catch {
            /* sem armazenamento: segue só em memória */
          }
        }
        return n;
      });
    }, 1000);
    return () => {
      evs.forEach((e) => window.removeEventListener(e, touch, { capture: true }));
      clearInterval(id);
    };
  }, [key]);

  return (
    <div className={`estudo-relogio ${state.paused ? "is-pausa" : ""}`} role="timer" aria-live="off" aria-label={`Estudo líquido hoje: ${formatHMS(state.seconds)}${state.paused ? ", pausado por inatividade" : ""}`} data-testid="estudo-relogio" data-pausado={state.paused || undefined}>
      {state.paused ? <Pause className="size-4" aria-hidden /> : <Timer className="size-4" aria-hidden />}
      <span className="estudo-relogio-t">{formatHMS(state.seconds)}</span>
      <span className="estudo-relogio-l">{state.paused ? "Pausado (inativo)" : "Estudo hoje"}</span>
    </div>
  );
}
