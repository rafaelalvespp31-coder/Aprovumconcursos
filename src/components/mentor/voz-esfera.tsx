"use client";

import { useEffect, useRef, useState } from "react";
import { resolveEstado, type Conexao, type SkullEstado } from "./skull-orb-fx";
import type { Bands } from "./skull-orb-fx";
import { Historia, TAU, clamp, follow, projetar, radiusAt, ringAmp } from "./esfera-fx";

/** Pontinho com borda suave. */
function sprite(r: number, g: number, b: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 48;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(24, 24, 0, 24, 24, 24);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gr.addColorStop(0.62, `rgba(${r},${g},${b},0.95)`);
  gr.addColorStop(0.82, `rgba(${r},${g},${b},0.35)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr;
  x.fillRect(0, 0, 48, 48);
  return c;
}

/**
 * Esfera de pontos do Mentor, toda em vermelho: anéis de latitude feitos de pontos que giram em 3D e se
 * deformam com a voz. O volume real do áudio entra no equador e corre até os polos, então cada sílaba
 * aparece como uma onda na esfera, e os anéis em volta pulsam junto. Um fio claro em espiral cruza os anéis.
 * Mesma interface da antiga caveira: `level` lê o áudio a cada quadro, `conn` e `dim` dão o estado.
 */
export function VozEsfera({ level, dim = false, size = 280, conn = "live" }: { level: () => Bands; dim?: boolean; size?: number; conn?: Conexao }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const read = useRef(level);
  const connRef = useRef(conn);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    read.current = level;
    connRef.current = conn;
  });

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!el || !ctx) {
      setFallback(true);
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const calm = reduce ? 0.3 : 1;
    const mobile = window.innerWidth < 640;
    const NL = mobile ? 20 : 26; // anéis de latitude
    const NM = mobile ? 24 : 30; // pontos por anel
    const spr = { bright: sprite(255, 92, 80), deep: sprite(176, 22, 28), seam: sprite(255, 214, 206), dust: sprite(255, 110, 100) };

    const phi = new Float32Array(NL);
    const cphi = new Float32Array(NL);
    const sphi = new Float32Array(NL);
    for (let i = 0; i < NL; i++) {
      phi[i] = (-0.5 + (i + 0.5) / NL) * Math.PI * 0.94;
      cphi[i] = Math.cos(phi[i]!);
      sphi[i] = Math.sin(phi[i]!);
    }
    const th = new Float32Array(NM);
    const cth = new Float32Array(NM);
    const sth = new Float32Array(NM);
    for (let j = 0; j < NM; j++) {
      th[j] = (j / NM) * TAU;
      cth[j] = Math.cos(th[j]!);
      sth[j] = Math.sin(th[j]!);
    }
    const N = NL * NM;
    const px = new Float32Array(N);
    const py = new Float32Array(N);
    const pz = new Float32Array(N);
    const ps = new Float32Array(N); // raio do ponto (px)
    const pa = new Float32Array(N); // opacidade
    const pk = new Uint8Array(N); // 0 vermelho vivo, 1 vermelho fundo, 2 fio claro

    // Poeira solta em volta (posição polar fixa, deriva devagar).
    const ND = mobile ? 22 : 36;
    const da = new Float32Array(ND);
    const dr = new Float32Array(ND);
    const dsz = new Float32Array(ND);
    const dph = new Float32Array(ND);
    for (let i = 0; i < ND; i++) {
      da[i] = Math.random() * TAU;
      dr[i] = 0.8 + Math.random() * 0.4;
      dsz[i] = 0.5 + Math.random() * 1.1;
      dph[i] = Math.random() * TAU;
    }

    const hist = new Historia(96);
    let acc = 0;
    let t = 0;
    let yaw = Math.random() * TAU;
    let seam = 0;
    let last = performance.now();
    let raf = 0;
    let visible = true;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let grid: HTMLCanvasElement | null = null;
    const sm = { vol: 0, low: 0, mid: 0, high: 0, mic: 0, amp: 0, k: 3.2, ph: 0 };
    let prevAmp = 0;
    let lastRipple = -9;
    const ripples: Array<{ born: number; mic: boolean }> = [];
    let peak = 0;

    const D = () => size * 0.9;
    const cyOf = () => size * 0.5 + 4;
    const buildGrid = () => {
      const R = D() / 2;
      const g = document.createElement("canvas");
      g.width = Math.max(1, Math.round(W * dpr));
      g.height = Math.max(1, Math.round(H * dpr));
      const x = g.getContext("2d");
      if (!x) return null;
      x.scale(dpr, dpr);
      const cell = R * 0.34;
      x.strokeStyle = "rgba(255,70,60,0.16)";
      x.lineWidth = 1;
      x.beginPath();
      const cx = W / 2;
      const cy = cyOf();
      for (let gx = cx % cell; gx < W; gx += cell) {
        x.moveTo(gx, 0);
        x.lineTo(gx, H);
      }
      for (let gy = cy % cell; gy < H; gy += cell) {
        x.moveTo(0, gy);
        x.lineTo(W, gy);
      }
      x.stroke();
      x.globalCompositeOperation = "destination-in";
      const m = x.createRadialGradient(cx, cy, R * 0.8, cx, cy, R * 1.5);
      m.addColorStop(0, "rgba(0,0,0,0.9)");
      m.addColorStop(1, "rgba(0,0,0,0)");
      x.fillStyle = m;
      x.fillRect(0, 0, W, H);
      return g;
    };
    const fit = () => {
      const r = el.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(mobile ? 1.5 : 2, window.devicePixelRatio || 1);
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
      grid = buildGrid();
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      t += dt;

      // Áudio real: a voz do Mentor manda; o microfone do aluno move a esfera um pouco menos.
      const b = read.current();
      const me = clamp(b.me ?? b.vol);
      const mic = clamp(b.mic ?? 0);
      const c = connRef.current;
      peak = Math.max(peak * Math.pow(0.5, dt * 3), me);
      const estado: SkullEstado = resolveEstado({ conn: c, me, mic, peak, awaiting: false });
      el.dataset.estado = estado;
      const live = c === "live";
      const voz = live ? clamp(me * 1.3 + mic * 0.4) : 0;
      sm.vol = follow(sm.vol, voz, dt, 18, 3.6);
      sm.low = follow(sm.low, live ? clamp(b.low) : 0, dt, 18, 4);
      sm.mid = follow(sm.mid, live ? clamp(b.mid) : 0, dt, 16, 4);
      sm.high = follow(sm.high, live ? clamp(b.high) : 0, dt, 20, 5);
      sm.mic = follow(sm.mic, live ? mic : 0, dt, 14, 3);
      // Entrada do histórico: voz + respiração de repouso (viva mesmo calada); conectando faz uma varredura.
      const idle = 0.07 + 0.04 * Math.sin(t * 1.3);
      const scan = c === "connecting" ? 0.3 * (0.5 + 0.5 * Math.sin(t * 3.2)) : 0;
      const raw = c === "error" ? 0.03 : c === "off" ? 0.02 : Math.max(voz, idle + scan);
      sm.amp = follow(sm.amp, raw, dt, 26, 5);
      acc += dt;
      while (acc >= 1 / 60) {
        hist.push(sm.amp * (reduce ? 0.5 : 1));
        acc -= 1 / 60;
      }
      // Tom da voz (se houver) muda a quantidade de ondas; as frequências médias também.
      const f0n = b.f0 && b.voiced && b.voiced > 0.3 ? clamp((b.f0 - 80) / 220) : 0.35;
      sm.k = follow(sm.k, 2.0 + f0n * 1.0 + sm.mid * 0.8, dt, 4, 1.5);
      sm.ph += dt * (1.6 + sm.vol * 5 + sm.high * 3) * calm;

      // Giro: eixo inclinado que balança; a voz acelera.
      const spd = c === "live" ? 0.42 + sm.vol * 1.1 + (estado === "thinking" ? 0.4 : 0) : c === "connecting" ? 0.9 : 0.14;
      yaw += dt * spd * calm;
      seam += dt * (0.8 + sm.vol * 2.4) * calm;
      const tilt = 0.42 + 0.2 * Math.sin(t * 0.37) * calm + sm.low * 0.12;
      const roll = 0.5 * Math.sin(t * 0.23) * calm + (sm.mid - 0.15) * 0.25;

      // Pulso dos anéis: um por início de palavra/sílaba.
      if (live && voz > 0.3 && prevAmp < 0.2 && t - lastRipple > 0.28) {
        ripples.push({ born: t, mic: me < mic });
        lastRipple = t;
      }
      prevAmp = voz;
      while (ripples.length && t - ripples[0]!.born > 1.2) ripples.shift();

      const R = D() / 2;
      const cx = W / 2;
      const cy = cyOf();
      const am = (dim ? 0.5 : 1) * (c === "off" ? 0.55 : c === "error" ? 0.6 + 0.4 * Math.sin(t * 9) ** 2 : 1);
      const forma = { k: sm.k, ph: sm.ph, t, low: sm.low, high: sm.high };

      // Pontos
      let nb = 0;
      for (let i = 0; i < NL; i++) {
        const amp = ringAmp(hist, i, NL);
        const ci = cphi[i]!;
        const si = sphi[i]!;
        const sj = (((Math.round(i * 0.9 + seam) % NM) + NM) % NM) | 0;
        for (let j = 0; j < NM; j++) {
          const r = radiusAt(phi[i]!, th[j]!, i, amp, forma);
          const p = projetar(r * ci * cth[j]!, r * si, r * ci * sth[j]!, yaw, tilt, roll, R * 0.74);
          const d = clamp((p.z + 1.25) / 2.5);
          const k = i * NM + j;
          px[k] = cx + p.x;
          py[k] = cy + p.y;
          pz[k] = p.z;
          const seamDot = j === sj;
          ps[k] = R * 0.046 * (0.4 + 0.8 * d) * p.persp * (1 + 0.07 * sm.vol) * (seamDot ? 1.3 : 1);
          pa[k] = (0.16 + 0.84 * Math.pow(d, 1.5)) * am;
          pk[k] = seamDot ? 2 : d < 0.45 ? 1 : 0;
          nb++;
        }
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";

      // Grade de fundo e brilho
      if (grid) {
        ctx.globalAlpha = (0.55 + sm.vol * 0.4) * am;
        ctx.drawImage(grid, 0, 0, W, H);
      }
      const gl = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.2);
      gl.addColorStop(0, `rgba(255,40,30,${(0.12 + sm.vol * 0.22) * am})`);
      gl.addColorStop(1, "rgba(255,40,30,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, W, H);

      // Anéis concêntricos
      ctx.lineWidth = 1;
      ctx.strokeStyle = `rgba(255,96,84,${(0.2 + sm.vol * 0.3) * am})`;
      ctx.beginPath();
      ctx.arc(cx, cy, R * (1.02 + 0.04 * sm.vol), 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,96,84,${0.11 * am})`;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.2, 0, TAU);
      ctx.stroke();
      if (sm.mic > 0.05) {
        ctx.strokeStyle = `rgba(255,222,214,${Math.min(0.7, sm.mic * 0.9) * am})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (0.92 + 0.05 * sm.mic), 0, TAU);
        ctx.stroke();
      }
      for (const rp of ripples) {
        const age = (t - rp.born) / 1.2;
        ctx.strokeStyle = rp.mic ? `rgba(255,222,214,${(1 - age) * 0.5 * am})` : `rgba(255,70,60,${(1 - age) * 0.6 * am})`;
        ctx.lineWidth = 1.4 * (1 - age) + 0.4;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (1.0 + 0.2 * age), 0, TAU);
        ctx.stroke();
      }

      // Poeira
      for (let i = 0; i < ND; i++) {
        const a = da[i]! + t * 0.05 * (i % 2 ? 1 : -1);
        const rr = R * dr[i]! * (1 + 0.04 * Math.sin(t * 0.7 + dph[i]!));
        const tw = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4 + dph[i]!));
        const s = dsz[i]! * 2.4;
        ctx.globalAlpha = tw * am;
        ctx.drawImage(spr.dust, cx + Math.cos(a) * rr - s, cy + Math.sin(a) * rr * 0.96 - s, s * 2, s * 2);
      }

      // Pontos: primeiro os do fundo, depois os da frente.
      for (let pass = 0; pass < 2; pass++) {
        for (let k = 0; k < nb; k++) {
          if ((pz[k]! < 0 ? 0 : 1) !== pass) continue;
          const s = ps[k]!;
          const img = pk[k] === 2 ? spr.seam : pk[k] === 1 ? spr.deep : spr.bright;
          ctx.globalAlpha = pk[k] === 2 ? Math.min(1, pa[k]! * 1.15) : pa[k]!;
          ctx.drawImage(img, px[k]! - s, py[k]! - s, s * 2, s * 2);
        }
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    // Só desenha enquanto aparece na tela.
    const io = new IntersectionObserver(([e]) => {
      visible = !!e?.isIntersecting;
      if (visible) start();
    });
    io.observe(el);
    start();
    return () => {
      cancelAnimationFrame(raf);
      raf = 0;
      visible = false;
      ro.disconnect();
      io.disconnect();
    };
  }, [size, dim]);

  if (fallback) {
    return (
      <div className="voz-fundo" aria-hidden data-testid="voz-orbe" data-estado="fallback" style={{ display: "flex", justifyContent: "center" }}>
        <span style={{ marginTop: size * 0.05, width: size * 0.8, height: size * 0.8, borderRadius: "50%", opacity: dim ? 0.5 : 1, background: "radial-gradient(circle at 40% 35%, #ff6a5e, #b01620 60%, #2a0507)", boxShadow: "0 0 30px rgb(255 26 26 / 0.45)" }} />
      </div>
    );
  }
  return <canvas ref={canvas} className="voz-fundo" aria-hidden data-testid="voz-orbe" />;
}
