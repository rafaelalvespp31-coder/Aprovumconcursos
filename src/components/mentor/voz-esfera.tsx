"use client";

import { useEffect, useRef, useState } from "react";
import { resolveEstado, type Bands, type Conexao, type SkullEstado } from "./skull-orb-fx";
import { Historia, TAU, clamp, follow, projetar, radiusAt, ringAmp } from "./esfera-fx";

const SRC = "/mentor/orb-esfera.webp"; // arte da caveira: só serve de mapa de densidade e cor das partículas
const BASE = 280;

/** Pontinho com borda suave (para ficar nítido mesmo com 1 px). */
function sprite(r: number, g: number, b: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, `rgba(${r},${g},${b},1)`);
  gr.addColorStop(0.45, `rgba(${r},${g},${b},0.9)`);
  gr.addColorStop(0.8, `rgba(${r},${g},${b},0.25)`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  return c;
}

const smooth = (v: number) => v * v * (3 - 2 * v);
/** Raios (px a 280 px de tamanho) das três classes de partícula da esfera: mínima, média e um pouco maior. */
const TIER = [0.55, 0.95, 1.5];

/**
 * Mentor: uma nuvem de micropartículas com duas formas. Em silêncio elas formam a caveira (desenho da
 * arte do Mentor, ponto a ponto). Quando o Mentor fala, as partículas se soltam, cada uma por um
 * caminho, e viram uma esfera de anéis que gira e se deforma com a voz: o volume nasce no equador e corre
 * até os polos, e cada partícula também vibra em três eixos, espalhando-se em várias direções nos picos.
 * Passada a fala, elas voltam à caveira.
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
    const k0 = size / BASE;
    // vermelho vivo, laranja, branco quente, rocha clara, rocha escura, vermelho fundo (caveira) | esfera: vivo, fundo, fio claro
    const spr = [
      sprite(255, 30, 24), sprite(255, 96, 64), sprite(255, 236, 228), sprite(168, 160, 168), sprite(92, 82, 88), sprite(176, 22, 24),
      sprite(255, 84, 72), sprite(176, 22, 30), sprite(255, 214, 206),
    ];
    const dust = sprite(255, 110, 100);

    // Nuvem: cada partícula tem um lugar na caveira e outro na esfera.
    const NC = mobile ? 8000 : 16000;
    const hx = new Float32Array(NC);
    const hy = new Float32Array(NC);
    const hz = new Float32Array(NC);
    const cc = new Uint8Array(NC);
    const cs = new Float32Array(NC);
    const ca = new Float32Array(NC);
    const kr = new Uint8Array(NC); // anel da esfera
    const kphi = new Float32Array(NC);
    const kth = new Float32Array(NC);
    const kcp = new Float32Array(NC);
    const ksp = new Float32Array(NC);
    const kct = new Float32Array(NC);
    const kst = new Float32Array(NC);
    const kdel = new Float32Array(NC); // atraso da viagem (as partículas não saem todas juntas)
    const wamp = new Float32Array(NC);
    const wf = new Float32Array(NC * 3);
    const wp = new Float32Array(NC * 3);
    const ux = new Float32Array(NC);
    const uy = new Float32Array(NC);
    const uz = new Float32Array(NC);
    let seed = (Math.random() * 2 ** 31) | 0;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // Esfera: grade alinhada (anéis de latitude, pontos igualmente espaçados em cada anel). As demais partículas viram poeira solta.
    const NR = mobile ? 44 : 56;
    const NS = mobile ? 3400 : 5600;
    const ringPhi = (i: number) => (-0.5 + (i + 0.5) / NR) * Math.PI * 0.94;
    let sumCos = 0;
    for (let i = 0; i < NR; i++) sumCos += Math.cos(ringPhi(i));
    const nMax = NS / sumCos;
    const kt = new Uint8Array(NC); // tamanho: 0 mínima, 1 média, 2 um pouco maior
    const kd = new Uint8Array(NC); // 1 = poeira
    let slot = 0;
    for (let i = 0; i < NR && slot < NC; i++) {
      const m = Math.max(6, Math.round(nMax * Math.cos(ringPhi(i))));
      for (let j = 0; j < m && slot < NS; j++) {
        const k = slot++;
        kr[k] = i;
        kphi[k] = ringPhi(i);
        kth[k] = ((j + (i % 2) * 0.5) / m) * TAU;
      }
    }
    const NSL = slot;
    for (let k = 0; k < NC; k++) {
      if (k >= NSL) {
        kd[k] = 1;
        kr[k] = 0;
        kphi[k] = 0;
        kth[k] = 0;
      }
      kcp[k] = Math.cos(kphi[k]!);
      ksp[k] = Math.sin(kphi[k]!);
      kct[k] = Math.cos(kth[k]!);
      kst[k] = Math.sin(kth[k]!);
      kdel[k] = rnd();
      wamp[k] = 0.5 + rnd() * 0.9;
      for (let q = 0; q < 3; q++) {
        wf[k * 3 + q] = 0.6 + rnd() * 2.6;
        wp[k * 3 + q] = rnd() * TAU;
      }
      const z = rnd() * 2 - 1;
      const a = rnd() * TAU;
      const s = Math.sqrt(1 - z * z);
      ux[k] = s * Math.cos(a);
      uy[k] = z;
      uz[k] = s * Math.sin(a);
      cs[k] = 0.42 + rnd() * 0.62;
      ca[k] = 0.55 + rnd() * 0.45;
      const rt = rnd();
      kt[k] = kd[k] ? 0 : rt < 0.5 ? 0 : rt < 0.84 ? 1 : 2;
    }
    let skullReady = false;
    const buildSkull = (img: HTMLImageElement) => {
      const S = 360;
      const c = document.createElement("canvas");
      c.width = c.height = S;
      const x = c.getContext("2d", { willReadFrequently: true });
      if (!x) return;
      x.drawImage(img, 0, 0, S, S);
      const d = x.getImageData(0, 0, S, S).data;
      const cum = new Float32Array(S * S);
      let tot = 0;
      for (let i = 0; i < S * S; i++) {
        const r = d[i * 4]!;
        const g = d[i * 4 + 1]!;
        const b = d[i * 4 + 2]!;
        const lum = (r * 0.5 + g * 0.3 + b * 0.2) / 255;
        const red = Math.max(0, r - Math.max(g, b)) / 255;
        tot += (d[i * 4 + 3]! / 255) * (0.05 + Math.pow(lum, 1.5) * 1.1 + Math.pow(red, 1.4) * 2);
        cum[i] = tot;
      }
      for (let k = 0; k < NC; k++) {
        const u = rnd() * tot;
        let lo = 0;
        let hi = S * S - 1;
        while (lo < hi) {
          const mid = (lo + hi) >> 1;
          if (cum[mid]! < u) lo = mid + 1;
          else hi = mid;
        }
        const r = d[lo * 4]!;
        const g = d[lo * 4 + 1]!;
        const b = d[lo * 4 + 2]!;
        const X = (((lo % S) + rnd()) / S - 0.5) * 2;
        const Y = ((Math.floor(lo / S) + rnd()) / S - 0.5) * 2;
        const rr = Math.min(1, Math.hypot(X, Y));
        const zz = Math.sqrt(Math.max(0, 1 - rr * rr));
        const back = rnd() < 0.3;
        hx[k] = X;
        hy[k] = Y;
        hz[k] = (back ? -1 : 1) * zz * (0.4 + 0.5 * rnd());
        const lum = (r * 0.5 + g * 0.3 + b * 0.2) / 255;
        const red = r - Math.max(g, b);
        cc[k] = red > 90 ? (g > 120 ? 1 : 0) : red > 45 ? 5 : lum > 0.62 ? 2 : lum > 0.2 ? 3 : 4;
        const bright = Math.max(lum * 1.1, (Math.max(0, red) / 255) * 1.6);
        ca[k] = Math.min(1, 0.16 + 1.0 * bright) * (0.7 + 0.3 * rnd()) * (back ? 0.45 : 1);
      }
      // Olhos acesos (as órbitas da caveira): um punhado de partículas quentes em cada uma.
      for (let k = 0; k < 360; k++) {
        const left = k < 180;
        const g1 = (rnd() + rnd() + rnd() - 1.5) * 0.07;
        const g2 = (rnd() + rnd() + rnd() - 1.5) * 0.05;
        hx[k] = (left ? -0.17 : 0.33) + g1;
        hy[k] = -0.2 + g2;
        hz[k] = 0.7;
        cc[k] = rnd() < 0.1 ? 2 : rnd() < 0.5 ? 1 : 0;
        ca[k] = 0.75 + 0.25 * rnd();
      }
      skullReady = true;
    };
    const img = new Image();
    img.onload = () => buildSkull(img);
    img.onerror = () => undefined; // sem a arte, fica só a esfera
    img.src = SRC;

    // Poeira solta em volta.
    const ND = mobile ? 20 : 34;
    const da = new Float32Array(ND);
    const dr = new Float32Array(ND);
    const dsz = new Float32Array(ND);
    const dph = new Float32Array(ND);
    for (let i = 0; i < ND; i++) {
      da[i] = rnd() * TAU;
      dr[i] = 0.8 + rnd() * 0.4;
      dsz[i] = 0.5 + rnd() * 1.0;
      dph[i] = rnd() * TAU;
    }

    const hist = new Historia(96);
    const ringA = new Float32Array(NR);
    let acc = 0;
    let t = 0;
    let yaw = rnd() * TAU;
    let seam = 0;
    let last = performance.now();
    let raf = 0;
    let visible = true;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let grid: HTMLCanvasElement | null = null;
    const sm = { vol: 0, low: 0, mid: 0, high: 0, mic: 0, amp: 0, k: 3, ph: 0, s: 0, burst: 0 };
    let hold = 0;
    let prevAmp = 0;
    let lastRipple = -9;
    const ripples: Array<{ born: number; mic: boolean }> = [];
    let peak = 0;
    // Qualidade adaptativa: tira partículas se os quadros demorarem.
    let q = 1;
    let ema = 16;
    let slow = 0;
    let fast = 0;

    const cyOf = () => size * 0.5 + 4;
    const buildGrid = () => {
      const R = (size * 0.9) / 2;
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
      const dtRaw = Math.max(0, (now - last) / 1000);
      const dt = Math.min(0.05, dtRaw);
      last = now;
      t += dt;
      ema += (dtRaw * 1000 - ema) * 0.05;
      if (ema > 26) {
        slow += dt;
        fast = 0;
      } else if (ema < 19) {
        fast += dt;
        slow = 0;
      }
      if (slow > 1.2 && q > 0.45) {
        q = Math.max(0.45, q - 0.18);
        slow = 0;
      }
      if (fast > 8 && q < 1) {
        q = Math.min(1, q + 0.1);
        fast = 0;
      }

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
      // Falando (ou ouvindo você) por perto: vira esfera. Calou por ~0,6 s: volta à caveira.
      if (live && (me > 0.05 || mic > 0.14)) hold = t + 0.6;
      const talk = c === "connecting" ? 0.0 : t < hold ? 1 : 0;
      sm.s = follow(sm.s, skullReady ? talk : 1, dt, 5.5, 2.1);
      // Pico: cada início de sílaba espalha as partículas por um instante em todas as direções.
      sm.burst = Math.max(follow(sm.burst, 0, dt, 1, 8), live && voz > prevAmp + 0.12 ? clamp(voz * 1.1) : 0);
      const raw = c === "error" ? 0.03 : c === "off" ? 0.02 : Math.max(voz, 0.07 + 0.04 * Math.sin(t * 1.3));
      sm.amp = follow(sm.amp, raw, dt, 26, 5);
      acc += dt;
      while (acc >= 1 / 60) {
        hist.push(sm.amp * (reduce ? 0.5 : 1));
        acc -= 1 / 60;
      }
      for (let i = 0; i < NR; i++) ringA[i] = ringAmp(hist, i, NR, 1.5);
      const f0n = b.f0 && b.voiced && b.voiced > 0.3 ? clamp((b.f0 - 80) / 220) : 0.35;
      sm.k = follow(sm.k, 2.0 + f0n * 1.0 + sm.mid * 0.8, dt, 4, 1.5);
      sm.ph += dt * (1.6 + sm.vol * 5 + sm.high * 3) * calm;
      yaw += dt * (c === "live" ? 0.42 + sm.vol * 1.1 : 0.2) * calm;
      seam += dt * (0.8 + sm.vol * 2.4) * calm;
      const tilt = 0.42 + 0.2 * Math.sin(t * 0.37) * calm + sm.low * 0.12;
      const roll = 0.5 * Math.sin(t * 0.23) * calm + (sm.mid - 0.15) * 0.25;
      if (live && voz > 0.3 && prevAmp < 0.2 && t - lastRipple > 0.28) {
        ripples.push({ born: t, mic: me < mic });
        lastRipple = t;
      }
      prevAmp = voz;
      while (ripples.length && t - ripples[0]!.born > 1.2) ripples.shift();

      const R = (size * 0.9) / 2;
      const Rs = R * 0.74;
      const Rk = R * 0.98;
      const cx = W / 2;
      const cy = cyOf();
      const eAll = smooth(clamp(sm.s));
      const am = (dim ? 0.5 : 1) * (c === "off" ? 0.55 : c === "error" ? 0.6 + 0.4 * Math.sin(t * 9) ** 2 : 1);
      const forma = { k: sm.k, ph: sm.ph, t, low: sm.low, high: sm.high };
      const skY = 0.14 * Math.sin(t * 0.5) * calm;
      const skT = 0.06 * Math.sin(t * 0.41) * calm;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      // Brilho (sempre) e grade/anéis (só como esfera)
      const gl = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R * 1.25);
      gl.addColorStop(0, `rgba(255,30,20,${(0.1 + eAll * 0.06 + sm.vol * 0.2) * am})`);
      gl.addColorStop(1, "rgba(255,30,20,0)");
      ctx.fillStyle = gl;
      ctx.fillRect(0, 0, W, H);
      if (grid && eAll > 0.01) {
        ctx.globalAlpha = (0.55 + sm.vol * 0.4) * am * eAll;
        ctx.drawImage(grid, 0, 0, W, H);
        ctx.globalAlpha = 1;
      }
      if (eAll > 0.01) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(255,96,84,${(0.2 + sm.vol * 0.3) * am * eAll})`;
        ctx.beginPath();
        ctx.arc(cx, cy, R * (1.02 + 0.04 * sm.vol), 0, TAU);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,96,84,${0.11 * am * eAll})`;
        ctx.beginPath();
        ctx.arc(cx, cy, R * 1.2, 0, TAU);
        ctx.stroke();
        if (sm.mic > 0.05) {
          ctx.strokeStyle = `rgba(255,222,214,${Math.min(0.7, sm.mic * 0.9) * am * eAll})`;
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
      }

      // Partículas (brilho aditivo: onde há muitas juntas, acende)
      ctx.globalCompositeOperation = "lighter";
      const n = Math.round(NC * q);
      const sc = k0 * 1.15;
      const drift = 0.006 + 0.04 * sm.vol + 0.03 * sm.high;
      const scat = (0.012 * sm.vol + 0.14 * sm.burst) * calm;
      for (let k = 0; k < n; k++) {
        const e = smooth(clamp(sm.s * 1.55 - kdel[k]! * 0.55));
        const w = wamp[k]!;
        const f = k * 3;
        const sx = Math.sin(t * wf[f]! + wp[f]!);
        const sy = Math.sin(t * wf[f + 1]! + wp[f + 1]!);
        const sz = Math.sin(t * wf[f + 2]! + wp[f + 2]!);
        let ax = 0;
        let ay = 0;
        let az = 0;
        let aa = 0;
        if (e < 1 && skullReady) {
          const j = 0.012 * w * calm;
          const p = projetar(hx[k]! + sx * j, hy[k]! + sy * j, hz[k]! + sz * j, skY, skT, 0, Rk);
          ax = cx + p.x;
          ay = cy + p.y;
          az = p.z;
          aa = ca[k]!;
        }
        let bx = 0;
        let by = 0;
        let bz = 0;
        let ba = 0;
        let bs = 0;
        if (e > 0) {
          let x0: number;
          let y0: number;
          let z0: number;
          if (kd[k]) {
            // poeira: enxame solto em volta, vibrando em ângulos diferentes
            const rho = 1.02 + 0.5 * kdel[k]! + 0.12 * sx;
            const dm = (0.05 + 0.12 * sm.vol + 0.1 * sm.high) * w;
            x0 = ux[k]! * rho + sy * dm;
            y0 = uy[k]! * rho + sz * dm;
            z0 = uz[k]! * rho + sx * dm;
          } else {
            const i = kr[k]!;
            const r = radiusAt(kphi[k]!, kth[k]!, i, ringA[i]!, forma);
            const dm = drift * w;
            const sk = scat * w;
            x0 = r * kcp[k]! * kct[k]! + sx * dm + ux[k]! * sk;
            y0 = r * ksp[k]! + sy * dm + uy[k]! * sk;
            z0 = r * kcp[k]! * kst[k]! + sz * dm + uz[k]! * sk;
          }
          const p = projetar(x0, y0, z0, yaw, tilt, roll, Rs);
          bx = cx + p.x;
          by = cy + p.y;
          bz = p.z;
          const d = clamp((p.z + 1.25) / 2.5);
          ba = (0.2 + 0.8 * Math.pow(d, 1.4)) * (kd[k] ? 0.55 : 1);
          bs = TIER[kt[k]!]! * (0.7 + 0.5 * d);
          if (!kd[k]) {
            let da2 = kth[k]! - (kphi[k]! * 3 + seam);
            da2 -= Math.round(da2 / TAU) * TAU;
            if (Math.abs(da2) < 0.1) bs *= -1; // marca: fio claro
          }
        }
        const useB = e > 0.5 || !skullReady;
        let x: number;
        let y: number;
        let a: number;
        let sizeP: number;
        let img: HTMLCanvasElement;
        if (e <= 0 && skullReady) {
          x = ax;
          y = ay;
          a = aa;
          sizeP = cs[k]! * sc * (0.75 + 0.25 * (az + 1));
          img = spr[cc[k]!]!;
        } else if (e >= 1 || !skullReady) {
          x = bx;
          y = by;
          a = ba;
          const seamDot = bs < 0;
          sizeP = k0 * Math.abs(bs) * (1 + 0.1 * sm.vol) * (seamDot ? 1.2 : 1);
          img = seamDot ? spr[8]! : bz < -0.1 ? spr[7]! : spr[6]!;
        } else {
          x = ax + (bx - ax) * e;
          y = ay + (by - ay) * e;
          a = aa + (ba - aa) * e;
          sizeP = cs[k]! * sc * (1 - e) + k0 * Math.abs(bs) * e;
          img = useB ? (bs < 0 ? spr[8]! : spr[6]!) : spr[cc[k]!]!;
        }
        const s = sizeP * 1.5;
        ctx.globalAlpha = Math.min(1, a * am * 0.85);
        ctx.drawImage(img, x - s, y - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      // Poeira em volta
      for (let i = 0; i < ND; i++) {
        const an = da[i]! + t * 0.05 * (i % 2 ? 1 : -1);
        const rr = R * dr[i]! * (1 + 0.04 * Math.sin(t * 0.7 + dph[i]!));
        const tw = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.4 + dph[i]!));
        const s = dsz[i]! * 2.2;
        ctx.globalAlpha = tw * am * 0.8;
        ctx.drawImage(dust, cx + Math.cos(an) * rr - s, cy + Math.sin(an) * rr * 0.96 - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
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
      img.onload = img.onerror = null;
    };
  }, [size, dim]);

  if (fallback) {
    return (
      <div className="voz-fundo" aria-hidden data-testid="voz-orbe" data-estado="fallback" style={{ display: "flex", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- sem canvas: mostra a esfera parada */}
        <img src={SRC} alt="" width={size * 0.9} height={size * 0.9} draggable={false} style={{ marginTop: size * 0.05, opacity: dim ? 0.5 : 1, filter: "drop-shadow(0 0 18px rgb(255 26 26 / 0.45))" }} />
      </div>
    );
  }
  return <canvas ref={canvas} className="voz-fundo" aria-hidden data-testid="voz-orbe" />;
}
