"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronRight, Quote, Target } from "lucide-react";
import { aparelhoLeve, useParallax } from "./movimento";

const FRASES = ["Disciplina é o que te leva até o final.", "Constância vence o talento que não treina.", "Cada aula concluída é um passo a menos até a posse."];

/** Banner cinematográfico: planos com profundidade, fumaça e luz vermelha que passa uma vez na entrada. */
export function EstudoHero({ continueHref, continueLabel }: { continueHref: string | null; continueLabel: string }) {
  const ref = useRef<HTMLElement>(null);
  const [frase, setFrase] = useState(0);
  const [leve, setLeve] = useState(false);
  useParallax(ref);
  useEffect(() => {
    const raf = requestAnimationFrame(() => setLeve(aparelhoLeve()));
    // As frases giram sozinhas uma única volta; depois, só pelo toque (nada fica animando para sempre).
    let voltas = 0;
    const id = window.setInterval(() => {
      if (document.hidden) return;
      voltas++;
      setFrase((f) => (f + 1) % FRASES.length);
      if (voltas >= FRASES.length) window.clearInterval(id);
    }, 6500);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, []);
  return (
    <section ref={ref} className={`me-hero${leve ? " me-leve" : ""}`} aria-labelledby="me-titulo">
      <div className="me-hero-arte" aria-hidden>
        <picture>
          <source media="(max-width: 639px)" srcSet="/estudo/hero-tatico-sm.webp" />
          <img src="/estudo/hero-tatico.webp" alt="" width={808} height={572} decoding="async" fetchPriority="high" />
        </picture>
      </div>
      <span className="me-hero-fumaca" aria-hidden />
      <span className="me-hero-faixa" aria-hidden />
      <span className="me-hero-luz" aria-hidden />
      {!leve && (
        <span className="me-hero-poeira" aria-hidden>
          <i /><i /><i /><i /><i /><i />
        </span>
      )}
      <div className="me-hero-txt">
        <span className="me-chip"><Target size={15} aria-hidden /> CENTRAL DE ESTUDOS</span>
        <h1 id="me-titulo">Meu <span>Estudo</span></h1>
        <p className="me-hero-sub">Sua jornada rumo à aprovação, ainda mais focada.</p>
        <div className="me-frase">
          <span className="me-frase-aspas" aria-hidden><Quote size={14} /></span>
          <blockquote key={frase} aria-live="off">
            “{FRASES[frase]}”
            <cite>APROVUM</cite>
          </blockquote>
        </div>
        <div className="me-hero-pe">
          <div className="me-pontos" role="tablist" aria-label="Frases">
            {FRASES.map((_, i) => (
              <button key={i} type="button" role="tab" aria-selected={i === frase} aria-label={`Frase ${i + 1}`} onClick={() => setFrase(i)} />
            ))}
          </div>
          {continueHref && <Link href={continueHref} className="me-continuar">{continueLabel} <ChevronRight size={15} aria-hidden /></Link>}
        </div>
      </div>
      <p className="me-lema" aria-hidden>ESTUDE.<br />EVOLUA.<br /><b>CONQUISTE.</b></p>
    </section>
  );
}
