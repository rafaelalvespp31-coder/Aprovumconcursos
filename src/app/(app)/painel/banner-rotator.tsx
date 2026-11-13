"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { APPROVAL_BANNERS, type ApprovalBanner } from "./approval-banners";

export type { ApprovalBanner };

const INTERVAL_MS = 3000;

/**
 * Reveza o banner da marca (primeiro slide, que dá a altura) com os banners de aprovação,
 * a cada 3 segundos, com transição suave. Pausa só com a aba oculta;
 * sem pontos nem botão de pausa por cima da arte.
 */
export function BannerRotator({ children, banners = APPROVAL_BANNERS, className = "" }: { children: ReactNode; banners?: ApprovalBanner[]; className?: string }) {
  const total = banners.length + 1;
  const [index, setIndex] = useState(0);
  const [hidden, setHidden] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const [mov, setMov] = useState(false); // só anima a troca depois da primeira mudança (sem efeito ao carregar)

  useEffect(() => {
    const on = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const running = !hidden && total > 1;
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
      ref={box}
      onPointerMove={(e) => {
        // Paralaxe do ponteiro: posição relativa ao centro (-1..1); as camadas se movem em profundidades diferentes.
        if (e.pointerType !== "mouse") return;
        const el = box.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        el.style.setProperty("--px", (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
        el.style.setProperty("--py", (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
      }}
      onPointerLeave={() => {
        box.current?.style.setProperty("--px", "0");
        box.current?.style.setProperty("--py", "0");
      }}
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
    </div>
  );
}
