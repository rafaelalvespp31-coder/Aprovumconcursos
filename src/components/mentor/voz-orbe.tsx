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
    const cls = [sprite(255, 24, 20), sprite(255, 84, 60), sprite(255, 236, 226), sprite(130, 124, 132), sprite(70, 62, 66), sprite(150, 18, 16)]; // vermelho, laranja-vivo, branco, rocha clara, rocha escura
    const rnd = mulberry32((Math.random() * 2 ** 31) | 0);

    // Nuvem da esfera: lida do mapa da arte, ponto a ponto (mais partículas onde há luz/vermelho).
    const NC = mobile ? 8000 : 16000;
    const hx = new Float32Array(NC);
    const hy = new Float32Array(NC);
    const hz = new Float32Array(NC);
    const cc = new Uint8Array(NC);
    const cs = new Float32Array(NC);
    const ca = new Float32Array(NC);
    const cd = new Float32Array(NC);
    const ck = new Uint8Array(NC); // 1 = partícula de fenda (acende com a voz)
    // Cada partícula flutua do seu jeito: 3 eixos independentes, 2 senoides por eixo, com frequências e
    // fases próprias (nenhuma direção ou sentido em comum), e uma amplitude própria.
    const wf = new Float32Array(NC * 6);
    const wp = new Float32Array(NC * 6);
    const wamp = new Float32Array(NC);
    const cpx = new Float32Array(NC);
    const cpy = new Float32Array(NC);
    const cpa = new Float32Array(NC);
    const cps = new Float32Array(NC);
    let nc = 0;
    let texImg: HTMLCanvasElement | null = null; // arte com a borda bem esfumada (sem contorno de círculo)
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
        cc[k] = red > 90 ? (g > 120 ? 1 : 0) : red > 45 ? 5 : lum > 0.62 ? 2 : lum > 0.2 ? 3 : 4;
        ck[k] = red > 60 ? 1 : 0;
        cs[k] = 0.35 + rnd() * 0.5 + (cc[k] === 2 && rnd() < 0.08 ? 0.25 : 0);
        ca[k] = (cc[k] === 4 ? 0.7 : cc[k] === 3 ? 0.35 + 0.4 * rnd() : 0.5 + 0.5 * rnd()) * (back ? 0.45 : 1) * ((cc[k] ?? 4) <= 1 ? 1.25 : 1);
        cd[k] = rnd() * 1000;
        for (let q = 0; q < 6; q++) {
          wf[k * 6 + q] = 0.08 + rnd() * 0.37;
          wp[k * 6 + q] = rnd() * TAU;
        }
        wamp[k] = 0.5 + rnd() * 0.9;
      }
      nc = NC;
    };
    const imgs = [
      (() => {
        const i = new Image();
        i.onload = () => {
          const c = document.createElement("canvas");
          c.width = c.height = 512;
          const x = c.getContext("2d");
          if (x) {
            x.drawImage(i, 0, 0, 512, 512);
            x.globalCompositeOperation = "destination-in";
            const g = x.createRadialGradient(256, 256, 0, 256, 256, 256);
            g.addColorStop(0, "#000");
            g.addColorStop(0.6, "#000");
            g.addColorStop(1, "rgba(0,0,0,0)");
            x.fillStyle = g;
            x.fillRect(0, 0, 512, 512);
            texImg = c;
          }
          buildCloud(i);
        };
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
    const maxBolts = () => [2, 3, 5][quality]!;
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
      wv[i] = (0.05 + rnd() * 0.3) * (rnd() < 0.5 ? -1 : 1);
      dirOf(i);
      bx[i] = rnd();
      by[i] = rnd();
      sd[i] = rnd() * 1000;
      sz[i] = 0.3 + rnd() * 0.35;
      al[i] = 0.25 + rnd() * 0.65;
      hot[i] = rnd() < (kind[i] === 4 ? 0.55 : 0.25) ? 1 : 0;
      trail[i] = 0; // sem rastros: tudo desliza devagar e junto
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
        const v = (8 + rnd() * 26) * (0.5 + power);
        sx[i] = x;
        sy[i] = y;
        svx[i] = Math.cos(a) * v;
        svy[i] = Math.sin(a) * v - 10;
        sl[i] = 0.3 + rnd() * 0.5;
      }
    };

    const bolts: Bolt[] = [];

    type Four = "vol" | "low" | "mid" | "high";
    const cur: Record<Four, number> = { vol: 0, low: 0, mid: 0, high: 0 };
    const fx: Alvo = { ...ALVOS.disconnected };
    let me = 0;
    let mic = 0;
    let peak = 0;
    let coord = 0; // 0 = cada partícula flutua sozinha; 1 = o corpo todo acompanha a voz, com suavidade
    let tone = 0.4; // tom da voz: 0 grave, 1 agudo
    let form = 0; // 0 = nuvem solta; 1 = partículas aglutinadas formando a imagem de referência (ouvindo)
    let tp = 0; // tempo próprio do flutuar: acelera de leve com a voz, sem saltos
    const sm = { vol: 0, low: 0, mid: 0, high: 0 }; // áudio bem suavizado para o movimento das partículas
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
      // Para as partículas, o áudio passa por um filtro lento (sobe e desce em cerca de meio segundo).
      (Object.keys(sm) as Four[]).forEach((k) => {
        sm[k] = ease(sm[k], clamp(tg[k]), 0.05, 0.025, f60);
      });
      {
        const sum = sm.low + sm.mid + sm.high;
        if (sum > 0.1) tone = ease(tone, clamp((sm.low * 0.1 + sm.mid * 0.5 + sm.high) / sum), 0.04, 0.04, f60);
        coord = ease(coord, clamp(me * 2.5), 0.04, 0.02, f60);
      }
      tp += dt * (1 + sm.mid * 0.7 + sm.high * 0.4) * (1 - form * 0.7) * (reduce ? 0.4 : 1);
      if (mic > 0.08) {
        micSeen = true;
        lastMic = t;
      }
      if (me > 0.06) micSeen = false;
      const awaiting = micSeen && t - lastMic > 0.6 && t - lastMic < 12;
      estado = resolveEstado({ conn: connRef.current, me, mic, peak, awaiting });
      if (el.dataset.estado !== estado) el.dataset.estado = estado;
      // Ouvindo: as partículas se aglutinam devagar na imagem de referência; ao sair, se soltam devagar.
      form = ease(form, estado === "listening" ? 1 : 0, 0.03, 0.012, f60);
      const goal = ALVOS[estado];
      (Object.keys(fx) as (keyof Alvo)[]).forEach((k) => {
        fx[k] = ease(fx[k], goal[k], 0.07, 0.016, f60); // nada para de repente
      });

      const spd = (0.4 + fx.speed * 0.5 + sm.vol * 0.5) * calm; // suave: usa o áudio filtrado
      const E = clamp(fx.energy + cur.vol * 0.5 + cur.low * 0.2);
      const k0 = size / BASE;
      const D = size * 0.9;
      const R = D / 2;
      const cx = W / 2;
      const cy = size * 0.5 + 4;
      const am = dim ? 0.5 : 1;
      const listen = clamp(mic * 1.6 - me * 2);
      const loc = (n: NodeId): Pt => ({ x: (NODES[n].x - 0.5) * D, y: (NODES[n].y - 0.5) * D });

      const newBolt = (intensity: number) => {
        if (bolts.length >= maxBolts()) return;
        let bolt: Bolt;
        let end: Pt;
        {
          const k = rnd();
          if (k < 0.85) {
            const p = pickNodes(rnd, intensity); // pelas fendas da caveira
            const a = loc(p.a);
            end = loc(p.b);
            bolt = spawnBolt(rnd, a, end, t, intensity);
          } else {
            const th = (rnd() < 0.7 ? (rnd() < 0.5 ? 0 : Math.PI) : rnd() * TAU) + (rnd() - 0.5) * 1.4; // saltando para fora, mais pelas laterais
            const a = { x: Math.cos(th) * R * (0.7 + rnd() * 0.28), y: Math.sin(th) * R * (0.7 + rnd() * 0.28) };
            const l = R * (0.12 + rnd() * (0.12 + intensity * 0.2));
            end = { x: a.x + Math.cos(th + (rnd() - 0.5) * 0.7) * l, y: a.y + Math.sin(th + (rnd() - 0.5) * 0.7) * l };
            bolt = spawnBolt(rnd, a, end, t, intensity);
          }
        }
        bolts.push(bolt);
        spark(cx + end.x, cy + end.y, 1 + Math.round(intensity * 2), intensity * 0.5);
      };

      // Descargas procedurais, sem padrão fixo.
      const I = clamp(E * 0.5 + cur.vol * 0.8);
      const rate = (fx.bolts * (reduce ? 0.35 : 1) * 0.3 * (1 - form * 0.8) + sm.vol * 1.6 + sm.high * 0.8) * dt;
      for (let n = Math.floor(rate) + (rnd() < rate % 1 ? 1 : 0); n > 0; n--) newBolt(I);
      for (let i = bolts.length - 1; i >= 0; i--) if (t - bolts[i]!.born > bolts[i]!.life) bolts.splice(i, 1);

      // Partículas.
      const n = active();
      const F = D * 3;
      const sphere = 1 + sm.low * 0.04;
      const pull = (0.015 + sm.vol * 0.1 + listen * 0.04) * calm;
      // Onda suave e compartilhada (viaja do centro para fora; o tom muda o espaçamento e a velocidade).
      const wv2 = (r: number) => 1 + coord * Math.sin(r * (2 + tone * 3) - tp * (1 + tone * 1.5)) * 0.05 * sm.vol * calm;
      for (let i = 0; i < n; i++) {
        const s = sd[i]!;
        let x = 0;
        let y = 0;
        let z = 0;
        let screen = false;
        const kd = kind[i]!;
        if (kd === 0) {
          ang[i] = ang[i]! + wv[i]! * dt * spd * 0.6;
          const r = rho[i]! * R * sphere * wv2(rho[i]!);
          const o = Math.sin(ang[i]!) * r;
          x = Math.cos(ang[i]!) * r;
          y = o * Math.cos(inc[i]!);
          z = o * Math.sin(inc[i]!);
        } else if (kd === 1) {
          screen = true;
          x = bx[i]! * W + Math.sin(t * 0.11 + s) * 38 + Math.sin(t * 0.07 + s * 2) * 24;
          y = by[i]! * H + Math.cos(t * 0.09 + s * 1.3) * 34 + Math.sin(t * 0.13 + s) * 20;
          z = Math.sin(s * 3) * R * 0.9;
          const w = sm.vol * 0.025 * (0.4 + 0.6 * Math.abs(Math.sin(s * 3)));
          x += (cx - x) * w;
          y += (cy - y) * w;
        } else if (kd === 2) {
          rho[i] = rho[i]! - dt * pull;
          if (rho[i]! < 0.55) {
            rho[i] = 1.8 + rnd() * 1.1;
            dirOf(i);
          }
          x = dx[i]! * rho[i]! * R * wv2(rho[i]!);
          y = dy[i]! * rho[i]! * R * wv2(rho[i]!);
          z = dz[i]! * rho[i]! * R * wv2(rho[i]!);
        } else if (kd === 3) {
          rho[i] = rho[i]! + dt * (0.02 + sm.high * 0.05) * calm;
          if (rho[i]! > 2.2) {
            rho[i] = 0.62 + rnd() * 0.1;
            dirOf(i);
          }
          x = dx[i]! * rho[i]! * R * wv2(rho[i]!);
          y = dy[i]! * rho[i]! * R * wv2(rho[i]!);
          z = dz[i]! * rho[i]! * R * wv2(rho[i]!);
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
        if (kd === 2 || kd === 3) a *= clamp((rho[i]! - 0.6) * 4) * clamp((2.3 - rho[i]!) * 2); // entra e sai com fade
        if (hot[i]) a *= 1 + sm.high * 0.3 * Math.sin(t * 2 + s); // cintilação lenta nos agudos
        const e = Math.min(1, X / 46, (W - X) / 46, Y / 46, (H - Y) / 46);
        pa[i] = e < 1 ? a * Math.max(0, e) : a;
        ps[i] = sz[i]! * k * k0 * 1.8 * (1 + sm.vol * 0.1);
      }

      // ---- Desenho ----
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.globalCompositeOperation = "lighter";

      // Halo energético: o grave expande, o volume acende. Escutando, clareia.
      const hr = D * (0.78 + sm.low * 0.05);
      const hg = ctx.createRadialGradient(cx, cy, D * 0.15, cx, cy, hr);
      const lc = Math.round(26 + listen * 120);
      const ha = clamp((0.08 + fx.halo * 0.22 + sm.low * 0.1 + sm.vol * 0.08) * am, 0, 0.32);
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

      // Micropartículas (um plano por vez: atrás e na frente da esfera).
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
      };

      sprPass(0);

      // ---- A esfera de micropartículas: a caveira nasce da arte de referência, sem borda nem imagem ----
      // Sem balanço global: nada se move todo no mesmo sentido; só a respiração mínima do conjunto.
      const cyw = 1;
      const syw = 0;
      const cp = 1;
      const sp = 0;
      const grow = 1 + 0.01 * sm.low;
      const bob = 0;
      const glitching = fx.glitch > 0.4 && t < glitchUntil;
      if (fx.glitch > 0.4 && t > glitchAt) {
        glitchUntil = t + 0.16;
        glitchAt = t + 1.4 + rnd() * 2.2;
      }
      // Onda de energia atravessando as fendas na diagonal.
      const ph = ((t * (0.15 + fx.speed * 0.08 + sm.mid * 0.15)) % 1.8) - 0.4;
      const crackE = E * 0.5 + sm.mid * 0.6 + sm.low * 0.25;
      const ncDraw = Math.min(nc, Math.round(NC * [0.5, 0.78, 1][quality]!));
      for (let i = 0; i < ncDraw; i++) {
        const hxi = hx[i]!;
        const hyi = hy[i]!;
        const r0 = Math.hypot(hxi, hyi);
        const sdd = cd[i]!;
        // Flutuar aleatório: cada partícula segue o seu próprio rumo (3 eixos independentes). Ouvindo, a
        // amplitude vai a zero e ela assenta no ponto exato da imagem de referência.
        // Falando, o vagar diminui (as partículas se organizam) em vez de se espalhar.
        const j = i * 6;
        // Ouvindo (formada): movimento bem lento; poucas partículas por vez se soltam e voltam, e a caveira se desfaz de leve sem perder a forma.
        const dis = Math.pow(0.5 + 0.5 * Math.sin(tp * 0.25 + wp[j + 2]! * 3), 2);
        const A = ((0.035 + 0.09 * r0 * r0) * (1 - coord * 0.45 + sm.vol * 0.1) * (1 - form) + (0.02 + 0.09 * r0 * r0) * dis * form) * calm;
        const wa = wamp[i]! * A;
        const ox2 = hxi + (Math.sin(tp * wf[j]! + wp[j]!) + 0.6 * Math.sin(tp * wf[j + 1]! + wp[j + 1]!)) * wa;
        const oy2 = hyi + (Math.sin(tp * wf[j + 2]! + wp[j + 2]!) + 0.6 * Math.sin(tp * wf[j + 3]! + wp[j + 3]!)) * wa;
        const oz2 = hz[i]! * (1 - form * 0.9) + (Math.sin(tp * wf[j + 4]! + wp[j + 4]!) + 0.6 * Math.sin(tp * wf[j + 5]! + wp[j + 5]!)) * wa;
        const d3 = Math.hypot(ox2, oy2, oz2);
        // Falando: o corpo acompanha o áudio com suavidade (camadas por faixa e uma torção bem leve).
        const wl = clamp(1 - d3 * 2.2);
        const wm = clamp(1 - Math.abs(d3 - 0.55) * 3.5);
        const wh = clamp((d3 - 0.5) * 2.5);
        const bandLit = 1 + coord * (wl * sm.low * 0.45 + wm * sm.mid * 0.5 + wh * sm.high * 0.6);
        const tw = coord * sm.vol * 0.1 * Math.sin(tp * (0.25 + tone * 0.5)) * (1 - d3 * 0.5) * calm;
        const ctw = Math.cos(tw);
        const stw = Math.sin(tw);
        // Onda suave e compartilhada (viaja do centro para fora): o corpo todo respira junto com a voz.
        const rw = grow * (1 + coord * Math.sin(d3 * (2.5 + tone * 4) - tp * (1 + tone * 1.5)) * (0.004 + sm.vol * 0.022) * calm * (1 - form));
        const x = (ox2 * ctw - oy2 * stw) * R * rw;
        const y = (ox2 * stw + oy2 * ctw) * R * rw;
        const z = oz2 * R * rw;
        const xr = x * cyw + z * syw;
        const zr = -x * syw + z * cyw;
        const yr = y * cp - zr * sp;
        const zr2 = y * sp + zr * cp;
        const k = F / (F - zr2);
        cpx[i] = cx + xr * k + (glitching && Math.sin(yr * 0.3 + t * 40) > 0.6 ? 7 : 0);
        cpy[i] = cy + bob + yr * k;
        let a = ca[i]! * (1 + E * 0.6 + form * 0.9) * bandLit * (0.55 + 0.45 * ((zr2 / R + 1) / 2));
        if (cc[i] === 2) a *= 0.75 + tone * 0.5 * (1 - form);
        else if (cc[i]! >= 3 && cc[i]! !== 5) a *= 1 + form * 0.9;
        let sc = 1;
        if (ck[i]) {
          const band = Math.exp(-Math.pow(((hxi * 0.6 + hyi * 0.8) * 0.5 + 0.5 - ph) / 0.1, 2)) * (0.5 + E);
          const boost = (0.15 + crackE * 0.6 + band * 1.4) * (1 - form * 0.6);
          a *= 1 + boost;
          sc = 1 + boost * 0.1;
        }
        if (r0 > 0.8) a *= 1 - (1 - form) * 0.3 * (0.5 - 0.5 * Math.sin(t * (1.5 + (sdd % 3)) + sdd));
        if (hot[i % NP] && sm.high > 0.05) a *= 1 + sm.high * 0.35 * Math.sin(t * 9 + sdd) * (1 - form);
        const e = Math.min(1, cpx[i]! / 46, (W - cpx[i]!) / 46, cpy[i]! / 46, (H - cpy[i]!) / 46);
        cpa[i] = clamp(a) * Math.max(0, e) * am;
        cps[i] = cs[i]! * k * k0 * 2.9 * sc * (1 - form * 0.4) * (1 + sm.vol * 0.12);
      }
      for (const c of [4, 3, 5, 0, 1, 2]) {
        ctx.globalCompositeOperation = c === 3 || c === 4 ? "source-over" : "lighter";
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
            ctx.globalAlpha = a * 0.09 * (1 - form * 0.75);
            ctx.drawImage(sp2, cpx[i]! - s * 1.1, cpy[i]! - s * 1.1, s * 2.2, s * 2.2);
          }
        }
      }
      ctx.globalAlpha = 1;

      // Plano local da caveira, para os olhos e as descargas acompanharem a nuvem.
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.translate(cx, cy + bob);
      ctx.transform(cyw * grow, 0, syw * 0.12, cp * grow, 0, 0);
      // Ouvindo: as partículas se aglutinam e o rosto da referência se condensa por baixo delas, fiel à arte.
      if (texImg && form > 0.02) {
        ctx.globalCompositeOperation = "screen";
        ctx.globalAlpha = clamp(form * form * 0.62) * (0.9 + 0.1 * Math.sin(tp * 0.3)) * am;
        const zoom = 1 + (1 - form) * 0.05 + 0.004 * form * Math.sin(tp * 0.2);
        const ddx = Math.sin(tp * 0.17) * 1.2 * form;
        const ddy = Math.cos(tp * 0.13) * 1.2 * form;
        ctx.drawImage(texImg, -R * zoom + ddx, -R * zoom + ddy, D * zoom, D * zoom);
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = "lighter";

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
          ctx.strokeStyle = `rgba(255,30,25,${0.1 * aa * k})`;
          ctx.lineWidth = b.width * 2.6 * k;
          ctx.stroke();
          ctx.strokeStyle = `rgba(255,120,105,${0.5 * aa * k})`;
          ctx.lineWidth = b.width * 0.55 * k;
          ctx.stroke();
        }
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      ctx.globalCompositeOperation = "lighter";

      // Faíscas das descargas.
      for (let i = 0; i < NS; i++) {
        if (sl[i]! <= 0) continue;
        sl[i] = sl[i]! - dt;
        sx[i] = sx[i]! + svx[i]! * dt;
        sy[i] = sy[i]! + svy[i]! * dt;
        svx[i] = svx[i]! * Math.pow(0.96, f60);
        svy[i] = svy[i]! * Math.pow(0.96, f60) + 14 * dt;
        const s = 1.2 * k0 * Math.min(1, sl[i]! * 2.5);
        ctx.globalAlpha = Math.min(0.6, sl[i]! * 1.2) * am;
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
