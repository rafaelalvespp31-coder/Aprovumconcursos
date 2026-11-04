"use client";

import { VozOrbe } from "@/components/mentor/voz-orbe";

/** Simula a voz do Mentor (rajadas de fala com pausas) para revisar o blob sem áudio real. */
export function VozDemo({ modo }: { modo: string }) {
  const level = () => {
    const t = performance.now() / 1000;
    if (modo === "parado") return 0;
    if (modo === "forte") return 0.95;
    const fala = Math.max(0, Math.sin(t * 1.3)) ** 0.5;
    return fala * (0.35 + 0.35 * Math.abs(Math.sin(t * 9)) + 0.2 * Math.abs(Math.sin(t * 3.7)));
  };
  return (
    <div className="voz" style={{ minHeight: 420, maxWidth: 360, margin: "24px auto" }}>
      <VozOrbe level={level} active={modo !== "parado"} />
      <p className="voz-titulo">{modo === "parado" ? "Fale com o Mentor" : "Mentor falando…"}</p>
    </div>
  );
}
