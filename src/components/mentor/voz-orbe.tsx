"use client";

import { useEffect, useRef } from "react";

/** Energia do áudio (0 a 1): volume geral e três faixas de frequência. */
export type Bands = { vol: number; low: number; mid: number; high: number };
export const SILENCE: Bands = { vol: 0, low: 0, mid: 0, high: 0 };

const N = 3000;
const BASE = 280; // tamanho de referência (px) das medidas do projeto
const R = 120; // raio da esfera nessa referência
const PAD = 1.3;

type Cloud = { dir: Float32Array; rad: Float32Array; seed: Float32Array; sz: Float32Array; cls: Uint8Array; lists: number[][] };

/** 3000 partículas: 40% vermelho neon (núcleo), 35% branco (casca), 25% preto (poeira escura). */
function build(): Cloud {
  const dir = new Float32Array(N * 3);
  const rad = new Float32Array(N);
  const seed = new Float32Array(N);
  const sz = new Float32Array(N);
  const cls = new Uint8Array(N);
  const lists: number[][] = [[], [], []]; // 0 vermelho, 1 branco, 2 preto
  for (let i = 0; i < N; i++) {
    const c = i < N * 0.4 ? 0 : i < N * 0.75 ? 1 : 2;
    cls[i] = c;
    lists[c]!.push(i);
    const z = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z);
    dir[i * 3] = s * Math.cos(a);
    dir[i * 3 + 1] = z;
    dir[i * 3 + 2] = s * Math.sin(a);
    const v = Math.random();
    rad[i] = c === 0 ? 0.03 + 0.7 * Math.pow(v, 0.8) : c === 1 ? 0.55 + 0.45 * Math.pow(v, 0.55) : 0.3 + 0.8 * v;
    seed[i] = Math.random() * 1000;
    sz[i] = 0.45 + Math.random() * 0.95 + (Math.random() < 0.04 ? 1.1 : 0);
  }
  return { dir, rad, seed, sz, cls, lists };
}

const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

/**
 * Orbe de micropartículas do Mentor por voz. Parado, flutua e "respira"; falando, reage ao áudio
 * real: faixa grave muda o tamanho, média acende o brilho, aguda espalha e agita as partículas.
 * Desenhado em canvas 2D (projeção 3D própria), sem imagem.
 */
export function VozOrbe({ level, dim = false, size = 280 }: { level: () => Bands; active?: boolean; dim?: boolean; size?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const read = useRef(level);
  useEffect(() => {
    read.current = level;
  });

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const calm = reduce ? 0.3 : 1;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    // Canvas 30% maior que o orbe: a explosão de partículas com voz forte não é cortada na borda.
    const S = Math.round(size * PAD * dpr);
    el.width = el.height = S;
    const k0 = (size * dpr) / BASE; // px do projeto -> px do canvas
    const cloud = build();
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const pr = new Float32Array(N);
    const front = new Uint8Array(N);
    const cur: Bands = { vol: 0, low: 0, mid: 0, high: 0 };
    let hot = 0;
    let rot = 0;
    let t = 0;
    let last = performance.now();
    let raf = 0;
    const cx = S / 2;
    const cy = S / 2;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const f60 = dt * 60;
      const tg = read.current();
      // Sobe rápido (acompanha a sílaba) e volta ao repouso com lerp 0.05.
      (Object.keys(cur) as Array<keyof Bands>).forEach((key) => {
        const to = Math.min(1, Math.max(0, tg[key]));
        const rate = to > cur[key] ? 0.45 : 0.05;
        cur[key] += (to - cur[key]) * (1 - Math.pow(1 - rate, f60));
      });
      hot += ((cur.vol > 0.2 ? 1 : 0) - hot) * (1 - Math.pow(1 - 0.12, f60));

      rot += dt * 0.06 * (1 + cur.vol * 4) * (reduce ? 0.4 : 1); // 0,001 rad/frame parado
      const breath = 1 + 0.02 * Math.sin((t / 3) * Math.PI * 2); // 0,98 a 1,02 em 3 s
      const sphere = breath * (1 + cur.low * 0.3);
      const spread = cur.high * 30 * calm;
      const vibe = (3 + cur.high * 10) * calm;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const F = R * 3.2;

      for (let i = 0; i < N; i++) {
        const dx = cloud.dir[i * 3]!;
        const dy = cloud.dir[i * 3 + 1]!;
        const dz = cloud.dir[i * 3 + 2]!;
        const r = cloud.rad[i]!;
        // Ruído orgânico da superfície (mais forte nas partículas de fora).
        const n = 0.1 * Math.sin(3.1 * dx + 1.7 * dy + t * 0.4) + 0.08 * Math.sin(2.3 * dy - 2.9 * dz + t * 0.31 + 1.2) + 0.06 * Math.sin(4.1 * dz + 3.3 * dx - t * 0.27);
        const rr = R * r * (1 + n * r) * sphere;
        const sd = cloud.seed[i]!;
        const out = spread * (0.4 + 0.6 * Math.abs(Math.sin(sd))); // cada partícula se afasta de um jeito
        const fl = Math.sin(t * 1.5 + i) * 2 * calm; // flutuar +-2px
        const vb = Math.sin(t * (14 + cur.high * 20) + sd) * vibe * cur.high;
        const m = rr + out + vb;
        const x0 = dx * m + fl;
        const y0 = dy * m + Math.sin(t * 1.3 + i * 0.7) * 2 * calm;
        const z0 = dz * m + Math.cos(t * 1.1 + i * 1.3) * 2 * calm;
        const x = x0 * cos + z0 * sin;
        const z = -x0 * sin + z0 * cos;
        const k = F / (F - z);
        px[i] = cx + x * k * k0;
        py[i] = cy + y0 * k * k0;
        pr[i] = cloud.sz[i]! * k * k0 * (1 + cur.vol * 0.35);
        front[i] = z >= 0 ? 1 : 0;
      }

      ctx.clearRect(0, 0, S, S);
      // Brilho vermelho do núcleo: cresce com a faixa média.
      const glow = Math.min(0.6, 0.1 + cur.mid * 0.9 + cur.vol * 0.3);
      ctx.globalCompositeOperation = "lighter";
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, S * (0.34 + cur.vol * 0.1));
      g.addColorStop(0, `rgba(255,26,26,${glow})`);
      g.addColorStop(0.5, `rgba(225,6,0,${glow * 0.35})`);
      g.addColorStop(1, "rgba(225,6,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);

      const whiteHot = `rgb(255,${mix(255, 26, hot)},${mix(255, 26, hot)})`;
      const blackHot = `rgb(${mix(10, 255, hot)},${mix(10, 26, hot)},${mix(10, 26, hot)})`;
      const pass = (half: number) => {
        // preto e branco por baixo, vermelho (aditivo) por cima
        for (const c of [2, 1, 0] as const) {
          ctx.globalCompositeOperation = c === 0 ? "lighter" : "source-over";
          ctx.globalAlpha = c === 0 ? 0.72 : 0.95;
          let style = "";
          for (const i of cloud.lists[c]!) {
            if (front[i] !== half) continue;
            const s = c === 0 ? "#FF1A1A" : cloud.rad[i]! < 0.5 ? (c === 1 ? whiteHot : blackHot) : c === 1 ? "#FFFFFF" : "#0A0A0A";
            if (s !== style) {
              ctx.fillStyle = s;
              style = s;
            }
            ctx.beginPath();
            ctx.arc(px[i]!, py[i]!, pr[i]!, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      };
      pass(0);
      // Bloom: halo fraco ao redor das partículas vermelhas.
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = 0.03 + glow * 0.08;
      ctx.fillStyle = "#FF1A1A";
      for (const i of cloud.lists[0]!) {
        if (i % 2) continue;
        ctx.beginPath();
        ctx.arc(px[i]!, py[i]!, pr[i]! * 4, 0, Math.PI * 2);
        ctx.fill();
      }
      pass(1);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  return <canvas ref={canvas} className="voz-orbe-canvas" style={{ width: size * PAD, height: size * PAD, top: -size * ((PAD - 1) / 2), opacity: dim ? 0.5 : 1 }} aria-hidden data-testid="voz-orbe" />;
}
