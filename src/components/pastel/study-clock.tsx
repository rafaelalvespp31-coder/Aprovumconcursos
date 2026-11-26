"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Timer, Pause } from "lucide-react";
import { formatHMS } from "@/domain/study-clock";
import { useStudyClock } from "./use-study-clock";

/** Horas líquidas de estudo do dia, no topo das telas de estudo (a conta está em useStudyClock; a aula tem o relógio no próprio painel). */
export function StudyClock() {
  const state = useStudyClock();

  // No celular o relógio entra no fluxo da página (espaço vazio no topo do conteúdo), sem cobrir banners.
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 1023px)");
    const apply = () => setSlot(mq.matches ? document.getElementById("estudo-relogio-slot") : null);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const clock = (
    <div className={`estudo-relogio ${slot ? "is-inline" : ""} ${state.paused ? "is-pausa" : ""}`} role="timer" aria-live="off" aria-label={`Estudo líquido hoje: ${formatHMS(state.seconds)}${state.paused ? ", pausado por inatividade" : ""}`} data-testid="estudo-relogio" data-pausado={state.paused || undefined}>
      {state.paused ? <Pause className="size-4" aria-hidden /> : <Timer className="size-4" aria-hidden />}
      <span className="estudo-relogio-t">{formatHMS(state.seconds)}</span>
      <span className="estudo-relogio-l">{state.paused ? "Pausado (inativo)" : "Estudo hoje"}</span>
    </div>
  );
  return slot ? createPortal(clock, slot) : clock;
}
