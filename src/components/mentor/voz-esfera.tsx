"use client";

import { useEffect, useRef, useState } from "react";
import { resolveEstado, type Bands, type Conexao, type SkullEstado } from "./skull-orb-fx";
import { Historia, TAU, clamp, follow } from "./esfera-fx";

const SRC = "/mentor/orb-esfera.webp"; // arte da caveira: só serve de mapa de densidade e cor das partículas
const BASE = 280;
const NA = 32; // amostras do histórico de volume ao longo da latitude (a sílaba corre do equador aos polos)

const smooth = (v: number) => v * v * (3 - 2 * v);

const VS = `#version 300 es
precision highp float;
layout(location=0) in vec3 aSk;
layout(location=1) in vec3 aSp;
layout(location=2) in vec4 aR;
layout(location=3) in vec4 aC;
uniform float uT, uS, uVol, uLow, uMid, uHigh, uBurst, uPh, uK, uPx, uCalm, uAm, uDpr;
uniform mat3 uRs, uRk;
uniform vec2 uSc;
uniform vec2 uCen;
uniform float uA[${NA}];
out vec3 vCol;
out float vA;
out float vSoft;
float h(float x){ return fract(sin(x*127.1+311.7)*43758.5453); }
void main(){
  float d0 = aR.x, p1 = aR.y*6.2831, p2 = aR.z*6.2831;
  vec3 rnd3 = vec3(h(aR.x*91.3), h(aR.y*57.1), h(aR.z*73.7))*2.0-1.0;
  vec3 dir2 = normalize(rnd3 + 1e-4);

  float lat = asin(clamp(aSp.y,-1.0,1.0));
  float li = abs(lat)/1.5708*${(NA - 1).toFixed(1)};
  int i0 = int(floor(li)); int i1 = min(i0+1, ${NA - 1});
  float amp = mix(uA[i0], uA[i1], li-float(i0));
  float wave = sin(lat*uK + uPh);
  float shell = 1.0 + 0.40*amp*wave + 0.03*sin(uT*1.1 + lat*3.0) + 0.10*uLow*(0.4+aR.w*0.6);
  shell += (aR.z-0.5)*0.016;
  vec3 sp = aSp*shell;

  float sw = uMid*0.55*sin(uT*(1.6+aR.y*3.0)+p1);
  float cs = cos(sw), sn = sin(sw);
  sp = vec3(cs*sp.x+sn*sp.z, sp.y, -sn*sp.x+cs*sp.z);

  vec3 jig = vec3(sin(uT*(1.7+aR.x*5.0)+p1), sin(uT*(1.3+aR.y*5.0)+p2), sin(uT*(2.1+aR.z*5.0)+p1+p2));
  float vib = (0.012 + 0.11*uVol + 0.05*uMid)*(0.4+aR.w);
  sp += jig*vib*uCalm;

  sp += dir2*uLow*0.13*(0.5+0.5*sin(uT*(0.8+aR.x*1.4)+p2))*uCalm;

  sp += vec3(sin(uT*(17.0+aR.x*23.0)+p1), sin(uT*(19.0+aR.y*21.0)+p2), sin(uT*(15.0+aR.z*27.0)))*uHigh*0.045*uCalm;

  sp += dir2*uBurst*(0.1+0.3*aR.w);
  sp = uRs*sp;

  vec3 sk = vec3(aSk.x, -aSk.y, aSk.z)*1.16;
  sk += jig*(0.004+0.006*(1.0-uS))*uCalm;
  sk = uRk*sk;

  float m = smoothstep(d0*0.5, d0*0.5+0.5, uS);
  vec3 pos = mix(sk, sp, m) + dir2*sin(3.14159*m)*0.55*(0.4+aR.w);
  float dep = clamp((pos.z+1.25)/2.5, 0.0, 1.0);
  float persp = 1.0 / (1.0 - clamp(pos.z, -1.2, 1.2)*0.30);
  gl_Position = vec4(uCen + vec2(pos.x*uSc.x, pos.y*uSc.y)*persp, 0.0, 1.0);
  float tier = aR.w < 0.5 ? 0.6 : (aR.w < 0.84 ? 1.0 : 1.55);
  vec3 nS = normalize(uRs*aSp);
  vec3 L = normalize(vec3(-0.55, 0.65, 0.75));
  float dif = max(dot(nS, L), 0.0);
  float spec = pow(max(dot(reflect(-L, nS), vec3(0.0,0.0,1.0)), 0.0), 24.0);
  float rim = pow(1.0 - abs(nS.z), 2.5);
  float face = smoothstep(-0.35, 0.45, nS.z);
  float lit = (0.28 + 0.95*dif + 0.55*rim + 1.4*spec) * mix(0.32, 1.0, face);
  float fog = mix(0.5, 1.0, dep);
  float foc = abs(pos.z - 0.1);
  vSoft = smoothstep(0.55, 1.15, foc);
  gl_PointSize = max(1.0, tier*uPx*uDpr*persp*(0.5+0.7*dep)*(1.0+0.45*vSoft));

  vec3 cs3 = vec3(aC.r, aC.g*0.3, aC.b*0.26);
  vec3 ce = mix(vec3(0.62,0.07,0.09), vec3(1.0,0.24,0.2), dep) + vec3(0.0, 0.1, 0.08)*uHigh*(0.3+aR.w*0.7);
  vCol = mix(cs3, ce*(0.45+0.75*lit)+vec3(1.0,0.4,0.3)*spec*0.5, m);
  float aSph = (0.12 + 0.5*pow(dep,1.3)) * (0.55 + 0.5*aR.w) * fog * (1.0 - 0.45*vSoft);
  vA = mix(aC.a*0.7, aSph, m) * uAm;
}`;

const FS = `#version 300 es
precision mediump float;
in vec3 vCol;
in float vA;
in float vSoft;
out vec4 o;
void main(){
  vec2 q = gl_PointCoord*2.0-1.0;
  float r = dot(q,q);
  if (r > 1.0) discard;
  float a = pow(1.0 - r, mix(1.6, 0.8, vSoft))*vA;
  vec3 c = vCol*a;
  o = vec4(c, max(c.r, max(c.g, c.b)));
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`${type === gl.VERTEX_SHADER ? "vs" : "fs"}: ${gl.getShaderInfoLog(s) ?? "?"}`);
  return s;
}

/** Matriz de rotação Ry(yaw)·Rx(tilt)·Rz(roll), em coluna-maior. */
function rot(yaw: number, tilt: number, roll: number, out: Float32Array) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(tilt), sx = Math.sin(tilt), cz = Math.cos(roll), sz = Math.sin(roll);
  // M = Ry * Rx * Rz
  const a00 = cy, a02 = sy, a20 = -sy, a22 = cy;
  const b11 = cx, b12 = -sx, b21 = sx, b22 = cx;
  // Ry*Rx
  const m00 = a00, m01 = a02 * b21, m02 = a02 * b22;
  const m10 = 0, m11 = b11, m12 = b12;
  const m20 = a20, m21 = a22 * b21, m22 = a22 * b22;
  // (Ry*Rx)*Rz, Rz = [[cz,-sz,0],[sz,cz,0],[0,0,1]]
  const r = [m00 * cz + m01 * sz, -m00 * sz + m01 * cz, m02, m10 * cz + m11 * sz, -m10 * sz + m11 * cz, m12, m20 * cz + m21 * sz, -m20 * sz + m21 * cz, m22];
  // coluna-maior
  out[0] = r[0]!; out[1] = r[3]!; out[2] = r[6]!;
  out[3] = r[1]!; out[4] = r[4]!; out[5] = r[7]!;
  out[6] = r[2]!; out[7] = r[5]!; out[8] = r[8]!;
}

/**
 * Mentor: centenas de milhares de micropartículas desenhadas na GPU (WebGL2). Em silêncio formam a caveira
 * (a arte do Mentor, ponto a ponto). Quando ele fala, soltam-se e viram uma esfera de casca fina e alinhada.
 * Tudo que se move vem do áudio real: o volume corre do equador aos polos, os graves fazem a esfera respirar,
 * os médios giram as partículas, os agudos e o tom as fazem tremer, e cada partícula balança no seu próprio
 * ângulo, então a nuvem se espalha em todas as direções, nunca em uma só.
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
    const gl = el?.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, powerPreference: "high-performance" }) ?? null;
    if (!el || !gl) {
      setFallback(true);
      return;
    }
    let prog: WebGLProgram;
    try {
      prog = gl.createProgram()!;
      gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) ?? "link");
    } catch (e) {
      if (process.env.NODE_ENV !== "production") console.warn("[voz-esfera]", e);
      setFallback(true);
      return;
    }
    const U = (n: string) => gl.getUniformLocation(prog, n);
    const u = { T: U("uT"), S: U("uS"), Vol: U("uVol"), Low: U("uLow"), Mid: U("uMid"), High: U("uHigh"), Burst: U("uBurst"), Ph: U("uPh"), K: U("uK"), Px: U("uPx"), Calm: U("uCalm"), Am: U("uAm"), Dpr: U("uDpr"), Rs: U("uRs"), Rk: U("uRk"), Sc: U("uSc"), Cen: U("uCen"), A: U("uA[0]") };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const calm = reduce ? 0.3 : 1;
    const mobile = window.innerWidth < 640;
    const k0 = size / BASE;
    const NC = Math.round(Math.min(1, Math.max(0.08, (size / BASE) ** 2)) * (mobile ? 180_000 : 520_000));
    let seed = (Math.random() * 2 ** 31) | 0;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const bufs: WebGLBuffer[] = [];
    let ready = false;
    const upload = (loc: number, data: Float32Array | Uint8Array, size_: number, norm = false) => {
      const b = gl.createBuffer()!;
      bufs.push(b);
      gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size_, data instanceof Uint8Array ? gl.UNSIGNED_BYTE : gl.FLOAT, norm, 0, 0);
    };
    const build = (img: HTMLImageElement | null) => {
      const sk = new Float32Array(NC * 3);
      const sp = new Float32Array(NC * 3);
      const rr = new Float32Array(NC * 4);
      const cc = new Uint8Array(NC * 4);
      // esfera: pontos uniformes na superfície (e alinhados por sorteio estratificado em anéis)
      for (let k = 0; k < NC; k++) {
        const z = rnd() * 2 - 1;
        const a = rnd() * TAU;
        const s = Math.sqrt(1 - z * z);
        sp[k * 3] = s * Math.cos(a);
        sp[k * 3 + 1] = z;
        sp[k * 3 + 2] = s * Math.sin(a);
        rr[k * 4] = rnd();
        rr[k * 4 + 1] = rnd();
        rr[k * 4 + 2] = rnd();
        rr[k * 4 + 3] = rnd();
      }
      if (img) {
        const S = 420;
        const c = document.createElement("canvas");
        c.width = c.height = S;
        const x = c.getContext("2d", { willReadFrequently: true })!;
        x.drawImage(img, 0, 0, S, S);
        const d = x.getImageData(0, 0, S, S).data;
        const cum = new Float32Array(S * S);
        let tot = 0;
        for (let i = 0; i < S * S; i++) {
          const r = d[i * 4]!, g = d[i * 4 + 1]!, b = d[i * 4 + 2]!;
          const lum = (r * 0.5 + g * 0.3 + b * 0.2) / 255;
          const red = Math.max(0, r - Math.max(g, b)) / 255;
          tot += (d[i * 4 + 3]! / 255) * (0.05 + Math.pow(lum, 1.5) * 1.1 + Math.pow(red, 1.4) * 2);
          cum[i] = tot;
        }
        for (let k = 0; k < NC; k++) {
          const u0 = rnd() * tot;
          let lo = 0, hi = S * S - 1;
          while (lo < hi) {
            const mid = (lo + hi) >> 1;
            if (cum[mid]! < u0) lo = mid + 1;
            else hi = mid;
          }
          const r = d[lo * 4]!, g = d[lo * 4 + 1]!, b = d[lo * 4 + 2]!;
          const X = (((lo % S) + rnd()) / S - 0.5) * 2;
          const Y = ((Math.floor(lo / S) + rnd()) / S - 0.5) * 2;
          const rad = Math.min(1, Math.hypot(X, Y));
          const zz = Math.sqrt(Math.max(0, 1 - rad * rad));
          const back = rnd() < 0.3;
          sk[k * 3] = X;
          sk[k * 3 + 1] = Y;
          sk[k * 3 + 2] = (back ? -1 : 1) * zz * (0.4 + 0.5 * rnd());
          const lum = (r * 0.5 + g * 0.3 + b * 0.2) / 255;
          const red = Math.max(0, r - Math.max(g, b)) / 255;
          const bright = Math.max(lum * 1.1, red * 1.6);
          const a = Math.min(1, 0.1 + 0.55 * bright) * (0.7 + 0.3 * rnd()) * (back ? 0.45 : 1);
          cc[k * 4] = r; cc[k * 4 + 1] = g; cc[k * 4 + 2] = b;
          cc[k * 4 + 3] = Math.round(a * 255);
        }
      } else {
        // sem a arte: a "caveira" é a própria esfera
        for (let k = 0; k < NC; k++) {
          sk[k * 3] = sp[k * 3]! * 0.8; sk[k * 3 + 1] = sp[k * 3 + 1]! * 0.8; sk[k * 3 + 2] = sp[k * 3 + 2]! * 0.8;
          cc[k * 4] = 255; cc[k * 4 + 1] = 40; cc[k * 4 + 2] = 36; cc[k * 4 + 3] = 90;
        }
      }
      upload(0, sk, 3);
      upload(1, sp, 3);
      upload(2, rr, 4);
      upload(3, cc, 4, true);
      ready = true;
      hasArt = !!img;
    };
    let hasArt = false;
    const img = new Image();
    img.onload = () => build(img);
    img.onerror = () => build(null);
    img.src = SRC;

    const hist = new Historia(96);
    const A = new Float32Array(NA);
    const Rs = new Float32Array(9);
    const Rk = new Float32Array(9);
    let acc = 0, t = 0, yaw = rnd() * TAU, last = performance.now(), raf = 0, visible = true, W = 0, H = 0, dpr = 1;
    const sm = { vol: 0, low: 0, mid: 0, high: 0, mic: 0, amp: 0, k: 3, ph: 0, s: 0, burst: 0 };
    let hold = 0, prevAmp = 0, peak = 0;
    let q = 1, ema = 16, slow = 0, fast = 0;

    const fit = () => {
      const r = el.getBoundingClientRect();
      W = Math.max(1, r.width);
      H = Math.max(1, r.height);
      dpr = Math.min(mobile ? 1.5 : 2, window.devicePixelRatio || 1);
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
      gl.viewport(0, 0, el.width, el.height);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    gl.useProgram(prog);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);

    const frame = (now: number) => {
      raf = 0;
      if (!visible) return;
      const dtRaw = Math.max(0, (now - last) / 1000);
      const dt = Math.min(0.05, dtRaw);
      last = now;
      t += dt;
      ema += (dtRaw * 1000 - ema) * 0.05;
      if (ema > 26) { slow += dt; fast = 0; } else if (ema < 19) { fast += dt; slow = 0; }
      if (slow > 1.0 && q > 0.2) { q = Math.max(0.2, q - 0.2); slow = 0; }
      if (fast > 8 && q < 1) { q = Math.min(1, q + 0.1); fast = 0; }

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
      if (live && (me > 0.05 || mic > 0.14)) hold = t + 0.6;
      const talk = c === "connecting" ? 0 : t < hold ? 1 : 0;
      sm.s = follow(sm.s, hasArt ? talk : 1, dt, 5.5, 2.1);
      sm.burst = Math.max(follow(sm.burst, 0, dt, 1, 8), live && voz > prevAmp + 0.12 ? clamp(voz * 1.1) : 0);
      prevAmp = voz;
      const raw = c === "error" ? 0.03 : c === "off" ? 0.02 : Math.max(voz, 0.07 + 0.04 * Math.sin(t * 1.3));
      sm.amp = follow(sm.amp, raw, dt, 26, 5);
      acc += dt;
      while (acc >= 1 / 60) { hist.push(sm.amp * (reduce ? 0.5 : 1)); acc -= 1 / 60; }
      for (let i = 0; i < NA; i++) A[i] = hist.at((i / (NA - 1)) * 42);
      // tom da voz (f0) muda o número de ondas; médios também
      const f0n = b.f0 && b.voiced && b.voiced > 0.3 ? clamp((b.f0 - 80) / 220) : 0.35;
      sm.k = follow(sm.k, 2.0 + f0n * 2.2 + sm.mid * 1.0, dt, 4, 1.5);
      sm.ph += dt * (1.6 + sm.vol * 5 + sm.high * 3 + f0n * 2) * calm;
      yaw += dt * (c === "live" ? 0.42 + sm.vol * 1.1 : 0.2) * calm;
      const tilt = 0.42 + 0.2 * Math.sin(t * 0.37) * calm + sm.low * 0.12;
      const roll = 0.5 * Math.sin(t * 0.23) * calm + (sm.mid - 0.15) * 0.25;
      rot(yaw, tilt, roll, Rs);
      rot(0.14 * Math.sin(t * 0.5) * calm, 0.06 * Math.sin(t * 0.41) * calm, 0, Rk);

      const R = (size * 0.9) / 2;
      const am = (dim ? 0.5 : 1) * (c === "off" ? 0.55 : c === "error" ? 0.6 + 0.4 * Math.sin(t * 9) ** 2 : 1);
      // quanto mais partículas por pixel, menos brilho cada uma
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (ready) {
        const cy = size * 0.5 + 4;
        gl.uniform1f(u.T, t);
        gl.uniform1f(u.S, smooth(clamp(sm.s)));
        gl.uniform1f(u.Vol, sm.vol);
        gl.uniform1f(u.Low, sm.low);
        gl.uniform1f(u.Mid, sm.mid);
        gl.uniform1f(u.High, sm.high);
        gl.uniform1f(u.Burst, sm.burst);
        gl.uniform1f(u.Ph, sm.ph);
        gl.uniform1f(u.K, sm.k);
        gl.uniform1f(u.Px, 0.62 * k0);
        gl.uniform1f(u.Calm, calm);
        // brilho por área: poucas partículas por pixel brilham pouco, muitas saturam em branco; mantém a densidade de referência
        const dens = (NC * q) / (Math.PI * (0.36 * size) ** 2);
        gl.uniform1f(u.Am, am * Math.min(6, Math.max(0.04, 8 / dens)));
        gl.uniform1f(u.Dpr, dpr);
        gl.uniformMatrix3fv(u.Rs, false, Rs);
        gl.uniformMatrix3fv(u.Rk, false, Rk);
        gl.uniform2f(u.Sc, (R * 0.8) / (W / 2), (R * 0.8) / (H / 2));
        gl.uniform2f(u.Cen, 0, 1 - (2 * cy) / H);
        gl.uniform1fv(u.A, A);
        gl.bindVertexArray(vao);
        gl.drawArrays(gl.POINTS, 0, Math.floor(NC * q));
      }
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
      bufs.forEach((x) => gl.deleteBuffer(x));
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
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
