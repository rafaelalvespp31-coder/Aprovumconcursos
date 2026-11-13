"use client";

import { useEffect, useRef, useState } from "react";
import { TimerReset } from "lucide-react";
import { armTickSound, playCountdownBeep } from "@/components/tick-sound";

/** Tempo de cada questão do Modo Jogo. */
export const QUESTION_SECONDS = 35;

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * Cronômetro regressivo da questão, no painel "Tempo restante": relógio mm:ss, anel que
 * esvazia em volta do ícone e alerta pulsante nos últimos 5 segundos (sem pausa).
 * Monte com uma `key` por questão para reiniciar. Só corre enquanto `running`;
 * ao zerar chama `onExpire` uma única vez.
 */
export function Countdown({
  seconds = QUESTION_SECONDS,
  running,
  result,
  onExpire,
}: {
  seconds?: number;
  running: boolean;
  /** Depois de responder, o cronômetro congela e assume a cor do resultado. */
  result: "ok" | "erro" | null;
  onExpire: () => void;
}) {
  const total = seconds * 1000;
  const [left, setLeft] = useState(total);
  const leftRef = useRef(total);
  const expireRef = useRef(onExpire);
  useEffect(() => {
    leftRef.current = left;
    expireRef.current = onExpire;
  });

  useEffect(() => {
    if (!running || result) return;
    const base = leftRef.current;
    if (base <= 0) return;
    const start = performance.now();
    const id = setInterval(() => {
      const l = Math.max(0, base - (performance.now() - start));
      setLeft(l);
      if (l <= 0) {
        clearInterval(id);
        expireRef.current();
      }
    }, 100);
    return () => clearInterval(id);
  }, [running, result]);

  const sec = Math.ceil(left / 1000);
  const frac = left / total;
  const urgent = !result && left > 0 && sec <= 5;
  // Som a cada segundo quando faltam 10 segundos ou menos (bip duplo nos últimos 5; bipe longo ao zerar).
  const ticking = running && !result && sec <= 10;
  useEffect(() => {
    armTickSound();
  }, []);
  useEffect(() => {
    if (ticking) playCountdownBeep(sec);
  }, [ticking, sec]);
  const color = result === "ok" ? "#4ADE80" : result === "erro" ? "rgba(255,255,255,0.45)" : urgent ? "#FFD60A" : "#FF1E12";

  return (
    <div
      className={`flex shrink-0 items-center gap-2 rounded-[18px] border bg-black/60 py-1.5 pl-2 pr-3 sm:gap-4 sm:rounded-[22px] sm:py-2 sm:pl-4 sm:pr-4 ${urgent ? "cd-urgente border-[#FFD60A]/70" : "border-[#E10600]/70"} shadow-[0_0_24px_rgba(225,6,0,0.18)]`}
    >
      <span className="relative flex h-9 w-9 shrink-0 items-center justify-center sm:h-11 sm:w-11" aria-hidden>
        <svg viewBox="0 0 44 44" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="22" cy="22" r="19" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3.5" />
          <circle
            cx="22"
            cy="22"
            r="19"
            fill="none"
            stroke={color}
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 19}
            strokeDashoffset={2 * Math.PI * 19 * (1 - frac)}
            style={{ transition: "stroke-dashoffset 100ms linear, stroke 300ms" }}
          />
        </svg>
        <TimerReset className="relative h-5 w-5" style={{ color }} />
      </span>
      <span
        role="timer"
        aria-label={`${sec} segundo${sec === 1 ? "" : "s"} restantes`}
        data-testid="cronometro"
        data-urgente={urgent || undefined}
        className="flex flex-col leading-none"
      >
        <span key={sec} className={`text-[21px] font-black tabular-nums tracking-tight sm:text-[30px] ${result ? "" : "cd-pop"}`} style={{ color: result ? color : urgent ? "#FFD60A" : "#FFFFFF" }}>
          {mmss(sec)}
        </span>
        <span className="mt-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-white/70 sm:text-[10.5px] sm:tracking-[0.12em]">
          {left <= 0 && !result ? "Tempo esgotado" : "Tempo restante"}
        </span>
      </span>
    </div>
  );
}
