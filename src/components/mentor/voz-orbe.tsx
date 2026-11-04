"use client";

import { useEffect, useRef } from "react";

/**
 * Blob luminoso do Mentor por voz (ciano, azul e magenta sobre preto). A energia vem do áudio
 * real: quando o Mentor fala, o blob cresce, deforma e gira no ritmo da voz; ao ouvir o aluno,
 * reage mais de leve ao microfone; parado, respira devagar.
 */
const BLOBS = [
  { c: "0,229,255", a: 0.0, r: 0.34, o: 0.2, f: 1.0 },
  { c: "59,130,246", a: 2.1, r: 0.37, o: 0.22, f: 0.8 },
  { c: "217,70,239", a: 4.2, r: 0.28, o: 0.26, f: 1.15 },
  { c: "167,243,240", a: 1.0, r: 0.27, o: 0.15, f: 1.4 },
] as const;

export function VozOrbe({ level, active, dim = false, size = 240 }: { level: () => number; active: boolean; dim?: boolean; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const live = useRef({ level, active });
  useEffect(() => {
    live.current = { level, active };
  });

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    el.width = el.height = Math.round(size * dpr);
    const S = el.width;
    let raf = 0;
    let last = performance.now();
    let phase = 0;
    let energy = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { level: read, active: on } = live.current;
      const target = Math.min(1, Math.max(on ? 0.06 : 0.03, read()));
      // Ataque rápido (acompanha a sílaba) e queda suave.
      energy += (target - energy) * (target > energy ? 0.45 : 0.1);
      const e = reduce ? Math.min(energy, 0.15) : energy;
      phase += dt * (0.3 + e * 2.6);
      ctx.clearRect(0, 0, S, S);
      ctx.globalCompositeOperation = "screen";
      const cx = S / 2;
      const cy = S / 2;
      // Halo fraco que pulsa com a voz.
      const halo = ctx.createRadialGradient(cx, cy, S * 0.1, cx, cy, S * (0.38 + e * 0.12));
      halo.addColorStop(0, `rgba(120,160,255,${0.1 + e * 0.25})`);
      halo.addColorStop(1, "rgba(120,160,255,0)");
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, S, S);
      for (const b of BLOBS) {
        const ang = b.a + phase * b.f;
        const wob = 1 + 0.25 * Math.sin(phase * 1.7 + b.a * 2);
        const dist = S * b.o * (0.3 + e * 0.7);
        const x = cx + Math.cos(ang) * dist;
        const y = cy + Math.sin(ang * 1.3) * dist;
        const rad = S * b.r * 0.78 * (0.62 + e * 0.5) * wob;
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
        g.addColorStop(0, `rgba(${b.c},0.92)`);
        g.addColorStop(0.55, `rgba(${b.c},0.4)`);
        g.addColorStop(1, `rgba(${b.c},0)`);
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, rad, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={canvas} className="voz-blob" style={{ width: size, height: size, opacity: dim ? 0.45 : 1 }} aria-hidden data-testid="voz-orbe" />;
}
