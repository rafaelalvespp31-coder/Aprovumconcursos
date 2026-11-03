/**
 * Personagem em ARTE 2D animada (three.js + shader). Não é animação anatômica 3D: a imagem é
 * presa a uma malha fina e deformada por regiões —
 *  - respiração: tórax e abdômen se alargam e a parte de cima sobe levemente (12–18 ciclos/min,
 *    com variação), sem escalar o personagem inteiro;
 *  - cabeça: micromovimento lento a partir do pescoço;
 *  - piscadas: pálpebras pintadas a partir da pele do próprio rosto descem e sobem
 *    (intervalos de 2 a 7 s, às vezes piscada dupla).
 * O tom de pele é ajustado só nos pixels de pele. Um único requestAnimationFrame, pausado fora da
 * tela e em segundo plano; prefers-reduced-motion deixa o personagem parado.
 */
import * as THREE from "three";
import { HAIR_COLORS, SKIN_TONES, type AvatarConfig } from "@/domain/avatar/catalog";
import type { Portrait } from "./portraits";
import type { EngineDebug } from "./engine";

const BASE_SKIN = new THREE.Color("#D3A27E"); // tom do personagem original ("morena clara")
const rand = (a: number, b: number) => a + Math.random() * (b - a);
const smooth = (t: number) => t * t * (3 - 2 * t);

const VERT = /* glsl */ `
uniform float uBreath, uRoll, uAspect, uCX, uNeck, uShoulder, uChest, uWaist;
varying vec2 vUv;
void main() {
  vUv = uv;
  float iy = 1.0 - uv.y;
  vec3 p = position;
  float cx = (uCX - 0.5) * uAspect;
  float wChest = smoothstep(uNeck, uShoulder + 0.03, iy) * (1.0 - smoothstep(uChest + 0.08, uWaist + 0.02, iy));
  float wAb = smoothstep(uChest, uChest + 0.08, iy) * (1.0 - smoothstep(uWaist - 0.02, uWaist + 0.05, iy));
  p.x = cx + (p.x - cx) * (1.0 + 0.013 * uBreath * wChest + 0.007 * uBreath * wAb);
  p.y += 0.0022 * uBreath * (1.0 - smoothstep(uShoulder, uChest + 0.05, iy));
  float wHead = 1.0 - smoothstep(uNeck - 0.02, uNeck + 0.012, iy);
  float a = uRoll * wHead;
  vec2 piv = vec2(cx, 1.0 - uNeck);
  vec2 d = p.xy - piv;
  p.xy = piv + vec2(d.x * cos(a) - d.y * sin(a), d.x * sin(a) + d.y * cos(a));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const FRAG = /* glsl */ `
uniform sampler2D uTex, uLids;
uniform float uBlink;
uniform vec3 uSkinRatio, uHair;
uniform float uHairOn, uNeckF;
uniform vec4 uEyeL, uEyeR;
varying vec2 vUv;
float lidMask(vec4 e, float iy) {
  float inside = step(e.x, vUv.x) * step(vUv.x, e.z);
  float t = (iy - e.y) / (e.w - e.y);
  return inside * step(t, uBlink * 1.08);
}
void main() {
  vec4 c = texture2D(uTex, vUv);
  if (c.a < 0.02) discard;
  float iy = 1.0 - vUv.y;
  vec4 lid = texture2D(uLids, vUv);
  float m = max(lidMask(uEyeL, iy), lidMask(uEyeR, iy)) * lid.a * step(0.02, uBlink);
  vec3 col = mix(c.rgb, lid.rgb, m);
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  float skin = smoothstep(0.03, 0.08, col.r - col.g) * smoothstep(0.015, 0.05, col.g - col.b) * smoothstep(0.14, 0.24, l);
  col = mix(col, clamp(col * uSkinRatio, 0.0, 1.0), skin);
  // cor do cabelo/barba: tons escuros da cabeça (fora dos olhos), mantendo a luz da arte
  float inEyes = max(step(uEyeL.x - 0.01, vUv.x) * step(vUv.x, uEyeL.z + 0.01), step(uEyeR.x - 0.01, vUv.x) * step(vUv.x, uEyeR.z + 0.01)) * step(uEyeL.y - 0.004, iy) * step(iy, uEyeL.w + 0.004);
  float sat = max(col.r, max(col.g, col.b)) - min(col.r, min(col.g, col.b));
  float hair = (1.0 - smoothstep(0.2, 0.34, l)) * (1.0 - skin) * (1.0 - step(0.25, sat)) * (1.0 - smoothstep(uNeckF - 0.02, uNeckF - 0.005, iy)) * (1.0 - inEyes) * uHairOn;
  col = mix(col, clamp(uHair * (l / 0.11), 0.0, 1.0), hair);
  gl_FragColor = vec4(col, c.a);
  #include <colorspace_fragment>
}`;

export class PortraitEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-0.5, 0.5, 1.05, -0.05, -10, 10);
  private mat: THREE.ShaderMaterial | null = null;
  private clock = new THREE.Clock();
  private raf = 0;
  private visible = true;
  private reduced = false;
  private cycleStart = 0;
  private cycleLen = 4;
  private depth = 1;
  private nextBlink = 1.2;
  private blinkStart = -1;
  private blinkDur = { close: 0.08, hold: 0.05, open: 0.14 };
  private double = false;
  private io: IntersectionObserver;
  private mql: MediaQueryList | null;
  private onVis = () => this.sync();
  private onMotion = () => {
    this.reduced = !!this.mql?.matches;
    this.sync();
  };
  readonly debug: EngineDebug = { breath: 0, blinks: 0, chestScale: 1, headYaw: 0, frames: 0, ready: false };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly portrait: Portrait,
    private readonly onDebug?: (d: EngineDebug) => void,
    /** Desenha só o personagem (fundo transparente): a página mostra o próprio cenário por trás. */
    private readonly transparent = false,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    // Resolução real da tela (até 3×): contorno nítido em telas de alta densidade.
    this.renderer.setPixelRatio(Math.min(3, window.devicePixelRatio || 1));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.mql = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
    this.reduced = !!this.mql?.matches;
    this.mql?.addEventListener?.("change", this.onMotion);
    document.addEventListener("visibilitychange", this.onVis);
    this.io = new IntersectionObserver((e) => {
      this.visible = e.some((x) => x.isIntersecting);
      this.sync();
    });
    this.io.observe(canvas);
    if (!portrait.backdrop) this.addBase();
    this.resize();
  }

  /** Base circular com anel vermelho sob os pés (como no layout). */
  private addBase() {
    const a = this.portrait.aspect;
    const cx = (this.portrait.centerX - 0.5) * a;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 64), new THREE.MeshBasicMaterial({ color: 0x0b0b0d, transparent: true, opacity: 0.92 }));
    disc.scale.set(a * 0.9, 0.06, 1);
    disc.position.set(cx, 0.012, -1);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 96), new THREE.MeshBasicMaterial({ color: 0xe50914 }));
    ring.scale.set(a * 0.86, 0.055, 1);
    ring.position.set(cx, 0.012, -0.9);
    const glow = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.06, 96), new THREE.MeshBasicMaterial({ color: 0xe50914, transparent: true, opacity: 0.18 }));
    glow.scale.copy(ring.scale);
    glow.position.set(cx, 0.012, -0.95);
    this.scene.add(disc, glow, ring);
  }

  async load(config: AvatarConfig) {
    const loader = new THREE.TextureLoader();
    const [tex, lids] = await Promise.all([loader.loadAsync(this.portrait.src), loader.loadAsync(this.portrait.lids)]);
    tex.colorSpace = THREE.SRGBColorSpace;
    lids.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const p = this.portrait;
    const e = (i: number) => new THREE.Vector4(p.eyes[i]!.x0, p.eyes[i]!.y0, p.eyes[i]!.x1, p.eyes[i]!.y1);
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      uniforms: {
        uTex: { value: tex },
        uLids: { value: lids },
        uBreath: { value: 0 },
        uRoll: { value: 0 },
        uBlink: { value: 0 },
        uAspect: { value: p.aspect },
        uCX: { value: p.centerX },
        uNeck: { value: p.neckY },
        uShoulder: { value: p.shoulderY },
        uChest: { value: p.chestY },
        uWaist: { value: p.waistY },
        uEyeL: { value: e(0) },
        uEyeR: { value: e(1) },
        uSkinRatio: { value: new THREE.Vector3(1, 1, 1) },
        uHair: { value: new THREE.Color(0x151110) },
        uHairOn: { value: 0 },
        uNeckF: { value: p.neckY },
      },
    });
    const geo = new THREE.PlaneGeometry(p.aspect, 1, 60, 160);
    geo.translate(0, 0.5, 0);
    const figure = new THREE.Mesh(geo, this.mat);
    if (p.backdrop) {
      const b = p.backdrop;
      const bw = b.w / b.h;
      if (!this.transparent) {
        const bg = await loader.loadAsync(b.src);
        bg.colorSpace = THREE.SRGBColorSpace;
        const back = new THREE.Mesh(new THREE.PlaneGeometry(bw, 1), new THREE.MeshBasicMaterial({ map: bg }));
        back.position.set(0, 0.5, -1);
        this.scene.add(back);
      }
      const s = b.figure.h / b.h;
      figure.scale.set(s, s, 1);
      figure.position.set(-bw / 2 + (b.figure.x + b.figure.w / 2) / b.h, 1 - (b.figure.y + b.figure.h) / b.h, 0);
    }
    this.scene.add(figure);
    this.setConfig(config);
    this.debug.ready = true;
    this.sync();
    this.renderOnce();
  }

  setConfig(config: AvatarConfig) {
    if (!this.mat) return;
    const target = new THREE.Color(SKIN_TONES.find((s) => s.id === config.skin)?.hex ?? "#D3A27E");
    (this.mat.uniforms.uSkinRatio!.value as THREE.Vector3).set(target.r / BASE_SKIN.r, target.g / BASE_SKIN.g, target.b / BASE_SKIN.b);
    // "preto" é a cor da arte original: sem recolorir
    this.mat.uniforms.uHairOn!.value = config.hairColor === "preto" ? 0 : 1;
    (this.mat.uniforms.uHair!.value as THREE.Color).set(HAIR_COLORS.find((h) => h.id === config.hairColor)?.hex ?? "#151110");
    if (this.reduced || !this.raf) this.renderOnce();
  }

  resize() {
    const w = this.canvas.clientWidth || 300;
    const h = this.canvas.clientHeight || 500;
    this.renderer.setSize(w, h, false);
    const A = w / h;
    const b = this.portrait.backdrop;
    if (b) {
      // cenário cobre o quadro inteiro (como object-fit: cover), centralizado
      const bw = b.w / b.h;
      const vw = A > bw ? bw : A;
      const vh = A > bw ? bw / A : 1;
      this.camera.left = -vw / 2;
      this.camera.right = vw / 2;
      this.camera.top = 0.5 + vh / 2;
      this.camera.bottom = 0.5 - vh / 2;
    } else {
      const viewH = 1.05;
      const viewW = Math.max(viewH * A, this.portrait.aspect * 1.15);
      const vh = viewW / A;
      this.camera.left = -viewW / 2;
      this.camera.right = viewW / 2;
      this.camera.top = vh - 0.06;
      this.camera.bottom = -0.06;
    }
    this.camera.updateProjectionMatrix();
    this.renderOnce();
  }

  private breathAt(t: number) {
    let u = (t - this.cycleStart) / this.cycleLen;
    if (u >= 1) {
      this.cycleStart = t;
      this.cycleLen = rand(3.4, 5);
      this.depth = rand(0.85, 1.12);
      u = 0;
    }
    if (u < 0.4) return smooth(u / 0.4) * this.depth;
    if (u < 0.88) return (1 - smooth((u - 0.4) / 0.48)) * this.depth;
    return 0;
  }

  private blinkAt(t: number) {
    if (this.blinkStart < 0 && t >= this.nextBlink) {
      this.blinkStart = t;
      this.blinkDur = { close: rand(0.06, 0.09), hold: rand(0.03, 0.07), open: rand(0.11, 0.17) };
      this.debug.blinks++;
    }
    if (this.blinkStart < 0) return 0;
    const d = t - this.blinkStart;
    const { close, hold, open } = this.blinkDur;
    if (d < close) return smooth(d / close);
    if (d < close + hold) return 1;
    if (d < close + hold + open) return 1 - smooth((d - close - hold) / open);
    this.blinkStart = -1;
    this.double = !this.double && Math.random() < 0.15;
    this.nextBlink = t + (this.double ? rand(0.12, 0.25) : rand(2, 7));
    return 0;
  }

  private update(t: number) {
    if (!this.mat) return;
    const b = this.reduced ? 0 : this.breathAt(t);
    const blink = this.reduced ? 0 : this.blinkAt(t);
    const roll = this.reduced ? 0 : Math.sin(t * 0.31) * 0.012 + Math.sin(t * 0.83 + 1.7) * 0.004;
    const u = this.mat.uniforms;
    u.uBreath!.value = b;
    u.uBlink!.value = blink;
    u.uRoll!.value = roll;
    Object.assign(this.debug, { breath: b, chestScale: 1 + 0.013 * b, headYaw: roll });
  }

  private last = 0;
  private loop = (now: number) => {
    this.raf = requestAnimationFrame(this.loop);
    // 30 quadros por segundo bastam para respiração e piscadas (economiza bateria e CPU)
    if (now - this.last < 32) return;
    this.last = now;
    this.update(this.clock.getElapsedTime());
    this.renderer.render(this.scene, this.camera);
    this.debug.frames++;
    if (this.debug.frames % 10 === 0) this.onDebug?.(this.debug);
  };

  private renderOnce() {
    this.update(this.clock.getElapsedTime());
    this.renderer.render(this.scene, this.camera);
    this.onDebug?.(this.debug);
  }

  private sync() {
    const run = this.visible && !document.hidden && !this.reduced && !!this.mat;
    if (run && !this.raf) this.raf = requestAnimationFrame(this.loop);
    else if (!run && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.renderOnce();
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.io.disconnect();
    document.removeEventListener("visibilitychange", this.onVis);
    this.mql?.removeEventListener?.("change", this.onMotion);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      (m.material as THREE.Material | undefined)?.dispose?.();
    });
    this.renderer.dispose();
  }
}
