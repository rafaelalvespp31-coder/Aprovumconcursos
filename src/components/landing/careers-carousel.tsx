"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { BadgeCheck, BookOpen, ChevronLeft, ChevronRight, Flame, Gavel, Landmark, Scale, Shield, ShieldCheck, Siren, Star } from "lucide-react";

type Slide = { kicker: string; title: [string, string]; items: Array<{ label: string; icon: LucideIcon }> };

/** Sem brasões oficiais: cada carreira aparece com um ícone genérico. */
const SLIDES: Slide[] = [
  {
    kicker: "Carreiras policiais",
    title: ["Seu futuro", "é uma escolha."],
    items: [
      { label: "PRF", icon: ShieldCheck },
      { label: "GCM", icon: Shield },
      { label: "PM", icon: Star },
      { label: "PC", icon: BadgeCheck },
      { label: "Bombeiros", icon: Flame },
    ],
  },
  {
    kicker: "Segurança pública",
    title: ["Estude o que", "cai na sua prova."],
    items: [
      { label: "Polícia Penal", icon: Shield },
      { label: "Polícia Federal", icon: ShieldCheck },
      { label: "Polícia Civil", icon: BadgeCheck },
      { label: "Polícia Militar", icon: Star },
      { label: "Guarda Municipal", icon: Siren },
    ],
  },
  {
    kicker: "Matérias do catálogo",
    title: ["Direito para", "concursos."],
    items: [
      { label: "Constitucional", icon: Landmark },
      { label: "Penal", icon: Scale },
      { label: "Processo Penal", icon: Gavel },
      { label: "Administrativo", icon: BookOpen },
      { label: "Legislação especial", icon: Shield },
    ],
  },
];

/**
 * Banner de carreiras em carrossel: setas, pontos, arrastar no celular (rolagem nativa
 * com encaixe) e troca automática suave — desligada para quem prefere menos movimento
 * e pausada enquanto o usuário interage.
 */
export function CareersCarousel({ ctaHref }: { ctaHref: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const n = (i + SLIDES.length) % SLIDES.length;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: n * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
    setIndex(n);
  };

  useEffect(() => {
    if (paused || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => go(index + 1), 7000);
    return () => clearInterval(t);
  });

  return (
    <section
      className="lp-carreiras"
      aria-roledescription="carrossel"
      aria-label="Carreiras e matérias"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      data-testid="carrossel-carreiras"
    >
      <div className="lp-carreiras-arte" aria-hidden />
      <div ref={track} className="lp-carreiras-trilho">
        {SLIDES.map((s, i) => (
          <div key={s.kicker} className="lp-slide" role="group" aria-roledescription="slide" aria-label={`${i + 1} de ${SLIDES.length}: ${s.kicker}`} aria-hidden={i !== index}>
            <div className="lp-slide-texto">
              <p className="lp-slide-kicker">{s.kicker}</p>
              <h2 className="lp-slide-titulo">
                {s.title[0]}
                <br />
                {s.title[1]}
              </h2>
              <Link href={ctaHref} className="lp-slide-cta" tabIndex={i === index ? 0 : -1}>
                Conquiste sua vaga
              </Link>
            </div>
            <ul className="lp-slide-itens">
              {s.items.map(({ label, icon: Icon }) => (
                <li key={label}>
                  <Icon className="lp-slide-icone" aria-hidden />
                  <span>{label}</span>
                </li>
              ))}
              <li className="lp-slide-mais">
                <span>E muito mais…</span>
              </li>
            </ul>
          </div>
        ))}
      </div>
      <button type="button" className="lp-seta lp-seta-esq" onClick={() => go(index - 1)} aria-label="Anterior">
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button type="button" className="lp-seta lp-seta-dir" onClick={() => go(index + 1)} aria-label="Próximo">
        <ChevronRight className="size-5" aria-hidden />
      </button>
      <div className="lp-pontos" role="tablist" aria-label="Escolher slide">
        {SLIDES.map((s, i) => (
          <button key={s.kicker} type="button" role="tab" aria-selected={i === index} aria-label={`Slide ${i + 1}: ${s.kicker}`} onClick={() => go(i)} />
        ))}
      </div>
    </section>
  );
}
