"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import type { Bands } from "@/components/mentor/voz-orbe";

/**
 * Onda de voz horizontal, de ponta a ponta no fundo da barra de ferramentas, enquanto o Mentor fala.
 * Suave e translúcida: a altura segue o volume, a ondulação segue o tom (grave/médio/agudo) e tudo
 * sobe e desce devagar (suavização), então nunca "pisca". Decorativa; some sozinha quando ele cala.
 */
export function VozOnda({ level, active }: { level: MutableRefObject<(() => Bands) | null>; active: boolean }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const on = useRef(active);
  const raf = useRef(0);
  const start = useRef<() => void>(() => {});
  useEffect(() => {
    on.current = active;
    if (active) start.current();
  }, [active]);

  useEffect(() => {
    const canvas = cv.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let w = 0, h = 0, amp = 0, low = 0, mid = 0, high = 0, ph = 0, last = 0;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = Math.max(1, Math.round(w * dpr));
      canvas.height = Math.max(1, Math.round(h * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
    const frame = (t: number) => {
      const dt = Math.min(0.05, (t - (last || t)) / 1000);
      last = t;
      const b = on.current ? level.current?.() : null;
      const k = 1 - Math.exp(-dt * (b && b.vol > amp ? 9 : 3.2)); // sobe rápido, desce devagar
      amp = lerp(amp, b ? Math.min(1, b.vol * 1.15) : 0, k);
      low = lerp(low, b?.low ?? 0, k);
      mid = lerp(mid, b?.mid ?? 0, k);
      high = lerp(high, b?.high ?? 0, k);
      ph += dt * (0.8 + mid * 2.4);
      ctx.clearRect(0, 0, w, h);
      if (amp > 0.01) {
        const cy = h / 2;
        const maxA = h * 0.34;
        // três camadas: grave (larga e lenta), média e aguda (fina e rápida); tom muda o comprimento de onda
        const layers = [
          { f: 1.3 + low * 1.2, s: 0.7, a: 0.55 + low * 0.45, w: 2.4, al: 0.2, c: "255,40,32" },
          { f: 2.6 + mid * 2.4, s: 1.1, a: 0.4 + mid * 0.5, w: 1.6, al: 0.26, c: "255,92,80" },
          { f: 5 + high * 5, s: 1.7, a: 0.22 + high * 0.5, w: 1, al: 0.2, c: "255,170,160" },
        ];
        for (const L of layers) {
          ctx.beginPath();
          for (let x = 0; x <= w; x += 3) {
            const u = x / w;
            const env = Math.sin(Math.PI * u) ** 1.4; // some suave nas pontas
            const y = cy + Math.sin(u * Math.PI * 2 * L.f + ph * L.s) * Math.sin(u * 7 + ph * 0.6 + L.f) * maxA * L.a * amp * env;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.lineWidth = L.w;
          ctx.strokeStyle = `rgba(${L.c},${L.al * Math.min(1, amp * 1.6)})`;
          ctx.shadowColor = `rgba(${L.c},0.35)`;
          ctx.shadowBlur = 8;
          ctx.stroke();
        }
      }
      if (on.current || amp > 0.01) raf.current = requestAnimationFrame(frame);
      else { raf.current = 0; last = 0; }
    };
    start.current = () => { if (!raf.current) raf.current = requestAnimationFrame(frame); };
    if (on.current) start.current();
    return () => { ro.disconnect(); if (raf.current) cancelAnimationFrame(raf.current); raf.current = 0; start.current = () => {}; };
  }, [level]);

  return <canvas ref={cv} className="st-onda" aria-hidden data-testid="st-onda" />;
}
