"use client";

import { useEffect, useRef, useState } from "react";
import { COOKIE_INTRO } from "./intro-constantes";
import "./intro-mentor.css";

/**
 * Abertura antes da Central: o retrato e o "Começar a estudar". Ao tocar, a câmera avança contra o rosto, a onda de
 * choque sai do botão, o clarão vermelho cobre a tela e a Central do Mentor emerge do preto.
 */
export function IntroMentor({ aoRevelar, aoFim }: { aoRevelar: () => void; aoFim: () => void }) {
  const [etapa, setEtapa] = useState<"espera" | "indo" | "revela">("espera");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const comecar = () => {
    if (etapa !== "espera") return;
    try { document.cookie = `${COOKIE_INTRO}=1; path=/; SameSite=Lax`; } catch { /* sem cookies: a abertura volta na próxima visita */ }
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setEtapa("indo");
    if (navigator.vibrate) { try { navigator.vibrate(18); } catch { /* sem vibração */ } }
    const tRevela = reduzir ? 140 : 1350;
    timers.current.push(setTimeout(() => { setEtapa("revela"); aoRevelar(); }, tRevela));
    timers.current.push(setTimeout(aoFim, tRevela + (reduzir ? 260 : 900)));
  };

  return (
    <div className="hm-intro" data-etapa={etapa} role="region" aria-label="Abertura">
      <div className="hm-intro-fundo" aria-hidden />
      <div className="hm-intro-cena">
        <div className="hm-intro-zoom">
          {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa da abertura; WebP já otimizado em public/home */}
          <img className="hm-intro-arte" src="/home/intro-mentor.webp" alt="Mentor Aprovum, de braços cruzados, pronto para começar" width={941} height={1672} fetchPriority="high" decoding="async" />
          <button type="button" className="hm-intro-botao" onClick={comecar} disabled={etapa !== "espera"} aria-label="Começar a estudar">
            <span className="hm-intro-brilho" aria-hidden />
          </button>
        </div>
      </div>
      <div className="hm-intro-linhas" aria-hidden />
      <div className="hm-intro-onda" aria-hidden />
      <div className="hm-intro-clarao" aria-hidden />
      <div className="hm-intro-barra hm-intro-barra-c" aria-hidden />
      <div className="hm-intro-barra hm-intro-barra-b" aria-hidden />
      <div className="hm-intro-preto" aria-hidden />
    </div>
  );
}
