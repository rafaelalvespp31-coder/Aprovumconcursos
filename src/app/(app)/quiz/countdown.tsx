"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, TimerReset } from "lucide-react";

/** Tempo de cada questão do Modo Jogo. */
export const QUESTION_SECONDS = 35;

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

/**
 * Cronômetro regressivo da questão, no painel "Tempo restante": relógio mm:ss, anel que
 * esvazia em volta do ícone, alerta pulsante nos últimos 5 segundos e botão de pausa.
 * Monte com uma `key` por questão para reiniciar. Só corre enquanto `running`;
 * ao zerar chama `onExpire` uma única vez.
 */
export function Countdown({
  seconds = QUESTION_SECONDS,
  running,
  result,
  paused,
  onTogglePause,
  onExpire,
}: {
  seconds?: number;
  running: boolean;
  /** Depois de responder, o cronômetro congela e assume a cor do resultado. */
  result: "ok" | "erro" | null;
  paused: boolean;
  onTogglePause: () => void;
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
  const color = result === "ok" ? "#4ADE80" : result === "erro" ? "rgba(255,255,255,0.45)" : urgent ? "#FFD60A" : "#FF1E12";
  const canPause = !result && left > 0;

  return (
    <div
      className={`flex shrink-0 items-center gap-3 rounded-[22px] border bg-black/60 py-2 pl-3 pr-2 max-sm:w-full sm:gap-4 sm:pl-4 ${urgent ? "cd-urgente border-[#FFD60A]/70" : "border-[#E10600]/70"} shadow-[0_0_24px_rgba(225,6,0,0.18)]`}
    >
      <span className="relative flex h-11 w-11 shrink-0 items-center justify-center" aria-hidden>
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
        <span key={sec} className={`text-[26px] font-black tabular-nums tracking-tight sm:text-[30px] ${result || paused ? "" : "cd-pop"}`} style={{ color: result ? color : urgent ? "#FFD60A" : "#FFFFFF" }}>
          {mmss(sec)}
        </span>
        <span className="mt-1 text-[10.5px] font-bold uppercase tracking-[0.12em] text-white/70">
          {left <= 0 && !result ? "Tempo esgotado" : paused ? "Pausado" : "Tempo restante"}
        </span>
      </span>
      <button
        type="button"
        onClick={onTogglePause}
        disabled={!canPause}
        aria-label={paused ? "Retomar o cronômetro" : "Pausar o cronômetro"}
        aria-pressed={paused}
        className="ml-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-colors hover:border-white/50 disabled:opacity-35"
      >
        {paused ? <Play className="h-5 w-5" aria-hidden /> : <Pause className="h-5 w-5" aria-hidden />}
      </button>
    </div>
  );
}
