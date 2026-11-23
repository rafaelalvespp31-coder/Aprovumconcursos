import * as THREE from "three";
import { RUIDO } from "./glsl";
import { materialAditivo } from "./mentor-orb-3d";
import { suavizarOlhos } from "./estado-mentor";

/** Centro de cada olho (pixels da arte 1086×732, y para baixo), medido no brilho das íris de `mentor-caveira.webp`. */
export const OLHOS = [
  { x: 656, y: 252.5, semente: 1.7 },
  { x: 771, y: 254, semente: 5.3 },
] as const;

const TAM = { w: 150, h: 130 } as const;

const VERT = /* glsl */ `
varying vec2 vUv; varying vec2 vP;
uniform vec2 uTam;
void main(){
  vUv = uv;
  vP = (uv - .5) * uTam; // pixels da arte a partir do centro do olho; y positivo = para baixo
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
}`;

/**
 * Brasa do olho: núcleo quente (vermelho profundo → laranja → amarelo no miolo) que respira devagar, um brilho suave
 * contido na órbita, línguas de chama bem baixas que sobem com ruído lento e poucas faíscas minúsculas. Tudo aditivo e
 * proporcional a `uAt`, então com `uAt = 0` não desenha nada e a arte original aparece intacta.
 */
const FRAG = /* glsl */ `
precision highp float;
${RUIDO}
varying vec2 vUv; varying vec2 vP;
uniform float uT, uAt, uSeed, uFixo;
vec3 fogo(float x){
  vec3 c = mix(vec3(.10, .0, .0), vec3(.82, .06, .02), smoothstep(.0, .35, x));
  c = mix(c, vec3(1., .36, .06), smoothstep(.3, .72, x));
  return mix(c, vec3(1., .74, .32), smoothstep(.78, 1.15, x));
}
void main(){
  float v = 1. - uFixo;           // 0 = movimento reduzido: brasa parada, sem chama nem faíscas
  float t = uT;
  float respira = .9 + .07 * sin(t * 1.9 + uSeed) + .1 * (noise(vec2(t * 1.1, uSeed * 3.)) - .5) * v;
  // íris: elipse achatada, com anel mais quente na borda
  vec2 q = vP / vec2(11., 7.5);
  float r = length(q);
  float nucleo = exp(-r * r * 2.1);
  float anel = exp(-pow((r - .8) * 2.3, 2.));
  // chama que se dissipa no ar: nasce da íris, sobe espalhando, vai se rasgando em fiapos e some aos poucos (nada de contorno)
  float h = max(0., -vP.y);
  float topo = clamp(h / 58., 0., 1.);
  float bal = sin(t * .7 + uSeed + h * .07) * 4. * topo * v;
  float px = vP.x - bal;
  float larg = mix(9., 21., topo);
  float lat = exp(-pow(px / larg, 2.));
  float nasce = smoothstep(-4., 8., -vP.y);
  float some = exp(-h / 19.) * (1. - smoothstep(34., 60., h));
  float w = fbm(vec2(px * .07, vP.y * .035 + t * .35 * v));
  float n = fbm(vec2(px * .1 + (w - .5) * 2.2 + uSeed, vP.y * .04 + t * .7 * v));
  float limite = mix(.2, .6, topo);
  float rasgo = smoothstep(limite, limite + .38, n * 1.1 + (1. - topo) * .1);
  float chama = lat * nasce * some * rasgo * v;
  // brilho na órbita (suave, contido)
  vec2 o = vP / vec2(26., 16.);
  float halo = exp(-dot(o, o) * 1.15);
  float at = uAt;
  // brasa: o calor varia pela superfície (manchas que esquentam e esfriam devagar), como carvão aceso
  float brasa = .72 + .55 * fbm(vP * .3 + vec2(uSeed, t * .3 * v));
  float e = at * (nucleo * 1.1 * brasa + anel * .5) * respira;
  // a chama usa só a parte vermelho-laranja da rampa (nunca amarela), bem transparente: lambe a órbita em vez de ser um desenho
  float ef = pow(at, 1.5) * chama * .7;
  vec3 col = fogo(e) * e + fogo(min(ef * 1.8, .5)) * ef + vec3(.85, .1, .03) * halo * at * .11 * respira;
  // faíscas minúsculas, só quando o olho já está bem aceso
  float acende = smoothstep(.5, .95, at) * v;
  for (int i = 0; i < 4; i++){
    float fi = float(i);
    float c = t * (.3 + fi * .05) + fi * .27 + uSeed;
    float life = fract(c), cyc = floor(c);
    float x = (hash11(cyc * 3.1 + fi * 11.7 + uSeed) - .5) * 22. + sin(life * 8. + fi * 2.) * 3.;
    float y = -4. - life * 40.;
    vec2 d = vP - vec2(x, y);
    col += vec3(1., .5, .14) * exp(-dot(d, d) / 1.2) * pow(1. - life, 1.6) * smoothstep(0., .12, life) * acende * .85;
  }
  // some nas bordas do quadro, sem corte
  vec2 b = abs(vUv * 2. - 1.);
  col *= (1. - smoothstep(.72, 1., b.x)) * (1. - smoothstep(.72, 1., b.y));
  gl_FragColor = vec4(col, 0.);
}`;

/** Olhos em brasa do Mentor: acendem enquanto ele fala e esfriam devagar quando termina. */
export class OlhosBrasa {
  readonly grupo = new THREE.Group();
  private mats: THREE.ShaderMaterial[] = [];
  private geo = new THREE.PlaneGeometry(TAM.w, TAM.h);
  private nivel = 0;

  constructor() {
    for (const o of OLHOS) {
      const m = materialAditivo({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uT: { value: 0 }, uAt: { value: 0 }, uSeed: { value: o.semente }, uFixo: { value: 0 }, uTam: { value: new THREE.Vector2(TAM.w, TAM.h) } },
      });
      const mesh = new THREE.Mesh(this.geo, m);
      mesh.position.set(o.x, o.y, 0);
      mesh.frustumCulled = false;
      mesh.visible = false;
      this.mats.push(m);
      this.grupo.add(mesh);
    }
  }

  /** `alvo` (0 a 1) é a intensidade pedida; `fixo` congela chama e faíscas (movimento reduzido) e liga direto. */
  atualizar(dt: number, alvo: number, tempo: number, fixo = false) {
    this.nivel = fixo ? alvo : suavizarOlhos(this.nivel, alvo, dt);
    const ligado = this.nivel > 0.004;
    this.grupo.children.forEach((c) => { c.visible = ligado; });
    if (!ligado) return;
    for (const m of this.mats) {
      m.uniforms.uT!.value = tempo;
      m.uniforms.uAt!.value = this.nivel;
      m.uniforms.uFixo!.value = fixo ? 1 : 0;
    }
  }

  liberar() { this.geo.dispose(); this.mats.forEach((m) => m.dispose()); }
}
