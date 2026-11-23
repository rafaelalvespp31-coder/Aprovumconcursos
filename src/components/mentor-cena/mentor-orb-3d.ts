import * as THREE from "three";
import { OCLUSAO, RUIDO } from "./glsl";
import type { AlvoCena } from "./estado-mentor";
import type { Qualidade } from "./qualidade";

/** Uniforms que todos os efeitos compartilham (tamanho do canvas, recorte da mão e posição da esfera). */
export interface UniformsComuns {
  uRes: { value: THREE.Vector2 };
  uMatte: { value: THREE.Texture };
  uOrb: { value: THREE.Vector2 };
  uOrbR: { value: number };
  uLuz: { value: number };
  uPx: { value: number };
}

/** OpenPalmOrbPosition: onde a esfera repousa na palma, em pixels da arte (1086 x 732). A esfera fica afundada na mão, com os dedos na frente. */
export const PALMA = { x: 318, y: 408, raio: 164, palmaY: 585 } as const;

export function materialAditivo(p: THREE.ShaderMaterialParameters): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    ...p,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
  });
}

function aleatorio(semente: number) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const VERT_QUAD = /* glsl */ `
uniform vec2 uCenter; uniform float uR; uniform float uQuad;
varying vec2 vP;
void main(){
  vP = position.xy * uQuad;
  gl_Position = projectionMatrix * viewMatrix * vec4(uCenter + position.xy * uR * uQuad, 0., 1.);
}`;

/** PlasmaShader: núcleo negro, borda de plasma irregular, anel incandescente, aura, raios e ondas de energia. */
const FRAG_PLASMA = /* glsl */ `
precision highp float;
${RUIDO}
${OCLUSAO}
uniform float uTime, uBrilho, uPulso, uEspiral, uAudio, uOndas;
varying vec2 vP;
void main(){
  vec2 p = vP; float len = length(p); vec2 cs = p / max(len, 1e-4); float t = uTime;
  // raio irregular do anel: três ruídos em escalas diferentes
  // ruído sobre o círculo unitário (sem emenda no ângulo ±π)
  float e1 = noise(cs * 2.0 + vec2(t * .55, t * .3));
  float e2 = noise(cs * 7.0 + vec2(-t * .9, t * .5 + 4.));
  float e3 = noise(cs * 19.0 + vec2(t * 1.7, 9.));
  float rr = 1.0 + (e1 - .5) * .075 + (e2 - .5) * .05 + (e3 - .5) * .022 + uPulso * .014 * sin(t * 3.1) + uAudio * .03;
  float d = len - rr;
  float w = .02 + .012 * e2;
  float quente = exp(-d * d / (w * w));
  float dentro = smoothstep(.012, -.02, d);
  float fora = 1. - dentro;
  // brilho do anel: branco-rosado no centro do fio, vermelho nas bordas
  vec3 cQuente = vec3(1., .78, .66), cMedio = vec3(1., .2, .1), cFundo = vec3(.62, .015, .03);
  vec3 glow = cQuente * quente * 1.25;
  glow += cMedio * exp(-abs(d) * 16.) * .75;
  glow += cFundo * exp(-max(d, 0.) * 4.2) * fora * .85;
  glow += cMedio * exp(max(-d, 0.) * -9.) * dentro * .22;
  // raios que saem do anel, cintilando
  float raio = pow(noise(cs * 15. + vec2(t * .35, floor(t * 3.) * 5.)), 4.) + .6 * pow(noise(cs * 31. + vec2(-t * .5, floor(t * 5.) * 3. + 7.)), 5.);
  glow += cMedio * raio * exp(-max(d, 0.) * 2.8) * fora * .7;
  // ondas de energia que se expandem
  for (int k = 0; k < 2; k++){
    float ph = fract(t * .5 + float(k) * .5);
    float rad = rr + ph * 1.35;
    glow += vec3(1., .26, .16) * exp(-pow((len - rad) / .05, 2.)) * (1. - ph) * uOndas * .9;
  }
  // interior: esfera negra com luz rasante vermelha nas bordas (profundidade 3D) e plasma sutil
  float nz = sqrt(max(1. - len * len / (rr * rr), 0.));
  float fres = pow(1. - nz, 3.2);
  vec2 q = p / (1. + nz);
  q = rot(t * .1 + uEspiral * t * .12) * q;
  float pl = fbm(q * 2.6 + vec2(t * .12, -t * .09) + fbm(q * 3.2 - t * .2) * 1.3);
  vec3 interior = vec3(.012, .0, .004) + vec3(.95, .08, .05) * fres * (.3 + 1.1 * pl) * .6 + vec3(.5, .02, .03) * pl * pl * .06 * nz;
  float a = dentro * .975;
  vec3 rgb = interior * a + glow * uBrilho;
  rgb = rgb / (1. + rgb * .22);
  float oc = 1. - ocluidoMao(1.);
  gl_FragColor = vec4(rgb * oc, a * oc);
}`;

const VERT_INTERNAS = /* glsl */ `
attribute vec3 aS; // x: velocidade angular, y: tamanho, z: fase
uniform vec2 uCenter; uniform float uR, uAnim, uPx, uPulso, uEspiral;
varying float vA; varying float vQ;
void main(){
  vec3 p = position;
  float rxy = length(p.xy);
  float giro = uEspiral * (1.3 / (rxy + .22)) * uAnim * .32;
  float c = cos(giro), s = sin(giro); p.xy = mat2(c, -s, s, c) * p.xy;
  float ay = uAnim * (.15 + aS.x * .5) + aS.z * 6.2831;
  float cy = cos(ay), sy = sin(ay); p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
  float ax = uAnim * .13 + aS.z * 3.;
  float cx = cos(ax), sx = sin(ax); p = vec3(p.x, cx * p.y - sx * p.z, sx * p.y + cx * p.z);
  p *= 1. + uPulso * .03 * sin(uAnim * 2.2 + aS.z * 6.);
  float prof = p.z * .5 + .5;
  gl_Position = projectionMatrix * viewMatrix * vec4(uCenter + p.xy * uR, 0., 1.);
  gl_PointSize = max(1.6, (1.1 + aS.y * 2.9) * (.65 + prof * .7) * uPx);
  vA = (.22 + .78 * prof) * (.55 + .45 * sin(uAnim * (1.5 + aS.x * 3.) + aS.z * 20.));
  vQ = aS.y;
}`;

const FRAG_PONTOS = /* glsl */ `
precision highp float;
${OCLUSAO}
uniform float uBrilho;
varying float vA; varying float vQ;
void main(){
  vec2 c = gl_PointCoord - .5; float r2 = dot(c, c) * 4.;
  float a = exp(-r2 * 4.5) * vA * 1.7;
  vec3 col = mix(vec3(.95, .06, .05), vec3(1., .48, .26), vQ * vQ);
  gl_FragColor = vec4(col * a * uBrilho * (1. - ocluidoMao(1.)), 0.);
}`;

const VERT_ORBITAIS = /* glsl */ `
attribute vec4 aO; // x: semi-eixo a, y: semi-eixo b, z: inclinação, w: fase
attribute vec2 aS; // x: velocidade, y: tamanho
uniform vec2 uCenter; uniform float uR, uAnim, uPx;
varying float vA; varying float vQ;
void main(){
  float ang = aO.w + uAnim * aS.x;
  vec2 e = vec2(cos(ang) * aO.x, sin(ang) * aO.y);
  float c = cos(aO.z), s = sin(aO.z); e = mat2(c, -s, s, c) * e;
  float prof = sin(ang) * .5 + .5;
  gl_Position = projectionMatrix * viewMatrix * vec4(uCenter + e * uR, 0., 1.);
  gl_PointSize = max(1.8, (1.4 + aS.y * 3.2) * (.6 + prof * .8) * uPx);
  vA = (.3 + .7 * prof) * (.6 + .4 * sin(uAnim * 3. + aO.w * 9.));
  vQ = aS.y;
}`;

const VERT_SUBIDA = /* glsl */ `
attribute vec4 aS; // x: deslocamento lateral, y: velocidade, z: fase, w: tamanho
uniform vec2 uCenter; uniform float uR, uAnim, uPx;
varying float vA; varying float vQ;
void main(){
  float c = aS.z + uAnim * aS.y * .22; float cyc = floor(c); float life = fract(c);
  float x0 = (fract(sin((aS.x + cyc * .137) * 91.7) * 437.5) - .5) * 1.1;
  float x = uCenter.x + uR * (x0 * (1. - life * .55)) + sin(life * 11. + aS.z * 20.) * 6.;
  float y = uCenter.y + uR * (1.38 - life * 1.35);
  gl_Position = projectionMatrix * viewMatrix * vec4(x, y, 0., 1.);
  gl_PointSize = max(1.8, (1.6 + aS.w * 3.) * uPx * (1. - life * .45));
  vA = smoothstep(0., .1, life) * (1. - smoothstep(.72, 1., life));
  vQ = aS.w;
}`;

const VERT_BRILHOS = /* glsl */ `
attribute float aTam; attribute float aAlfa;
uniform float uPx;
varying float vA; varying float vQ;
void main(){
  gl_Position = projectionMatrix * viewMatrix * vec4(position.xy, 0., 1.);
  gl_PointSize = aTam * uPx; vA = aAlfa; vQ = 1.;
}`;

const VERT_ARCOS = /* glsl */ `
attribute float aA;
varying float vA;
void main(){ vA = aA; gl_Position = projectionMatrix * viewMatrix * vec4(position.xy, 0., 1.); }`;
const FRAG_ARCOS = /* glsl */ `
precision highp float;
${OCLUSAO}
varying float vA;
void main(){ gl_FragColor = vec4(vec3(1., .5, .38) * vA * (1. - ocluidoMao(.92)), 0.); }`;

/** OrbLighting: luz da esfera sobre a mão, o personagem e o ambiente. Soma luz vermelha; a mão e a caveira recebem reflexo, o fundo recebe halo. */
const FRAG_LUZ = /* glsl */ `
precision highp float;
${OCLUSAO}
uniform vec2 uCenter; uniform float uR, uLuz, uTime;
varying vec2 vP;
void main(){
  vec2 pos = uCenter + vP * uR * 1.0;
  vec2 mm = texture2D(uMatte, gl_FragCoord.xy / uRes).rg;
  float m = mm.r; float mao = mm.g;
  float dist = length(vP);
  float pisca = .92 + .08 * sin(uTime * 2.3) + .04 * sin(uTime * 7.1);
  float halo = exp(-dist * dist * .55) * .38;
  // reflexo na mão: mais forte perto da palma, logo abaixo da esfera
  vec2 palma = (vec2(0., 1.15));
  float reflexoMao = exp(-length((vP - palma) * vec2(.9, 1.3)) * 1.25);
  float sobreCorpo = exp(-dist * 1.05) * .5 + reflexoMao * 1.25 * mao;
  vec3 cor = vec3(1., .2, .1);
  float base = smoothstep(0., .3, gl_FragCoord.y / uRes.y);
  float luz = (halo * (1. - m * .8) + sobreCorpo * m * .62) * uLuz * pisca * base;
  gl_FragColor = vec4(cor * luz, 0.);
}`;

function criarUniforms() {
  return {
    uCenter: { value: new THREE.Vector2(PALMA.x, PALMA.y) },
    uR: { value: PALMA.raio as number },
    uTime: { value: 0 }, uAnim: { value: 0 }, uBrilho: { value: 1 }, uPulso: { value: 0.35 }, uEspiral: { value: 0 }, uAudio: { value: 0 }, uOndas: { value: 0 },
  };
}

export class MentorOrb3D {
  readonly grupo = new THREE.Group();
  private uniforms: ReturnType<typeof criarUniforms>;
  private plasma: THREE.ShaderMaterial;
  private internas: THREE.Points;
  private internasMat: THREE.ShaderMaterial;
  private orbitais: THREE.Points;
  private orbitaisMat: THREE.ShaderMaterial;
  private subida: THREE.Points;
  private subidaMat: THREE.ShaderMaterial;
  private luzMat: THREE.ShaderMaterial;
  private arcos: THREE.LineSegments;
  private arcosPos: Float32Array;
  private arcosAlfa: Float32Array;
  private brilhos: THREE.Points;
  private brilhosPos: Float32Array;
  private brilhosTam: Float32Array;
  private brilhosAlfa: Float32Array;
  private bolts: { pts: number[]; nasc: number; vida: number }[] = [];
  private proximoBolt = 0;
  private pulsos: { t: number; vel: number; x: number }[] = [];
  private proximoPulso = 1;
  private rnd = aleatorio(20260);
  private anim = 0;
  private tempo = 0;
  private readonly maxBolts = 7;
  private readonly seg = 14;
  private cx: number = PALMA.x;
  private cy: number = PALMA.y;

  constructor(q: Qualidade, comuns: UniformsComuns) {
    const compartilhados = { uRes: comuns.uRes, uMatte: comuns.uMatte, uPx: comuns.uPx };
    this.uniforms = criarUniforms();
    const u = this.uniforms;
    const base = { ...compartilhados, uCenter: u.uCenter, uR: u.uR, uTime: u.uTime, uAnim: u.uAnim, uBrilho: u.uBrilho, uPulso: u.uPulso, uEspiral: u.uEspiral };

    // OrbGeometry + PlasmaShader: um quadrado maior que a esfera; o shader desenha o plasma, o anel e a aura
    const quad = new THREE.PlaneGeometry(2, 2);
    this.plasma = materialAditivo({ vertexShader: VERT_QUAD, fragmentShader: FRAG_PLASMA, uniforms: { ...base, uQuad: { value: 2.9 }, uAudio: u.uAudio, uOndas: u.uOndas } });
    const malha = new THREE.Mesh(quad, this.plasma);
    malha.frustumCulled = false; malha.renderOrder = 10;

    // OrbLighting
    this.luzMat = materialAditivo({ vertexShader: VERT_QUAD, fragmentShader: FRAG_LUZ, uniforms: { ...compartilhados, uCenter: u.uCenter, uR: u.uR, uTime: u.uTime, uLuz: comuns.uLuz, uQuad: { value: 5.2 } } });
    const luz = new THREE.Mesh(quad, this.luzMat);
    luz.frustumCulled = false; luz.renderOrder = 9;

    // EnergyParticles: milhares de pontos dentro da esfera, em profundidades diferentes
    const rnd = this.rnd;
    const nI = q.orbParticulas;
    const pos = new Float32Array(nI * 3); const seed = new Float32Array(nI * 3);
    for (let i = 0; i < nI; i++) {
      const r = 0.96 * Math.cbrt(rnd()); const th = Math.acos(2 * rnd() - 1); const fi = rnd() * Math.PI * 2;
      pos[i * 3] = r * Math.sin(th) * Math.cos(fi); pos[i * 3 + 1] = r * Math.sin(th) * Math.sin(fi); pos[i * 3 + 2] = r * Math.cos(th);
      seed[i * 3] = rnd(); seed[i * 3 + 1] = Math.pow(rnd(), 2.2); seed[i * 3 + 2] = rnd();
    }
    const gI = new THREE.BufferGeometry();
    gI.setAttribute("position", new THREE.BufferAttribute(pos, 3)); gI.setAttribute("aS", new THREE.BufferAttribute(seed, 3));
    this.internasMat = materialAditivo({ vertexShader: VERT_INTERNAS, fragmentShader: FRAG_PONTOS, uniforms: { ...base } });
    this.internas = new THREE.Points(gI, this.internasMat);
    this.internas.frustumCulled = false; this.internas.renderOrder = 11;

    // partículas em órbita ao redor do anel (rastros do movimento orbital)
    const nO = q.orbitais;
    const o = new Float32Array(nO * 4); const so = new Float32Array(nO * 2); const po = new Float32Array(nO * 3);
    for (let i = 0; i < nO; i++) {
      const semi = 1.12 + rnd() * 0.75; o[i * 4] = semi; o[i * 4 + 1] = (0.28 + rnd() * 0.5) * semi; o[i * 4 + 2] = (rnd() - 0.5) * 2.2; o[i * 4 + 3] = rnd() * Math.PI * 2;
      so[i * 2] = (rnd() < 0.5 ? -1 : 1) * (0.18 + rnd() * 0.5); so[i * 2 + 1] = Math.pow(rnd(), 1.8);
    }
    const gO = new THREE.BufferGeometry();
    gO.setAttribute("position", new THREE.BufferAttribute(po, 3)); gO.setAttribute("aO", new THREE.BufferAttribute(o, 4)); gO.setAttribute("aS", new THREE.BufferAttribute(so, 2));
    this.orbitaisMat = materialAditivo({ vertexShader: VERT_ORBITAIS, fragmentShader: FRAG_PONTOS, uniforms: { ...base } });
    this.orbitais = new THREE.Points(gO, this.orbitaisMat);
    this.orbitais.frustumCulled = false; this.orbitais.renderOrder = 12;

    // partículas subindo da palma até a esfera
    const nS = q.subida;
    const sub = new Float32Array(nS * 4); const ps = new Float32Array(nS * 3);
    for (let i = 0; i < nS; i++) { sub[i * 4] = rnd(); sub[i * 4 + 1] = 0.6 + rnd() * 1.2; sub[i * 4 + 2] = rnd(); sub[i * 4 + 3] = rnd(); }
    const gS = new THREE.BufferGeometry();
    gS.setAttribute("position", new THREE.BufferAttribute(ps, 3)); gS.setAttribute("aS", new THREE.BufferAttribute(sub, 4));
    this.subidaMat = materialAditivo({ vertexShader: VERT_SUBIDA, fragmentShader: FRAG_PONTOS, uniforms: { ...base } });
    this.subida = new THREE.Points(gS, this.subidaMat);
    this.subida.frustumCulled = false; this.subida.renderOrder = 12;

    // arcos elétricos (CPU): cada descarga é desenhada três vezes, com deslocamentos de 1 px, para engrossar o fio
    const nv = this.maxBolts * this.seg * 2 * 3;
    this.arcosPos = new Float32Array(nv * 3); this.arcosAlfa = new Float32Array(nv);
    const gA = new THREE.BufferGeometry();
    gA.setAttribute("position", new THREE.BufferAttribute(this.arcosPos, 3)); gA.setAttribute("aA", new THREE.BufferAttribute(this.arcosAlfa, 1));
    this.arcos = new THREE.LineSegments(gA, materialAditivo({ vertexShader: VERT_ARCOS, fragmentShader: FRAG_ARCOS, uniforms: { ...compartilhados } }));
    this.arcos.frustumCulled = false; this.arcos.renderOrder = 13;

    // brilhos pontuais: pulsos de energia da mão à esfera e clarões nas pontas das descargas
    const nB = 24;
    this.brilhosPos = new Float32Array(nB * 3); this.brilhosTam = new Float32Array(nB); this.brilhosAlfa = new Float32Array(nB);
    const gB = new THREE.BufferGeometry();
    gB.setAttribute("position", new THREE.BufferAttribute(this.brilhosPos, 3)); gB.setAttribute("aTam", new THREE.BufferAttribute(this.brilhosTam, 1)); gB.setAttribute("aAlfa", new THREE.BufferAttribute(this.brilhosAlfa, 1));
    this.brilhos = new THREE.Points(gB, materialAditivo({ vertexShader: VERT_BRILHOS, fragmentShader: FRAG_PONTOS, uniforms: { ...compartilhados, uBrilho: { value: 1.25 } } }));
    this.brilhos.frustumCulled = false; this.brilhos.renderOrder = 14;

    this.grupo.add(luz, malha, this.internas, this.orbitais, this.subida, this.arcos, this.brilhos);
    comuns.uOrb.value.set(PALMA.x, PALMA.y);
    comuns.uOrbR.value = PALMA.raio;
    this.comuns = comuns;
  }

  private comuns: UniformsComuns;

  /** OrbAnimationController: levitação, rotação, descargas e pulsos. `audio` é a energia real do áudio (0 a 1). */
  atualizar(dt: number, e: AlvoCena, audio: number) {
    this.tempo += dt;
    this.anim += dt * e.rapidez;
    const t = this.tempo;
    // levitação suave com movimento lateral mínimo
    this.cy = PALMA.y + Math.sin(t * 1.05) * 5 + Math.sin(t * 0.37 + 1.3) * 2.2 - e.brilho * 1.5 + audio * -3;
    this.cx = PALMA.x + Math.sin(t * 0.63) * 1.6;
    const u = this.uniforms;
    u.uCenter.value.set(this.cx, this.cy);
    u.uTime.value = t; u.uAnim.value = this.anim;
    u.uBrilho.value = e.brilho * (0.92 + 0.08 * Math.sin(t * 1.9));
    u.uPulso.value = e.pulso; u.uEspiral.value = e.espiral; u.uAudio.value = audio; u.uOndas.value = e.ondas;
    this.comuns.uOrb.value.set(this.cx, this.cy);
    this.comuns.uLuz.value = e.luz;

    this.descargas(dt, e);
    this.atualizarPulsos(dt, e);
  }

  private descargas(dt: number, e: AlvoCena) {
    const rnd = this.rnd;
    this.proximoBolt -= dt;
    if (this.proximoBolt <= 0 && this.bolts.length < this.maxBolts) {
      this.proximoBolt = (0.5 + rnd() * 1.4) / Math.max(0.3, e.faiscas);
      const R = PALMA.raio;
      const pts: number[] = [];
      let x0: number, y0: number, x1: number, y1: number;
      if (rnd() < 0.55) {
        // da palma até a esfera
        x0 = this.cx + (rnd() - 0.5) * R * 1.1; y0 = this.cy + R * 1.38;
        const a = Math.PI / 2 + (rnd() - 0.5) * 1.1;
        x1 = this.cx + Math.cos(a) * R * 0.98; y1 = this.cy + Math.sin(a) * R * 0.98;
      } else {
        // descarga saindo do anel
        const a = rnd() * Math.PI * 2;
        x0 = this.cx + Math.cos(a) * R * 1.0; y0 = this.cy + Math.sin(a) * R * 1.0;
        const a2 = a + (rnd() - 0.5) * 0.7; const L = R * (0.25 + rnd() * 0.45);
        x1 = x0 + Math.cos(a2) * L; y1 = y0 + Math.sin(a2) * L;
      }
      const n = this.seg;
      const dx = x1 - x0, dy = y1 - y0; const len = Math.hypot(dx, dy) || 1; const nx = -dy / len, ny = dx / len;
      for (let i = 0; i <= n; i++) {
        const f = i / n; const amp = Math.sin(f * Math.PI) * len * 0.09;
        const off = (rnd() - 0.5) * 2 * amp * (i === 0 || i === n ? 0 : 1);
        pts.push(x0 + dx * f + nx * off, y0 + dy * f + ny * off);
      }
      this.bolts.push({ pts, nasc: this.tempo, vida: 0.1 + rnd() * 0.16 });
    }
    this.bolts = this.bolts.filter((b) => this.tempo - b.nasc < b.vida);
    // escreve os segmentos (três cópias: núcleo e dois deslocamentos de 1 px)
    this.arcosAlfa.fill(0);
    let v = 0;
    const desloc = [[0, 0, 1], [1, 0, 0.42], [0, 1, 0.42]];
    let bp = 0;
    for (const b of this.bolts) {
      const idade = (this.tempo - b.nasc) / b.vida;
      const a = (1 - idade) * (0.65 + 0.35 * Math.sin(this.tempo * 90 + b.nasc * 50));
      for (const [ox, oy, k] of desloc) {
        for (let i = 0; i < this.seg; i++) {
          for (let j = 0; j < 2; j++) {
            const p = (i + j) * 2;
            this.arcosPos[v * 3] = b.pts[p]! + ox!; this.arcosPos[v * 3 + 1] = b.pts[p + 1]! + oy!; this.arcosPos[v * 3 + 2] = 0;
            this.arcosAlfa[v] = a * k! * 1.4;
            v++;
          }
        }
      }
      // clarão na ponta
      const slot = 12 + (bp % 6);
      this.brilhosPos[slot * 3] = b.pts[b.pts.length - 2]!; this.brilhosPos[slot * 3 + 1] = b.pts[b.pts.length - 1]!;
      this.brilhosTam[slot] = 16 + 10 * a; this.brilhosAlfa[slot] = a * 0.9;
      bp++;
    }
    for (let s = 12 + bp; s < 18; s++) this.brilhosAlfa[s] = 0;
    (this.arcos.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.arcos.geometry.getAttribute("aA") as THREE.BufferAttribute).needsUpdate = true;
    this.arcos.geometry.setDrawRange(0, Math.max(2, v));
  }

  private atualizarPulsos(dt: number, e: AlvoCena) {
    this.proximoPulso -= dt;
    if (this.proximoPulso <= 0 && this.pulsos.length < 5) {
      this.proximoPulso = (1.1 + this.rnd() * 1.6) / Math.max(0.4, e.faiscas * 0.7);
      this.pulsos.push({ t: 0, vel: 0.5 + this.rnd() * 0.35, x: (this.rnd() - 0.5) * PALMA.raio * 0.8 });
    }
    const R = PALMA.raio;
    this.pulsos = this.pulsos.filter((p) => p.t < 1);
    for (let i = 0; i < 6; i++) this.brilhosAlfa[i] = 0;
    this.pulsos.forEach((p, i) => {
      p.t += dt * p.vel * (0.8 + e.rapidez * 0.35);
      const f = p.t;
      this.brilhosPos[i * 3] = this.cx + p.x * (1 - f * 0.6); this.brilhosPos[i * 3 + 1] = this.cy + R * (1.4 - f * 1.3);
      this.brilhosTam[i] = 20 * (1 - f * 0.4); this.brilhosAlfa[i] = Math.sin(f * Math.PI) * 0.8;
    });
    (this.brilhos.geometry.getAttribute("position") as THREE.BufferAttribute).needsUpdate = true;
    (this.brilhos.geometry.getAttribute("aTam") as THREE.BufferAttribute).needsUpdate = true;
    (this.brilhos.geometry.getAttribute("aAlfa") as THREE.BufferAttribute).needsUpdate = true;
  }

  /** Usado quando o governador reduz a qualidade: desenha só uma parte das partículas. */
  limitar(f: number) {
    this.internas.geometry.setDrawRange(0, Math.floor((this.internas.geometry.getAttribute("position").count) * f));
    this.orbitais.geometry.setDrawRange(0, Math.floor((this.orbitais.geometry.getAttribute("position").count) * f));
  }

  liberar() {
    this.grupo.traverse((o) => {
      const m = o as THREE.Mesh | THREE.Points | THREE.LineSegments;
      m.geometry?.dispose?.();
      (m.material as THREE.Material | undefined)?.dispose?.();
    });
  }
}
