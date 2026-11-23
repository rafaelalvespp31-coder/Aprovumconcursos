"use client";

import { useEffect, useRef, useState } from "react";
import { VozEsfera } from "@/components/mentor/voz-esfera";
import type { Bands } from "@/components/mentor/skull-orb-fx";
import type { Cena } from "./mentor-cena";

/** Raio do anel do Mentor em unidades da cena (as chamas vão até ~1,4x isso; o anel mais interno da órbita tem 1,62). */
const RAIO_MUNDO = 1.15;
/** O anel do Mentor tem raio de 34% do `size` que ele recebe. */
const FRACAO = 0.34;

/**
 * O Mentor (disco preto com anel de fogo vermelho) no meio da órbita de energia.
 * A órbita (anéis, nós e partículas) é uma cena three.js carregada só no navegador, depois da primeira pintura;
 * o disco de fogo é o mesmo Mentor das conversas por voz. `energia` (0 a 1) acende a órbita e faz a esfera "falar"
 * quando o aluno confirma o concurso; `voz` (0 a 1) é uma agitação leve enquanto ele digita.
 */
export function MentorOrbita({ energia = 0, voz = 0, className }: { energia?: number; voz?: number; className?: string }) {
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const cena = useRef<Cena | null>(null);
  const alvo = useRef({ energia, voz });
  const [semWebgl, setSemWebgl] = useState(false);
  const [lado, setLado] = useState(0);

  useEffect(() => {
    alvo.current = { energia, voz };
    cena.current?.energia(energia);
  }, [energia, voz]);

  useEffect(() => {
    const el = caixa.current;
    const canvas = tela.current;
    if (!el || !canvas) return;
    let vivo = true;
    let c: Cena | null = null;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const medir = () => {
      const r = el.getBoundingClientRect();
      // sem a cena ainda: a esfera ocupa uma fração razoável do menor lado
      const px = c ? c.pxPorUnidade() * RAIO_MUNDO : Math.min(r.width, r.height) * 0.27;
      const novo = Math.round((px / FRACAO) / 4) * 4;
      setLado((antigo) => (antigo && Math.abs(antigo - novo) / antigo < 0.02 ? antigo : novo));
    };
    medir();

    import("./mentor-cena")
      .then(({ criarCena }) => {
        if (!vivo) return;
        const nova = criarCena({ canvas, movimentoReduzido: reduzido, semMentor: true });
        if (!nova) {
          setSemWebgl(true);
          return;
        }
        c = nova;
        cena.current = nova;
        nova.energia(alvo.current.energia);
        medir();
      })
      .catch(() => vivo && setSemWebgl(true));

    const ro = new ResizeObserver(() => {
      c?.redimensionar();
      medir();
    });
    ro.observe(el);
    const io = new IntersectionObserver(([e]) => (e?.isIntersecting ? c?.retomar() : c?.pausar()));
    io.observe(el);
    const vis = () => (document.hidden ? c?.pausar() : c?.retomar());
    document.addEventListener("visibilitychange", vis);

    return () => {
      vivo = false;
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", vis);
      c?.destruir();
      cena.current = null;
    };
  }, []);

  const [nivel] = useState(() => (): Bands => {
    const { energia: e, voz: v } = alvo.current;
    const x = Math.min(1, e * 0.75 + v * 0.35);
    return { vol: x, low: x * 0.6, mid: x * 0.5, high: x * 0.35, me: x };
  });

  return (
    <div ref={caixa} className={`mo-caixa${className ? ` ${className}` : ""}`} aria-hidden>
      {semWebgl ? (
        <div className="mo-aneis">
          <i /><i /><i />
        </div>
      ) : (
        <canvas ref={tela} className="mo-cena" />
      )}
      {lado > 0 && (
        <div className="mo-esfera" style={{ width: lado, height: lado }}>
          <VozEsfera level={nivel} size={lado} conn="live" resolucao={lado > 520 ? 1 : 1.5} />
        </div>
      )}
    </div>
  );
}
