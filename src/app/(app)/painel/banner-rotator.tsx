"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";

export interface ApprovalBanner {
  src: string;
  srcSm: string;
  /** Texto alternativo: o que a arte diz (nome do aluno e onde foi aprovado). */
  alt: string;
}

/** Banners de aprovação de alunos (artes fornecidas pela equipe APROVUM). */
export const APPROVAL_BANNERS: ApprovalBanner[] = [
  {
    src: "/images/aprovados/william-abreu.webp",
    srcSm: "/images/aprovados/william-abreu-sm.webp",
    alt: "Nosso aluno aprovado William Abreu. Aprovado em: GCM BH (Guarda Civil Municipal), PMPA (Polícia Militar do Pará), Socioeducativo MG, Polícia Penal MG, STM (Superior Tribunal Militar), TRT10 e TRF6. Disciplina + foco + resultado.",
  },
  {
    src: "/images/aprovados/fabio-bezerra.webp",
    srcSm: "/images/aprovados/fabio-bezerra-sm.webp",
    alt: "Nosso aluno aprovado Fábio Bezerra. Aprovado em: Polícia Penal MG, Polícia Militar RJ e Guarda Municipal de Nova Iguaçu. Disciplina + foco + resultado.",
  },
  {
    src: "/images/aprovados/rafael-alves.webp",
    srcSm: "/images/aprovados/rafael-alves-sm.webp",
    alt: "Nosso aluno aprovado Rafael Alves. Aprovado em: GCM São Gonçalo (RJ), Polícia Militar RJ e Polícia Penal MG. Disciplina + foco + resultado.",
  },
];

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

  useEffect(() => {
    const on = () => setHidden(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  const running = !paused && !hidden && total > 1;
  useEffect(() => {
    if (!running) return;
    const t = setTimeout(() => setIndex((i) => (i + 1) % total), INTERVAL_MS);
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

      <div className="br-controles">
        <div className="br-pontos" role="group" aria-label="Escolher banner">
          {Array.from({ length: total }, (_, i) => (
            <button key={i} type="button" aria-label={`Mostrar banner ${i + 1} de ${total}`} aria-current={index === i ? "true" : undefined} onClick={() => setIndex(i)} />
          ))}
        </div>
        <button type="button" className="br-pausa" onClick={() => setPaused((p) => !p)} aria-label={paused ? "Retomar troca automática dos banners" : "Pausar troca automática dos banners"}>
          {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
        </button>
      </div>
    </div>
  );
}
