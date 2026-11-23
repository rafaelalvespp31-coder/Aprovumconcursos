import * as THREE from "three";
import { DEFORMA_VOZ, OCLUSAO, RUIDO } from "./glsl";
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

/**
 * Anel de fogo e fumaça: uma lâmina fina de fumaça incandescente em forma de anel, com filamentos que deslizam ao longo
 * dele, línguas de fogo que sobem para fora e o centro escuro. Cor de fogo real (vermelho profundo → laranja → núcleo
 * amarelado). A voz engrossa, acende e acelera o anel; a deformação do contorno vem de `deformaVoz`.
 */
const FRAG_PLASMA = /* glsl */ `
precision highp float;
${RUIDO}
${OCLUSAO}
${DEFORMA_VOZ}
uniform float uTime, uBrilho, uPulso, uEspiral, uAudio;
varying vec2 vP;
float cume(vec2 p){ return 1. - abs(2. * fbm(p) - 1.); }
// calor (0 a 1,3) → cor de brasa/fogo
vec3 fogo(float h){
  vec3 c = mix(vec3(.04, .0, .0), vec3(.5, .012, .008), smoothstep(0., .22, h));
  c = mix(c, vec3(.98, .13, .015), smoothstep(.18, .5, h));
  c = mix(c, vec3(1., .42, .05), smoothstep(.45, .82, h));
  c = mix(c, vec3(1., .78, .4), smoothstep(.8, 1.2, h));
  return c;
}
void main(){
  vec2 p = vP; float len = length(p); vec2 cs = p / max(len, 1e-4); float t = uTime;
  float a = min(1., uAudio * 1.25);
  float ts = t * (1. + a * .9); // a fala acelera o fogo
  // raio irregular do anel (sem emenda no ângulo) + deformação da voz
  float e1 = noise(cs * 1.6 + vec2(t * .22, t * .13));
  float e2 = noise(cs * 4.0 + vec2(-t * .35, t * .2 + 4.));
  float rr = .93 + (e1 - .5) * .07 + (e2 - .5) * .026 + uPulso * .008 * sin(t * 1.5) + deformaVoz(cs, t, uAudio);
  float d = len - rr;
  // espessura da lâmina varia ao longo do anel: trechos finos e trechos encorpados que giram devagar
  float esp = .075 + .15 * noise(cs * 1.3 + vec2(-t * .15, 3.)) + .05 * a;
  // fluxo da fumaça: o desenho desliza ao longo do anel; os filamentos ficam esticados na direção do anel (como véus)
  vec2 cr = rot(t * .09 + uEspiral * t * .1) * cs;
  vec2 w1 = vec2(fbm(cr * 1.8 + vec2(d * 3., ts * .2)), fbm(cr * 1.8 + vec2(-d * 3. + 7., -ts * .17)));
  vec2 g = cr * 2.4 + (w1 - .5) * 1.1;
  float f1 = fbm(g + vec2(d * 6. - ts * .3, ts * .1));                    // corpo do véu
  float f2 = cume(g * 1.7 + vec2(d * 15. + w1.x * 2., ts * .15));         // filamentos
  float f3 = cume(g * 3.3 + vec2(d * 28. - ts * .4, 3.));                 // fios finos
  float dd = d + (f1 - .5) * .13 - .01;
  float lamina = smoothstep(.28, .74, f1 + (w1.y - .5) * .35);            // trechos densos x rarefeitos
  float corpo = exp(-pow(abs(dd) / esp, 1.9) * 1.7) * (.2 + .8 * lamina);
  float fil = f2 * .7 + f3 * .4;
  // línguas de fogo que sobem para fora do anel
  float lingua = fbm(cr * 3.4 + vec2(max(d, 0.) * 5. - ts * .95, t * .15));
  float chama = smoothstep(.3, .85, lingua) * exp(-max(d, 0.) * 6.5) * (.5 + a) * smoothstep(-.04, .02, d) * (.4 + .6 * lamina);
  float quente = exp(-d * d / (esp * esp * .35));
  float h = corpo * (.2 + 1.5 * pow(fil, 2.3)) + chama * .85 + quente * .1 * (.4 + f1);
  h *= uBrilho * (1. + .6 * a);
  vec3 cor = fogo(h) * smoothstep(0., .1, h);
  // brilho difuso: aura vermelha para fora e um fio laranja no contorno
  vec3 glow = vec3(.95, .09, .03) * exp(-max(d, 0.) * 5.2) * .4 + vec3(1., .3, .04) * exp(-abs(d) * 15.) * .34 * (.6 + f1);
  glow *= uBrilho * (1. + .5 * a);
  // centro escuro, com um resquício de calor colado na borda interna
  float dentro = smoothstep(.014, -.02, d);
  vec3 interior = vec3(.008, .0, .002) + vec3(.8, .06, .02) * exp(min(d, 0.) * 11.) * (.2 + .5 * f1) * .5;
  float alfa = max(dentro * .975, clamp(h * .55, 0., .55));
  vec3 rgb = interior * dentro + cor * (1. - dentro * .35) + glow * (1. - dentro);
  rgb = rgb / (1. + rgb * .2);
  float oc = 1. - ocluidoMao(1.);
  gl_FragColor = vec4(rgb * oc, alfa * oc);
}`;

const FRAG_PONTOS = /* glsl */ `
precision highp float;
${OCLUSAO}
uniform float uBrilho;
varying float vA; varying float vQ;
void main(){
  vec2 c = gl_PointCoord - .5; float r2 = dot(c, c) * 4.;
  float a = exp(-r2 * 4.5) * vA * 1.7 * smoothstep(1., .6, r2);
  vec3 col = mix(vec3(1., .22, .03), vec3(1., .66, .2), vQ * vQ);
  gl_FragColor = vec4(col * a * uBrilho * (1. - ocluidoMao(1.)), 0.);
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

    // anel de fogo: um quadrado maior que a esfera; o shader desenha o anel, a fumaça, as línguas de fogo e a aura
    const quad = new THREE.PlaneGeometry(2, 2);
    this.plasma = materialAditivo({ vertexShader: VERT_QUAD, fragmentShader: FRAG_PLASMA, uniforms: { ...base, uQuad: { value: 2.9 }, uAudio: u.uAudio } });
    const malha = new THREE.Mesh(quad, this.plasma);
    malha.frustumCulled = false; malha.renderOrder = 10;

    // OrbLighting
    this.luzMat = materialAditivo({ vertexShader: VERT_QUAD, fragmentShader: FRAG_LUZ, uniforms: { ...compartilhados, uCenter: u.uCenter, uR: u.uR, uTime: u.uTime, uLuz: comuns.uLuz, uQuad: { value: 5.2 } } });
    const luz = new THREE.Mesh(quad, this.luzMat);
    luz.frustumCulled = false; luz.renderOrder = 9;

    const rnd = this.rnd;

    // partículas subindo da palma até a esfera
    const nS = q.subida;
    const sub = new Float32Array(nS * 4); const ps = new Float32Array(nS * 3);
    for (let i = 0; i < nS; i++) { sub[i * 4] = rnd(); sub[i * 4 + 1] = 0.6 + rnd() * 1.2; sub[i * 4 + 2] = rnd(); sub[i * 4 + 3] = rnd(); }
    const gS = new THREE.BufferGeometry();
    gS.setAttribute("position", new THREE.BufferAttribute(ps, 3)); gS.setAttribute("aS", new THREE.BufferAttribute(sub, 4));
    this.subidaMat = materialAditivo({ vertexShader: VERT_SUBIDA, fragmentShader: FRAG_PONTOS, uniforms: { ...base } });
    this.subida = new THREE.Points(gS, this.subidaMat);
    this.subida.frustumCulled = false; this.subida.renderOrder = 12;

    this.grupo.add(luz, malha, this.subida);
    comuns.uOrb.value.set(PALMA.x, PALMA.y);
    comuns.uOrbR.value = PALMA.raio;
    this.comuns = comuns;
  }

  private comuns: UniformsComuns;

  /** OrbAnimationController: levitação lenta e respiração suave guiada pelo áudio (já suavizado). Nada é emitido da esfera. */
  atualizar(dt: number, e: AlvoCena, audio: number, escala = 1, deforma = 0) {
    this.tempo += dt;
    this.anim += dt * e.rapidez;
    const t = this.tempo;
    this.cy = PALMA.y + Math.sin(t * 0.95) * 4 + Math.sin(t * 0.33 + 1.3) * 1.6;
    this.cx = PALMA.x + Math.sin(t * 0.6) * 1.2;
    const u = this.uniforms;
    u.uCenter.value.set(this.cx, this.cy);
    u.uTime.value = t; u.uAnim.value = this.anim;
    u.uBrilho.value = e.brilho * (0.95 + 0.05 * Math.sin(t * 1.3));
    u.uPulso.value = e.pulso; u.uEspiral.value = e.espiral; u.uAudio.value = deforma;
    // contração e expansão da esfera inteira (anel, núcleo, micropartículas e luz) no ritmo da voz
    u.uR.value = PALMA.raio * escala;
    this.comuns.uOrbR.value = PALMA.raio * escala;
    this.comuns.uOrb.value.set(this.cx, this.cy);
    this.comuns.uLuz.value = e.luz;
  }

  /** Usado quando o governador reduz a qualidade: desenha só uma parte das brasas que sobem. */
  limitar(f: number) {
    this.subida.geometry.setDrawRange(0, Math.floor(this.subida.geometry.getAttribute("position").count * f));
  }

  liberar() {
    this.grupo.traverse((o) => {
      const m = o as THREE.Mesh | THREE.Points | THREE.LineSegments;
      m.geometry?.dispose?.();
      (m.material as THREE.Material | undefined)?.dispose?.();
    });
  }
}
