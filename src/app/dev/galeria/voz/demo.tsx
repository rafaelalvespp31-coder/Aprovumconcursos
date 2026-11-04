"use client";

import { VozView, type Fase } from "@/components/mentor/voz-view";
import type { Bands } from "@/components/mentor/voz-orbe";

/** Simula a voz do Mentor (rajadas de fala com pausas) para revisar o orbe sem áudio real. */
export function VozDemo({ modo, fase }: { modo: string; fase: Fase }) {
  const level = (): Bands => {
    const t = performance.now() / 1000;
    if (modo === "parado") return { vol: 0, low: 0, mid: 0, high: 0 };
    if (modo === "forte") return { vol: 0.95, low: 0.9, mid: 0.9, high: 0.9 };
    const fala = Math.max(0, Math.sin(t * 1.3)) ** 0.5;
    const j = 0.35 + 0.35 * Math.abs(Math.sin(t * 9)) + 0.2 * Math.abs(Math.sin(t * 3.7));
    return { vol: fala * j, low: fala * (0.4 + 0.5 * Math.abs(Math.sin(t * 5))), mid: fala * j, high: fala * 0.6 * Math.abs(Math.sin(t * 11)) };
  };
  return (
    <div className="mentor-painel is-voz" style={{ position: "relative", width: 390, minHeight: 560, margin: "24px auto" }}>
      <div className="mentor-painel-topo">
        <span className="pc-ico" aria-hidden />
        <h2 id="mentor-flut-titulo" className="min-w-0 flex-1 text-white font-bold">Mentor APROVUM</h2>
      </div>
      <div className="mentor-abas">
        <button className="">Prioridades (3)</button>
        <button>Conversar</button>
        <button className="is-on">Voz</button>
      </div>
      <div className="mentor-painel-corpo">
        <VozView fase={fase} left={110} limit={180} speaking={modo !== "parado"} msg={null} level={level} onStart={() => {}} onStop={() => {}} />
      </div>
    </div>
  );
}
