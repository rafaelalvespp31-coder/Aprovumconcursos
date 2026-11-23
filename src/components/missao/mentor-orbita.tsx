"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { VozEsfera } from "@/components/mentor/voz-esfera";
import type { Bands, Conexao } from "@/components/mentor/skull-orb-fx";

/**
 * O Mentor da Central de Missão: só o disco preto com o anel de fogo vermelho, o mesmo das conversas por voz.
 * Em conversa, `fonte` entrega a energia real do áudio (a voz do Mentor e o microfone) e o fogo acompanha cada sílaba.
 * `energia` (0 a 1) faz o Mentor "falar" ao confirmar o concurso e `voz` é uma agitação leve enquanto o aluno digita.
 */
export function MentorOrbita({ energia = 0, voz = 0, conn = "live", fonte, className }: { energia?: number; voz?: number; conn?: Conexao; fonte?: RefObject<(() => Bands) | null>; className?: string }) {
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
    const real = fonte?.current?.();
    if (!real) return { vol: x, low: x * 0.6, mid: x * 0.5, high: x * 0.35, me: x };
    return { ...real, vol: Math.max(real.vol, x), me: Math.max(real.me ?? real.vol, x) };
  });

  return (
    <div ref={caixa} className={`mo-caixa${className ? ` ${className}` : ""}`} aria-hidden>
      {lado > 0 && (
        <div className="mo-esfera" style={{ width: lado, height: lado }}>
          <VozEsfera level={nivel} size={lado} conn={conn} resolucao={lado > 520 ? 1 : 1.5} />
        </div>
      )}
    </div>
  );
}
