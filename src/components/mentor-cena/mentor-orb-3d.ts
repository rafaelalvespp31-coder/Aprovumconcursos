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
 * Anel de fogo e fumaça fiel à referência: a forma e o movimento vêm dos quadros do GIF de referência (folha de textura
 * com 45 quadros, em tons de cinza, em /home/orb-fogo.webp). O shader só mistura quadros vizinhos (movimento suave),
 * suaviza e pinta a densidade com a paleta de fogo (vermelho profundo → laranja → núcleo quente). A voz acende o anel,
 * acelera a fumaça e deforma o contorno. Centro preto.
 */
const FRAG_PLASMA = /* glsl */ `
precision highp float;
${RUIDO}
${OCLUSAO}
${DEFORMA_VOZ}
uniform sampler2D uFogo;
uniform float uTime, uBrilho, uPulso, uEspiral, uAudio, uQuadro, uPronto;
varying vec2 vP;
const float N = 45.;
const float COLS = 7.;
const float ROWS = 7.;
const float META = 1.116; // meia largura do recorte, em raios da esfera
float quadro(float k, vec2 uv){
  k = mod(k, N);
  vec2 cel = vec2(mod(k, COLS), floor(k / COLS));
  return texture2D(uFogo, (cel + clamp(uv, .006, .994)) / vec2(COLS, ROWS)).r;
}
// mistura dois quadros vizinhos: o movimento fica contínuo mesmo com 15 quadros por segundo
float lumi(vec2 uv){
  float i = floor(uQuadro); float m = uQuadro - i;
  return mix(quadro(i, uv), quadro(i + 1., uv), m);
}
// densidade de fumaça (0 a 1) → cor de fogo
vec3 fogo(float x){
  vec3 c = mix(vec3(0.), vec3(.30, .006, .004), smoothstep(0., .16, x));
  c = mix(c, vec3(.78, .06, .01), smoothstep(.12, .42, x));
  c = mix(c, vec3(1., .27, .03), smoothstep(.36, .7, x));
  c = mix(c, vec3(1., .56, .14), smoothstep(.66, .92, x));
  c = mix(c, vec3(1., .82, .48), smoothstep(.9, 1.15, x));
  return c;
}
void main(){
  vec2 p = vP; float len = length(p); vec2 cs = p / max(len, 1e-4); float t = uTime;
  float a = min(1., uAudio * 1.25);
  // a voz estufa o anel onde a deformação é positiva (o desenho acompanha)
  vec2 q = p / (1. + deformaVoz(cs, t, uAudio));
  vec2 uv = vec2(.5 + q.x / (2. * META), .5 - q.y / (2. * META));
  float px = 1.4 / 256.;
  // leve suavização (hiper-real, sem serrilhado) e um halo mais aberto
  float L0 = lumi(uv);
  float Lb = L0 * .4 + (lumi(uv + vec2(px, 0.)) + lumi(uv - vec2(px, 0.)) + lumi(uv + vec2(0., px)) + lumi(uv - vec2(0., px))) * .15;
  float L = mix(L0, Lb, .4);
  float halo = 0.;
  for (int i = 0; i < 8; i++){
    float ang = float(i) * .785398;
    halo += lumi(uv + vec2(cos(ang), sin(ang)) * .028);
  }
  halo /= 8.;
  // os véus translúcidos ficam vermelhos e fundos; só os filamentos e as bordas mais densas esquentam até o laranja
  float filete = clamp((L0 - Lb) * 3.2, 0., 1.);
  float x = clamp((pow(L, 1.75) * 1.22 + filete * .3) * (1. + .45 * a) * uBrilho * uPronto, 0., 1.3);
  vec3 cor = fogo(x);
  // halo avermelhado e fio laranja difuso saindo da fumaça
  vec3 brilho = vec3(.95, .1, .02) * pow(halo, 1.5) * .42 * (1. + .5 * a) * uBrilho * uPronto;
  brilho += vec3(1., .3, .04) * pow(L, 2.4) * .12 * uBrilho * uPronto;
  // centro escuro + contorno de calor colado por dentro do anel
  float dentro = smoothstep(.9, .83, len);
  vec3 interior = vec3(.006, .0, .002) + vec3(.7, .05, .015) * pow(halo, 1.6) * .35 * uPronto;
  // antes de a textura carregar: só um anel fraco para não aparecer um buraco
  float reserva = exp(-pow((len - .93) / .05, 2.)) * (1. - uPronto) * .4;
  vec3 rgb = interior * dentro + (cor * (1. - dentro * .15) + brilho) * (1. - dentro * .0) + vec3(.9, .1, .03) * reserva;
  float alfa = max(dentro * .975, clamp(x * .8, 0., .85));
  rgb = rgb / (1. + rgb * .12);
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
    uQuadro: { value: 0 }, uPronto: { value: 0 }, uFogo: { value: null as unknown as THREE.Texture },
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
  private quadro = 0;
  private fogoPronto = false;
  private tempo = 0;
  private cx: number = PALMA.x;
  private cy: number = PALMA.y;

  constructor(q: Qualidade, comuns: UniformsComuns) {
    const compartilhados = { uRes: comuns.uRes, uMatte: comuns.uMatte, uPx: comuns.uPx };
    this.uniforms = criarUniforms();
    const u = this.uniforms;
    // folha de textura com os quadros do anel (referência): carrega sem bloquear; até lá só um anel fraco e o centro preto
    const vazio = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    vazio.needsUpdate = true;
    u.uFogo.value = vazio;
    new THREE.TextureLoader().load("/home/orb-fogo.webp", (t) => {
      t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; t.flipY = false;
      u.uFogo.value = t; this.fogoPronto = true;
    }, undefined, () => { /* sem a textura o anel fica só na reserva fraca */ });
    const base = { ...compartilhados, uCenter: u.uCenter, uR: u.uR, uTime: u.uTime, uAnim: u.uAnim, uBrilho: u.uBrilho, uPulso: u.uPulso, uEspiral: u.uEspiral };

    // anel de fogo: um quadrado maior que a esfera; o shader desenha o anel, a fumaça, as línguas de fogo e a aura
    const quad = new THREE.PlaneGeometry(2, 2);
    this.plasma = materialAditivo({ vertexShader: VERT_QUAD, fragmentShader: FRAG_PLASMA, uniforms: { ...base, uQuad: { value: 2.9 }, uAudio: u.uAudio, uQuadro: u.uQuadro, uPronto: u.uPronto, uFogo: u.uFogo } });
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
    // a fumaça corre na velocidade do GIF (15 quadros por segundo na folha) e acelera um pouco com a fala
    this.quadro += dt * 15 * Math.min(1.6, 0.85 + 0.15 * e.rapidez + deforma * 0.8);
    const t = this.tempo;
    this.cy = PALMA.y + Math.sin(t * 0.95) * 4 + Math.sin(t * 0.33 + 1.3) * 1.6;
    this.cx = PALMA.x + Math.sin(t * 0.6) * 1.2;
    const u = this.uniforms;
    u.uCenter.value.set(this.cx, this.cy);
    u.uTime.value = t; u.uAnim.value = this.anim; u.uQuadro.value = this.quadro;
    u.uPronto.value = this.fogoPronto ? Math.min(1, u.uPronto.value + dt * 1.6) : 0;
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
