"use client";

import Link from "next/link";
import { forwardRef, type ComponentProps, type MouseEventHandler, type ReactNode } from "react";
import { ArrowRight, Play } from "lucide-react";
import { formatHMS } from "@/domain/study-clock";
import { useStudyClock } from "@/components/pastel/use-study-clock";
import { VozOnda } from "./voz-onda";
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

export interface AulaTopoProps {
  postit: Ferr;
  explicar: Ferr;
  pdf: Ferr;
  lousas: Ferr;
  /** o cartão do Mentor: o orbe de voz (ou o botão de repouso) vai dentro dele */
  mentor: ReactNode;
  mentorAtivo: boolean;
  mentorFala: boolean;
  onMentor: () => void;
  level: ComponentProps<typeof VozOnda>["level"];
}

const Img = ({ n, className }: { n: string; className?: string }) => (
  // eslint-disable-next-line @next/next/no-img-element -- recortes do layout aprovado (WebP em public/home/aula-topo)
  <img className={className} src={`/home/aula-topo/${n}.webp`} alt="" decoding="async" draggable={false} />
);

function Cartao({ f }: { f: Ferr }) {
  return (
    <button type="button" className={`at-cartao ${f.ligado ? "is-on" : ""}`} onMouseDown={(e) => e.preventDefault()} onClick={f.onClick} aria-label={f.aria} aria-expanded={f.expandido} title={f.tip} data-testid={f.testid}>
      <Img n={f.arte} className="at-cartao-arte" />
      <b>{f.titulo}</b>
      <span className="at-seta" aria-hidden><ArrowRight strokeWidth={2.4} /></span>
      <small className="at-so-leitor">{f.sub}</small>
      {f.badge ? <span className="at-badge" aria-hidden>{f.badge}</span> : null}
    </button>
  );
}

/**
 * Topo do modo aula (layout aprovado): marca, "Ferramentas" (post-it, explicar, PDF, lousas e Mentor) e o relógio
 * de estudo do dia com o botão "Estudo hoje". As ferramentas são as mesmas da barra compacta que aparece ao rolar.
 */
export const AulaTopo = forwardRef<HTMLElement, AulaTopoProps>(function AulaTopo({ postit, explicar, pdf, lousas, mentor, mentorAtivo, mentorFala, onMentor, level }, ref) {
  const rel = useStudyClock();
  const hora = formatHMS(rel.seconds);
  // a barra enche a cada hora de estudo líquido (volta a zero na hora cheia)
  const pct = Math.max(3, Math.min(100, ((rel.seconds % 3600) / 3600) * 100));

  return (
    <section ref={ref} className="at-topo" aria-label="Ferramentas de estudo e tempo de estudo" data-aula-topo data-st>
      <header className="at-cab">
        <Img n="caveira" className="at-marca-agua" />
        <Img n="logo" className="at-logo" />
        <p className="at-lema"><span>Disciplina hoje,</span><b>Aprovação</b> amanhã.</p>
      </header>

      <div className="at-ferr" data-testid="st-dock">
        <VozOnda level={level} active={mentorAtivo && mentorFala} />
        <div className="at-ferr-t"><Img n="chave" className="at-chave" /><h2>Ferramentas</h2><i aria-hidden /></div>
        <div className="at-grade" role="toolbar" aria-label="Barra de ferramentas de estudo">
          <Cartao f={postit} />
          <Cartao f={explicar} />
          <Cartao f={pdf} />
          <Cartao f={lousas} />
          <div className={`at-cartao at-mentor ${mentorAtivo ? "is-on" : ""}`}>
            <Img n="mentor" className="at-mentor-arte" />
            <div className="at-mentor-orbe">{mentor}</div>
            <b>Mentor</b>
            <button type="button" className="at-seta at-seta-v" onClick={onMentor} aria-label={mentorAtivo ? "Encerrar conversa com o Mentor" : "Falar com o Mentor"}><ArrowRight strokeWidth={2.4} aria-hidden /></button>
            <small className="at-so-leitor">Falar com o Mentor</small>
          </div>
        </div>
      </div>

      <div className="at-tempo" data-testid="estudo-relogio" data-pausado={rel.paused || undefined}>
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
        <div className="at-cta">
          <Link href="/meu-plano-de-estudo" className="at-botao" data-testid="estudo-hoje"><Play aria-hidden fill="currentColor" strokeWidth={0} /><span>Estudo hoje</span></Link>
          <p className="at-foque">Foque. Estude. Conquiste.</p>
        </div>
      </div>
    </section>
  );
});
