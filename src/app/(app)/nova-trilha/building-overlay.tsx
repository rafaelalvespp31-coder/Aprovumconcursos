"use client";

import { useEffect, useState } from "react";

const STEPS = [
  "Analisando o tema",
  "Organizando o conteúdo em blocos",
  "Preparando exemplos práticos",
  "Separando as questões por dificuldade",
  "Finalizando sua aula",
];

/** Tela de preparação da aula: suave, com etapas aparecendo uma a uma. */
export function BuildingOverlay({ topic, durationMs }: { topic: string; durationMs: number }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(4);

  useEffect(() => {
    const per = durationMs / STEPS.length;
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i), i * per));
    const start = Date.now();
    const tick = setInterval(() => {
      // aproxima de 96% e só completa quando a página muda
      const t = Math.min(1, (Date.now() - start) / durationMs);
      setProgress(4 + 92 * (1 - Math.pow(1 - t, 2)));
    }, 60);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tick);
    };
  }, [durationMs]);


  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-white/80 px-4 backdrop-blur-md entrar" role="status" aria-live="polite" data-testid="montando-aula">
      <div className="w-full max-w-md rounded-[22px] border border-[#ECECEC] bg-white p-6 shadow-[0_24px_70px_rgba(0,0,0,0.14)]">
        <div className="flex items-center gap-4">
          <div className="relative size-14 shrink-0" aria-hidden>
            <span className="absolute inset-0 animate-ping rounded-full bg-[#FF2A2A]/25 [animation-duration:2.2s]" />
            <span className="absolute inset-1 rounded-full bg-[conic-gradient(from_0deg,#FF2A2A,#8a0303,#FF2A2A)] animate-spin [animation-duration:3s]" />
            <span className="absolute inset-[7px] flex items-center justify-center rounded-full bg-white text-[20px]">✦</span>
          </div>
          <div className="min-w-0">
            <p className="font-[Space_Grotesk] text-[18px] font-bold leading-tight">Montando sua aula</p>
            <p className="truncate text-[13px] text-[#5C5C5C]">{topic}</p>
          </div>
        </div>

        <p className="mt-5 min-h-6 text-[15px] font-semibold text-[#0A0A0A]">
          <TypedLine key={step} text={`${STEPS[step]}…`} />
          <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] animate-pulse bg-[#E10600]" aria-hidden />
        </p>

        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F1F1F1]">
          <div className="h-full rounded-full bg-gradient-to-r from-[#FF2A2A] to-[#8a0303] transition-[width] duration-200 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <ol className="mt-5 flex flex-col gap-2.5">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s} className={`flex items-center gap-3 text-[14px] transition-all duration-500 ${i > step ? "translate-y-1 opacity-35" : "opacity-100"}`}>
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold transition-colors duration-500 ${
                    done ? "bg-[#15803d] text-white" : active ? "bg-[#E10600] text-white" : "bg-[#F1F1F1] text-[#8C8C8C]"
                  }`}
                  aria-hidden
                >
                  {done ? "✓" : i + 1}
                </span>
                <span className={active ? "font-semibold" : done ? "text-[#404040]" : "text-[#8C8C8C]"}>{s}</span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** Escreve o texto letra por letra (remontado a cada etapa pela key). */
function TypedLine({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 28);
    return () => clearInterval(id);
  }, [text]);
  return <>{text.slice(0, n)}</>;
}
