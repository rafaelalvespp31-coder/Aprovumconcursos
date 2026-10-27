"use client";

import { useEffect, useRef, useState } from "react";
import "./carregamento.css";

const STEPS = [
  "Analisando o tema",
  "Organizando o conteúdo em blocos",
  "Preparando exemplos práticos",
  "Separando as questões por dificuldade",
  "Finalizando sua aula",
];

/** Cena (px da imagem original): ruínas ao pôr do sol, bandeira do APROVUM à direita. */
const SCENE = { w: 2096, h: 1184, src: "/images/carregamento/ruinas.webp", srcSm: "/images/carregamento/ruinas-sm.webp" };
const FLAG = { src: "/images/carregamento/bandeira.webp", x: 1618, y: 505, w: 280, h: 260 };
/** Margem do pano em volta do recorte (para as ondas não cortarem). */
const PAD = 26;
/** Fogo (x, y, raio), fumaça (x, y, tamanho, coluna?) e sol, nos px da cena. */
const FIRES: Array<[number, number, number]> = [
  [1590, 780, 70],
  [1525, 760, 45],
  [1745, 445, 55],
  [1785, 470, 40],
  [1335, 445, 38],
  [110, 320, 36],
  [820, 318, 42],
  [1655, 640, 50],
];
const SMOKE: Array<[number, number, number, boolean]> = [
  [840, 300, 120, true],
  [1700, 620, 110, true],
  [1340, 430, 80, true],
  [600, 640, 140, false],
  [1250, 700, 160, false],
];
const SUN: [number, number] = [964, 590];

/** Pré-carrega a cena (chamado quando a confirmação abre, antes do clique). */
export function preloadLoadingScene() {
  if (typeof window === "undefined") return;
  const sm = window.matchMedia("(max-width: 760px)").matches;
  for (const src of [sm ? SCENE.srcSm : SCENE.src, FLAG.src]) {
    const i = new Image();
    i.decoding = "async";
    i.src = src;
  }
}

/**
 * Tela de carregamento da aula: cidade em ruínas com a bandeira do APROVUM tremulando,
 * câmera avançando devagar, fogo, fumaça e brasas — tudo animado no próprio navegador
 * (sem vídeo), leve no celular. Com "reduzir movimento", a cena fica parada.
 */
export function BuildingOverlay({ topic, durationMs }: { topic: string; durationMs: number }) {
  const [step, setStep] = useState(0);
  const [progress, setProgress] = useState(4);
  const root = useRef<HTMLDivElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const flagCv = useRef<HTMLCanvasElement>(null);
  const fxCv = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const per = durationMs / STEPS.length;
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i), i * per));
    const start = Date.now();
    const tick = setInterval(() => {
      // aproxima de 96% e só completa quando a página muda
      const t = Math.min(1, (Date.now() - start) / durationMs);
      setProgress(4 + 92 * (1 - Math.pow(1 - t, 2)));
    }, 60);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tick);
    };
  }, [durationMs]);

  // Animação: câmera (um transform por quadro), bandeira (colunas deslocadas) e efeitos (meia resolução).
  useEffect(() => {
    const el = root.current;
    const sc = scene.current;
    const fc = flagCv.current;
    const xc = fxCv.current;
    if (!el || !sc || !fc || !xc) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fctx = fc.getContext("2d");
    const xctx = xc.getContext("2d");
    const flag = new Image();
    flag.decoding = "async";
    flag.src = FLAG.src;

    let W = 1;
    let H = 1;
    const measure = () => {
      const r = el.getBoundingClientRect();
      W = r.width;
      H = r.height;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);

    // Sprites pré-desenhados (nada de gradiente criado por quadro).
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
    const fire = sprite(64, [
      [0, "rgba(255,190,90,0.75)"],
      [0.45, "rgba(255,90,20,0.3)"],
      [1, "rgba(255,40,0,0)"],
    ]);
    const smoke = sprite(64, [
      [0, "rgba(70,60,58,0.22)"],
      [0.6, "rgba(70,60,58,0.09)"],
      [1, "rgba(70,60,58,0)"],
    ]);
    const ember = sprite(8, [
      [0, "rgba(255,200,120,1)"],
      [0.4, "rgba(255,120,40,0.7)"],
      [1, "rgba(255,60,20,0)"],
    ]);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const puffs = SMOKE.flatMap((s, i) => Array.from({ length: 5 }, (_, j) => ({ i, u: j / 5 + rnd() * 0.1, sp: 0.05 + rnd() * 0.04 })));
    const sparks = Array.from({ length: W < 760 ? 26 : 48 }, () => ({ x: 900 + rnd() * 1150, y: 300 + rnd() * 850, v: 40 + rnd() * 90, r: 3 + rnd() * 5, a: 0.4 + rnd() * 0.6, ph: rnd() * 6.28 }));

    const t0 = performance.now();
    let last = t0;
    let fxAcc = 1;
    let raf = 0;
    const loop = (now: number) => {
      const t = (now - t0) / 1000;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Câmera: cobre a tela; em pé, enquadra a bandeira; avança devagar (push-in) e nunca para de vez.
      const aspect = W / H;
      const k = Math.max(0, Math.min(1, (aspect - 0.6) / 0.9));
      const fx = 1720 + (1060 - 1720) * k;
      const fy = 610;
      const push = reduced ? 1 : 1 + 0.07 * (1 - Math.exp(-t / 4.5)) + t * 0.002;
      const s = Math.max(W / SCENE.w, H / SCENE.h) * 1.04 * push;
      let tx = W / 2 - fx * s;
      let ty = H / 2 - fy * s;
      tx = Math.min(0, Math.max(W - SCENE.w * s, tx));
      ty = Math.min(0, Math.max(H - SCENE.h * s, ty));
      sc.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${s.toFixed(5)})`;

      // Bandeira: o pano preso ao mastro ondula mais quanto mais longe dele, com dobras de luz e sombra.
      if (fctx && flag.complete && flag.naturalWidth) {
        const cw = fc.width;
        const ch = fc.height;
        fctx.globalCompositeOperation = "source-over";
        fctx.clearRect(0, 0, cw, ch);
        const om = reduced ? 0 : 1;
        const step = 2;
        for (let x = 0; x < FLAG.w; x += step) {
          const u = x / FLAG.w;
          const ph = 2 * Math.PI * 1.55 * u - t * 4.2;
          const ph2 = 2 * Math.PI * 3.2 * u - t * 6.9 + 1.3;
          const amp = 9 * Math.pow(u, 1.25) * om;
          const dy = amp * Math.sin(ph) + amp * 0.32 * Math.sin(ph2);
          const dx = -amp * 0.35 * (1 - Math.cos(ph));
          fctx.drawImage(flag, x, 0, step, FLAG.h, PAD + x + dx, PAD + dy, step + 0.6, FLAG.h);
        }
        if (om) {
          fctx.globalCompositeOperation = "source-atop";
          for (let x = 0; x < FLAG.w; x += step) {
            const u = x / FLAG.w;
            const sh = Math.cos(2 * Math.PI * 1.55 * u - t * 4.2) * 0.3 * Math.pow(u, 0.9);
            fctx.fillStyle = sh > 0 ? `rgba(255,190,130,${(sh * 0.55).toFixed(3)})` : `rgba(0,0,0,${(-sh).toFixed(3)})`;
            fctx.fillRect(PAD + x - 3, 0, step + 6, ch);
          }
        }
      }

      // Fogo, fumaça e brasas a ~30 qps, em meia resolução (macios: ninguém vê a diferença).
      fxAcc += dt;
      if (xctx && !reduced && fxAcc >= 1 / 30) {
        const fdt = fxAcc;
        fxAcc = 0;
        xctx.setTransform(0.5, 0, 0, 0.5, 0, 0);
        xctx.clearRect(0, 0, SCENE.w, SCENE.h);
        xctx.globalCompositeOperation = "source-over";
        for (const p of puffs) {
          const src = SMOKE[p.i]!;
          p.u += p.sp * fdt;
          if (p.u > 1) p.u -= 1;
          const col = src[3];
          const x = src[0] + (col ? p.u * 220 + Math.sin(p.u * 5 + p.i) * 25 : (p.u - 0.5) * 500);
          const y = src[1] - (col ? p.u * 380 : Math.sin(p.u * Math.PI) * 30);
          const size = src[2] * (col ? 1 + p.u * 2.6 : 2.2);
          xctx.globalAlpha = Math.sin(Math.PI * p.u) * (col ? 0.9 : 0.5);
          xctx.drawImage(smoke, x - size / 2, y - size / 2, size, size);
        }
        xctx.globalCompositeOperation = "lighter";
        for (const [x, y, r] of FIRES) {
          const fl = 0.72 + Math.sin(t * 9 + x) * 0.14 + Math.sin(t * 23 + y) * 0.08;
          xctx.globalAlpha = Math.min(1, fl);
          const rr = r * 2 * fl;
          xctx.drawImage(fire, x - rr, y - rr, rr * 2, rr * 2);
        }
        for (const p of sparks) {
          p.y -= p.v * fdt;
          p.x += Math.sin(t * 1.3 + p.ph) * 18 * fdt + 22 * fdt;
          if (p.y < 120) {
            p.y = 900 + rnd() * 250;
            p.x = 950 + rnd() * 1100;
          }
          xctx.globalAlpha = p.a * (0.6 + 0.4 * Math.sin(t * 6 + p.ph));
          xctx.drawImage(ember, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
        }
        xctx.globalAlpha = 1;
      }
      if (!reduced || t < 0.2) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return (
    <div ref={root} className="cl-root entrar" role="status" aria-live="polite" data-testid="montando-aula">
      <div className="cl-stage" aria-hidden>
        <div ref={scene} className="cl-scene" style={{ width: SCENE.w, height: SCENE.h }}>
          <picture>
            <source media="(max-width: 760px)" srcSet={SCENE.srcSm} />
            <img src={SCENE.src} alt="" width={SCENE.w} height={SCENE.h} className="cl-img" draggable={false} />
          </picture>
          <span className="cl-sun" style={{ left: SUN[0], top: SUN[1] }} />
          <canvas ref={fxCv} className="cl-fx" width={SCENE.w / 2} height={SCENE.h / 2} style={{ width: SCENE.w, height: SCENE.h }} />
          <canvas
            ref={flagCv}
            className="cl-flag"
            width={FLAG.w + PAD * 2}
            height={FLAG.h + PAD * 2}
            style={{ left: FLAG.x - PAD, top: FLAG.y - PAD, width: FLAG.w + PAD * 2, height: FLAG.h + PAD * 2 }}
          />
        </div>
      </div>
      <div className="cl-shade" aria-hidden />

      <div className="cl-hud">
        <p className="cl-kicker">
          <b>{"///"}</b> APROVUM · Operação em andamento
        </p>
        <p className="cl-title">Montando sua aula</p>
        <p className="cl-topic">{topic}</p>
        <p className="cl-line">
          <TypedLine key={step} text={`${STEPS[step]}…`} />
          <span className="cl-caret" aria-hidden />
        </p>
        <div className="cl-bar" aria-hidden>
          <i style={{ width: `${progress}%` }} />
        </div>
        <ol className="cl-steps">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s} data-estado={done ? "feito" : active ? "agora" : "depois"}>
                <span aria-hidden>{done ? "✓" : i + 1}</span>
                {s}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/** Escreve o texto letra por letra (remontado a cada etapa pela key). */
function TypedLine({ text }: { text: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), 28);
    return () => clearInterval(id);
  }, [text]);
  return <>{text.slice(0, n)}</>;
}
