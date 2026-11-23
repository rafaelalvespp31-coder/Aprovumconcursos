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

/** OpenPalmOrbPosition: onde a esfera repousa, em pixels da arte (1086 x 732). Fica inteira, acima da palma, entre as pontas dos dedos médio e anelar. */
export const PALMA = { x: 318, y: 368, raio: 140, palmaY: 528 } as const;

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

/** PlasmaShader: núcleo negro, borda de plasma irregular e suave, anel incandescente e aura. Sem raios nem ondas: a voz só faz a esfera respirar. */
const FRAG_PLASMA = /* glsl */ `
precision highp float;
${RUIDO}
${OCLUSAO}
uniform float uTime, uBrilho, uPulso, uEspiral, uAudio;
varying vec2 vP;
void main(){
  vec2 p = vP; float len = length(p); vec2 cs = p / max(len, 1e-4); float t = uTime;
  // raio irregular do anel: três ruídos em escalas diferentes
  // ruído sobre o círculo unitário (sem emenda no ângulo ±π)
  float e1 = noise(cs * 2.0 + vec2(t * .55, t * .3));
  float e2 = noise(cs * 5.0 + vec2(-t * .7, t * .4 + 4.));
  float e3 = noise(cs * 13.0 + vec2(t * 1.1, 9.));
  float rr = 1.0 + (e1 - .5) * .06 + (e2 - .5) * .032 + (e3 - .5) * .01 + uPulso * .01 * sin(t * 1.5) + uAudio * .022;
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

/** Micropartículas dentro da esfera: pairam à deriva (sem giro), com profundidade de campo, luz rasante nas bordas e cintilações raras. */
const VERT_INTERNAS = /* glsl */ `
attribute vec3 aS; // x: frequência de cintilação, y: tamanho (0 a 1), z: fase
attribute vec4 aD; // frequências de deriva em x, y e z e a amplitude
uniform vec2 uCenter; uniform float uR, uAnim, uPx, uEspiral;
varying float vA; varying float vSoft; varying float vQ; varying float vGlint;
void main(){
  float t = uAnim;
  vec3 p = position;
  // deriva lenta e sem direção: soma de senos com frequências próprias de cada partícula
  p += aD.w * vec3(sin(t * aD.x + aS.z * 6.2831), sin(t * aD.y + aS.z * 17.), sin(t * aD.z + aS.z * 29.));
  // no estado "processando" as partículas se organizam num redemoinho lento
  float rxy = length(p.xy);
  float giro = uEspiral * (.9 / (rxy + .3)) * t * .12;
  float c = cos(giro), s = sin(giro); p.xy = mat2(c, -s, s, c) * p.xy;
  float ay = t * .03; float cy = cos(ay), sy = sin(ay);
  p = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);
  p *= min(1., .93 / max(length(p), .0001));
  float prof = p.z * .5 + .5;
  gl_Position = projectionMatrix * viewMatrix * vec4(uCenter + p.xy * uR, 0., 1.);
  float tam = 1. + aS.y * aS.y * 3.4;
  // plano de foco um pouco à frente do centro: o que está longe dele fica maior, mais suave e mais fraco
  vSoft = clamp(abs(prof - .58) * 1.9 + step(.82, aS.y) * .22, 0., 1.);
  gl_PointSize = max(1.5, tam * (.7 + prof * .7) * (1. + vSoft * .9) * uPx);
  float rim = smoothstep(.12, .93, length(p));
  float pisca = .62 + .38 * sin(t * aS.x + aS.z * 40.);
  vA = (.2 + .8 * prof) * (.3 + .7 * rim) * pisca * (1. - vSoft * .35);
  vGlint = pow(max(0., sin(t * (.22 + aS.x * .25) + aS.z * 91.)), 28.) * (.4 + .6 * aS.y);
  vQ = aS.y;
}`;

const FRAG_INTERNAS = /* glsl */ `
precision highp float;
${OCLUSAO}
uniform float uBrilho;
varying float vA; varying float vSoft; varying float vQ; varying float vGlint;
void main(){
  vec2 c = gl_PointCoord - .5; float r2 = dot(c, c) * 4.;
  float a = exp(-r2 * mix(11., 2.4, vSoft)) * mix(1., .5, vSoft) + (1. - vSoft) * .45 * exp(-r2 * 45.);
  a *= smoothstep(1., .6, r2);
  vec3 base = mix(vec3(1., .05, .03), vec3(1., .26, .1), vQ * vQ);
  vec3 col = base * vA * 1.55 + vec3(1., .5, .36) * vGlint * .8;
  gl_FragColor = vec4(col * a * uBrilho * (1. - ocluidoMao(1.)), 0.);
}`;

const FRAG_PONTOS = /* glsl */ `
precision highp float;
${OCLUSAO}
uniform float uBrilho;
varying float vA; varying float vQ;
void main(){
  vec2 c = gl_PointCoord - .5; float r2 = dot(c, c) * 4.;
  float a = exp(-r2 * 4.5) * vA * 1.7 * smoothstep(1., .6, r2);
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
    uTime: { value: 0 }, uAnim: { value: 0 }, uBrilho: { value: 1 }, uPulso: { value: 0.35 }, uEspiral: { value: 0 }, uAudio: { value: 0 },
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
  private rnd = aleatorio(20260);
  private anim = 0;
  private tempo = 0;
  private cx: number = PALMA.x;
  private cy: number = PALMA.y;

  constructor(q: Qualidade, comuns: UniformsComuns) {
    const compartilhados = { uRes: comuns.uRes, uMatte: comuns.uMatte, uPx: comuns.uPx };
    this.uniforms = criarUniforms();
    const u = this.uniforms;
    const base = { ...compartilhados, uCenter: u.uCenter, uR: u.uR, uTime: u.uTime, uAnim: u.uAnim, uBrilho: u.uBrilho, uPulso: u.uPulso, uEspiral: u.uEspiral };

    // OrbGeometry + PlasmaShader: um quadrado maior que a esfera; o shader desenha o plasma, o anel e a aura
    const quad = new THREE.PlaneGeometry(2, 2);
    this.plasma = materialAditivo({ vertexShader: VERT_QUAD, fragmentShader: FRAG_PLASMA, uniforms: { ...base, uQuad: { value: 2.9 }, uAudio: u.uAudio } });
    const malha = new THREE.Mesh(quad, this.plasma);
    malha.frustumCulled = false; malha.renderOrder = 10;

    // OrbLighting
    this.luzMat = materialAditivo({ vertexShader: VERT_QUAD, fragmentShader: FRAG_LUZ, uniforms: { ...compartilhados, uCenter: u.uCenter, uR: u.uR, uTime: u.uTime, uLuz: comuns.uLuz, uQuad: { value: 5.2 } } });
    const luz = new THREE.Mesh(quad, this.luzMat);
    luz.frustumCulled = false; luz.renderOrder = 9;

    // EnergyParticles: milhares de pontos dentro da esfera, em profundidades diferentes
    const rnd = this.rnd;
    const nI = q.orbParticulas;
    const pos = new Float32Array(nI * 3); const seed = new Float32Array(nI * 3); const deriva = new Float32Array(nI * 4);
    for (let i = 0; i < nI; i++) {
      const r = 0.9 * Math.cbrt(rnd()); const th = Math.acos(2 * rnd() - 1); const fi = rnd() * Math.PI * 2;
      pos[i * 3] = r * Math.sin(th) * Math.cos(fi); pos[i * 3 + 1] = r * Math.sin(th) * Math.sin(fi); pos[i * 3 + 2] = r * Math.cos(th);
      seed[i * 3] = rnd(); seed[i * 3 + 1] = Math.pow(rnd(), 1.7); seed[i * 3 + 2] = rnd();
      deriva[i * 4] = 0.1 + rnd() * 0.32; deriva[i * 4 + 1] = 0.1 + rnd() * 0.32; deriva[i * 4 + 2] = 0.08 + rnd() * 0.26; deriva[i * 4 + 3] = 0.035 + rnd() * 0.11;
    }
    const gI = new THREE.BufferGeometry();
    gI.setAttribute("position", new THREE.BufferAttribute(pos, 3)); gI.setAttribute("aS", new THREE.BufferAttribute(seed, 3)); gI.setAttribute("aD", new THREE.BufferAttribute(deriva, 4));
    this.internasMat = materialAditivo({ vertexShader: VERT_INTERNAS, fragmentShader: FRAG_INTERNAS, uniforms: { ...base } });
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

    this.grupo.add(luz, malha, this.internas, this.orbitais, this.subida);
    comuns.uOrb.value.set(PALMA.x, PALMA.y);
    comuns.uOrbR.value = PALMA.raio;
    this.comuns = comuns;
  }

  private comuns: UniformsComuns;

  /** OrbAnimationController: levitação lenta e respiração suave guiada pelo áudio (já suavizado). Nada é emitido da esfera. */
  atualizar(dt: number, e: AlvoCena, audio: number) {
    this.tempo += dt;
    this.anim += dt * e.rapidez;
    const t = this.tempo;
    this.cy = PALMA.y + Math.sin(t * 0.95) * 4 + Math.sin(t * 0.33 + 1.3) * 1.6;
    this.cx = PALMA.x + Math.sin(t * 0.6) * 1.2;
    const u = this.uniforms;
    u.uCenter.value.set(this.cx, this.cy);
    u.uTime.value = t; u.uAnim.value = this.anim;
    u.uBrilho.value = e.brilho * (0.95 + 0.05 * Math.sin(t * 1.3));
    u.uPulso.value = e.pulso; u.uEspiral.value = e.espiral; u.uAudio.value = audio;
    this.comuns.uOrb.value.set(this.cx, this.cy);
    this.comuns.uLuz.value = e.luz;
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
