"use client";

import { useEffect, useRef, useState } from "react";
import { resolveEstado, type Bands, type Conexao, type SkullEstado } from "./skull-orb-fx";
import { Historia, clamp, follow } from "./esfera-fx";

const NA = 32; // amostras do histórico de volume ao longo do raio (a sílaba nasce no centro e corre até a borda)

const VS = `#version 300 es
void main(){
  vec2 v = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(v*2.0-1.0, 0.0, 1.0);
}`;

/**
 * Esfera de vidro líquido com núcleo de plasma, toda em um shader (sem malha, sem textura).
 * Casca: normal perturbada por ruído (dobras de água) + ondas que partem do centro com o volume da voz; reflexo
 * de estúdio e fresnel dão o aro azulado. Interior: o raio refratado atinge o núcleo e lê um plasma de ruído
 * deformado (filamentos laranja sobre vermelho-escuro), e a parte que passa ao largo vira o redemoinho vermelho.
 */
const FS = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uCen;
uniform float uR, uT, uFlow, uVol, uLow, uMid, uHigh, uBurst, uPh, uK, uPow, uAm, uGlitch, uDetail;
uniform float uA[${NA}];
out vec4 o;

vec3 hash3(vec3 p){
  uvec3 v = uvec3(ivec3(floor(p)));
  v = v*1664525u + 1013904223u;
  v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y;
  v ^= v >> 16u;
  v.x += v.y*v.z; v.y += v.z*v.x; v.z += v.x*v.y;
  return vec3(v) * (2.0/4294967295.0) - 1.0;
}
float gn(vec3 p){
  vec3 i = floor(p), f = fract(p);
  vec3 u = f*f*f*(f*(f*6.0-15.0)+10.0);
  float a = dot(hash3(i), f);
  float b = dot(hash3(i+vec3(1,0,0)), f-vec3(1,0,0));
  float c = dot(hash3(i+vec3(0,1,0)), f-vec3(0,1,0));
  float d = dot(hash3(i+vec3(1,1,0)), f-vec3(1,1,0));
  float e = dot(hash3(i+vec3(0,0,1)), f-vec3(0,0,1));
  float g = dot(hash3(i+vec3(1,0,1)), f-vec3(1,0,1));
  float h = dot(hash3(i+vec3(0,1,1)), f-vec3(0,1,1));
  float k = dot(hash3(i+vec3(1,1,1)), f-vec3(1,1,1));
  return mix(mix(mix(a,b,u.x), mix(c,d,u.x), u.y), mix(mix(e,g,u.x), mix(h,k,u.x), u.y), u.z) * 1.6;
}
const mat3 ROT = mat3(0.00, 0.80, 0.60, -0.80, 0.36, -0.48, -0.60, -0.48, 0.64);
float fbm(vec3 p, int oct){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){
    if (i >= oct) break;
    s += a*gn(p);
    p = ROT*p*2.03 + 3.1;
    a *= 0.5;
  }
  return s;
}
/** Filamentos: cristas finas e vivas da mesma deformação. */
float ridged(vec3 p, int oct){
  float s = 0.0, a = 0.55;
  for (int i = 0; i < 5; i++){
    if (i >= oct) break;
    float n = 1.0 - abs(gn(p));
    s += a*n*n;
    p = ROT*p*2.1 + 1.7;
    a *= 0.5;
  }
  return s;
}

float amp(float r){
  float x = clamp(r, 0.0, 1.0)*${(NA - 1).toFixed(1)};
  int i0 = int(floor(x)); int i1 = min(i0+1, ${NA - 1});
  return mix(uA[i0], uA[i1], x-float(i0));
}
float ripple(float r){ return amp(r) * sin(r*uK*5.2 - uPh) * (0.35 + 0.65*smoothstep(0.0, 0.25, r)); }

vec3 env(vec3 d){
  float a = smoothstep(0.55, 0.97, dot(d, normalize(vec3(-0.55, 0.62, 0.55))));
  float b = smoothstep(0.66, 0.985, dot(d, normalize(vec3(-0.82, -0.38, 0.42))));
  float c = smoothstep(0.8, 0.99, dot(d, normalize(vec3(0.72, 0.5, 0.4))));
  float t = pow(max(d.y, 0.0), 5.0);
  return vec3(0.78, 0.85, 1.0) * (a*0.62 + b*0.95 + c*0.28 + t*0.16);
}

vec3 plasma(vec3 q, float pw, int oct){
  float t = uFlow;
  vec3 w = vec3(fbm(q*1.5 + vec3(0.0, t*0.32, 0.0), 3), fbm(q*1.5 + vec3(5.2, 1.3, t*0.27), 3), fbm(q*1.5 + vec3(2.7, 8.1, -t*0.3), 3));
  vec3 s = q*2.2 + w*(1.5 + 0.8*uVol + 0.7*uBurst);
  float rid = ridged(s + vec3(0.0, t*0.18, t*0.1), oct);
  float cloud = fbm(s*0.8 - t*0.07, 3)*0.5 + 0.5;
  float f = clamp(rid*1.02 - 0.06, 0.0, 1.6);
  vec3 dark = vec3(0.16, 0.012, 0.006);
  vec3 mid = vec3(0.95, 0.15, 0.025);
  vec3 hot = vec3(1.0, 0.62, 0.22);
  vec3 c = dark*(0.35 + cloud) + mid*pow(f, 2.3)*1.7 + hot*pow(f, 5.0)*2.1;
  return c * pw;
}

void main(){
  vec2 p = (gl_FragCoord.xy - uCen) / uR;
  float r0 = length(p);
  float ang = atan(p.y, p.x);
  float wob = (0.008 + 0.028*uVol + 0.02*uLow)*(0.5*sin(ang*2.0 + uT*1.9) + 0.35*sin(ang*3.0 - uT*2.4 + 1.3) + 0.15*sin(ang*5.0 + uT*3.3))
            + 0.022*uBurst*sin(ang*4.0 + uT*7.0);
  float Re = 1.0 + wob + 0.025*uLow;
  float r = r0 / Re;
  float px = 1.0 / uR;

  if (r >= 1.0){
    float g = exp(-(r - 1.0)*8.0) * (0.012 + 0.07*uPow*uPow + 0.12*uVol) * uAm;
    vec3 gc = vec3(1.0, 0.16, 0.05) * g;
    o = vec4(gc, g*0.6);
    return;
  }
  float cov = clamp((1.0 - r)*uR/ max(Re, 1.0) + 0.5, 0.0, 1.0);

  vec2 pn = p / Re;
  float z = sqrt(max(0.0, 1.0 - r*r));
  vec3 n0 = vec3(pn, z);

  // superfície de água: dobras lentas + ondas que saem do centro com a voz
  vec3 s = vec3(pn*1.25, uFlow*0.17);
  float e = 0.07;
  float b0 = gn(s);
  vec2 g1 = vec2(gn(s + vec3(e,0,0)) - b0, gn(s + vec3(0,e,0)) - b0) / e;
  vec3 s2 = vec3(pn*3.1 + 4.0, uFlow*0.3);
  float c0 = gn(s2);
  vec2 g2 = vec2(gn(s2 + vec3(e,0,0)) - c0, gn(s2 + vec3(0,e,0)) - c0) / e;
  vec2 slope = g1*0.16 + g2*(0.05 + 0.05*uHigh);
  float rr = max(r, 1e-3);
  float dr = 0.02;
  float dh = (ripple(min(r + dr, 1.0)) - ripple(max(r - dr, 0.0))) / (2.0*dr);
  slope += (pn / rr) * dh * 0.032 * (0.5 + uVol);
  slope *= 1.0 + 0.7*uVol + 0.5*uBurst;
  vec3 n = normalize(n0 + vec3(slope, 0.0));

  vec3 V = vec3(0.0, 0.0, -1.0);
  vec3 Rf = reflect(V, n);
  float cosv = max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0);
  float F = 0.035 + 0.965*pow(1.0 - cosv, 4.0);

  // refração até o núcleo (flutua, balançando com o grave)
  vec3 d = refract(V, n, 0.76);
  vec3 P = n0 - vec3(0.045*sin(uT*0.7) + 0.05*uLow*sin(uT*5.0), 0.04*cos(uT*0.9) + 0.04*uLow*cos(uT*4.0), 0.0);
  float bq = dot(P, d);
  float rc = 0.405 + 0.03*uVol + 0.02*uBurst;
  float cq = dot(P, P) - rc*rc;
  float disc = bq*bq - cq;
  float pw = (0.78 + 0.5*uVol + 0.35*uBurst + 0.18*uMid) * uPow;
  int oct = uDetail > 0.5 ? 4 : 3;

  vec3 col = vec3(0.0);
  // redemoinho vermelho em volta (ponto de maior aproximação do raio ao centro)
  vec3 cp = P - d*bq;
  float dmin = length(cp);
  float wisp = ridged(cp*2.0 + vec3(0.0, uFlow*0.2, 0.0) + fbm(cp*1.4 + uFlow*0.12, 2)*1.4, 3);
  float halo = smoothstep(0.74, 0.22, dmin) * (0.04 + wisp*wisp*0.9);
  col += vec3(0.7, 0.07, 0.02) * halo * 0.8 * pw;
  if (disc > 0.0){
    float sq = -bq - sqrt(disc);
    vec3 hit = P + d*sq;
    vec3 qn = hit / rc;
    float cs = cos(uFlow*0.11), sn = sin(uFlow*0.11);
    vec3 q = vec3(cs*qn.x + sn*qn.z, qn.y, -sn*qn.x + cs*qn.z);
    vec3 pl = plasma(q, pw, oct);
    float limb = pow(1.0 - abs(dot(qn, -d)), 1.6);
    pl *= 0.82 + 0.9*limb;
    pl += vec3(1.0, 0.5, 0.18) * pow(limb, 3.0) * 0.28 * pw;
    float core = smoothstep(0.52, 0.0, length(P.xy - d.xy*0.0));
    col = mix(col, pl, smoothstep(0.0, 0.08, disc));
    col += vec3(1.0, 0.45, 0.14) * core * 0.12 * pw;
  }
  col *= 1.0 - 0.18*F;

  // vidro escuro: tinta de fundo, reflexo do estúdio, aro (fresnel) e gotículas
  vec3 glass = vec3(0.010, 0.012, 0.020) * (0.6 + 1.0*(b0*0.5 + 0.5));
  float rough = 0.16 + 0.8*F;
  vec3 refl = env(Rf) * rough;
  float rimEdge = smoothstep(0.93, 1.0, r) * (0.08 + 0.92*pow(max(0.0, dot(normalize(p + 1e-4), normalize(vec2(-0.62, -0.42)))), 1.5));
  refl += vec3(0.6, 0.66, 1.0) * rimEdge * 0.75;
  refl += vec3(0.4, 0.5, 0.9) * smoothstep(0.985, 1.0, r) * 0.18;

  vec2 gp = pn*11.0 + vec2(uFlow*0.05, -uFlow*0.03);
  vec2 gi = floor(gp), gf = fract(gp);
  vec3 hh = hash3(vec3(gi, 7.0));
  vec2 dc = gf - (0.5 + 0.3*hh.xy);
  float gd = length(dc);
  float drop = step(0.9, hh.z*0.5 + 0.5) * smoothstep(0.035 + 0.07*(hh.x*0.5+0.5), 0.0, gd);
  float sp = pow(max(dot(Rf, normalize(vec3(-0.45, 0.6, 0.65))), 0.0), 18.0);
  refl += vec3(0.8, 0.88, 1.0) * drop * (0.25 + 0.9*sp + 0.5*uHigh) * (0.35 + 0.65*z);

  vec3 c = col + glass + refl;

  // estados: erro pisca em falha; sem conexão, brasas
  c *= uAm;
  if (uGlitch > 0.0){
    float fl = 0.55 + 0.45*step(0.5, fract(sin(floor(uT*14.0))*43758.5));
    c *= mix(1.0, fl, uGlitch);
    c.r += uGlitch*0.03;
  }
  c = vec3(1.0) - exp(-c*1.2);
  c = pow(c, vec3(0.95));
  o = vec4(c*cov, cov);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`${type === gl.VERTEX_SHADER ? "vs" : "fs"}: ${gl.getShaderInfoLog(s) ?? "?"}`);
  return s;
}

/**
 * Mentor: esfera de vidro líquido com um núcleo de plasma. Parada, o plasma gira devagar dentro do vidro.
 * Quando o Mentor fala, tudo vem do áudio real: o volume faz ondas saírem do centro e correrem até a borda
 * como numa gota d'água, o grave faz a esfera inteira respirar e o núcleo balançar no líquido, os médios
 * giram o plasma, os agudos enrugam a superfície e o tom da voz muda o espaçamento das ondas.
 */
export function VozEsfera({ level, dim = false, size = 280, conn = "live", resolucao }: { level: () => Bands; dim?: boolean; size?: number; conn?: Conexao; /** Teto de pixels por pixel CSS do desenho (padrão: 2 no computador, 1,5 no celular). Telas grandes usam menos. */ resolucao?: number }) {
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
    const u = { Cen: U("uCen"), R: U("uR"), T: U("uT"), Flow: U("uFlow"), Vol: U("uVol"), Low: U("uLow"), Mid: U("uMid"), High: U("uHigh"), Burst: U("uBurst"), Ph: U("uPh"), K: U("uK"), Pow: U("uPow"), Am: U("uAm"), Glitch: U("uGlitch"), Detail: U("uDetail"), A: U("uA[0]") };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const calm = reduce ? 0.3 : 1;
    const mobile = window.innerWidth < 640;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.useProgram(prog);
    gl.disable(gl.BLEND);

    const hist = new Historia(96);
    const A = new Float32Array(NA);
    let acc = 0, t = 0, flow = Math.random() * 50, last = performance.now(), raf = 0, visible = true, W = 1, H = 1, dpr = 1, cssW = 1, cssH = 1;
    const sm = { vol: 0, low: 0, mid: 0, high: 0, mic: 0, amp: 0, k: 3, ph: 0, burst: 0, pow: 0.9, glitch: 0 };
    let prevAmp = 0, peak = 0;
    let q = 1, ema = 16, slow = 0, fast = 0;

    const fit = () => {
      const r = el.getBoundingClientRect();
      cssW = Math.max(1, r.width);
      cssH = Math.max(1, r.height);
      dpr = Math.min(resolucao ?? (mobile ? 1.5 : 2), window.devicePixelRatio || 1) * q;
      W = Math.max(1, Math.round(cssW * dpr));
      H = Math.max(1, Math.round(cssH * dpr));
      el.width = W;
      el.height = H;
      gl.viewport(0, 0, W, H);
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
      // qualidade adaptativa: se o aparelho não acompanha, diminui a resolução do desenho (não o tamanho na tela)
      ema += (dtRaw * 1000 - ema) * 0.05;
      if (ema > 26) { slow += dt; fast = 0; } else if (ema < 19) { fast += dt; slow = 0; }
      if (slow > 1.0 && q > 0.5) { q = Math.max(0.5, q - 0.15); slow = 0; fit(); }
      if (fast > 10 && q < 1) { q = Math.min(1, q + 0.1); fast = 0; fit(); }

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
      sm.burst = Math.max(follow(sm.burst, 0, dt, 1, 7), live && voz > prevAmp + 0.12 ? clamp(voz * 1.1) : 0);
      prevAmp = voz;
      const raw = c === "error" ? 0.03 : c === "off" ? 0.02 : Math.max(voz, 0.05 + 0.03 * Math.sin(t * 1.3));
      sm.amp = follow(sm.amp, raw, dt, 26, 5);
      acc += dt;
      while (acc >= 1 / 60) { hist.push(sm.amp * (reduce ? 0.5 : 1)); acc -= 1 / 60; }
      for (let i = 0; i < NA; i++) A[i] = hist.at((i / (NA - 1)) * 42);
      // tom da voz (f0) muda o espaçamento das ondas; os médios também
      const f0n = b.f0 && b.voiced && b.voiced > 0.3 ? clamp((b.f0 - 80) / 220) : 0.35;
      sm.k = follow(sm.k, 2.0 + f0n * 2.0 + sm.mid * 0.9, dt, 4, 1.5);
      sm.ph += dt * (2.2 + sm.vol * 6 + sm.high * 3 + f0n * 2) * calm;
      // o plasma corre mais rápido quanto mais ele fala
      flow += dt * (0.55 + sm.vol * 2.4 + sm.mid * 1.2 + (c === "connecting" ? 1 : 0)) * calm;
      const alvoPow = c === "off" ? 0.32 : c === "error" ? 0.28 : c === "connecting" ? 0.9 + 0.25 * Math.sin(t * 4.5) : 0.92;
      sm.pow = follow(sm.pow, alvoPow, dt, 4, 2.5);
      sm.glitch = follow(sm.glitch, c === "error" ? 1 : 0, dt, 8, 4);

      const R = size * 0.4 * (dim ? 0.97 : 1);
      const cy = size * 0.5 + 4;
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform2f(u.Cen, (cssW / 2) * dpr, (cssH - cy) * dpr);
      gl.uniform1f(u.R, R * dpr);
      gl.uniform1f(u.T, t * calm);
      gl.uniform1f(u.Flow, flow);
      gl.uniform1f(u.Vol, sm.vol);
      gl.uniform1f(u.Low, sm.low);
      gl.uniform1f(u.Mid, sm.mid);
      gl.uniform1f(u.High, sm.high);
      gl.uniform1f(u.Burst, sm.burst);
      gl.uniform1f(u.Ph, sm.ph);
      gl.uniform1f(u.K, sm.k);
      gl.uniform1f(u.Pow, sm.pow);
      gl.uniform1f(u.Am, dim ? 0.5 : 1);
      gl.uniform1f(u.Glitch, sm.glitch);
      gl.uniform1f(u.Detail, size >= 160 && q > 0.7 ? 1 : 0);
      gl.uniform1fv(u.A, A);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
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
      gl.deleteVertexArray(vao);
      gl.deleteProgram(prog);
    };
  }, [size, dim, resolucao]);

  if (fallback) {
    const d = size * 0.8;
    return (
      <div className="voz-fundo" aria-hidden data-testid="voz-orbe" data-estado="fallback" style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            marginTop: size * 0.1,
            width: d,
            height: d,
            borderRadius: "50%",
            opacity: dim ? 0.5 : 1,
            background: "radial-gradient(circle at 50% 52%, #ffb25a 0%, #ff4a12 16%, #8a1608 30%, #1a0a0c 48%, #05070d 72%)",
            boxShadow: "inset 0 0 0 1px rgb(150 170 255 / 0.35), inset 6px 8px 22px rgb(120 150 255 / 0.18), 0 0 26px rgb(255 40 20 / 0.25)",
          }}
        />
      </div>
    );
  }
  return <canvas ref={canvas} className="voz-fundo" aria-hidden data-testid="voz-orbe" />;
}
