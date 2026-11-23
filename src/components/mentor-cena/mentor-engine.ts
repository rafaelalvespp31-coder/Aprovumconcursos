import * as THREE from "three";
import type { RefObject } from "react";
import type { Bands } from "@/components/mentor/skull-orb-fx";
import type { FaseMentor } from "@/components/missao/falar-mentor";
import { alvoDaFase, escalaDaVoz, REPOUSO, suavizar, suavizarAudio, type AlvoCena } from "./estado-mentor";
import { lerAparelho, nivelAbaixo, nivelInicial, qualidadeDe } from "./qualidade";
import { MentorOrb3D, type UniformsComuns } from "./mentor-orb-3d";
import { ARTE, EmberEnvironment } from "./ember-environment";

export interface OpcoesMotor {
  fonte: RefObject<(() => Bands) | null>;
  reduzirMovimento: boolean;
  matteUrl: string;
  aoFalha: () => void;
  aoPronto: () => void;
}

export interface MotorCena {
  definirFase(f: FaseMentor): void;
  pausar(p: boolean): void;
  liberar(): void;
  /** só para testes e depuração */
  info(): { nivel: string; dpr: number; quadros: number; msMedio: number };
}

/** MentorScene (motor): orquestra o Orb, as brasas, a fumaça, as faíscas, a luz e o estado real do Mentor num único canvas WebGL transparente. */
export function criarMotor(canvas: HTMLCanvasElement, op: OpcoesMotor): MotorCena {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "default", stencil: false, depth: false });
  } catch (e) {
    op.aoFalha();
    throw e;
  }
  renderer.setClearColor(0x000000, 0);
  const aparelho = lerAparelho();
  let nivel = nivelInicial(aparelho);
  const q = qualidadeDe(nivel);
  let dprAtual = Math.min(window.devicePixelRatio || 1, q.dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, ARTE.w, 0, ARTE.h, -10, 10);

  const branco = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, THREE.RGBAFormat); branco.needsUpdate = true;
  const comuns: UniformsComuns = {
    uRes: { value: new THREE.Vector2(1, 1) },
    uMatte: { value: branco },
    uOrb: { value: new THREE.Vector2(0, 0) },
    uOrbR: { value: 160 },
    uLuz: { value: 1 },
    uPx: { value: dprAtual },
  };
  let matte: THREE.Texture | null = null;
  new THREE.TextureLoader().load(op.matteUrl, (t) => { t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; t.colorSpace = THREE.NoColorSpace; matte = t; comuns.uMatte.value = t; quadroFixo(); }, undefined, () => { /* sem recorte: só não há oclusão */ });

  const brasas = new EmberEnvironment(q, comuns);
  const orb = new MentorOrb3D(q, comuns);
  scene.add(brasas.atras, orb.grupo, brasas.frente);

  let fase: FaseMentor = "repouso";
  let atual: AlvoCena = { ...REPOUSO };
  let audio = 0;
  let fala = 0;
  let pausado = false;
  let visivel = true;
  let raf = 0;
  let ultimo = 0;
  let tempo = 0;
  let quadros = 0;
  let somaMs = 0;
  let janelaMs = 0;
  let janelaN = 0;
  let reducoes = 0;
  let pronto = false;

  const tamanho = () => {
    const w = Math.max(2, canvas.clientWidth), h = Math.max(2, canvas.clientHeight);
    renderer.setPixelRatio(dprAtual);
    renderer.setSize(w, h, false);
    const v = new THREE.Vector2(); renderer.getDrawingBufferSize(v);
    comuns.uRes.value.copy(v);
    comuns.uPx.value = v.x / ARTE.w; // pixels do dispositivo por pixel da arte
  };
  tamanho();
  const ro = new ResizeObserver(() => { tamanho(); quadroFixo(); });
  ro.observe(canvas);

  const lerAudio = (dt: number) => {
    const b = op.fonte.current?.();
    const alvo = b ? Math.min(1, Math.max(b.vol ?? 0, b.me ?? 0)) : 0;
    audio = suavizarAudio(audio, alvo, dt);
    fala += ((fase === "respondendo" ? 1 : 0) - fala) * (1 - Math.exp(-dt * 5));
  };

  const passo = (dt: number) => {
    tempo += dt;
    lerAudio(dt);
    atual = suavizar(atual, alvoDaFase(fase, audio), dt, 2.2);
    orb.atualizar(dt, atual, audio, escalaDaVoz(fala, audio));
    brasas.atualizar(dt, atual, tempo);
  };
  const desenhar = () => renderer.render(scene, camera);

  /** movimento reduzido: um quadro parado (com a cena já "aquecida") e novo quadro só quando algo muda */
  function quadroFixo() {
    if (!op.reduzirMovimento) return;
    if (tempo < 4) { for (let i = 0; i < 240; i++) passo(1 / 60); }
    atual = alvoDaFase(fase, 0);
    orb.atualizar(0.0001, atual, 0);
    desenhar();
  }

  const reduzir = () => {
    const prox = nivelAbaixo(nivel);
    reducoes++;
    if (prox) { nivel = prox; }
    dprAtual = Math.max(1, dprAtual * 0.78);
    orb.limitar(Math.max(0.35, 1 - reducoes * 0.3));
    tamanho();
  };

  const quadro = (agora: number) => {
    raf = requestAnimationFrame(quadro);
    if (pausado || !visivel || document.hidden) { ultimo = 0; return; }
    if (!ultimo) { ultimo = agora; return; }
    const dtMs = agora - ultimo; ultimo = agora;
    const dt = Math.min(0.05, dtMs / 1000);
    passo(dt);
    desenhar();
    quadros++;
    if (quadros === 1 && !pronto) { pronto = true; op.aoPronto(); }
    if (quadros > 40) {
      janelaMs += dtMs; janelaN++; somaMs += dtMs;
      if (janelaN >= 90) {
        // governador: se os quadros demoram demais, baixa a resolução e a quantidade de partículas
        if (janelaMs / janelaN > 27 && reducoes < 3) reduzir();
        janelaMs = 0; janelaN = 0;
      }
    }
  };

  const io = new IntersectionObserver(([e]) => { visivel = !!e?.isIntersecting; }, { threshold: 0.01 });
  io.observe(canvas);
  const perdido = (e: Event) => { e.preventDefault(); cancelAnimationFrame(raf); op.aoFalha(); };
  canvas.addEventListener("webglcontextlost", perdido);

  if (op.reduzirMovimento) { quadroFixo(); op.aoPronto(); pronto = true; } else { raf = requestAnimationFrame(quadro); }

  return {
    definirFase(f) { fase = f; if (op.reduzirMovimento) quadroFixo(); },
    pausar(p) { pausado = p; ultimo = 0; },
    info: () => ({ nivel, dpr: dprAtual, quadros, msMedio: quadros > 40 ? somaMs / (quadros - 40) : 0 }),
    liberar() {
      cancelAnimationFrame(raf);
      ro.disconnect(); io.disconnect();
      canvas.removeEventListener("webglcontextlost", perdido);
      orb.liberar(); brasas.liberar();
      matte?.dispose(); branco.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
