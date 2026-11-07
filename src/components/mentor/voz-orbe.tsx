"use client";

import { useEffect, useRef, useState } from "react";
import { ALVOS, NODES, ease, mulberry32, pickNodes, resolveEstado, spawnBolt, boltSpan, type Alvo, type Bands, type Bolt, type Conexao, type NodeId, type Pt, type SkullEstado } from "./skull-orb-fx";

export { SILENCE, type Bands } from "./skull-orb-fx";

const SRC = "/mentor/caveira.webp";
const BASE = 280; // tamanho de referência (px) das medidas

type Sprites = { red: HTMLCanvasElement; hot: HTMLCanvasElement };

/** Pontinho suave (centro nítido, borda que se apaga) para cada micropartícula. */
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

/** A caveira original com a borda esfumada (a imagem tem fundo preto quadrado). O desenho dela nunca é alterado. */
function skullTexture(img: HTMLImageElement): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0, 512, 512);
  x.globalCompositeOperation = "destination-in";
  const g = x.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0, "#000");
  g.addColorStop(0.9, "#000");
  g.addColorStop(1, "rgba(0,0,0,0)");
  x.fillStyle = g;
  x.fillRect(0, 0, 512, 512);
  return c;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/**
 * Skull Orb do Mentor: a caveira original (caveira.webp) viva, renderizada em tempo real num canvas.
 * Por cima da arte, sem redesenhá-la: respiração e inclinação 3D, brilho e ondas de luz, olhos
 * energizados, descargas elétricas procedurais que percorrem o crânio, anéis de energia e uma nuvem
 * de micropartículas em vários planos de profundidade. Tudo é guiado pelo áudio real (volume, grave,
 * médio, agudo e picos) e por sete estados (idle, listening, thinking, speaking, high, error,
 * disconnected) com transições suavizadas.
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
    const sprites: Sprites = { red: sprite(255, 26, 26), hot: sprite(255, 214, 200) };
    const rnd = mulberry32((Math.random() * 2 ** 31) | 0);

    let tex: HTMLCanvasElement | null = null;
    let hl: HTMLCanvasElement | null = null;
    let hlx: CanvasRenderingContext2D | null = null;
    const img = new Image();
    img.onload = () => {
      tex = skullTexture(img);
    };
    img.onerror = () => setFallback(true);
    img.src = SRC;

    // Qualidade: 0 (leve) a 2 (completa). Cai sozinha se os quadros demorarem.
    const NP = mobile ? 420 : 760;
    let quality = mobile ? 1 : 2;
    let slow = 0;
    let fast = 0;
    let ema = 16;
    const maxBolts = () => [5, 9, 14][quality]!;
    const active = () => Math.round(NP * [0.4, 0.7, 1][quality]!);

    // Partículas: 0 orbita a caveira, 1 flutua pelo fundo, 2 é atraída, 3 é repelida pelo campo.
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
      const a = rnd() * Math.PI * 2;
      const s = Math.sqrt(1 - z * z);
      dx[i] = s * Math.cos(a);
      dy[i] = z;
      dz[i] = s * Math.sin(a);
    };
    for (let i = 0; i < NP; i++) {
      const u = rnd();
      kind[i] = u < 0.34 ? 0 : u < 0.68 ? 1 : u < 0.84 ? 2 : 3;
      ang[i] = rnd() * Math.PI * 2;
      rho[i] = kind[i] === 0 ? 1.05 + rnd() * 0.95 : kind[i] === 2 ? 1.2 + rnd() * 1.4 : 0.5 + rnd() * 1.1;
      inc[i] = (rnd() - 0.5) * 2.2;
      wv[i] = (0.12 + rnd() * 0.5) * (rnd() < 0.5 ? -1 : 1);
      dirOf(i);
      bx[i] = rnd();
      by[i] = rnd();
      sd[i] = rnd() * 1000;
      sz[i] = 0.35 + rnd() * 0.95 + (rnd() < 0.04 ? 0.9 : 0);
      al[i] = 0.25 + rnd() * 0.65;
      hot[i] = rnd() < 0.22 ? 1 : 0;
      trail[i] = kind[i] !== 1 && rnd() < 0.4 ? 1 : 0;
    }

    // Faíscas lançadas depois de cada descarga.
    const NS = 140;
    const sx = new Float32Array(NS);
    const sy = new Float32Array(NS);
    const svx = new Float32Array(NS);
    const svy = new Float32Array(NS);
    const sl = new Float32Array(NS); // vida restante (s)
    let sNext = 0;
    const spark = (x: number, y: number, n: number, power: number) => {
      for (let k = 0; k < n; k++) {
        const i = sNext++ % NS;
        const a = rnd() * Math.PI * 2;
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
    let loud = 0; // média lenta do volume, para detectar picos (início de palavra enfática)
    let impulse = 0;
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
    let hs = 0;

    const fit = () => {
      const r = el.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(mobile ? 1.5 : 1.75, window.devicePixelRatio || 1);
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
      hs = Math.round(size * 0.9 * dpr);
      hl = document.createElement("canvas");
      hl.width = hl.height = hs;
      hlx = hl.getContext("2d");
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

      // Pico de voz: onda de luz, descargas extras e empurrão nas partículas.
      if (!reduce && onset > 0.22 && tg.vol > 0.25 && t - lastWave > 0.4 && (estado === "speaking" || estado === "high")) {
        lastWave = t;
        waves.push({ born: t, str: clamp(0.4 + tg.vol * 0.7) });
        impulse = clamp(impulse + 0.5 + tg.vol * 0.4, 0, 1.2);
        for (let k = 0; k < 2 + Math.round(tg.vol * 2); k++) newBolt(0.9);
      }

      function newBolt(intensity: number, eyes = false) {
        if (bolts.length >= maxBolts()) return;
        const loc = (n: NodeId): Pt => ({ x: (NODES[n].x - 0.5) * D, y: (NODES[n].y - 0.5) * D });
        let a: Pt;
        let b: Pt;
        if (eyes) {
          const n: NodeId = rnd() < 0.5 ? "eyeL" : "eyeR";
          a = loc(n);
          const ag = rnd() * Math.PI * 2;
          const l = D * (0.07 + rnd() * 0.1);
          b = { x: a.x + Math.cos(ag) * l, y: a.y + Math.sin(ag) * l - D * 0.02 };
        } else {
          const p = pickNodes(rnd, intensity);
          a = loc(p.a);
          b = loc(p.b);
        }
        const bolt = spawnBolt(rnd, a, b, t, intensity);
        bolts.push(bolt);
        spark(cx + b.x, cy + b.y, 2 + Math.round(intensity * 4), intensity);
        if (!eyes) spark(cx + a.x, cy + a.y, 1 + Math.round(intensity * 2), intensity * 0.6);
      }
      // Descargas procedurais, sem padrão fixo.
      const I = clamp(E * 0.5 + cur.vol * 0.8 + impulse * 0.4);
      const rate = (fx.bolts * (reduce ? 0.35 : 1) + cur.vol * 10 + cur.high * 6) * dt;
      for (let n = Math.floor(rate) + (rnd() < rate % 1 ? 1 : 0); n > 0; n--) newBolt(I);
      const eyeRate = eyeI * 1.1 * dt * (reduce ? 0.3 : 1);
      if (rnd() < eyeRate) newBolt(0.3 + eyeI * 0.4, true);
      for (let i = bolts.length - 1; i >= 0; i--) if (t - bolts[i]!.born > bolts[i]!.life) bolts.splice(i, 1);

      // Partículas.
      const n = active();
      const F = D * 3;
      const sphere = 1 + cur.low * 0.12 + impulse * 0.3;
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
        } else {
          rho[i] = rho[i]! + dt * (0.05 + impulse * 1.1 + cur.high * 0.35) * spd;
          if (rho[i]! > 2.2) {
            rho[i] = 0.62 + rnd() * 0.1;
            dirOf(i);
          }
          x = dx[i]! * rho[i]! * R;
          y = dy[i]! * rho[i]! * R;
          z = dz[i]! * rho[i]! * R;
        }
        let X: number;
        let Y: number;
        let k = 1;
        if (screen) {
          k = F / (F - z);
          X = x;
          Y = y;
        } else {
          k = F / (F - z);
          X = cx + x * k;
          Y = cy + y * k;
        }
        ox[i] = px[i]!;
        oy[i] = py[i]!;
        px[i] = X;
        py[i] = Y;
        front[i] = z >= 0 ? 1 : 0;
        let a = al[i]! * (0.5 + E * 0.7) * (0.45 + 0.55 * ((z / R + 1) / 2));
        if (z < 0 && !screen && Math.hypot(x, y) < R * 0.78) a *= 0.3; // atrás do crânio
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
      const hr = D * (0.62 + cur.low * 0.2 + impulse * 0.2);
      const hg = ctx.createRadialGradient(cx, cy, D * 0.1, cx, cy, hr);
      const lc = Math.round(26 + listen * 120);
      const ha = clamp((0.1 + fx.halo * 0.22 + cur.low * 0.25 + cur.vol * 0.15) * am, 0, 0.7);
      hg.addColorStop(0, `rgba(255,${lc},${lc},${ha})`);
      hg.addColorStop(0.5, `rgba(225,${Math.round(6 + listen * 60)},0,${ha * 0.35})`);
      hg.addColorStop(1, "rgba(225,6,0,0)");
      ctx.fillStyle = hg;
      ctx.fillRect(cx - hr, cy - hr, hr * 2, hr * 2);

      // Plataforma de energia embaixo do crânio.
      ctx.lineWidth = 1.2;
      for (let r = 0; r < 3; r++) {
        ctx.strokeStyle = `rgba(255,40,30,${(0.12 + fx.ring * 0.25 + cur.mid * 0.2) * am * (1 - r * 0.28)})`;
        ctx.beginPath();
        ctx.ellipse(cx, cy + R * 1.02, R * (0.62 + r * 0.17 + cur.low * 0.06), R * (0.075 + r * 0.02), 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      const sprPass = (half: number) => {
        ctx.globalCompositeOperation = "lighter";
        ctx.strokeStyle = "rgba(255,70,55,0.22)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          if (front[i] !== half || !trail[i] || pa[i]! < 0.05) continue;
          const l = Math.hypot(px[i]! - ox[i]!, py[i]! - oy[i]!);
          if (l < 0.6 || l > 24) continue;
          const tx = px[i]! - (px[i]! - ox[i]!) * (2 + cur.vol * 2.5);
          const ty = py[i]! - (py[i]! - oy[i]!) * (2 + cur.vol * 2.5);
          ctx.moveTo(px[i]!, py[i]!);
          ctx.lineTo(tx, ty);
        }
        ctx.globalAlpha = am;
        ctx.stroke();
        for (let i = 0; i < n; i++) {
          if (front[i] !== half) continue;
          const a = pa[i]! * am;
          if (a < 0.02) continue;
          ctx.globalAlpha = Math.min(1, a);
          const s = ps[i]!;
          ctx.drawImage(hot[i] ? sprites.hot : sprites.red, px[i]! - s / 2, py[i]! - s / 2, s, s);
        }
        ctx.globalAlpha = 1;
      };

      // Anéis de energia: a metade de trás fica atrás do crânio, a da frente cruza por cima.
      const rings = [
        { rx: R * 1.28, ry: R * 0.4, rot: -0.38 + Math.sin(t * 0.21) * 0.05 * calm, dir: 1 },
        { rx: R * 1.14, ry: R * 0.3, rot: 0.52 + Math.sin(t * 0.17 + 1) * 0.05 * calm, dir: -1 },
      ];
      const ringArc = (half: "back" | "front") => {
        for (const rg of rings) {
          const [a0, a1] = half === "back" ? [Math.PI, Math.PI * 2] : [0, Math.PI];
          const per = Math.PI * 2 * Math.sqrt((rg.rx * rg.rx + rg.ry * rg.ry) / 2);
          const ri = clamp(fx.ring * 0.7 + cur.mid * 0.8 + cur.vol * 0.2) * am;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rg.rot);
          ctx.lineCap = "round";
          ctx.strokeStyle = `rgba(255,50,40,${(0.1 + ri * 0.22) * (half === "back" ? 0.6 : 1)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.ellipse(0, 0, rg.rx, rg.ry, 0, a0, a1);
          ctx.stroke();
          ctx.setLineDash([per * 0.16, per * 0.84]);
          ctx.lineDashOffset = -t * per * 0.12 * rg.dir * (0.4 + fx.speed + cur.mid * 2.5) * calm;
          ctx.strokeStyle = `rgba(255,120,100,${0.2 + ri * 0.7})`;
          ctx.lineWidth = 1.6 + cur.mid * 2.4;
          ctx.beginPath();
          ctx.ellipse(0, 0, rg.rx, rg.ry, 0, a0, a1);
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.restore();
        }
      };

      sprPass(0);
      ringArc("back");

      // ---- A caveira (arte original) ----
      const yaw = Math.sin(t * 0.45) * 0.07 * calm + (estado === "thinking" ? Math.sin(t * 1.3) * 0.03 * calm : 0);
      const pitch = Math.sin(t * 0.33 + 1) * 0.045 * calm;
      const roll = Math.sin(t * 0.27) * 0.022 * calm + Math.sin(t * 17) * cur.vol * 0.004 * calm;
      const breath = 1 + 0.014 * Math.sin((t / 3.2) * Math.PI * 2) * (reduce ? 0.4 : 1);
      const sc = breath * (1 + cur.low * 0.05 + impulse * 0.025) * (1 - listen * 0.03);
      const bob = Math.sin(t * 0.8) * D * 0.008 * calm;
      const glitching = fx.glitch > 0.4 && t < glitchUntil;
      if (fx.glitch > 0.4 && t > glitchAt) {
        glitchUntil = t + 0.16;
        glitchAt = t + 1.4 + rnd() * 2.2;
      }
      const bright = clamp(0.55 + E * 0.5) * am;
      const toSkull = (ofs = 0) => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.translate(cx + ofs, cy + bob);
        ctx.rotate(roll);
        ctx.transform(Math.cos(yaw) * sc, 0, Math.sin(yaw) * 0.07, Math.cos(pitch) * sc, 0, 0);
      };
      toSkull();
      if (tex) {
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = bright;
        ctx.drawImage(tex, -R, -R, D, D);
        if (glitching) {
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = 0.3 * am;
          ctx.drawImage(tex, -R + 5, -R - 1, D, D);
          ctx.globalAlpha = 0.16 * am;
          ctx.drawImage(tex, -R - 6, -R + 2, D, D);
        }
        ctx.globalAlpha = 1;

        // Ondas de luz percorrendo o crânio: faixa diagonal que passa por cima da própria arte.
        if (hl && hlx && quality > 0 && !reduce) {
          hlx.setTransform(1, 0, 0, 1, 0, 0);
          hlx.globalCompositeOperation = "source-over";
          hlx.clearRect(0, 0, hs, hs);
          hlx.drawImage(tex, 0, 0, hs, hs);
          hlx.globalCompositeOperation = "destination-in";
          const ph = ((t * (0.13 + fx.speed * 0.1 + cur.mid * 0.3)) % 1.6) - 0.3;
          const gx = hs * ph * 1.4 - hs * 0.2;
          const bg = hlx.createLinearGradient(gx - hs * 0.25, hs * 0.1, gx + hs * 0.25, hs * 0.5);
          const wa = clamp(0.2 + E * 0.55 + cur.mid * 0.4);
          bg.addColorStop(0, "rgba(255,255,255,0)");
          bg.addColorStop(0.5, `rgba(255,255,255,${wa})`);
          bg.addColorStop(1, "rgba(255,255,255,0)");
          hlx.fillStyle = bg;
          hlx.fillRect(0, 0, hs, hs);
          hlx.globalCompositeOperation = "source-over";
          ctx.globalCompositeOperation = "lighter";
          ctx.globalAlpha = clamp(0.3 + cur.vol * 0.3) * am;
          ctx.drawImage(hl, -R, -R, D, D);
          ctx.globalAlpha = 1;
        }
        // Pulsação luminosa do crânio inteiro (grave).
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = clamp(cur.low * 0.28 + impulse * 0.12) * am;
        ctx.drawImage(tex, -R, -R, D, D);
        ctx.globalAlpha = 1;
      }

      // Cavidades oculares energizadas: brilho interno, núcleo e reflexo nas bordas.
      ctx.globalCompositeOperation = "lighter";
      for (const id of ["eyeL", "eyeR"] as const) {
        const ex = (NODES[id].x - 0.5) * D;
        const ey = (NODES[id].y - 0.5) * D;
        const er = D * (0.05 + eyeI * 0.05);
        const g = ctx.createRadialGradient(ex, ey, 0, ex, ey, er);
        g.addColorStop(0, `rgba(255,${Math.round(150 + eyeI * 70)},${Math.round(120 + eyeI * 60)},${clamp(0.3 + eyeI * 0.7) * am})`);
        g.addColorStop(0.35, `rgba(255,40,30,${clamp(0.2 + eyeI * 0.5) * am})`);
        g.addColorStop(1, "rgba(255,0,0,0)");
        ctx.fillStyle = g;
        ctx.fillRect(ex - er, ey - er, er * 2, er * 2);
        ctx.strokeStyle = `rgba(255,70,55,${(0.12 + eyeI * 0.5) * am})`;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(ex, ey, D * 0.062, D * 0.048, id === "eyeL" ? 0.25 : -0.25, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Descargas elétricas na anatomia da caveira.
      ctx.lineCap = "round";
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
        const fl = reduce ? 0.8 : 0.6 + 0.4 * rnd();
        const aa = sp.alpha * fl * am;
        const parts: [Pt[], number][] = [[b.pts, 1], ...b.branches.map((p): [Pt[], number] => [p, 0.6])];
        for (const [pts, k] of parts) {
          if (!trace(pts, sp.head, sp.tail)) continue;
          ctx.strokeStyle = `rgba(255,30,25,${0.25 * aa * k})`;
          ctx.lineWidth = b.width * 4.5 * k;
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,205,195,${0.95 * aa * k})`;
          ctx.lineWidth = b.width * k;
          ctx.stroke();
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ringArc("front");

      // Ondas de luz nos picos de voz.
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
        ctx.ellipse(cx, cy, R * (0.9 + p * 0.9), R * (0.9 + p * 0.9) * 0.96, 0, 0, Math.PI * 2);
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
        ctx.drawImage(sprites.hot, sx[i]! - s, sy[i]! - s, s * 2, s * 2);
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
      img.onload = img.onerror = null;
    };
  }, [size, dim]);

  if (fallback) {
    return (
      <div className="voz-fundo" aria-hidden data-testid="voz-orbe" data-estado="fallback" style={{ display: "flex", justifyContent: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- sem canvas: mostra a caveira original parada */}
        <img src={SRC} alt="" width={size * 0.9} height={size * 0.9} draggable={false} style={{ marginTop: size * 0.05, opacity: dim ? 0.5 : 1, filter: "drop-shadow(0 0 18px rgb(255 26 26 / 0.45))" }} />
      </div>
    );
  }
  return <canvas ref={canvas} className="voz-fundo" aria-hidden data-testid="voz-orbe" />;
}
