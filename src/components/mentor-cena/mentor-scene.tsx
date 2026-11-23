"use client";

import { useEffect, useRef, type RefObject } from "react";
import type { Bands } from "@/components/mentor/skull-orb-fx";
import type { FaseMentor } from "@/components/missao/falar-mentor";
import type { MotorCena } from "./mentor-engine";

export interface MentorSceneProps {
  fase: FaseMentor;
  /** energia real do áudio (microfone e voz do Mentor), vinda do sistema de conversa */
  fonte: RefObject<(() => Bands) | null>;
  pausado?: boolean;
  /** WebGL indisponível ou perdido: a página volta para a esfera 2D */
  aoFalha: () => void;
  aoPronto?: () => void;
}

/** Camada 3D da cena: carrega o motor (three.js) sob demanda e o liga ao estado real do Mentor. */
export function MentorScene({ fase, fonte, pausado = false, aoFalha, aoPronto }: MentorSceneProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const motor = useRef<MotorCena | null>(null);
  const faseRef = useRef(fase);
  const falhaRef = useRef(aoFalha);
  const prontoRef = useRef(aoPronto);
  const pausaRef = useRef(pausado);
  useEffect(() => { faseRef.current = fase; falhaRef.current = aoFalha; prontoRef.current = aoPronto; pausaRef.current = pausado; });

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let vivo = true;
    (async () => {
      try {
        const { criarMotor } = await import("./mentor-engine");
        if (!vivo) return;
        const reduzir = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
        const m = criarMotor(canvas, { fonte, reduzirMovimento: reduzir, matteUrl: "/home/mentor-matte.webp", aoFalha: () => falhaRef.current(), aoPronto: () => prontoRef.current?.() });
        if (!vivo) { m.liberar(); return; }
        motor.current = m;
        m.definirFase(faseRef.current);
        m.pausar(pausaRef.current);
        // só em desenvolvimento: deixa o testador ler o nível de qualidade e a contagem de quadros
        if (process.env.NODE_ENV !== "production") (window as unknown as { __mentorCena?: MotorCena }).__mentorCena = m;
      } catch {
        if (vivo) falhaRef.current();
      }
    })();
    return () => { vivo = false; motor.current?.liberar(); motor.current = null; };
  }, [fonte]);

  useEffect(() => { motor.current?.definirFase(fase); }, [fase]);
  useEffect(() => { motor.current?.pausar(pausado); }, [pausado]);

  return <canvas ref={ref} className="hm-3d" aria-hidden />;
}
