"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

import { APPROVAL_BANNERS, type ApprovalBanner } from "./approval-banners";

export type { ApprovalBanner };

const INTERVAL_MS = 3000;

/**
 * Reveza o banner da marca (primeiro slide, que dá a altura) com os banners de aprovação,
 * a cada 3 segundos, com transição suave. Pausa com a aba oculta e no botão de pausa;
 * os pontos levam direto a cada banner (e a contagem recomeça dali).
 */
export function BannerRotator({ children, banners = APPROVAL_BANNERS, className = "" }: { children: ReactNode; banners?: ApprovalBanner[]; className?: string }) {
  const total = banners.length + 1;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mov, setMov] = useState(false); // só anima a troca depois da primeira mudança (sem efeito ao carregar)

  useEffect(() => {
    const on = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const running = !paused && !hidden && total > 1;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => {
      setMov(true);
      setIndex((i) => (i + 1) % total);
    }, INTERVAL_MS);
    return () => clearTimeout(t);
  }, [running, index, total]);

  return (
    <div
      className={`banner-rotator relative ${className}`}
      role="region"
      aria-roledescription="carrossel"
      aria-label="Banners do APROVUM"
      data-testid="banner-rotator"
      data-slide={index}
      data-mov={mov ? "1" : undefined}
      data-formato={index === 0 ? "marca" : "largo"}
    >
      {/* Slide 0: banner da marca (fica no fluxo e define a altura) */}
      <div className="br-slide br-slide-base" data-ativo={index === 0 ? "1" : "0"} aria-hidden={index !== 0} inert={index !== 0}>
        {children}
      </div>

      {banners.map((b, i) => {
        const on = index === i + 1;
        return (
          <div key={b.src} className="br-slide br-slide-aprovado" data-ativo={on ? "1" : "0"} aria-hidden={!on} inert={!on} data-testid="banner-aprovado">
            {/* Fundo: a própria arte ampliada e desfocada (sem faixas vazias) */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={b.srcSm} alt="" className="br-fundo" loading="lazy" decoding="async" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={b.src}
              srcSet={`${b.srcSm} 1000w, ${b.src} 2000w`}
              sizes="(min-width: 1024px) 1200px, 100vw"
              width={2000}
              height={711}
              alt={b.alt}
              className="br-arte"
              loading="lazy"
              decoding="async"
            />
          </div>
        );
      })}

      {/* Corte cinematográfico: feixe de luz varrendo a tela junto com a cortina diagonal + clarão quente. */}
      {mov && (
        <span key={index} className="br-corte" aria-hidden>
          <i className="br-feixe" />
          <i className="br-luz" />
        </span>
      )}

      <div className="br-controles">
        <div className="br-pontos" role="group" aria-label="Escolher banner">
          {Array.from({ length: total }, (_, i) => (
            <button key={i} type="button" aria-label={`Mostrar banner ${i + 1} de ${total}`} aria-current={index === i ? "true" : undefined} onClick={() => {
                setMov(true);
                setIndex(i);
              }} />
          ))}
        </div>
        <button type="button" className="br-pausa" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Retomar troca automática dos banners" : "Pausar troca automática dos banners"}>
          {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
