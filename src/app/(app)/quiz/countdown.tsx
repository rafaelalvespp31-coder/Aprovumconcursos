"use client";

import { useEffect, useRef, useState } from "react";

/** Tempo de cada questão do Modo Jogo. */
export const QUESTION_SECONDS = 10;

const R = 23;
const C = 2 * Math.PI * R;

/**
 * Cronômetro regressivo da questão: anel que esvazia, número que "salta" a cada segundo,
 * barra que drena sob o cabeçalho e alerta pulsante nos últimos 3 segundos.
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
  const urgent = !result && left > 0 && sec <= 3;
  const warn = !result && sec <= 5;
  const color = result === "ok" ? "#4ADE80" : result === "erro" ? "rgba(255,255,255,0.45)" : warn ? "#FFD60A" : "#FFFFFF";

  return (
    <>
      <span
        role="timer"
        aria-label={`${sec} segundo${sec === 1 ? "" : "s"} restantes`}
        data-testid="cronometro"
        data-urgente={urgent || undefined}
        className={`relative flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-full ${urgent ? "cd-urgente bg-black" : "bg-black/35"} ${!running && !result && left > 0 ? "opacity-80" : ""}`}
      >
        <svg viewBox="0 0 58 58" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
          <circle cx="29" cy="29" r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="4.5" />
          <circle
            cx="29"
            cy="29"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth="4.5"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C * (1 - frac)}
            style={{ transition: "stroke-dashoffset 100ms linear, stroke 300ms" }}
          />
        </svg>
        {/* Ponteiro que gira com o tempo restante */}
        {!result && left > 0 && (
          <span className="absolute inset-0" style={{ transform: `rotate(${360 * frac}deg)`, transition: "transform 100ms linear" }} aria-hidden>
            <span className="absolute left-1/2 top-[3px] h-[7px] w-[7px] -translate-x-1/2 rounded-full shadow-[0_0_8px_currentColor]" style={{ background: color, color }} />
          </span>
        )}
        <span key={sec} className={`relative text-[22px] font-black tabular-nums leading-none ${result ? "" : "cd-pop"}`} style={{ color }}>
          {sec}
        </span>
        <span className="absolute -bottom-1.5 rounded-full bg-black px-1.5 text-[8.5px] font-black uppercase tracking-[0.12em] text-white/80" aria-hidden>
          {left <= 0 && !result ? "fim" : "seg"}
        </span>
      </span>
      {/* Barra que drena sob o cabeçalho */}
      <span className="pointer-events-none absolute inset-x-0 bottom-0 h-1 bg-black/25" aria-hidden>
        <span
          className={`block h-full ${urgent ? "cd-barra" : ""}`}
          style={{ width: `${frac * 100}%`, background: color, transition: "width 100ms linear, background-color 300ms" }}
        />
      </span>
    </>
  );
}
