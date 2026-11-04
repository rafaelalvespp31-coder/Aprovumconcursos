"use client";

import { useEffect, useRef } from "react";

/** Energia do áudio (0 a 1): volume geral e três faixas de frequência. */
export type Bands = { vol: number; low: number; mid: number; high: number };
export const SILENCE: Bands = { vol: 0, low: 0, mid: 0, high: 0 };

const CORE = 3200; // nuvem do orbe
const HALO = 1300; // partículas que flutuam por todo o fundo
const N = CORE + HALO;
const BASE = 280; // tamanho de referência (px) das medidas
const R = 120; // raio do orbe nessa referência

type Cloud = { dir: Float32Array; rad: Float32Array; seed: Float32Array; sz: Float32Array; al: Float32Array; hx: Float32Array; hy: Float32Array; cls: Uint8Array; lists: number[][] };

const gauss = () => {
  let u = 0;
  while (u === 0) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * Math.random());
};

/** Orbe: 40% vermelho neon (núcleo), 35% branco (casca), 25% preto (poeira escura); halo espalhado pelo fundo. */
function build(): Cloud {
  const dir = new Float32Array(N * 3);
  const rad = new Float32Array(N);
  const seed = new Float32Array(N);
  const sz = new Float32Array(N);
  const al = new Float32Array(N);
  const hx = new Float32Array(N);
  const hy = new Float32Array(N);
  const cls = new Uint8Array(N);
  const lists: number[][] = [[], [], []]; // 0 vermelho, 1 branco, 2 preto
  for (let i = 0; i < N; i++) {
    const halo = i >= CORE;
    const u = Math.random();
    const c = halo ? (u < 0.55 ? 0 : u < 0.9 ? 1 : 2) : i < CORE * 0.4 ? 0 : i < CORE * 0.75 ? 1 : 2;
    cls[i] = c;
    lists[c]!.push(i);
    const z = Math.random() * 2 - 1;
    const a = Math.random() * Math.PI * 2;
    const s = Math.sqrt(1 - z * z);
    dir[i * 3] = s * Math.cos(a);
    dir[i * 3 + 1] = z;
    dir[i * 3 + 2] = s * Math.sin(a);
    const v = Math.random();
    const base = c === 0 ? 0.03 + 0.62 * Math.pow(v, 0.9) : c === 1 ? 0.5 + 0.4 * Math.pow(v, 0.6) : 0.3 + 0.7 * v;
    // Sem casca dura: a borda do orbe se esfuma (jitter gaussiano no raio).
    rad[i] = Math.max(0.02, base * (1 + 0.09 * gauss()));
    seed[i] = Math.random() * 1000;
    sz[i] = halo ? 0.4 + Math.random() * 1.0 : 0.4 + Math.random() * 0.9 + (Math.random() < 0.035 ? 0.9 : 0);
    al[i] = halo ? 0.16 + Math.random() * 0.34 : 0.55 + Math.random() * 0.45;
    hx[i] = Math.random();
    hy[i] = Math.random();
  }
  return { dir, rad, seed, sz, al, hx, hy, cls, lists };
}

/** Pontinho suave (centro nítido, borda que se apaga) para desenhar cada micropartícula. */
function sprite(r: number, g: number, b: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gr.addColorStop(0.28, `rgba(${r},${g},${b},0.75)`);
  gr.addColorStop(0.6, `rgba(${r},${g},${b},0.2)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  return c;
}

/**
 * Fundo de micropartículas do Mentor por voz. Ocupa todo o painel: o orbe (núcleo vermelho com casca
 * branca) fica no centro e o resto das partículas flutua pelo fundo inteiro. Parado, tudo respira e
 * deriva devagar; falando, reage ao áudio real (grave muda o tamanho, média acende o brilho, agudo
 * agita) e as partículas do fundo são puxadas suavemente para o orbe. Sem bordas: tudo se esfuma.
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
    const sprites = [sprite(255, 26, 26), sprite(255, 255, 255), sprite(14, 14, 14)];
    const cloud = build();
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const ps = new Float32Array(N);
    const pa = new Float32Array(N);
    const front = new Uint8Array(N);
    const cur: Bands = { vol: 0, low: 0, mid: 0, high: 0 };
    let hot = 0;
    let rot = 0;
    let t = 0;
    let last = performance.now();
    let raf = 0;
    let W = 0;
    let H = 0;
    let dpr = 1;

    const fit = () => {
      const r = el.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      t += dt;
      const f60 = dt * 60;
      const tg = read.current();
      // Sobe rápido (acompanha a sílaba) e volta ao repouso aos poucos (lerp 0.05).
      (Object.keys(cur) as Array<keyof Bands>).forEach((key) => {
        const to = Math.min(1, Math.max(0, tg[key]));
        const rate = to > cur[key] ? 0.4 : 0.05;
        cur[key] += (to - cur[key]) * (1 - Math.pow(1 - rate, f60));
      });
      hot += ((cur.vol > 0.2 ? 1 : 0) - hot) * (1 - Math.pow(1 - 0.1, f60));
      rot += dt * 0.06 * (1 + cur.vol * 3) * (reduce ? 0.4 : 1);

      const k0 = size / BASE;
      const cx = W / 2;
      const cy = size * 0.5 + 4;
      const breath = 1 + 0.02 * Math.sin((t / 3) * Math.PI * 2);
      const sphere = breath * (1 + cur.low * 0.22);
      const A = (2.2 + cur.vol * 9 + cur.high * 6) * calm;
      const cos = Math.cos(rot);
      const sin = Math.sin(rot);
      const F = R * 3.2;
      const pull = cur.vol * 0.1;

      for (let i = 0; i < N; i++) {
        const sd = cloud.seed[i]!;
        if (i < CORE) {
          const dx = cloud.dir[i * 3]!;
          const dy = cloud.dir[i * 3 + 1]!;
          const dz = cloud.dir[i * 3 + 2]!;
          const r = cloud.rad[i]!;
          const n = 0.1 * Math.sin(3.1 * dx + 1.7 * dy + t * 0.4) + 0.08 * Math.sin(2.3 * dy - 2.9 * dz + t * 0.31 + 1.2) + 0.06 * Math.sin(4.1 * dz + 3.3 * dx - t * 0.27);
          const m = R * r * (1 + n * r) * sphere + cur.high * 10 * (0.3 + 0.7 * Math.abs(Math.sin(sd))) * calm;
          const x0 = dx * m;
          const y0 = dy * m;
          const z0 = dz * m;
          // Correnteza suave: cada região deriva diferente, sem explodir em formato nenhum.
          const ox = (Math.sin(y0 * 0.05 + t * 0.6 + sd) + 0.6 * Math.sin(z0 * 0.03 - t * 0.45)) * A;
          const oy = (Math.sin(z0 * 0.05 + t * 0.55 + sd * 1.3) + 0.6 * Math.sin(x0 * 0.03 + t * 0.4)) * A;
          const oz = Math.sin(x0 * 0.05 + t * 0.5 + sd * 0.7) * A;
          const xr = (x0 + ox) * cos + (z0 + oz) * sin;
          const zr = -(x0 + ox) * sin + (z0 + oz) * cos;
          const k = F / (F - zr);
          px[i] = cx + xr * k * k0;
          py[i] = cy + (y0 + oy) * k * k0;
          pa[i] = cloud.al[i]! * (0.6 + 0.4 * ((zr / R + 1) / 2));
          ps[i] = cloud.sz[i]! * k * k0 * 3.6 * (1 + cur.vol * 0.3);
          front[i] = zr >= 0 ? 1 : 0;
        } else {
          // Fundo: deriva devagar pela área toda e, falando, é puxado de leve para o orbe.
          const bx = cloud.hx[i]! * W + Math.sin(t * 0.11 + sd) * 38 + Math.sin(t * 0.07 + sd * 2) * 24;
          const by = cloud.hy[i]! * H + Math.cos(t * 0.09 + sd * 1.3) * 34 + Math.sin(t * 0.13 + sd) * 20;
          const w = pull * (0.4 + 0.6 * Math.abs(Math.sin(sd * 3)));
          const jit = cur.high * 6 * calm;
          px[i] = bx + (cx - bx) * w + Math.sin(t * 9 + sd) * jit;
          py[i] = by + (cy - by) * w + Math.cos(t * 8 + sd) * jit;
          pa[i] = cloud.al[i]! * (0.8 + cur.vol * 1.1);
          ps[i] = cloud.sz[i]! * k0 * 3 * (1 + cur.vol * 0.4);
          front[i] = Math.sin(sd) > 0 ? 1 : 0;
        }
        // Esfuma nas bordas do painel (nunca aparece um corte quadrado).
        const e = Math.min(1, px[i]! / 46, (W - px[i]!) / 46, py[i]! / 46, (H - py[i]!) / 46);
        if (e < 1) pa[i] = pa[i]! * Math.max(0, e);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      // Brilho vermelho do núcleo: cresce com a faixa média.
      const glow = Math.min(0.6, 0.18 + cur.mid * 0.7 + cur.vol * 0.25);
      ctx.globalCompositeOperation = "lighter";
      const gr = size * (0.5 + cur.vol * 0.1);
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
      g.addColorStop(0, `rgba(255,26,26,${glow})`);
      g.addColorStop(0.45, `rgba(225,6,0,${glow * 0.3})`);
      g.addColorStop(1, "rgba(225,6,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(cx - gr, cy - gr, gr * 2, gr * 2);

      const pass = (half: number) => {
        // preto e branco por baixo, vermelho (aditivo) por cima
        for (const c of [2, 1, 0] as const) {
          ctx.globalCompositeOperation = c === 0 ? "lighter" : "source-over";
          const spr = sprites[c]!;
          const kr = c === 0 ? 1 : c === 1 ? 0.75 : 1;
          for (const i of cloud.lists[c]!) {
            if (front[i] !== half) continue;
            const a = pa[i]! * kr * (dim ? 0.5 : 1);
            if (a < 0.01) continue;
            ctx.globalAlpha = Math.min(1, a);
            const s = ps[i]!;
            ctx.drawImage(spr, px[i]! - s / 2, py[i]! - s / 2, s, s);
            // Núcleo aceso: acima de 20% de volume, branco e preto do centro viram vermelho.
            if (c !== 0 && i < CORE && cloud.rad[i]! < 0.5 && hot > 0.02) {
              ctx.globalCompositeOperation = "lighter";
              ctx.globalAlpha = Math.min(1, a * 0.7 * hot);
              ctx.drawImage(sprites[0]!, px[i]! - s / 2, py[i]! - s / 2, s, s);
              ctx.globalCompositeOperation = "source-over";
            }
          }
        }
      };
      pass(0);
      pass(1);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [size, dim]);

  return <canvas ref={canvas} className="voz-fundo" aria-hidden data-testid="voz-orbe" />;
}
