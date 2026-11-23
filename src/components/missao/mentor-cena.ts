/**
 * Cena 3D do Mentor APROVUM: caveira tridimensional em uma órbita de energia (anéis, partículas, nós luminosos).
 * Three.js puro (sem R3F/drei): uma só dependência, limpeza completa no destruir() e fácil de testar fora do React.
 *
 * - A caveira é GERADA POR GEOMETRIA (esfera esculpida por deslocamento de vértices + mandíbula e dentes). É uma
 *   representação provisória: se existir um modelo em /models/mentor-caveira.glb, a página o informa em `modeloUrl`
 *   e ele substitui a geometria procedural (carregamento assíncrono; falhou = continua com a procedural).
 * - Qualidade por dispositivo (alta/média/baixa), degradação automática se os quadros ficarem lentos,
 *   pausa quando a aba some ou o canvas sai da tela e respeito a prefers-reduced-motion (quadro estático).
 */
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

export type Qualidade = "alta" | "media" | "baixa";

export interface CenaOpcoes {
  canvas: HTMLCanvasElement;
  qualidade?: Qualidade;
  movimentoReduzido?: boolean;
  /** Modelo GLB/GLTF opcional do Mentor (substitui a caveira procedural). */
  modeloUrl?: string | null;
  /** Oculta a caveira: o Mentor é desenhado por cima (esfera de vidro líquido) e a cena fica só com órbita, nós e partículas. */
  semMentor?: boolean;
}

export interface Cena {
  redimensionar(): void;
  /** Pixels CSS por unidade do mundo no centro da cena (para alinhar o Mentor desenhado por cima). */
  pxPorUnidade(): number;
  /** 0 = repouso, 1 = intensidade máxima (escolha confirmada). Suaviza sozinho. */
  energia(v: number): void;
  pausar(): void;
  retomar(): void;
  destruir(): void;
}

const VERMELHO = 0xd71920;
const LUMINOSO = 0xff252d;

export function detectarQualidade(): Qualidade {
  const n = navigator as Navigator & { deviceMemory?: number };
  const fraco = (n.hardwareConcurrency ?? 4) <= 4 || (n.deviceMemory ?? 4) <= 3;
  const toque = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  if (toque && fraco) return "baixa";
  if (toque || fraco) return "media";
  return "alta";
}

const suave = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const gauss = (x: number, c: number, s: number) => Math.exp(-(((x - c) / s) ** 2));

/** Ruído barato e determinístico (sem Math.random): dá grão ao osso e variação à cor. */
function ruido(x: number, y: number, z: number): number {
  return Math.sin(x * 9.3 + y * 6.1 + z * 4.7) * 0.6 + Math.sin(x * 15.7 - y * 12.3 + z * 9.1) * 0.4;
}

/** Crânio e face: uma esfera de alta resolução esculpida (afunilamento, órbitas, nariz, supercílio, maçãs do rosto). */
function criarCranio(seg: number): THREE.BufferGeometry {
  const base = new THREE.SphereGeometry(1, seg, Math.round(seg * 0.75));
  base.deleteAttribute("uv");
  const g = mergeVertices(base, 1e-4);
  base.dispose();
  const pos = g.attributes.position as THREE.BufferAttribute;
  const cores = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const ux = pos.getX(i), uy = pos.getY(i), uz = pos.getZ(i);
    // forma base: mais alto que largo, profundo
    let x = ux * 0.84, y = uy * 0.98, z = uz * 1.04;
    // topo levemente achatado e calota mais larga (menos "ovo", mais crânio)
    y *= 1 - 0.07 * suave(0.75, 1, uy);
    x *= 1 + 0.07 * gauss(uy, 0.3, 0.35);
    // face afunila abaixo da linha dos olhos e avança; a base do crânio recua
    const t = suave(0.1, -0.95, uy);
    x *= 1 - 0.4 * t;
    if (uz > 0) z += 0.1 * t * uz;
    else z *= 1 - 0.14 * suave(-0.4, -1, uy);
    // temporais: leve concavidade nas laterais
    x -= Math.sign(ux) * 0.045 * suave(0.6, 0.92, Math.abs(ux)) * gauss(uy, 0.05, 0.3) * (uz > -0.2 ? 1 : 0);
    let escuro = 0;
    if (z > 0.15) {
      // órbitas dos olhos (côncavas) com borda levemente elevada
      for (const s of [-1, 1]) {
        const d = Math.hypot((x - s * 0.3) / 0.2, (y + 0.08) / 0.185);
        const k = suave(1, 0.55, d); // paredes firmes e fundo plano (buraco, não funil)
        z -= 0.42 * k;
        x += (s * 0.3 - x) * 0.1 * k;
        escuro = Math.max(escuro, k);
        z += 0.04 * gauss(d, 1.15, 0.16);
      }
      // cavidade nasal (em gota, mais larga embaixo)
      const ny = (y + 0.4) / 0.15;
      const nx = x / (0.06 + 0.05 * suave(-1, 1, -ny));
      const dn = Math.hypot(nx, ny);
      const kn = suave(1, 0.5, dn);
      z -= 0.34 * kn;
      escuro = Math.max(escuro, kn);
      // maxila: frente mais plana abaixo do nariz
      if (y < -0.5) z += (0.8 - z) * 0.25 * suave(-0.5, -0.7, y);
      // supercílio, ponte do nariz e maçãs do rosto
      z += 0.075 * gauss(y, 0.15, 0.06) * suave(0.62, 0.25, Math.abs(x));
      z += 0.045 * gauss(x, 0, 0.05) * suave(0.05, -0.2, y) * suave(-0.34, -0.1, y);
      for (const s of [-1, 1]) {
        const dc = Math.hypot(x - s * 0.5, (y + 0.3) / 0.8);
        z += 0.085 * gauss(dc, 0, 0.17);
        x += s * 0.05 * gauss(dc, 0, 0.17);
      }
    }
    // suturas: sulco sagital (meio do crânio) e coronal (de orelha a orelha), finos e discretos
    const sut = Math.max(gauss(ux, 0, 0.035) * suave(0.1, 0.4, uy) * (uz > -0.6 ? 1 : 0.6), gauss(uz, 0.1, 0.035) * suave(0.25, 0.55, uy));
    const af = 1 - 0.007 * sut;
    x *= af; y *= af; z *= af;
    escuro = Math.max(escuro, 0.22 * sut);
    // grão do osso (micro-relevo que vira brilho no metal)
    const r = ruido(ux, uy, uz);
    const k = 1 + 0.003 * r;
    x *= k; y *= k; z *= k;
    pos.setXYZ(i, x, y, z);
    const tom = (0.085 + 0.022 * r + 0.015 * suave(0.4, 1, uy)) * (1 - 0.97 * Math.pow(escuro, 0.4));
    cores[i * 3] = tom; cores[i * 3 + 1] = tom; cores[i * 3 + 2] = tom * 1.04;
  }
  g.setAttribute("color", new THREE.BufferAttribute(cores, 3));
  g.computeVertexNormals();
  return g;
}

/** Mandíbula (ferradura extrudada + ramos laterais) e dentes. Tudo em geometria, sem textura. */
function criarMandibulaEDentes(mat: THREE.Material, matDente: THREE.Material, qual: Qualidade): THREE.Group {
  const grupo = new THREE.Group();
  const forma = new THREE.Shape();
  forma.absellipse(0, 0.1, 0.37, 0.66, 0, Math.PI, false);
  forma.lineTo(-0.37, 0.1);
  forma.closePath();
  const placa = new THREE.ExtrudeGeometry(forma, { depth: 0.1, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: qual === "baixa" ? 2 : 5, curveSegments: qual === "baixa" ? 18 : 48 });
  placa.rotateX(Math.PI / 2); // (x, y, profundidade) -> (x, -profundidade, y): a frente da forma vira +z
  const jaw = new THREE.Mesh(placa, mat);
  jaw.position.set(0, -0.74, 0);
  grupo.add(jaw);
  // dentes: fileira superior (sob a maxila) e inferior (sobre a mandíbula)
  const dente = new THREE.BoxGeometry(0.07, 0.16, 0.06, 1, 1, 1);
  const n = 9;
  for (const [yBase, recuo, alt] of [[-0.6, 0, 1], [-0.7, 0.02, 0.9]] as const) {
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1;
      const m = new THREE.Mesh(dente, matDente);
      m.scale.set(1, alt, 1);
      m.position.set(u * 0.27, yBase, 0.8 - recuo - 0.2 * u * u);
      m.rotation.y = -u * 0.55;
      grupo.add(m);
    }
  }
  return grupo;
}

function criarCaveira(qual: Qualidade) {
  const seg = qual === "alta" ? 140 : qual === "media" ? 100 : 72;
  const osso = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, vertexColors: true, roughness: 0.46, metalness: 0.38, clearcoat: 0.4, clearcoatRoughness: 0.4, envMapIntensity: 0.5,
  });
  const dente = new THREE.MeshPhysicalMaterial({ color: 0x2c2c30, roughness: 0.45, metalness: 0.3, clearcoat: 0.35, envMapIntensity: 0.5 });
  const grupo = new THREE.Group();
  const cranio = new THREE.Mesh(criarCranio(seg), osso);
  grupo.add(cranio);
  grupo.add(criarMandibulaEDentes(new THREE.MeshPhysicalMaterial({ color: 0x121214, roughness: 0.46, metalness: 0.38, clearcoat: 0.4, envMapIntensity: 0.5 }), dente, qual));
  return grupo;
}

function texturaBrilho(): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,37,45,0.85)");
  g.addColorStop(0.35, "rgba(215,25,32,0.35)");
  g.addColorStop(1, "rgba(215,25,32,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const VERT_PART = /* glsl */ `
  attribute vec4 aOrb;   // raio, ângulo inicial, velocidade, altura
  attribute vec2 aVar;   // tamanho, semente
  uniform float uTime;
  uniform float uEscala;
  uniform float uEnergia;
  varying float vA;
  varying float vB;
  void main() {
    float ang = aOrb.y + uTime * aOrb.z * (1.0 + 1.2 * uEnergia);
    float r = aOrb.x;
    vec3 p = vec3(cos(ang) * r, aOrb.w + sin(uTime * 0.7 + aVar.y * 6.2831) * 0.06, sin(ang) * r);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float tw = 0.55 + 0.45 * sin(uTime * 2.1 + aVar.y * 40.0);
    gl_PointSize = max(1.0, aVar.x * uEscala * (1.0 + 0.6 * uEnergia) * (0.7 + 0.5 * tw) / -mv.z);
    vA = tw;
    vB = step(0.84, fract(aVar.y * 7.13));
  }
`;
const FRAG_PART = /* glsl */ `
  varying float vA;
  varying float vB;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    vec3 col = mix(vec3(1.0, 0.145, 0.176), vec3(1.0, 0.93, 0.9), vB);
    gl_FragColor = vec4(col, a * (0.35 + 0.65 * vA));
  }
`;
const VERT_TRILHA = /* glsl */ `
  attribute float aAlfa;
  uniform float uEscala;
  varying float vAlfa;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = max(1.0, (0.012 + 0.07 * aAlfa) * uEscala / -mv.z);
    vAlfa = aAlfa;
  }
`;
const FRAG_TRILHA = /* glsl */ `
  varying float vAlfa;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    vec3 col = mix(vec3(0.84, 0.1, 0.12), vec3(1.0, 0.6, 0.55), vAlfa * vAlfa);
    gl_FragColor = vec4(col, a * vAlfa);
  }
`;

interface AneIC { r: number; esp: number; inc: [number, number, number]; vel: number; arco: number; op: number; marcas: number }
const ANEIS: AneIC[] = [
  { r: 1.62, esp: 0.011, inc: [1.2, 0.15, 0.0], vel: 0.24, arco: Math.PI * 2, op: 0.5, marcas: 0 },
  { r: 1.98, esp: 0.007, inc: [-0.55, 0.0, 0.7], vel: -0.17, arco: Math.PI * 1.45, op: 0.9, marcas: 72 },
  { r: 2.36, esp: 0.01, inc: [0.4, 0.35, -0.95], vel: 0.11, arco: Math.PI * 1.8, op: 0.6, marcas: 0 },
  { r: 2.8, esp: 0.005, inc: [1.42, 0.0, 0.25], vel: -0.07, arco: Math.PI * 2, op: 0.45, marcas: 120 },
];

export function criarCena(opcoes: CenaOpcoes): Cena | null {
  const { canvas } = opcoes;
  let qual = opcoes.qualidade ?? detectarQualidade();
  const reduzido = !!opcoes.movimentoReduzido;

  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: qual !== "baixa", alpha: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;

  const cena = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);

  // iluminação: reflexos suaves de estúdio + luz vermelha lateral + toque de luz branca para revelar os detalhes
  const pmrem = new THREE.PMREMGenerator(renderer);
  const ambienteRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
  cena.environment = ambienteRT.texture;
  cena.environmentIntensity = 0.2;
  pmrem.dispose();
  const chave = new THREE.DirectionalLight(0xfff1ea, 0.85);
  chave.position.set(-2.2, 3.2, 4.5);
  const luzVermEsq = new THREE.PointLight(LUMINOSO, 70, 14, 1.6);
  luzVermEsq.position.set(-3.2, 0.4, 1.6);
  const luzVermDir = new THREE.PointLight(VERMELHO, 46, 14, 1.6);
  luzVermDir.position.set(3.2, -0.6, -0.6);
  const contra = new THREE.PointLight(0xffffff, 5, 10, 1.8);
  contra.position.set(0, 1.2, -3.5);
  cena.add(chave, luzVermEsq, luzVermDir, contra, new THREE.AmbientLight(0xffffff, 0.04));

  // caveira (substituível por GLB)
  const mentor = new THREE.Group();
  let caveira: THREE.Object3D = criarCaveira(qual);
  mentor.add(caveira);
  mentor.scale.setScalar(1.3);
  mentor.visible = !opcoes.semMentor;
  cena.add(mentor);

  // brilho de fundo (halo vermelho atrás da caveira)
  const texBrilho = texturaBrilho();
  const brilho = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrilho, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  brilho.scale.set(6.4, 6.4, 1);
  brilho.position.set(0, 0.05, -1.4);
  cena.add(brilho);

  // anéis orbitais
  const orbita = new THREE.Group();
  cena.add(orbita);
  const matAnel: THREE.MeshBasicMaterial[] = [];
  const girantes: Array<{ obj: THREE.Object3D; vel: number }> = [];
  const nos: Array<{ pai: THREE.Object3D; r: number; vel: number; fase: number; ponto: THREE.Mesh; trilha: THREE.Points; pos: Float32Array; alfa: Float32Array }> = [];
  const TRILHA = qual === "baixa" ? 10 : 18;
  const uTrilha = { uEscala: { value: 400 } };
  const geoms: THREE.BufferGeometry[] = [];
  const mats: THREE.Material[] = [];
  ANEIS.forEach((a, idx) => {
    const g = new THREE.Group();
    g.rotation.set(a.inc[0], a.inc[1], a.inc[2]);
    const torus = new THREE.TorusGeometry(a.r, a.esp, 6, qual === "baixa" ? 120 : 220, a.arco);
    const m = new THREE.MeshBasicMaterial({ color: idx % 2 ? LUMINOSO : VERMELHO, transparent: true, opacity: a.op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const malha = new THREE.Mesh(torus, m);
    geoms.push(torus); mats.push(m); matAnel.push(m);
    g.add(malha);
    girantes.push({ obj: malha, vel: a.vel });
    if (a.marcas && qual !== "baixa") {
      // marcas de régua ao longo do anel (instanciadas: 1 chamada de desenho)
      const caixa = new THREE.BoxGeometry(0.012, 0.075, 0.012);
      const mm = new THREE.MeshBasicMaterial({ color: 0xf5f5f5, transparent: true, opacity: 0.35, depthWrite: false, toneMapped: false });
      const inst = new THREE.InstancedMesh(caixa, mm, a.marcas);
      const tmp = new THREE.Object3D();
      for (let i = 0; i < a.marcas; i++) {
        const ang = (i / a.marcas) * Math.PI * 2;
        tmp.position.set(Math.cos(ang) * a.r, Math.sin(ang) * a.r, 0);
        tmp.rotation.set(0, 0, ang);
        tmp.scale.set(1, i % 6 === 0 ? 1.8 : 1, 1);
        tmp.updateMatrix();
        inst.setMatrixAt(i, tmp.matrix);
      }
      geoms.push(caixa); mats.push(mm);
      const par = new THREE.Group();
      par.add(inst);
      g.add(par);
      girantes.push({ obj: par, vel: a.vel * 0.6 });
    }
    // nó de energia com trilha luminosa
    if (idx !== 3 || qual === "alta") {
      const sg = new THREE.SphereGeometry(0.045, 14, 10);
      const sm = new THREE.MeshBasicMaterial({ color: 0xffd9d6, toneMapped: false });
      const ponto = new THREE.Mesh(sg, sm);
      const pos = new Float32Array(TRILHA * 3);
      const alfa = new Float32Array(TRILHA);
      for (let k = 0; k < TRILHA; k++) alfa[k] = 1 - k / TRILHA;
      const tg = new THREE.BufferGeometry();
      tg.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      tg.setAttribute("aAlfa", new THREE.BufferAttribute(alfa, 1));
      const tm = new THREE.ShaderMaterial({ vertexShader: VERT_TRILHA, fragmentShader: FRAG_TRILHA, uniforms: uTrilha, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
      const trilha = new THREE.Points(tg, tm);
      trilha.frustumCulled = false;
      g.add(ponto, trilha);
      geoms.push(sg, tg); mats.push(sm, tm);
      nos.push({ pai: g, r: a.r, vel: (idx % 2 ? -1 : 1) * (0.5 + idx * 0.13), fase: idx * 1.9, ponto, trilha, pos, alfa });
    }
    orbita.add(g);
  });

  // partículas orbitais (animadas na GPU)
  const nPart = qual === "alta" ? 1100 : qual === "media" ? 560 : 220;
  const partGeo = new THREE.BufferGeometry();
  const aOrb = new Float32Array(nPart * 4);
  const aVar = new Float32Array(nPart * 2);
  const posFalsa = new Float32Array(nPart * 3);
  let semente = 7;
  const alea = () => ((semente = (semente * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < nPart; i++) {
    const r = 1.5 + Math.pow(alea(), 1.4) * 2.9;
    aOrb[i * 4] = r;
    aOrb[i * 4 + 1] = alea() * Math.PI * 2;
    aOrb[i * 4 + 2] = (0.05 + alea() * 0.16) * (alea() > 0.5 ? 1 : -1) / Math.sqrt(r);
    aOrb[i * 4 + 3] = (alea() - 0.5) * 0.7 * (0.4 + r * 0.25);
    aVar[i * 2] = 0.03 + alea() * 0.06;
    aVar[i * 2 + 1] = alea();
  }
  partGeo.setAttribute("position", new THREE.BufferAttribute(posFalsa, 3));
  partGeo.setAttribute("aOrb", new THREE.BufferAttribute(aOrb, 4));
  partGeo.setAttribute("aVar", new THREE.BufferAttribute(aVar, 2));
  const uPart = { uTime: { value: 0 }, uEscala: { value: 400 }, uEnergia: { value: 0 } };
  const partMat = new THREE.ShaderMaterial({ vertexShader: VERT_PART, fragmentShader: FRAG_PART, uniforms: uPart, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const particulas = new THREE.Points(partGeo, partMat);
  particulas.frustumCulled = false;
  particulas.rotation.set(0.42, 0, -0.14);
  orbita.add(particulas);
  geoms.push(partGeo); mats.push(partMat);

  // pós-processamento (brilho) só em dispositivos capazes
  let composer: EffectComposer | null = null;
  let bloom: UnrealBloomPass | null = null;
  const montarComposer = () => {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(cena, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.4, 0.55, 0.42);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
  };
  if (qual !== "baixa") montarComposer();

  // estado
  let largura = 1, altura = 1;
  let energiaAlvo = 0, energia = 0;
  let rodando = false, destruida = false, quadro = 0;
  const relogio = new THREE.Clock();
  let t = 1.7; // pose do quadro estático (movimento reduzido)
  const alvoPonteiro = { x: 0, y: 0 };
  const ponteiro = { x: 0, y: 0 };

  const aplicarPixelRatio = () => {
    const teto = qual === "alta" ? 2 : qual === "media" ? 1.5 : 1;
    const pr = Math.min(window.devicePixelRatio || 1, teto);
    renderer.setPixelRatio(pr);
    composer?.setPixelRatio(pr);
  };

  let pxUnidade = 100;
  const redimensionar = () => {
    if (destruida) return;
    const r = canvas.parentElement?.getBoundingClientRect() ?? canvas.getBoundingClientRect();
    largura = Math.max(1, Math.round(r.width));
    altura = Math.max(1, Math.round(r.height));
    aplicarPixelRatio();
    renderer.setSize(largura, altura, false);
    composer?.setSize(largura, altura);
    camera.aspect = largura / altura;
    // enquadra a órbita inteira, inclusive em telas estreitas (retrato)
    const meia = Math.tan((camera.fov * Math.PI) / 360);
    const folga = camera.aspect < 1.2 ? 2.7 : 3.1;
    const dist = Math.max(2.5 / meia, folga / (meia * camera.aspect));
    pxUnidade = altura / (2 * dist * meia);
    camera.position.set(0, 0.05, dist);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    const escala = (altura * renderer.getPixelRatio()) / 2;
    uPart.uEscala.value = escala;
    uTrilha.uEscala.value = escala;
    render();
  };

  const desenhar = () => {
    if (composer) composer.render();
    else renderer.render(cena, camera);
  };

  const atualizar = (dt: number) => {
    t += dt;
    energia += (energiaAlvo - energia) * Math.min(1, dt * 2.4);
    ponteiro.x += (alvoPonteiro.x - ponteiro.x) * Math.min(1, dt * 3);
    ponteiro.y += (alvoPonteiro.y - ponteiro.y) * Math.min(1, dt * 3);
    // caveira: flutua, gira de leve e se inclina; fica estável como elemento central
    mentor.position.y = Math.sin(t * 0.8) * 0.07;
    mentor.rotation.y = Math.sin(t * 0.33) * 0.32 + ponteiro.x * 0.28;
    mentor.rotation.x = Math.sin(t * 0.47) * 0.05 + ponteiro.y * 0.16 - 0.02;
    mentor.rotation.z = Math.sin(t * 0.29) * 0.025;
    const rot = 1 + 1.6 * energia;
    for (const g of girantes) g.obj.rotation.z += g.vel * dt * rot;
    orbita.rotation.y = Math.sin(t * 0.12) * 0.25 + ponteiro.x * 0.12;
    orbita.rotation.x = ponteiro.y * 0.08;
    uPart.uTime.value = t;
    uPart.uEnergia.value = energia;
    // nós de energia e suas trilhas (no referencial do anel)
    for (const n of nos) {
      const a0 = n.fase + t * n.vel * rot;
      for (let k = 0; k < TRILHA; k++) {
        const a = a0 - k * 0.055 * Math.sign(n.vel);
        n.pos[k * 3] = Math.cos(a) * n.r;
        n.pos[k * 3 + 1] = Math.sin(a) * n.r;
        n.pos[k * 3 + 2] = 0;
      }
      (n.trilha.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      n.ponto.position.set(n.pos[0]!, n.pos[1]!, 0);
    }
    // intensidade luminosa
    const pulso = 0.5 + 0.5 * Math.sin(t * 1.3);
    luzVermEsq.intensity = 62 + 14 * pulso + 120 * energia;
    luzVermDir.intensity = 40 + 8 * pulso + 80 * energia;
    brilho.material.opacity = 0.26 + 0.08 * pulso + 0.38 * energia;
    brilho.scale.setScalar(6.2 + 0.3 * pulso + 1.2 * energia);
    matAnel.forEach((m, i) => { m.opacity = Math.min(1, ANEIS[i]!.op * (1 + 0.8 * energia)); });
    if (bloom) bloom.strength = 0.4 + 0.5 * energia;
  };

  let acumulado = 0, contados = 0;
  const tick = () => {
    if (!rodando || destruida) return;
    const dt = Math.min(0.05, relogio.getDelta());
    atualizar(dt);
    desenhar();
    // degradação automática: se a média dos quadros ficar lenta, reduz resolução e desliga o brilho
    if (qual !== "baixa" && ++quadro > 40) {
      acumulado += dt; contados++;
      if (contados === 90) {
        if (acumulado / contados > 0.034) {
          qual = qual === "alta" ? "media" : "baixa";
          aplicarPixelRatio();
          renderer.setSize(largura, altura, false);
          if (qual === "baixa") { composer?.dispose(); composer = null; bloom = null; }
          else if (bloom) bloom.strength = 0.4;
          particulas.geometry.setDrawRange(0, Math.floor(nPart * 0.5));
        }
        acumulado = 0; contados = 0;
      }
    }
  };

  const render = () => {
    if (destruida) return;
    if (reduzido || !rodando) { atualizar(0); desenhar(); }
  };

  const mover = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    alvoPonteiro.x = (e.clientX / window.innerWidth) * 2 - 1;
    alvoPonteiro.y = (e.clientY / window.innerHeight) * 2 - 1;
  };
  if (!reduzido) window.addEventListener("pointermove", mover, { passive: true });

  // modelo GLB opcional
  if (opcoes.modeloUrl && !opcoes.semMentor) {
    new GLTFLoader().load(
      opcoes.modeloUrl,
      (gltf) => {
        if (destruida) return;
        const caixa = new THREE.Box3().setFromObject(gltf.scene);
        const tam = caixa.getSize(new THREE.Vector3());
        const centro = caixa.getCenter(new THREE.Vector3());
        const k = 2.1 / Math.max(tam.y, 0.0001);
        gltf.scene.scale.setScalar(k);
        gltf.scene.position.set(-centro.x * k, -centro.y * k, -centro.z * k);
        const grupo = new THREE.Group();
        grupo.add(gltf.scene);
        mentor.remove(caveira);
        descartar(caveira);
        caveira = grupo;
        mentor.add(grupo);
        render();
      },
      undefined,
      () => { /* sem modelo: segue com a caveira procedural */ },
    );
  }

  function descartar(raiz: THREE.Object3D) {
    raiz.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mt = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mt)) mt.forEach((x) => x.dispose());
      else mt?.dispose();
    });
  }

  redimensionar();

  return {
    redimensionar,
    pxPorUnidade: () => pxUnidade,
    energia(v) { energiaAlvo = Math.min(1, Math.max(0, v)); if (reduzido || !rodando) { energia = energiaAlvo; render(); } },
    pausar() { rodando = false; renderer.setAnimationLoop(null); },
    retomar() {
      if (destruida || reduzido || rodando) return;
      rodando = true; relogio.getDelta();
      renderer.setAnimationLoop(tick);
    },
    destruir() {
      if (destruida) return;
      destruida = true; rodando = false;
      renderer.setAnimationLoop(null);
      window.removeEventListener("pointermove", mover);
      descartar(cena);
      geoms.forEach((g) => g.dispose());
      mats.forEach((m) => m.dispose());
      brilho.material.dispose();
      texBrilho.dispose();
      ambienteRT.dispose();
      composer?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
