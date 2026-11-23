import * as THREE from "three";
import { OCLUSAO, RUIDO } from "./glsl";
import { materialAditivo, type UniformsComuns } from "./mentor-orb-3d";
import type { AlvoCena } from "./estado-mentor";
import type { Qualidade } from "./qualidade";

export const ARTE = { w: 1086, h: 732 } as const;

function aleatorio(semente: number) {
  let a = semente >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const VERT_BRASAS = /* glsl */ `
${RUIDO}
attribute vec4 aS; // x: semente, y: velocidade (ciclos/s), z: fase, w: tamanho
attribute float aH; // calor: 0 vermelho profundo, 1 laranja
uniform float uT, uW, uH, uPx, uTam, uBalanco;
uniform vec2 uOrb; uniform float uOrbR, uLuz;
varying float vA; varying vec3 vCor;
void main(){
  float c = aS.z + uT * aS.y; float cyc = floor(c); float life = fract(c);
  // cada ciclo nasce em outro ponto: nada se repete de forma evidente
  float rx = hash11(aS.x * 91.7 + cyc * 13.13);
  float x = rx * uW + sin(c * 6.2831 * (.6 + aS.w * .5) + aS.x * 20.) * uBalanco * (.4 + life) + sin(c * 17. + aS.x * 5.) * 3.;
  float y = uH * (1.08 - life * 1.22) + sin(c * 9. + aS.x * 7.) * 4.;
  float env = smoothstep(0., .1, life) * (1. - smoothstep(.5, 1., life));
  float pisca = .62 + .38 * sin(uT * (3. + aS.w * 5.) + aS.x * 50.) * sin(uT * 1.3 + aS.z * 9.);
  float d = length(vec2(x, y) - uOrb);
  float perto = exp(-pow(d / (uOrbR * 2.7), 2.));
  float lumin = env * pisca * (1. + uLuz * 2.2 * perto);
  gl_Position = projectionMatrix * viewMatrix * vec4(x, y, 0., 1.);
  gl_PointSize = max(1.6, aS.w * uTam * uPx * (.55 + .45 * env + perto * .4));
  vA = lumin;
  float calor = clamp(aH * (1. - life * .6) + perto * .35, 0., 1.);
  vCor = mix(vec3(.95, .07, .04), vec3(1., .42, .1), calor);
}`;

const FRAG_BRASAS = /* glsl */ `
precision highp float;
${OCLUSAO}
uniform float uMole, uOcc;
varying float vA; varying vec3 vCor;
void main(){
  vec2 c = gl_PointCoord - .5; float r2 = dot(c, c) * 4.;
  float a = (exp(-r2 * uMole) + .3 * exp(-r2 * 1.6)) * smoothstep(1., .55, r2);
  gl_FragColor = vec4(vCor * a * vA * (1. - ocluido(uOcc)), 0.);
}`;

/** Faíscas em primeiro plano: quadrados instanciados esticados na direção do movimento (rastro com desfoque). */
const VERT_FAISCAS = /* glsl */ `
attribute vec4 aA; // x0, y0 (em pixels), ângulo, velocidade (px/s)
attribute vec4 aB; // período, atraso, largura, duração
uniform float uT, uPx, uFreq;
varying vec2 vUv; varying float vA;
void main(){
  float periodo = aB.x / max(.4, uFreq);
  float c = (uT + aB.y) / periodo; float f = fract(c);
  float k = f * periodo / aB.w;
  float ativo = step(k, 1.);
  vec2 dir = vec2(cos(aA.z), -sin(aA.z));
  float avancou = aA.w * k * aB.w;
  float comp = aA.w * .075 * (1. - k * .55) + 8.;
  vec2 cabeca = vec2(aA.x, aA.y) + dir * avancou + vec2(sin(k * 9. + aB.y * 7.) * 7., 0.) * k;
  vec2 perp = vec2(-dir.y, dir.x);
  // x do quadrado: 0 = cauda, 1 = cabeça
  float u = position.x + .5;
  vec2 pos = cabeca - dir * comp * (1. - u) + perp * position.y * aB.z * 2.4;
  vUv = vec2(u, position.y * 2.);
  vA = ativo * pow(1. - clamp(k, 0., 1.), 1.25) * smoothstep(0., .07, k);
  gl_Position = projectionMatrix * viewMatrix * vec4(pos, 0., 1.);
}`;
const FRAG_FAISCAS = /* glsl */ `
precision highp float;
varying vec2 vUv; varying float vA;
void main(){
  float cauda = pow(vUv.x, 2.4);
  float lado = exp(-vUv.y * vUv.y * 5.5);
  float a = cauda * lado * vA;
  vec3 col = mix(vec3(1., .22, .08), vec3(1., .78, .5), pow(vUv.x, 6.));
  gl_FragColor = vec4(col * a * 1.6, 0.);
}`;

/** Fumaça: duas camadas de ruído rolando devagar numa textura pequena, iluminadas pela esfera. Fica atrás do personagem. */
const VERT_FUMACA = /* glsl */ `
varying vec2 vUv;
void main(){ vUv = position.xy * .5 + .5; gl_Position = vec4(position.xy, 0., 1.); }`;
const FRAG_FUMACA = /* glsl */ `
precision highp float;
${OCLUSAO}
uniform sampler2D uRuido;
uniform float uT, uLuz, uPisca;
uniform vec2 uOrb; uniform float uOrbR, uW, uH;
varying vec2 vUv;
void main(){
  vec2 uv = vUv;
  vec2 mundo = vec2(uv.x * uW, (1. - uv.y) * uH);
  float a1 = texture2D(uRuido, uv * vec2(1.7, 1.15) + vec2(uT * .006, -uT * .011)).r;
  float a2 = texture2D(uRuido, uv * vec2(3.1, 2.1) + vec2(-uT * .009, -uT * .016) + a1 * .08).g;
  float dens = smoothstep(.42, .9, a1 * .62 + a2 * .5);
  float vert = smoothstep(.0, .55, uv.y) * .75 + .25;
  dens *= vert * smoothstep(0., .14, uv.y) * smoothstep(1., .84, uv.y) * smoothstep(0., .1, uv.x) * smoothstep(1., .9, uv.x);
  float d = length(mundo - uOrb);
  float luz = exp(-d / (uOrbR * 2.4)) * uLuz * uPisca;
  float laranja = smoothstep(.2, .9, a2) * .5;
  vec3 lit = mix(vec3(1., .13, .06), vec3(1., .5, .16), laranja) * luz * dens * 1.05;
  float oc = 1. - ocluido(1.);
  // parte escura (absorve) + parte iluminada (soma)
  float escura = dens * .3;
  gl_FragColor = vec4((vec3(.02, .004, .004) * escura + lit) * oc, escura * oc);
}`;

function texturaRuido(tam = 128): THREE.DataTexture {
  const rnd = aleatorio(777);
  const g = 16; const grade = new Float32Array(g * g); for (let i = 0; i < grade.length; i++) grade[i] = rnd();
  const amostra = (x: number, y: number, per: number) => {
    const fx = x * per, fy = y * per; const x0 = Math.floor(fx), y0 = Math.floor(fy);
    const tx = fx - x0, ty = fy - y0; const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    // a malha repete a cada `per` células, então a textura inteira emenda sem costura
    const h = (ix: number, iy: number) => grade[((iy % per) + per) % per * g + ((ix % per) + per) % per]!;
    const a = h(x0, y0) + (h(x0 + 1, y0) - h(x0, y0)) * sx; const b = h(x0, y0 + 1) + (h(x0 + 1, y0 + 1) - h(x0, y0 + 1)) * sx;
    return a + (b - a) * sy;
  };
  const d = new Uint8Array(tam * tam * 4);
  for (let y = 0; y < tam; y++) for (let x = 0; x < tam; x++) {
    const u = x / tam, v = y / tam;
    const r = 0.55 * amostra(u, v, 4) + 0.3 * amostra(u, v, 8) + 0.15 * amostra(u, v, 16);
    const gch = 0.55 * amostra(u + .37, v + .11, 6) + 0.3 * amostra(u + .37, v + .11, 12) + 0.15 * amostra(u + .37, v + .11, 16);
    const i = (y * tam + x) * 4; d[i] = r * 255; d[i + 1] = gch * 255; d[i + 2] = 0; d[i + 3] = 255;
  }
  const t = new THREE.DataTexture(d, tam, tam, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
  return t;
}

export class EmberEnvironment {
  readonly atras = new THREE.Group();
  readonly frente = new THREE.Group();
  private ember = 0;
  private tempo = 0;
  private uT = { value: 0 };
  private uFreq = { value: 1 };
  private uLuzFumaca = { value: 1 };
  private uPisca = { value: 1 };
  private ruido: THREE.DataTexture;
  private camadas: THREE.Points[] = [];
  private faiscas: THREE.Mesh | null = null;
  private materiais: THREE.ShaderMaterial[] = [];

  constructor(q: Qualidade, comuns: UniformsComuns) {
    const rnd = aleatorio(4242);
    const compart = { uRes: comuns.uRes, uMatte: comuns.uMatte, uPx: comuns.uPx, uOrb: comuns.uOrb, uOrbR: comuns.uOrbR, uLuz: comuns.uLuz };
    this.ruido = texturaRuido();

    // SmokeParticles: fumaça volumétrica atrás da caveira
    if (q.fumaca) {
      const m = materialAditivo({ vertexShader: VERT_FUMACA, fragmentShader: FRAG_FUMACA, uniforms: { ...compart, uRuido: { value: this.ruido }, uT: this.uT, uLuz: this.uLuzFumaca, uPisca: this.uPisca, uW: { value: ARTE.w }, uH: { value: ARTE.h } } });
      const malha = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); malha.frustumCulled = false; malha.renderOrder = 1;
      this.atras.add(malha); this.materiais.push(m);
    }

    const criarBrasas = (n: number, vel: [number, number], tam: [number, number], macia: number, balanco: number, ordem: number, tamMul = 1) => {
      const pos = new Float32Array(n * 3); const s = new Float32Array(n * 4); const h = new Float32Array(n);
      for (let i = 0; i < n; i++) { s[i * 4] = rnd(); s[i * 4 + 1] = vel[0] + rnd() * (vel[1] - vel[0]); s[i * 4 + 2] = rnd(); s[i * 4 + 3] = tam[0] + Math.pow(rnd(), 2) * (tam[1] - tam[0]); h[i] = rnd(); }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("aS", new THREE.BufferAttribute(s, 4)); g.setAttribute("aH", new THREE.BufferAttribute(h, 1));
      const mat = materialAditivo({ vertexShader: VERT_BRASAS, fragmentShader: FRAG_BRASAS, uniforms: { ...compart, uT: this.uT, uW: { value: ARTE.w }, uH: { value: ARTE.h }, uTam: { value: tamMul }, uBalanco: { value: balanco }, uMole: { value: macia }, uOcc: { value: 1 } } });
      const p = new THREE.Points(g, mat); p.frustumCulled = false; p.renderOrder = ordem;
      this.atras.add(p); this.camadas.push(p); this.materiais.push(mat);
      return p;
    };
    // PLANO TRASEIRO: brasas pequenas, desfocadas e distantes; INTERMEDIÁRIO: nítidas e lentas; GRANDES: acendem, vagam e apagam
    criarBrasas(q.brasasFundo, [0.016, 0.034], [3.5, 7], 2.2, 22, 2);
    criarBrasas(q.brasasMeio, [0.026, 0.055], [2.2, 4.6], 6.5, 14, 3);
    criarBrasas(q.brasasGrandes, [0.006, 0.012], [14, 24], 2.6, 36, 4);

    // ForegroundSparks: poucas faíscas com rastro, em grupos, atravessando a frente da cena
    const n = q.faiscas;
    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([-.5, -.5, 0, .5, -.5, 0, .5, .5, 0, -.5, .5, 0]), 3));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    const A = new Float32Array(n * 4); const B = new Float32Array(n * 4);
    let gx = 0, gy = 0, gt = 0, ga = 0, gper = 0;
    for (let i = 0; i < n; i++) {
      if (i % 5 === 0) { gx = rnd() * ARTE.w; gy = ARTE.h * (0.45 + rnd() * 0.6); gt = rnd() * 9; ga = (0.55 + rnd() * 0.5); gper = 4 + rnd() * 5; }
      A[i * 4] = gx + (rnd() - 0.5) * 40; A[i * 4 + 1] = gy + (rnd() - 0.5) * 30; A[i * 4 + 2] = ga + (rnd() - 0.5) * 0.35; A[i * 4 + 3] = 380 + rnd() * 520;
      B[i * 4] = gper; B[i * 4 + 1] = gt + rnd() * 0.18; B[i * 4 + 2] = 1.1 + Math.pow(rnd(), 2) * 2.3; B[i * 4 + 3] = 0.7 + rnd() * 0.7;
    }
    geo.setAttribute("aA", new THREE.InstancedBufferAttribute(A, 4)); geo.setAttribute("aB", new THREE.InstancedBufferAttribute(B, 4));
    geo.instanceCount = n;
    const fm = materialAditivo({ vertexShader: VERT_FAISCAS, fragmentShader: FRAG_FAISCAS, uniforms: { uT: this.uT, uPx: comuns.uPx, uFreq: this.uFreq } });
    fm.side = THREE.DoubleSide;
    this.faiscas = new THREE.Mesh(geo, fm); this.faiscas.frustumCulled = false; this.faiscas.renderOrder = 20;
    this.frente.add(this.faiscas); this.materiais.push(fm);
  }

  /** EmberAnimationController */
  atualizar(dt: number, e: AlvoCena, tempoTotal: number) {
    this.tempo += dt;
    this.ember += dt * (0.75 + e.brasas * 0.25);
    this.uT.value = this.ember;
    this.uFreq.value = e.faiscas;
    // a fumaça recebe luz dinâmica: pisca mais rápido enquanto o Mentor pensa
    const rapido = Math.min(1, Math.max(0, (e.faiscas - 1.2) / 2));
    this.uLuzFumaca.value = (0.8 + e.luz * 0.7);
    this.uPisca.value = 0.9 + 0.1 * Math.sin(tempoTotal * (1.6 + rapido * 7)) + 0.06 * Math.sin(tempoTotal * 0.7);
  }

  liberar() {
    this.ruido.dispose();
    for (const m of this.materiais) m.dispose();
    for (const p of this.camadas) p.geometry.dispose();
    this.faiscas?.geometry.dispose();
  }
}
