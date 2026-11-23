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
 * Mentor: disco preto cercado por um anel de fogo/energia vermelho, tudo em um shader (sem malha, sem textura).
 * Anel: linha branco-quente com chama vermelha por cima e filamentos que escorrem para fora; o ruído é arrastado
 * radialmente, então as chamas "sobem" do anel o tempo todo. Interior: poeira de pontos que cintilam, mais densa
 * perto da borda, e uma névoa carmim. A voz do Mentor ondula o anel como água (a sílaba nasce no topo e corre
 * pelos dois lados até embaixo), alonga as chamas e acende o anel.
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
/** Filamentos elétricos: cristas finas do mesmo ruído. */
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
float amp(float x01){
  float x = clamp(x01, 0.0, 1.0)*${(NA - 1).toFixed(1)};
  int i0 = int(floor(x)); int i1 = min(i0+1, ${NA - 1});
  return mix(uA[i0], uA[i1], x-float(i0));
}

void main(){
  vec2 p = (gl_FragCoord.xy - uCen) / uR;
  float r0 = length(p);
  float ang = atan(p.y, p.x);
  vec2 dir = p / max(r0, 1e-3);
  int oct = uDetail > 0.5 ? 4 : 3;

  // ondas da voz: nascem no topo do anel e correm pelos dois lados até embaixo
  float at = abs(ang - 1.5708);
  at = (at > 3.14159 ? 6.28318 - at : at) / 3.14159;
  float wave = amp(at) * sin(at*uK*4.5 - uPh);
  float Rr = 1.0 + 0.05*uLow + 0.07*wave + 0.012*sin(ang*3.0 + uT*1.3) + 0.02*uBurst*sin(ang*5.0 + uT*6.0);
  float d = r0 - Rr;

  // chamas: o ruído é arrastado para fora, então elas escorrem do anel
  float fl = uFlow;
  vec3 q = vec3(p*3.1 - dir*fl*1.05, fl*0.32);
  float w1 = fbm(q*1.3 + vec3(4.0, 1.0, 0.0), 3);
  float w2 = fbm(q*1.3 + vec3(9.0, 3.0, 2.0), 3);
  vec3 q2 = q + vec3(w1*2.6, w2*2.6, 0.0);
  float disp = fbm(q2*0.55, 3) * (0.05 + 0.05*uVol);
  float dd = d - disp;
  float fil = ridged(q2*1.15 + vec3(2.0, 5.0, 1.0), oct);

  float pw = uPow * (0.85 + 0.45*uVol + 0.3*uBurst);
  float reach = 11.0 / (1.0 + 0.7*uVol + 0.5*uBurst);
  float fora = exp(-max(dd, 0.0)*reach);
  float dentro = exp(min(dd, 0.0)*15.0) * (1.0 - smoothstep(0.0, 0.06, dd));

  float nucleo = exp(-pow(dd/(0.03 + 0.01*uVol), 2.0));
  float chama = exp(-pow((dd - 0.012)/(0.065 + 0.03*uVol + 0.02*uMid), 2.0));
  float tend = pow(clamp(fil, 0.0, 1.5), 3.6) * 1.5 * fora * smoothstep(-0.12, 0.01, dd) * (1.0 + 0.5*uHigh);
  float fumo = smoothstep(0.34, 0.0, dd) * smoothstep(-0.2, 0.0, dd) * (0.15 + 0.85*(fbm(q*0.7 + 7.0, 2)*0.5 + 0.5));

  vec3 col = vec3(0.0);
  col += vec3(1.0, 0.86, 0.8) * nucleo * 2.3;
  col += vec3(1.0, 0.2, 0.17) * chama * 1.7;
  col += mix(vec3(0.5, 0.02, 0.035), vec3(1.0, 0.2, 0.16), clamp(fil, 0.0, 1.0)) * tend * 1.7;
  col += vec3(0.4, 0.012, 0.03) * fumo * 0.4;
  col += vec3(0.55, 0.04, 0.06) * dentro * 0.55;
  col += vec3(0.7, 0.05, 0.06) * exp(-max(d, 0.0)*7.0) * 0.07;
  col *= pw;

  // interior: disco preto com poeira que cintila (mais densa junto à borda) e névoa carmim
  float dentroMask = 1.0 - smoothstep(-0.02, 0.03, d);
  if (dentroMask > 0.0){
    vec2 cell = floor(gl_FragCoord.xy / 1.5);
    vec3 h = hash3(vec3(cell, 11.0));
    vec3 h2 = hash3(vec3(cell, 29.0));
    float borda = smoothstep(0.1, 1.0, r0/Rr);
    float lim = mix(0.992, 0.86, borda*borda);
    float tw = 0.5 + 0.5*sin(uT*(3.0 + 5.0*(h2.x*0.5 + 0.5)) + h.z*20.0);
    float poeira = step(lim, h.x*0.5 + 0.5) * (0.35 + 0.65*tw) * (0.45 + 0.9*uHigh);
    vec3 pc = mix(vec3(1.0, 0.22, 0.2), vec3(1.0, 0.55, 0.4), h2.y*0.5 + 0.5);
    pc = mix(pc, vec3(0.95, 0.15, 0.45), step(0.82, h2.z*0.5 + 0.5));
    float neblina = (fbm(vec3(p*1.8, fl*0.12), 3)*0.5 + 0.5) * borda;
    float raio = smoothstep(0.45, 0.0, abs(dot(p, vec2(0.72, -0.69)) ) ) * smoothstep(0.1, 0.9, dot(p, vec2(0.69, 0.72)));
    vec3 inner = vec3(0.004, 0.0, 0.002) + pc*poeira*0.9 + vec3(0.32, 0.02, 0.05)*neblina*0.22 + vec3(0.6, 0.06, 0.2)*raio*0.05;
    col += inner * dentroMask * uPow;
  }

  col *= uAm;
  if (uGlitch > 0.0){
    float fp = 0.5 + 0.5*step(0.5, fract(sin(floor(uT*14.0))*43758.5));
    col *= mix(1.0, fp, uGlitch);
  }
  col = vec3(1.0) - exp(-col*1.45);
  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  a = max(a, dentroMask*0.93);
  o = vec4(col, a);
}`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`${type === gl.VERTEX_SHADER ? "vs" : "fs"}: ${gl.getShaderInfoLog(s) ?? "?"}`);
  return s;
}

/**
 * Mentor: disco preto com anel de fogo vermelho. Parado, o anel queima e escorre devagar. Quando o Mentor fala,
 * tudo vem do áudio real: o volume faz ondas nascerem no topo do anel e correrem até embaixo como na água,
 * o grave faz o anel respirar, os médios aceleram as chamas, os agudos fazem a poeira cintilar e o tom da voz
 * muda o espaçamento das ondas.
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
      flow += dt * (1.1 + sm.vol * 2.4 + sm.mid * 1.2 + (c === "connecting" ? 1 : 0)) * calm;
      const alvoPow = c === "off" ? 0.32 : c === "error" ? 0.28 : c === "connecting" ? 0.9 + 0.25 * Math.sin(t * 4.5) : 0.92;
      sm.pow = follow(sm.pow, alvoPow, dt, 4, 2.5);
      sm.glitch = follow(sm.glitch, c === "error" ? 1 : 0, dt, 8, 4);

      const R = size * 0.34 * (dim ? 0.97 : 1);
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
    const d = size * 0.6;
    return (
      <div className="voz-fundo" aria-hidden data-testid="voz-orbe" data-estado="fallback" style={{ display: "flex", justifyContent: "center" }}>
        <div
          style={{
            marginTop: size * 0.2,
            width: d,
            height: d,
            borderRadius: "50%",
            opacity: dim ? 0.5 : 1,
            background: "radial-gradient(circle, #050102 0%, #050102 70%, #3a0508 82%, #000 100%)",
            boxShadow: "0 0 0 3px rgb(255 235 230 / 0.9), 0 0 14px 4px rgb(255 40 30 / 0.9), 0 0 46px 12px rgb(215 25 32 / 0.5)",
          }}
        />
      </div>
    );
  }
  return <canvas ref={canvas} className="voz-fundo" aria-hidden data-testid="voz-orbe" />;
}
