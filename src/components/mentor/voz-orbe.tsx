"use client";

import { useEffect, useRef, useState } from "react";
import { ALVOS, NODES, ease, mulberry32, pickNodes, resolveEstado, spawnBolt, boltSpan, type Alvo, type Bands, type Bolt, type Conexao, type NodeId, type Pt, type SkullEstado } from "./skull-orb-fx";

export { SILENCE, type Bands } from "./skull-orb-fx";

const SRC = "/mentor/orb-esfera.webp"; // arte de referência: só serve de mapa de cor e densidade das partículas
const BASE = 280; // tamanho de referência (px) das medidas

/** Pontinho suave (centro nítido, borda que se apaga). */
function sprite(r: number, g: number, b: number, a = 1): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const x = c.getContext("2d")!;
  const gr = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  gr.addColorStop(0, `rgba(${r},${g},${b},${a})`);
  gr.addColorStop(0.28, `rgba(${r},${g},${b},${a * 0.75})`);
  gr.addColorStop(0.6, `rgba(${r},${g},${b},${a * 0.2})`);
  gr.addColorStop(1, `rgba(${r},${g},${b},0)`);
  x.fillStyle = gr;
  x.fillRect(0, 0, 32, 32);
  return c;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
const TAU = Math.PI * 2;

/**
 * Skull Orb do Mentor: a esfera com a caveira de rocha e fendas vermelhas (arte de referência), mas
 * feita só de micropartículas soltas que flutuam: nada de imagem presa a um círculo. A arte é lida
 * uma vez como mapa de densidade e cor; cada partícula nasce num ponto da esfera (com profundidade),
 * deriva devagar e nas bordas se solta numa névoa. Por cima: descargas elétricas, olhos energizados,
 * destroços, fumaça e micropartículas em vários planos. Tudo guiado pelo áudio real (volume, grave,
 * médio, agudo e picos) e por sete estados (idle, listening, thinking, speaking, high, error,
 * disconnected).
 */
export function VozOrbe({ level, dim = false, size = 280, conn = "live" }: { level: () => Bands; dim?: boolean; size?: number; conn?: Conexao }) {
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
    const spr = { red: sprite(255, 26, 26), hot: sprite(255, 214, 200), smoke: sprite(200, 200, 210, 0.5) };
    const cls = [sprite(255, 24, 20), sprite(255, 84, 60), sprite(255, 236, 226), sprite(130, 124, 132), sprite(70, 62, 66)]; // vermelho, laranja-vivo, branco, rocha clara, rocha escura
    const rnd = mulberry32((Math.random() * 2 ** 31) | 0);

    // Nuvem da esfera: lida do mapa da arte, ponto a ponto (mais partículas onde há luz/vermelho).
    const NC = mobile ? 5200 : 10000;
    const hx = new Float32Array(NC);
    const hy = new Float32Array(NC);
    const hz = new Float32Array(NC);
    const cc = new Uint8Array(NC);
    const cs = new Float32Array(NC);
    const ca = new Float32Array(NC);
    const cd = new Float32Array(NC);
    const ck = new Uint8Array(NC); // 1 = partícula de fenda (acende com a voz)
    const oax = new Float32Array(NC); // eixo da órbita de cada partícula
    const oay = new Float32Array(NC);
    const oaz = new Float32Array(NC);
    const ow = new Float32Array(NC); // velocidade angular (rad/s)
    const oam = new Float32Array(NC); // abertura da órbita (rad)
    const oph = new Float32Array(NC);
    const cpx = new Float32Array(NC);
    const cpy = new Float32Array(NC);
    const cpa = new Float32Array(NC);
    const cps = new Float32Array(NC);
    let nc = 0;
    const buildCloud = (img: HTMLImageElement) => {
      const S = 320;
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
        tot += (d[i * 4 + 3]! / 255) * (0.13 + Math.pow(lum, 1.4) * 0.7 + red * 2.2);
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
        const px0 = ((lo % S) + rnd()) / S;
        const py0 = (Math.floor(lo / S) + rnd()) / S;
        const X = (px0 - 0.5) * 2;
        const Y = (py0 - 0.5) * 2;
        const rr = Math.hypot(X, Y);
        const zz = Math.sqrt(Math.max(0, 1 - Math.min(1, rr) ** 2));
        const back = rnd() < 0.3;
        hx[k] = X;
        hy[k] = Y;
        hz[k] = (back ? -1 : 1) * zz * (0.55 + 0.45 * rnd());
        const lum = (r * 0.5 + g * 0.3 + b * 0.2) / 255;
        const red = r - Math.max(g, b);
        cc[k] = red > 90 ? (g > 120 ? 1 : 0) : lum > 0.62 ? 2 : lum > 0.2 ? 3 : 4;
        ck[k] = red > 60 ? 1 : 0;
        cs[k] = 0.45 + rnd() * 0.9 + (cc[k] === 2 && rnd() < 0.08 ? 0.7 : 0);
        ca[k] = (cc[k] === 4 ? 0.7 : cc[k] === 3 ? 0.35 + 0.4 * rnd() : 0.5 + 0.5 * rnd()) * (back ? 0.45 : 1) * ((cc[k] ?? 4) <= 1 ? 1.25 : 1);
        cd[k] = rnd() * 1000;
        // Órbita própria: eixo, sentido, velocidade e abertura aleatórios (nada anda igual).
        const az = rnd() * 2 - 1;
        const aa = rnd() * TAU;
        const as = Math.sqrt(1 - az * az);
        oax[k] = as * Math.cos(aa);
        oay[k] = az;
        oaz[k] = as * Math.sin(aa);
        ow[k] = (0.05 + rnd() * 0.22) * (rnd() < 0.5 ? -1 : 1);
        oam[k] = 0.05 + rnd() * 0.16;
        oph[k] = rnd() * TAU;
      }
      nc = NC;
    };
    const imgs = [
      (() => {
        const i = new Image();
        i.onload = () => buildCloud(i);
        i.onerror = () => setFallback(true);
        i.src = SRC;
        return i;
      })(),
    ];

    // Qualidade: 0 (leve) a 2 (completa). Cai sozinha se os quadros demorarem.
    const NP = mobile ? 300 : 520;
    let quality = mobile ? 1 : 2;
    let slow = 0;
    let fast = 0;
    let ema = 16;
    const maxBolts = () => [6, 10, 16][quality]!;
    const active = () => Math.round(NP * [0.4, 0.7, 1][quality]!);

    // Partículas: 0 orbita, 1 flutua pelo fundo, 2 é atraída, 3 é repelida, 4 é poeira que gira sobre a esfera.
    const kind = new Uint8Array(NP);
    const ang = new Float32Array(NP);
    const rho = new Float32Array(NP);
    const inc = new Float32Array(NP);
    const wv = new Float32Array(NP);
    const dx = new Float32Array(NP);
    const dy = new Float32Array(NP);
    const dz = new Float32Array(NP);
    const bx = new Float32Array(NP);
    const by = new Float32Array(NP);
    const sd = new Float32Array(NP);
    const sz = new Float32Array(NP);
    const al = new Float32Array(NP);
    const hot = new Uint8Array(NP);
    const trail = new Uint8Array(NP);
    const px = new Float32Array(NP);
    const py = new Float32Array(NP);
    const ox = new Float32Array(NP);
    const oy = new Float32Array(NP);
    const pa = new Float32Array(NP);
    const ps = new Float32Array(NP);
    const front = new Uint8Array(NP);
    const dirOf = (i: number) => {
      const z = rnd() * 2 - 1;
      const a = rnd() * TAU;
      const s = Math.sqrt(1 - z * z);
      dx[i] = s * Math.cos(a);
      dy[i] = z;
      dz[i] = s * Math.sin(a);
    };
    for (let i = 0; i < NP; i++) {
      const u = rnd();
      kind[i] = u < 0.3 ? 0 : u < 0.6 ? 1 : u < 0.8 ? 2 : 3;
      ang[i] = rnd() * TAU;
      rho[i] = kind[i] === 0 ? 1.08 + rnd() * 1.1 : kind[i] === 2 ? 1.3 + rnd() * 1.4 : kind[i] === 4 ? 0.5 + 0.5 * Math.sqrt(rnd()) : 0.5 + rnd() * 1.1;
      inc[i] = kind[i] === 4 ? (rnd() - 0.5) * 2.6 : (rnd() - 0.5) * 2.2; // latitude (poeira) ou inclinação da órbita
      wv[i] = (0.1 + rnd() * 0.5) * (rnd() < 0.5 ? -1 : 1);
      dirOf(i);
      bx[i] = rnd();
      by[i] = rnd();
      sd[i] = rnd() * 1000;
      sz[i] = (kind[i] === 4 ? 0.3 : 0.35) + rnd() * 0.9 + (rnd() < 0.04 ? 0.9 : 0);
      al[i] = 0.25 + rnd() * 0.65;
      hot[i] = rnd() < (kind[i] === 4 ? 0.55 : 0.25) ? 1 : 0;
      trail[i] = kind[i] !== 1 && kind[i] !== 4 && rnd() < 0.4 ? 1 : 0;
    }

    // Destroços de rocha que giram em volta da esfera.
    const ND = mobile ? 9 : 16;
    const dAng = new Float32Array(ND);
    const dRho = new Float32Array(ND);
    const dInc = new Float32Array(ND);
    const dW = new Float32Array(ND);
    const dSz = new Float32Array(ND);
    const dRot = new Float32Array(ND);
    const dRv = new Float32Array(ND);
    const dShape: number[][] = [];
    for (let i = 0; i < ND; i++) {
      dAng[i] = rnd() * TAU;
      dRho[i] = 1.12 + rnd() * 0.9;
      dInc[i] = (rnd() - 0.5) * 1.6;
      dW[i] = (0.05 + rnd() * 0.2) * (rnd() < 0.5 ? -1 : 1);
      dSz[i] = 3 + rnd() * 8;
      dRot[i] = rnd() * TAU;
      dRv[i] = (rnd() - 0.5) * 2;
      dShape.push(Array.from({ length: 5 }, (_, k) => (k / 5) * TAU + (rnd() - 0.5) * 0.8).flatMap((a) => [Math.cos(a) * (0.55 + rnd() * 0.6), Math.sin(a) * (0.55 + rnd() * 0.6)]));
    }

    // Fumaça: manchas cinzentas que derivam devagar.
    const NF = 12;
    const fAng = new Float32Array(NF);
    const fDist = new Float32Array(NF);
    const fW = new Float32Array(NF);
    const fSz = new Float32Array(NF);
    for (let i = 0; i < NF; i++) {
      fAng[i] = rnd() * TAU;
      fDist[i] = 0.9 + rnd() * 1.1;
      fW[i] = (0.02 + rnd() * 0.05) * (rnd() < 0.5 ? -1 : 1);
      fSz[i] = 0.7 + rnd() * 1.1;
    }

    // Faíscas lançadas depois de cada descarga.
    const NS = 160;
    const sx = new Float32Array(NS);
    const sy = new Float32Array(NS);
    const svx = new Float32Array(NS);
    const svy = new Float32Array(NS);
    const sl = new Float32Array(NS);
    let sNext = 0;
    const spark = (x: number, y: number, n: number, power: number) => {
      for (let k = 0; k < n; k++) {
        const i = sNext++ % NS;
        const a = rnd() * TAU;
        const v = (20 + rnd() * 70) * (0.5 + power);
        sx[i] = x;
        sy[i] = y;
        svx[i] = Math.cos(a) * v;
        svy[i] = Math.sin(a) * v - 10;
        sl[i] = 0.35 + rnd() * 0.7;
      }
    };

    const bolts: Bolt[] = [];
    const waves: { born: number; str: number }[] = [];

    type Four = "vol" | "low" | "mid" | "high";
    const cur: Record<Four, number> = { vol: 0, low: 0, mid: 0, high: 0 };
    const fx: Alvo = { ...ALVOS.disconnected };
    let me = 0;
    let mic = 0;
    let peak = 0;
    let loud = 0;
    let impulse = 0;
    let coord = 0; // 0 = cada partícula na sua órbita; 1 = todas coordenadas com a voz
    let tone = 0.4; // tom da voz: 0 grave, 1 agudo
    let lastWave = -1;
    let micSeen = false;
    let lastMic = -99;
    let glitchAt = 2;
    let glitchUntil = 0;
    let estado: SkullEstado = "disconnected";
    let t = 0;
    let last = performance.now();
    let raf = 0;
    let visible = true;
    let W = 0;
    let H = 0;
    let dpr = 1;

    const fit = () => {
      const r = el.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(mobile ? 1.5 : 1.75, window.devicePixelRatio || 1);
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      // O carimbo do rAF pode ser um pouco anterior ao `last`: dt nunca negativo (senão a suavização estoura).
      const dtRaw = Math.max(0, (now - last) / 1000);
      const dt = Math.min(0.05, dtRaw);
      last = now;
      t += dt;
      const f60 = dt * 60;

      // Qualidade adaptativa: sustenta ~50 fps, senão tira partículas e raios.
      ema += (dtRaw * 1000 - ema) * 0.05;
      if (ema > 26) {
        slow += dt;
        fast = 0;
      } else if (ema < 18) {
        fast += dt;
        slow = 0;
      }
      if (slow > 1.2 && quality > 0) {
        quality--;
        slow = 0;
      }
      if (fast > 8 && quality < (mobile ? 1 : 2)) {
        quality++;
        fast = 0;
      }

      // Áudio real: sobe rápido (acompanha a sílaba) e volta ao repouso aos poucos.
      const tg = read.current();
      (Object.keys(cur) as Four[]).forEach((k) => {
        cur[k] = ease(cur[k], clamp(tg[k]), 0.55, 0.06, f60);
      });
      const tgMe = clamp(tg.me ?? tg.vol);
      const tgMic = clamp(tg.mic ?? 0);
      me = ease(me, tgMe, 0.5, 0.07, f60);
      mic = ease(mic, tgMic, 0.5, 0.1, f60);
      peak = Math.max(peak * Math.pow(0.985, f60), me);
      const onset = tg.vol - loud;
      loud = ease(loud, tg.vol, 0.2, 0.03, f60);
      impulse *= Math.pow(0.93, f60);
      {
        const sum = cur.low + cur.mid + cur.high;
        if (sum > 0.12) tone = ease(tone, clamp((cur.low * 0.1 + cur.mid * 0.5 + cur.high) / sum), 0.15, 0.15, f60);
        const l = clamp(mic * 1.6 - me * 2);
        coord = ease(coord, Math.max(clamp(me * 2.5), l * 0.55), 0.1, 0.025, f60);
      }
      if (mic > 0.08) {
        micSeen = true;
        lastMic = t;
      }
      if (me > 0.06) micSeen = false;
      const awaiting = micSeen && t - lastMic > 0.6 && t - lastMic < 12;
      estado = resolveEstado({ conn: connRef.current, me, mic, peak, awaiting });
      if (el.dataset.estado !== estado) el.dataset.estado = estado;
      const goal = ALVOS[estado];
      (Object.keys(fx) as (keyof Alvo)[]).forEach((k) => {
        fx[k] = ease(fx[k], goal[k], 0.07, 0.016, f60); // nada para de repente
      });

      const spd = (0.35 + fx.speed + cur.vol * 1.4 + cur.high * 0.6) * calm;
      const E = clamp(fx.energy + cur.vol * 0.5 + cur.low * 0.2);
      const eyeI = clamp(fx.eye + cur.vol * 0.7 + cur.mid * 0.25 + 0.06 * Math.sin(t * 2.1));
      const k0 = size / BASE;
      const D = size * 0.9;
      const R = D / 2;
      const cx = W / 2;
      const cy = size * 0.5 + 4;
      const am = dim ? 0.5 : 1;
      const listen = clamp(mic * 1.6 - me * 2);
      const loc = (n: NodeId): Pt => ({ x: (NODES[n].x - 0.5) * D, y: (NODES[n].y - 0.5) * D });

      const newBolt = (intensity: number, eyes = false) => {
        if (bolts.length >= maxBolts()) return;
        let bolt: Bolt;
        let end: Pt;
        if (eyes) {
          const a = loc(rnd() < 0.5 ? "eyeL" : "eyeR");
          const ag = rnd() * TAU;
          const l = D * (0.06 + rnd() * 0.1);
          end = { x: a.x + Math.cos(ag) * l, y: a.y + Math.sin(ag) * l - D * 0.02 };
          bolt = spawnBolt(rnd, a, end, t, intensity);
        } else {
          const k = rnd();
          if (k < 0.55) {
            const p = pickNodes(rnd, intensity); // pelas fendas da caveira
            const a = loc(p.a);
            end = loc(p.b);
            bolt = spawnBolt(rnd, a, end, t, intensity);
          } else {
            const th = (rnd() < 0.7 ? (rnd() < 0.5 ? 0 : Math.PI) : rnd() * TAU) + (rnd() - 0.5) * 1.4; // saltando para fora, mais pelas laterais
            const a = { x: Math.cos(th) * R * (0.7 + rnd() * 0.28), y: Math.sin(th) * R * (0.7 + rnd() * 0.28) };
            const l = R * (0.25 + rnd() * (0.3 + intensity * 0.45));
            end = { x: a.x + Math.cos(th + (rnd() - 0.5) * 0.7) * l, y: a.y + Math.sin(th + (rnd() - 0.5) * 0.7) * l };
            bolt = spawnBolt(rnd, a, end, t, intensity);
          }
        }
        bolts.push(bolt);
        spark(cx + end.x, cy + end.y, 2 + Math.round(intensity * 4), intensity);
      };

      // Pico de voz: onda de luz, descargas extras e empurrão nas partículas.
      if (!reduce && onset > 0.22 && tg.vol > 0.25 && t - lastWave > 0.4 && (estado === "speaking" || estado === "high")) {
        lastWave = t;
        waves.push({ born: t, str: clamp(0.4 + tg.vol * 0.7) });
        impulse = clamp(impulse + 0.5 + tg.vol * 0.4, 0, 1.2);
        for (let k = 0; k < 2 + Math.round(tg.vol * 3); k++) newBolt(0.9);
      }
      // Descargas procedurais, sem padrão fixo.
      const I = clamp(E * 0.5 + cur.vol * 0.8 + impulse * 0.4);
      const rate = (fx.bolts * (reduce ? 0.35 : 1) + cur.vol * 10 + cur.high * 6) * dt;
      for (let n = Math.floor(rate) + (rnd() < rate % 1 ? 1 : 0); n > 0; n--) newBolt(I);
      if (rnd() < eyeI * 1.1 * dt * (reduce ? 0.3 : 1)) newBolt(0.3 + eyeI * 0.4, true);
      for (let i = bolts.length - 1; i >= 0; i--) if (t - bolts[i]!.born > bolts[i]!.life) bolts.splice(i, 1);

      // Partículas.
      const n = active();
      const F = D * 3;
      const sphere = 1 + cur.low * 0.1 + impulse * 0.3;
      const pull = (0.04 + cur.vol * 0.5 + listen * 0.25) * spd;
      for (let i = 0; i < n; i++) {
        const s = sd[i]!;
        let x = 0;
        let y = 0;
        let z = 0;
        let screen = false;
        const kd = kind[i]!;
        if (kd === 0) {
          ang[i] = ang[i]! + wv[i]! * dt * spd * 2.2;
          const r = rho[i]! * R * sphere;
          const o = Math.sin(ang[i]!) * r;
          x = Math.cos(ang[i]!) * r;
          y = o * Math.cos(inc[i]!);
          z = o * Math.sin(inc[i]!);
        } else if (kd === 1) {
          screen = true;
          x = bx[i]! * W + Math.sin(t * 0.11 + s) * 38 + Math.sin(t * 0.07 + s * 2) * 24;
          y = by[i]! * H + Math.cos(t * 0.09 + s * 1.3) * 34 + Math.sin(t * 0.13 + s) * 20;
          z = Math.sin(s * 3) * R * 0.9;
          const w = cur.vol * 0.07 * (0.4 + 0.6 * Math.abs(Math.sin(s * 3)));
          x += (cx - x) * w + Math.sin(t * 9 + s) * cur.high * 5 * calm;
          y += (cy - y) * w + Math.cos(t * 8 + s) * cur.high * 5 * calm;
        } else if (kd === 2) {
          rho[i] = rho[i]! - dt * pull;
          if (rho[i]! < 0.55) {
            rho[i] = 1.8 + rnd() * 1.1;
            dirOf(i);
          }
          x = dx[i]! * rho[i]! * R;
          y = dy[i]! * rho[i]! * R;
          z = dz[i]! * rho[i]! * R;
        } else if (kd === 3) {
          rho[i] = rho[i]! + dt * (0.05 + impulse * 1.1 + cur.high * 0.35) * spd;
          if (rho[i]! > 2.2) {
            rho[i] = 0.62 + rnd() * 0.1;
            dirOf(i);
          }
          x = dx[i]! * rho[i]! * R;
          y = dy[i]! * rho[i]! * R;
          z = dz[i]! * rho[i]! * R;
        } else {
          // Poeira girando sobre a esfera (longitude avança, latitude fixa).
          ang[i] = ang[i]! + wv[i]! * dt * (0.5 + spd) * 1.6;
          const lat = inc[i]!;
          const r = rho[i]! * R * 1.02 * sphere;
          x = Math.sin(ang[i]!) * Math.cos(lat) * r;
          y = Math.sin(lat) * r;
          z = Math.cos(ang[i]!) * Math.cos(lat) * r;
        }
        const k = F / (F - z);
        const X = screen ? x : cx + x * k;
        const Y = screen ? y : cy + y * k;
        ox[i] = px[i]!;
        oy[i] = py[i]!;
        px[i] = X;
        py[i] = Y;
        front[i] = z >= 0 ? 1 : 0;
        let a = al[i]! * (0.5 + E * 0.7) * (0.45 + 0.55 * ((z / R + 1) / 2));
        if (z < 0 && !screen && Math.hypot(x, y) < R * 0.95) a *= kd === 4 ? 0 : 0.3; // atrás da esfera
        if (hot[i]) a *= 1 + clamp(cur.high * 0.9) * Math.sin(t * 30 + s) * 0.8; // cintilação nos agudos
        const e = Math.min(1, X / 46, (W - X) / 46, Y / 46, (H - Y) / 46);
        pa[i] = e < 1 ? a * Math.max(0, e) : a;
        ps[i] = sz[i]! * k * k0 * 3.4 * (1 + cur.vol * 0.3);
      }

      // ---- Desenho ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      // Halo energético: o grave expande, o volume acende. Escutando, clareia.
      const hr = D * (0.78 + cur.low * 0.2 + impulse * 0.2);
      const hg = ctx.createRadialGradient(cx, cy, D * 0.15, cx, cy, hr);
      const lc = Math.round(26 + listen * 120);
      const ha = clamp((0.08 + fx.halo * 0.22 + cur.low * 0.25 + cur.vol * 0.15) * am, 0, 0.4);
      hg.addColorStop(0, `rgba(255,${lc},${lc},${ha})`);
      hg.addColorStop(0.55, `rgba(225,${Math.round(6 + listen * 60)},0,${ha * 0.3})`);
      hg.addColorStop(1, "rgba(225,6,0,0)");
      ctx.fillStyle = hg;
      ctx.fillRect(cx - hr, cy - hr, hr * 2, hr * 2);

      // Plataforma de energia no chão, com o ponto de luz no centro e a linha do horizonte.
      const fy = cy + R * 1.04;
      const fl = clamp(0.15 + fx.ring * 0.3 + cur.mid * 0.25) * am;
      ctx.lineWidth = 1.2;
      for (let r = 0; r < 4; r++) {
        ctx.strokeStyle = `rgba(255,40,30,${fl * (1 - r * 0.2)})`;
        ctx.beginPath();
        ctx.ellipse(cx, fy, R * (0.55 + r * 0.2 + cur.low * 0.05), R * (0.065 + r * 0.018), 0, 0, TAU);
        ctx.stroke();
      }
      const fg = ctx.createRadialGradient(cx, fy, 0, cx, fy, R * 0.45);
      fg.addColorStop(0, `rgba(255,70,55,${clamp(0.3 + E * 0.5) * am})`);
      fg.addColorStop(1, "rgba(255,0,0,0)");
      ctx.fillStyle = fg;
      ctx.fillRect(cx - R * 0.45, fy - R * 0.2, R * 0.9, R * 0.4);
      const hzg = ctx.createLinearGradient(0, 0, W, 0);
      hzg.addColorStop(0, "rgba(255,40,30,0)");
      hzg.addColorStop(0.5, `rgba(255,50,40,${fl * 0.9})`);
      hzg.addColorStop(1, "rgba(255,40,30,0)");
      ctx.fillStyle = hzg;
      ctx.fillRect(0, fy - 0.5, W, 1);

      // Colchetes de HUD nas laterais, como na arte.
      ctx.strokeStyle = `rgba(255,40,35,${(0.3 + fx.ring * 0.3) * am})`;
      ctx.lineWidth = 1.3;
      for (const sd2 of [1, -1]) {
        const x0 = sd2 > 0 ? 12 : W - 12;
        ctx.beginPath();
        ctx.moveTo(x0, cy + R * 0.7);
        ctx.lineTo(x0, cy - R * 0.55);
        ctx.lineTo(x0 + 16 * sd2, cy - R * 0.8);
        ctx.lineTo(x0 + 46 * sd2, cy - R * 0.8);
        ctx.stroke();
      }

      // Fumaça.
      for (let i = 0; i < NF; i++) {
        fAng[i] = fAng[i]! + fW[i]! * dt * calm;
        const d = fDist[i]! * R * (1 + cur.low * 0.1);
        const fxp = cx + Math.cos(fAng[i]!) * d * 1.3 + Math.sin(t * 0.2 + i) * 8;
        const fyp = cy + Math.sin(fAng[i]!) * d * 0.75 + Math.cos(t * 0.17 + i * 2) * 6;
        const s = fSz[i]! * R * 0.9;
        ctx.globalAlpha = (0.1 + E * 0.12) * am;
        ctx.drawImage(spr.smoke, fxp - s / 2, fyp - s / 2, s, s);
      }
      ctx.globalAlpha = 1;

      // Destroços e partículas (um plano por vez: atrás e na frente da esfera).
      const debris = (half: number) => {
        ctx.globalCompositeOperation = "source-over";
        for (let i = 0; i < ND; i++) {
          dAng[i] = dAng[i]! + dW[i]! * dt * (0.6 + spd) * 1.4;
          dRot[i] = dRot[i]! + dRv[i]! * dt * (0.5 + spd);
          const r = dRho[i]! * R * (1 + cur.low * 0.08 + impulse * 0.25);
          const o = Math.sin(dAng[i]!) * r;
          const z = o * Math.sin(dInc[i]!);
          if ((z >= 0 ? 1 : 0) !== half) continue;
          const k = F / (F - z);
          const X = cx + Math.cos(dAng[i]!) * r * k;
          const Y = cy + o * Math.cos(dInc[i]!) * k;
          if (z < 0 && Math.hypot(X - cx, Y - cy) < R * 0.95) continue; // escondido pela esfera
          const s = dSz[i]! * k0 * k;
          ctx.save();
          ctx.translate(X, Y);
          ctx.rotate(dRot[i]!);
          const sh = dShape[i]!;
          ctx.beginPath();
          ctx.moveTo(sh[0]! * s, sh[1]! * s);
          for (let q = 2; q < sh.length; q += 2) ctx.lineTo(sh[q]! * s, sh[q + 1]! * s);
          ctx.closePath();
          ctx.globalAlpha = clamp(0.55 + E * 0.4) * am;
          ctx.fillStyle = "#0b0b0d";
          ctx.fill();
          ctx.strokeStyle = `rgba(255,${70 + Math.round(cur.vol * 80)},60,${0.45 + cur.vol * 0.4})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
          ctx.restore();
        }
        ctx.globalAlpha = 1;
      };
      const sprPass = (half: number) => {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(255,70,55,0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          if (front[i] !== half || !trail[i] || pa[i]! < 0.05) continue;
          const l = Math.hypot(px[i]! - ox[i]!, py[i]! - oy[i]!);
          if (l < 0.6 || l > 24) continue;
          ctx.moveTo(px[i]!, py[i]!);
          ctx.lineTo(px[i]! - (px[i]! - ox[i]!) * (2 + cur.vol * 2.5), py[i]! - (py[i]! - oy[i]!) * (2 + cur.vol * 2.5));
        }
        ctx.globalAlpha = am;
        ctx.stroke();
        for (let i = 0; i < n; i++) {
          if (front[i] !== half) continue;
          const a = pa[i]! * am;
          if (a < 0.02) continue;
          ctx.globalAlpha = Math.min(1, a);
          const s = ps[i]!;
          ctx.drawImage(hot[i] ? spr.hot : spr.red, px[i]! - s / 2, py[i]! - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
        debris(half);
      };

      sprPass(0);

      // ---- A esfera de micropartículas: a caveira nasce da arte de referência, sem borda nem imagem ----
      const yaw = Math.sin(t * 0.35) * 0.16 * calm + (estado === "thinking" ? Math.sin(t * 1.3) * 0.06 * calm : 0);
      const pitch = Math.sin(t * 0.27 + 1) * 0.08 * calm;
      const cyw = Math.cos(yaw);
      const syw = Math.sin(yaw);
      const cp = Math.cos(pitch);
      const sp = Math.sin(pitch);
      const grow = (1 + 0.02 * Math.sin((t / 3.2) * TAU) * (reduce ? 0.4 : 1)) * (1 + cur.low * 0.06 + impulse * 0.1) * (1 - listen * 0.03);
      const bob = Math.sin(t * 0.8) * D * 0.008 * calm;
      const glitching = fx.glitch > 0.4 && t < glitchUntil;
      if (fx.glitch > 0.4 && t > glitchAt) {
        glitchUntil = t + 0.16;
        glitchAt = t + 1.4 + rnd() * 2.2;
      }
      // Onda de energia atravessando as fendas na diagonal.
      const ph = ((t * (0.2 + fx.speed * 0.12 + cur.mid * 0.35)) % 1.8) - 0.4;
      const crackE = E * 0.5 + cur.mid * 0.9 + cur.low * 0.4;
      const ncDraw = Math.min(nc, Math.round(NC * [0.5, 0.78, 1][quality]!));
      for (let i = 0; i < ncDraw; i++) {
        const hxi = hx[i]!;
        const hyi = hy[i]!;
        const r0 = Math.hypot(hxi, hyi);
        const sdd = cd[i]!;
        // Em repouso: cada partícula orbita sozinha, devagar (arco em torno de um eixo próprio).
        // Falando: a órbita individual se acalma e todas passam a responder juntas ao áudio.
        const rest = 1 - coord * 0.65;
        const th = oam[i]! * (0.5 + r0) * rest * calm * Math.sin(t * ow[i]! * 4 + oph[i]!);
        const ct = Math.cos(th);
        const st = Math.sin(th);
        const ux = oax[i]!;
        const uy = oay[i]!;
        const uz = oaz[i]!;
        const vx = hxi;
        const vy = hyi;
        const vz = hz[i]!;
        const dt3 = (ux * vx + uy * vy + uz * vz) * (1 - ct);
        let ox2 = vx * ct + (uy * vz - uz * vy) * st + ux * dt3;
        let oy2 = vy * ct + (uz * vx - ux * vz) * st + uy * dt3;
        let oz2 = vz * ct + (ux * vy - uy * vx) * st + uz * dt3;
        const wob = 1 + 0.025 * rest * calm * Math.sin(t * (0.3 + Math.abs(ow[i]!)) + sdd);
        ox2 *= wob;
        oy2 *= wob;
        oz2 *= wob;
        const d3 = Math.hypot(ox2, oy2, oz2);
        // Resposta coordenada: três camadas (núcleo = grave, meio = médio, fora = agudo) e ondas que
        // saem do centro; o tom muda a frequência das ondas e o volume muda a força.
        const wl = clamp(1 - d3 * 2.2);
        const wm = clamp(1 - Math.abs(d3 - 0.55) * 3.5);
        const wh = clamp((d3 - 0.5) * 2.5);
        const bandPush = wl * cur.low * 0.1 + wm * cur.mid * 0.08 + wh * cur.high * 0.07;
        const wave = Math.sin(d3 * (3 + tone * 8) - t * (2.2 + tone * 5) * (listen > me ? -0.6 : 1)) * (0.012 + cur.vol * 0.07 + impulse * 0.07);
        const radial = 1 + (bandPush + wave) * coord * calm + cur.low * 0.04 + impulse * 0.2 * (0.3 + r0) + 0.05 * r0 * r0 * Math.sin(t * 0.6 + sdd);
        const edge = (0.004 + 0.045 * r0 * r0 * r0 + cur.high * 0.012 * coord) * R * calm;
        // Torção coordenada em torno do eixo de visão: gira mais com o médio e com o tom.
        const tw = coord * (cur.mid * 0.45 + cur.vol * 0.25) * Math.sin(t * (0.8 + tone * 2.4)) * (1 - d3 * 0.5) * calm;
        const ctw = Math.cos(tw);
        const stw = Math.sin(tw);
        const x = ((ox2 * ctw - oy2 * stw) * R * radial + Math.sin(t * 0.5 + sdd + hyi * 3) * edge) * grow;
        const y = ((ox2 * stw + oy2 * ctw) * R * radial + Math.cos(t * 0.45 + sdd * 1.3 + hxi * 3) * edge) * grow;
        const z = (oz2 * R * radial + Math.sin(t * 0.4 + sdd * 0.7) * edge) * grow;
        const bandLit = 1 + coord * (wl * cur.low * 0.5 + wm * cur.mid * 0.6 + wh * cur.high * 0.7);
        const xr = x * cyw + z * syw;
        const zr = -x * syw + z * cyw;
        const yr = y * cp - zr * sp;
        const zr2 = y * sp + zr * cp;
        const k = F / (F - zr2);
        cpx[i] = cx + xr * k + (glitching && Math.sin(yr * 0.3 + t * 40) > 0.6 ? 7 : 0);
        cpy[i] = cy + bob + yr * k;
        let a = ca[i]! * (0.7 + E * 0.6) * bandLit * (0.55 + 0.45 * ((zr2 / R + 1) / 2));
        let sc = 1;
        if (ck[i]) {
          const band = Math.exp(-Math.pow(((hxi * 0.6 + hyi * 0.8) * 0.5 + 0.5 - ph) / 0.1, 2)) * (0.5 + E);
          const boost = 0.15 + crackE * 0.6 + band * 1.4;
          a *= 1 + boost;
          sc = 1 + boost * 0.1;
        }
        if (r0 > 0.8) a *= 0.7 + 0.3 * Math.sin(t * (1.5 + (sdd % 3)) + sdd);
        if (hot[i % NP] && cur.high > 0.05) a *= 1 + cur.high * 0.6 * Math.sin(t * 30 + sdd);
        const e = Math.min(1, cpx[i]! / 46, (W - cpx[i]!) / 46, cpy[i]! / 46, (H - cpy[i]!) / 46);
        cpa[i] = clamp(a) * Math.max(0, e) * am;
        cps[i] = cs[i]! * k * k0 * 3.7 * sc * (1 + cur.vol * 0.25);
      }
      for (const c of [4, 3, 0, 1, 2]) {
        ctx.globalCompositeOperation = c >= 3 ? "source-over" : "lighter";
        const sp2 = cls[c]!;
        for (let i = 0; i < ncDraw; i++) {
          if (cc[i] !== c) continue;
          const a = cpa[i]!;
          if (a < 0.02) continue;
          ctx.globalAlpha = a;
          const s = cps[i]!;
          ctx.drawImage(sp2, cpx[i]! - s / 2, cpy[i]! - s / 2, s, s);
          if (c < 2 && a > 0.35) {
            // brilho suave em volta das fendas (bloom barato)
            ctx.globalAlpha = a * 0.16;
            ctx.drawImage(sp2, cpx[i]! - s * 1.6, cpy[i]! - s * 1.6, s * 3.2, s * 3.2);
          }
        }
      }
      ctx.globalAlpha = 1;

      // Plano local da caveira, para os olhos e as descargas acompanharem a nuvem.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(cx, cy + bob);
      ctx.transform(cyw * grow, 0, syw * 0.12, cp * grow, 0, 0);
      ctx.globalCompositeOperation = "lighter";

      // Cavidades oculares energizadas.
      for (const id of ["eyeL", "eyeR"] as const) {
        const ex = (NODES[id].x - 0.5) * D;
        const ey = (NODES[id].y - 0.5) * D;
        const er = D * (0.04 + eyeI * 0.03);
        const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, er);
        g.addColorStop(0, `rgba(255,${Math.round(130 + eyeI * 80)},${Math.round(110 + eyeI * 60)},${clamp(0.1 + eyeI * 0.4) * am})`);
        g.addColorStop(0.35, `rgba(255,40,30,${clamp(0.1 + eyeI * 0.35) * am})`);
        g.addColorStop(1, "rgba(255,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
      }

      // Descargas elétricas: pelas fendas da caveira e saltando para fora.
      ctx.lineJoin = "round";
      const trace = (pts: Pt[], head: number, tail: number) => {
        const m = pts.length - 1;
        const i0 = Math.floor(tail * m);
        const i1 = Math.min(m, Math.ceil(head * m));
        if (i1 - i0 < 1) return false;
        ctx.beginPath();
        ctx.moveTo(pts[i0]!.x, pts[i0]!.y);
        for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(pts[i]!.x, pts[i]!.y);
        return true;
      };
      for (const b of bolts) {
        const sp = boltSpan(t - b.born, b.life);
        const aa = sp.alpha * (reduce ? 0.8 : 0.6 + 0.4 * rnd()) * am;
        const parts: [Pt[], number][] = [[b.pts, 1], ...b.branches.map((p): [Pt[], number] => [p, 0.6])];
        for (const [pts, k] of parts) {
          if (!trace(pts, sp.head, sp.tail)) continue;
          ctx.strokeStyle = `rgba(255,30,25,${0.28 * aa * k})`;
          ctx.lineWidth = b.width * 4.5 * k;
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,205,195,${0.95 * aa * k})`;
          ctx.lineWidth = b.width * k;
          ctx.stroke();
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Ondas de luz nos picos de voz.
      ctx.globalCompositeOperation = "lighter";
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i]!;
        const p = (t - w.born) / 0.9;
        if (p >= 1) {
          waves.splice(i, 1);
          continue;
        }
        ctx.strokeStyle = `rgba(255,70,55,${Math.pow(1 - p, 2) * w.str * 0.55 * am})`;
        ctx.lineWidth = 1 + (1 - p) * 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * (0.95 + p * 0.9), R * (0.95 + p * 0.9) * 0.96, 0, 0, TAU);
        ctx.stroke();
      }

      // Faíscas das descargas.
      for (let i = 0; i < NS; i++) {
        if (sl[i]! <= 0) continue;
        sl[i] = sl[i]! - dt;
        sx[i] = sx[i]! + svx[i]! * dt;
        sy[i] = sy[i]! + svy[i]! * dt;
        svx[i] = svx[i]! * Math.pow(0.96, f60);
        svy[i] = svy[i]! * Math.pow(0.96, f60) + 14 * dt;
        const s = 3.5 * k0 * Math.min(1, sl[i]! * 2.5);
        ctx.globalAlpha = Math.min(1, sl[i]! * 2) * am;
        ctx.drawImage(spr.hot, sx[i]! - s, sy[i]! - s, s * 2, s * 2);
      }
      ctx.globalAlpha = 1;

      sprPass(1);
      ctx.globalCompositeOperation = "source-over";
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    // Só renderiza enquanto aparece na tela e a aba está aberta.
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
      for (const i of imgs) i.onload = i.onerror = null;
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
