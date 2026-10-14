"use client";

import { useEffect, useState } from "react";

/** Frases originais do APROVUM (sem autoria atribuída). */
const FRASES = [
  "Disciplina vence talento.",
  "Hoje é dia de subir de nível.",
  "Cada questão te aproxima da posse.",
  "Constância é a sua melhor arma.",
  "Quem treina, aprova.",
  "Um artigo por vez, uma vitória por dia.",
  "O cansaço passa. A aprovação fica.",
  "Sua vaga está sendo disputada agora.",
  "Foco na missão, não na desculpa.",
  "A farda começa nos livros.",
];

/** Fonte + cor de cada frase: alterna estilos, sempre em preto ou vermelho. */
const ESTILOS = [
  "font-stencil text-[#D90A00] tracking-[0.02em]",
  "font-[Space_Grotesk] font-[800] text-[#0A0A0A]",
  "font-hud font-bold uppercase tracking-[0.08em] text-[#D90A00]",
  "font-serif italic font-semibold text-[#0A0A0A]",
  "font-[Space_Grotesk] font-[800] uppercase text-[#D90A00]",
  "font-hud font-semibold text-[#0A0A0A]",
];

export function RotatingQuote({ className = "" }: { className?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    // Troca a cada 4,5 s, passando por todas as frases.
    const t = setInterval(() => setI((n) => (n + 1) % FRASES.length), 4500);
    return () => clearInterval(t);
  }, []);
  return (
    <span className={`relative block min-w-0 overflow-hidden ${className}`} aria-live="off" data-testid="frase-motivacional">
      <span key={i} className={`frase-in block truncate ${ESTILOS[i % ESTILOS.length]}`}>{FRASES[i]}</span>
    </span>
  );
}
