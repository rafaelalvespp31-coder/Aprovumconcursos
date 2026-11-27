"use client";

import { forwardRef, useCallback, useEffect, useId, useRef, type MouseEventHandler, type MutableRefObject, type ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { formatHMS } from "@/domain/study-clock";
import { useStudyClock } from "@/components/pastel/use-study-clock";
import type { Bands } from "@/components/mentor/skull-orb-fx";
import { iniciarVozRadio } from "./voz-radio";
import "./aula-topo.css";

type Ferr = {
  /** ícone recortado do layout aprovado (public/home/aula-topo) */
  arte: string;
  titulo: string;
  sub: string;
  ligado?: boolean;
  badge?: number;
  expandido?: boolean;
  aria: string;
  tip: string;
  testid: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
};

export interface AulaFerramentasProps {
  /** sem cabeçalho fixo da página para acoplar: a barra fica presa ao topo da tela */
  solta?: boolean;
  postit: Ferr;
  explicar: Ferr;
  pdf: Ferr;
  lousas: Ferr;
  /** o cartão do Mentor: o orbe de voz (ou o botão de repouso) vai dentro dele */
  mentor: ReactNode;
  mentorAtivo: boolean;
  mentorFala: boolean;
  onMentor: () => void;
  /** Professor ("o") ou Professora ("a") Aprovum escolhido; null = ainda não escolheu. */
  professor: "a" | "o" | null;
  onProfessor: (p: "a" | "o") => void;
  level: MutableRefObject<(() => Bands) | null>;
}

const Img = ({ n, className }: { n: string; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element -- recortes do layout aprovado (WebP em public/home/aula-topo)
  <img className={className} src={`/home/aula-topo/${n}.webp`} alt="" decoding="async" draggable={false} />
);

function Cartao({ f, i, radio }: { f: Ferr; i: number; radio?: boolean }) {
  return (
    <button type="button" className={`at-cartao ${f.ligado ? "is-on" : ""}`} style={{ "--bi": `var(--b${i}, 0)` } as React.CSSProperties} onMouseDown={(e) => e.preventDefault()} onClick={f.onClick} aria-label={f.aria} aria-expanded={f.expandido} title={f.tip} data-testid={f.testid}>
      {radio ? <canvas className="at-radio" aria-hidden /> : null}
      <Img n={f.arte} className="at-cartao-arte" />
      <b>{f.titulo}</b>
      <span className="at-seta" aria-hidden><ArrowRight strokeWidth={2.4} /></span>
      <small className="at-so-leitor">{f.sub}</small>
      {f.badge ? <span className="at-badge" aria-hidden>{f.badge}</span> : null}
    </button>
  );
}

/**
 * Barra de ferramentas da aula (layout aprovado), acoplada ao cabeçalho fixo da plataforma: post-it, explicar, PDF,
 * lousas e Mentor. No celular os cinco cartões dividem a largura da tela, sem rolar para o lado.
 */
export const AulaFerramentas = forwardRef<HTMLDivElement, AulaFerramentasProps>(function AulaFerramentas({ solta, postit, explicar, pdf, lousas, mentor, mentorAtivo, mentorFala, onMentor, level, professor, onProfessor }, ref) {
  const raiz = useRef<HTMLDivElement | null>(null);
  const esfera = useRef<HTMLVideoElement>(null);
  const turb = useRef<SVGFETurbulenceElement>(null);
  const desloc = useRef<SVGFEDisplacementMapElement>(null);
  const filtroId = `atdef${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const juntar = useCallback((el: HTMLDivElement | null) => {
    raiz.current = el;
    if (typeof ref === "function") ref(el); else if (ref) ref.current = el;
  }, [ref]);

  // com o Mentor em conversa: a esfera, o sinal de rádio e os cartões seguem a voz (energia real do áudio)
  useEffect(() => {
    if (!mentorAtivo || !raiz.current) return;
    return iniciarVozRadio({ raiz: raiz.current, esfera: esfera.current, turbulencia: turb.current, deslocamento: desloc.current, filtroId, level });
  }, [mentorAtivo, level, filtroId]);

  return (
    <div ref={juntar} className={`at-ferr ${solta ? "is-solta" : ""} ${mentorAtivo ? "is-ativo" : ""} ${mentorAtivo && mentorFala ? "is-fala" : ""}`} data-st data-testid="st-dock">
      <svg className="at-so-leitor" width="0" height="0" aria-hidden focusable="false">
        <filter id={filtroId} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feTurbulence ref={turb} type="fractalNoise" baseFrequency="0.03 0.034" numOctaves="2" seed="3" result="n" />
          <feDisplacementMap ref={desloc} in="SourceGraphic" in2="n" scale="0" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>
      <div className="at-ferr-t"><Img n="chave" className="at-chave" /><h2>Barra de ferramentas</h2></div>
      <div className="at-grade" role="toolbar" aria-label="Barra de ferramentas de estudo">
        <Cartao f={postit} i={0} radio={mentorAtivo} />
        <Cartao f={explicar} i={1} radio={mentorAtivo} />
        <Cartao f={pdf} i={2} radio={mentorAtivo} />
        <Cartao f={lousas} i={3} radio={mentorAtivo} />
        <div className="at-mentor-col">
          <div className={`at-cartao at-mentor ${mentorAtivo ? "is-on" : ""}`} style={{ "--bi": "var(--b4, 0)" } as React.CSSProperties}>
            {/* a mesma esfera da Central de Missão (gravada da própria cena: anel de fogo e fumaça), em laço contínuo; com o Mentor falando ela pulsa e deforma com a voz */}
            <video ref={esfera} className="at-esfera" src="/home/aula-topo/esfera.mp4" poster="/home/aula-topo/esfera.webp" autoPlay loop muted playsInline preload="auto" aria-hidden tabIndex={-1} />
            <div className="at-mentor-orbe">{mentor}</div>
            <b>Mentor</b>
            <button type="button" className="at-seta at-seta-v" onClick={onMentor} aria-label={mentorAtivo ? "Encerrar conversa com o Mentor" : "Falar com o Mentor"}><ArrowRight strokeWidth={2.4} aria-hidden /></button>
            <small className="at-so-leitor">Falar com o Mentor</small>
          </div>
          {/* escolha do professor, miniatura sob a esfera: o selecionado pisca em vermelho */}
          <div className="at-prof" role="radiogroup" aria-label="Professor ou professora Aprovum">
            {([["o", "Professor", "Prof."], ["a", "Professora", "Profa."]] as const).map(([k, longo, curto]) => (
              <button key={k} type="button" role="radio" aria-checked={professor === k} className={`at-prof-b ${professor === k ? "is-sel" : ""}`} onClick={() => onProfessor(k)} data-testid={`prof-${k}`} title={`${longo} Aprovum`}>
                <i aria-hidden />
                <span className="at-prof-l">{longo}</span><span className="at-prof-c">{curto}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

/** Tempo de estudo do dia (ampulheta, cronômetro, barra da hora e situação), em tamanho compacto. */
export function AulaTempo() {
  const rel = useStudyClock();
  const hora = formatHMS(rel.seconds);
  // a barra enche a cada hora de estudo líquido (volta a zero na hora cheia)
  const pct = Math.max(3, Math.min(100, ((rel.seconds % 3600) / 3600) * 100));
  return (
    <section className="at-tempo" aria-label="Tempo de estudo" data-aula-topo data-testid="estudo-relogio" data-pausado={rel.paused || undefined}>
      <Img n="ampulheta" className="at-ampulheta" />
      <div className="at-relogio" role="timer" aria-live="off" aria-label={`Estudo líquido hoje: ${hora}${rel.paused ? ", pausado por inatividade" : ""}`}>
        <p className="at-rot">
          <svg viewBox="0 0 24 24" aria-hidden><circle cx="12" cy="12" r="9.2" fill="none" stroke="#161616" strokeWidth="2.2" /><path d="M12 12 V4.6 A7.4 7.4 0 0 1 18.2 8 Z" fill="#e10600" /><circle cx="12" cy="12" r="1.6" fill="#161616" /></svg>
          Tempo de estudo
        </p>
        <p className="at-hora">{hora}</p>
        <span className="at-barra" aria-hidden><i style={{ width: `${pct}%` }} /></span>
        <p className={`at-chip ${rel.paused ? "is-pausa" : ""}`}><i aria-hidden />{rel.paused ? "Pausado (inativo)" : "Estudando agora"}</p>
      </div>
    </section>
  );
}
