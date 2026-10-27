"use client";

import { useEffect, useRef } from "react";

/**
 * Cena da tela de carregamento: cidade em ruínas com a bandeira do APROVUM.
 * A câmera avança pela rua (CSS, no compositor), a bandeira tremula (canvas pequeno, em faixas)
 * e fumaça, fogo e brasas se movem (canvas em meia resolução, ~30 qps). Tudo a partir da imagem
 * original da equipe; nada é baixado de fora.
 */
const ART = { w: 2096, h: 1184, src: "/images/carregamento/ruinas.webp", srcSm: "/images/carregamento/ruinas-sm.webp" };
/** Bandeira recortada (posição na arte). O mastro fica do lado esquerdo do recorte. */
const FLAG = { src: "/images/carregamento/bandeira.webp", x: 1622, y: 508, w: 272, h: 253, pad: 18 };
/** Para onde a câmera avança: o fundo da rua (computador) ou a bandeira (celular em pé). */
const FOCUS_WIDE: [number, number] = [990, 600];
const FOCUS_TALL: [number, number] = [1650, 640];

/** Fogo visível na arte: [x, y, raio]. */
const FIRES: Array<[number, number, number]> = [
  [120, 312, 46],
  [1365, 462, 48],
  [1772, 440, 64],
  [1598, 786, 82],
  [1745, 650, 70],
  [882, 300, 34],
  [1508, 560, 40],
];
/** Fontes de fumaça: [x, y, tamanho, "coluna" sobe | "nevoa" desliza]. */
const SMOKE: Array<[number, number, number, "coluna" | "nevoa"]> = [
  [870, 300, 120, "coluna"],
  [1420, 470, 110, "coluna"],
  [1700, 560, 130, "coluna"],
  [160, 330, 90, "coluna"],
  [700, 760, 220, "nevoa"],
  [1350, 790, 240, "nevoa"],
];

export function RuinsScene() {
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const flagCv = useRef<HTMLCanvasElement>(null);
  const fxCv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const el = root.current;
    const sc = scene.current;
    const fc = flagCv.current;
    const xc = fxCv.current;
    if (!el || !sc || !fc || !xc) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const light = window.innerWidth < 900 || (navigator.hardwareConcurrency ?? 8) <= 4;

    // Enquadramento "cobrir" com o ponto de foco no centro (sem nunca mostrar a borda da arte).
    const fit = () => {
      const r = el.getBoundingClientRect();
      const tall = r.width / r.height < 1;
      const [fx, fy] = tall ? FOCUS_TALL : FOCUS_WIDE;
      const s = Math.max(r.width / ART.w, r.height / ART.h);
      const tx = Math.min(0, Math.max(r.width - ART.w * s, r.width / 2 - fx * s));
      const ty = Math.min(0, Math.max(r.height - ART.h * s, r.height / 2 - fy * s));
      sc.style.transform = `translate3d(${tx.toFixed(1)}px, ${ty.toFixed(1)}px, 0) scale(${s.toFixed(5)})`;
      sc.style.setProperty("--fx", `${fx}px`);
      sc.style.setProperty("--fy", `${fy}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    // --- Bandeira: desenhada em faixas verticais com onda que cresce a partir do mastro.
    const flag = new Image();
    flag.src = FLAG.src;
    const fctx = fc.getContext("2d");
    const FS = 1.5; // resolução do canvas da bandeira (px de arte × 1,5)
    fc.width = Math.round((FLAG.w + FLAG.pad * 2) * FS);
    fc.height = Math.round((FLAG.h + FLAG.pad * 2) * FS);
    const drawFlag = (t: number) => {
      if (!fctx || !flag.complete || !flag.naturalWidth) return;
      fctx.setTransform(FS, 0, 0, FS, 0, 0);
      fctx.clearRect(0, 0, FLAG.w + FLAG.pad * 2, FLAG.h + FLAG.pad * 2);
      const STRIP = 2;
      const pole = 22; // a bandeira presa no mastro (perto da borda esquerda do recorte)
      const span = FLAG.w - pole;
      for (let x = 0; x < FLAG.w; x += STRIP) {
        const u = Math.max(0, (x - pole) / span); // 0 no mastro → 1 na ponta
        const ph = x * 0.055 - t * 3.1;
        const amp = u * (7 + 3 * Math.sin(t * 0.7)) + u * u * 4;
        const dy = Math.sin(ph) * amp + Math.sin(ph * 0.47 + 1.3) * amp * 0.35;
        // A ponta encolhe um pouco na horizontal quando a onda passa (tecido "puxando").
        const dx = -u * u * 6 * (0.5 + 0.5 * Math.sin(ph * 0.5));
        fctx.drawImage(flag, x, 0, STRIP, FLAG.h, FLAG.pad + x + dx, FLAG.pad + dy, STRIP + 0.6, FLAG.h);
      }
      // Luz e sombra das dobras (só sobre o tecido).
      fctx.globalCompositeOperation = "source-atop";
      for (let x = 0; x < FLAG.w; x += STRIP) {
        const u = Math.max(0, (x - pole) / span);
        const slope = Math.cos(x * 0.055 - t * 3.1) * u;
        fctx.fillStyle = slope > 0 ? `rgba(255,190,120,${(slope * 0.16).toFixed(3)})` : `rgba(0,0,0,${(-slope * 0.32).toFixed(3)})`;
        fctx.fillRect(FLAG.pad + x - 1, 0, STRIP + 2, FLAG.h + FLAG.pad * 2);
      }
      fctx.globalCompositeOperation = "source-over";
    };

    // --- Fumaça, fogo e brasas (canvas em coordenadas da arte, meia resolução).
    const XS = 0.5;
    xc.width = Math.round(ART.w * XS);
    xc.height = Math.round(ART.h * XS);
    const xctx = xc.getContext("2d");
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const sprite = (r: number, stops: Array<[number, string]>) => {
      const c = document.createElement("canvas");
      c.width = c.height = r * 2;
      const g = c.getContext("2d");
      if (g) {
        const gr = g.createRadialGradient(r, r, 0, r, r, r);
        for (const [o, col] of stops) gr.addColorStop(o, col);
        g.fillStyle = gr;
        g.fillRect(0, 0, r * 2, r * 2);
      }
      return c;
    };
    const smokeSpr = document.createElement("canvas");
    smokeSpr.width = smokeSpr.height = 128;
    const sg = smokeSpr.getContext("2d");
    if (sg)
      for (let i = 0; i < 24; i++) {
        const x = 64 + (rnd() - 0.5) * 56;
        const y = 64 + (rnd() - 0.5) * 56;
        const r = 18 + rnd() * 30;
        const g = sg.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(70,60,58,0.09)");
        g.addColorStop(1, "rgba(70,60,58,0)");
        sg.fillStyle = g;
        sg.fillRect(0, 0, 128, 128);
      }
    const fireSpr = sprite(64, [
      [0, "rgba(255,190,90,0.55)"],
      [0.45, "rgba(255,90,20,0.22)"],
      [1, "rgba(255,40,0,0)"],
    ]);
    const emberSpr = sprite(12, [
      [0, "rgba(255,220,150,1)"],
      [0.4, "rgba(255,120,40,0.7)"],
      [1, "rgba(255,60,10,0)"],
    ]);
    const PER = light ? 4 : 6;
    const puffs = SMOKE.flatMap((_, i) => Array.from({ length: PER }, (__, j) => ({ i, u: j / PER + rnd() * 0.1, sp: 0.025 + rnd() * 0.02, o: rnd() })));
    const N = light ? 40 : 80;
    const embers = Array.from({ length: N }, () => ({ x: 900 + rnd() * 1196, y: rnd() * ART.h, v: 40 + rnd() * 70, r: 1.2 + rnd() * 2.4, a: 0.4 + rnd() * 0.6, w: rnd() * 6.28 }));
    const drawFx = (t: number, dt: number) => {
      if (!xctx) return;
      xctx.setTransform(XS, 0, 0, XS, 0, 0);
      xctx.clearRect(0, 0, ART.w, ART.h);
      for (const p of puffs) {
        const [sx, sy, size, kind] = SMOKE[p.i]!;
        p.u += p.sp * dt * (kind === "nevoa" ? 0.5 : 1);
        if (p.u > 1) p.u -= 1;
        const col = kind === "coluna";
        const x = col ? sx + p.u * 140 + Math.sin(p.u * 5 + p.o * 6) * 24 : sx + (p.u - 0.5) * 700;
        const y = col ? sy - p.u * 360 : sy - Math.sin(p.u * Math.PI) * 30;
        const s = size * (col ? 1 + p.u * 2.6 : 1.6);
        xctx.globalAlpha = Math.sin(Math.PI * p.u) * (col ? 0.9 : 0.55);
        xctx.drawImage(smokeSpr, x - s / 2, y - s / 2, s, s);
      }
      xctx.globalCompositeOperation = "lighter";
      for (const [fx, fy, fr] of FIRES) {
        const fl = 0.78 + Math.sin(t * 9 + fx) * 0.12 + Math.sin(t * 23 + fy) * 0.07;
        const r = fr * 1.6 * fl;
        xctx.globalAlpha = Math.min(1, fl);
        xctx.drawImage(fireSpr, fx - r, fy - r, r * 2, r * 2);
      }
      for (const e of embers) {
        e.y -= e.v * dt;
        e.x += Math.sin(t * 1.3 + e.w) * 12 * dt - 8 * dt;
        if (e.y < -10) {
          e.y = ART.h + 10;
          e.x = 900 + rnd() * 1196;
        }
        xctx.globalAlpha = e.a * (0.7 + 0.3 * Math.sin(t * 6 + e.w));
        const s = e.r * 4;
        xctx.drawImage(emberSpr, e.x - s / 2, e.y - s / 2, s, s);
      }
      xctx.globalAlpha = 1;
      xctx.globalCompositeOperation = "source-over";
    };

    if (reduced) {
      // Movimento reduzido: cena parada (bandeira desenhada uma vez, sem fumaça animada).
      flag.onload = () => drawFlag(0);
      if (flag.complete) drawFlag(0);
      return () => ro.disconnect();
    }

    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      acc += dt;
      const t = now / 1000;
      // Bandeira a cada quadro (é pequena); efeitos a ~30 qps.
      drawFlag(t);
      if (acc >= 1 / 30) {
        drawFx(t, acc);
        acc = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const vis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", vis);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={root} className="cl-scene-root" aria-hidden>
      <div ref={scene} className="cl-scene" style={{ width: ART.w, height: ART.h }}>
        <div className="cl-cam">
          <picture>
            <source media="(max-width: 700px)" srcSet={ART.srcSm} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ART.src} alt="" width={ART.w} height={ART.h} className="cl-img" draggable={false} />
          </picture>
          <span className="cl-sun" />
          <canvas
            ref={flagCv}
            className="cl-flag"
            style={{ left: FLAG.x - FLAG.pad, top: FLAG.y - FLAG.pad, width: FLAG.w + FLAG.pad * 2, height: FLAG.h + FLAG.pad * 2 }}
          />
          <canvas ref={fxCv} className="cl-fx" style={{ width: ART.w, height: ART.h }} />
        </div>
      </div>
      <div className="cl-vignette" />
    </div>
  );
}
