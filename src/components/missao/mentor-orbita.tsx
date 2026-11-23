"use client";

import { useEffect, useRef, useState } from "react";
import { VozEsfera } from "@/components/mentor/voz-esfera";
import type { Bands } from "@/components/mentor/skull-orb-fx";

/**
 * O Mentor da Central de Missão: só o disco preto com o anel de fogo vermelho, o mesmo das conversas por voz.
 * `energia` (0 a 1) faz o Mentor "falar" (ondas, chamas mais altas) quando o aluno confirma o concurso;
 * `voz` (0 a 1) é uma agitação leve enquanto ele digita.
 */
export function MentorOrbita({ energia = 0, voz = 0, className }: { energia?: number; voz?: number; className?: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const alvo = useRef({ energia, voz });
  const [lado, setLado] = useState(0);

  useEffect(() => {
    alvo.current = { energia, voz };
  }, [energia, voz]);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const medir = () => {
      const r = el.getBoundingClientRect();
      // o desenho (anel + chamas) ocupa cerca de 0,95 do `size`: o menor lado do palco é o limite
      const novo = Math.round((Math.min(r.width, r.height) * 1.22) / 4) * 4;
      setLado((antigo) => (antigo && Math.abs(antigo - novo) / antigo < 0.02 ? antigo : novo));
    };
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [nivel] = useState(() => (): Bands => {
    const { energia: e, voz: v } = alvo.current;
    const x = Math.min(1, e * 0.75 + v * 0.35);
    return { vol: x, low: x * 0.6, mid: x * 0.5, high: x * 0.35, me: x };
  });

  return (
    <div ref={caixa} className={`mo-caixa${className ? ` ${className}` : ""}`} aria-hidden>
      {lado > 0 && (
        <div className="mo-esfera" style={{ width: lado, height: lado }}>
          <VozEsfera level={nivel} size={lado} conn="live" resolucao={lado > 520 ? 1 : 1.5} />
        </div>
      )}
    </div>
  );
}
