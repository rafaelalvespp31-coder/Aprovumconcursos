/**
 * Motor 3D do avatar (three.js). Carrega o modelo-base do gênero (.glb com esqueleto) e as
 * peças equipadas (.glb ligadas ao MESMO esqueleto), aplica pele/cabelo/corpo/rosto e anima:
 *  - respiração (ossos do tórax, ombros e abdômen; 12–18 ciclos/min com variação),
 *  - piscadas (morph targets eyeBlinkLeft/Right ou ossos das pálpebras, intervalos aleatórios),
 *  - micromovimentos (cabeça e quadril, independentes da respiração).
 * Um único laço requestAnimationFrame; pausa em segundo plano/fora da tela; respeita
 * prefers-reduced-motion. Nada de escala no personagem inteiro para "respirar".
 */
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { bodyFactor, HAIR_COLORS, SKIN_TONES, UNIFORM_REPLACES, type AvatarConfig, type AvatarItem, type Slot } from "@/domain/avatar/catalog";

/** Nome do osso normalizado: "mixamorig:Spine2" → "spine2". */
const boneKey = (name: string) => name.replace(/^.*[:|]/, "").replace(/^(mixamorig|armature|cc_base_|rig_|def[-_])/i, "").toLowerCase();

const BONE_ALIASES: Record<string, string[]> = {
  hips: ["hips", "pelvis", "root_hips"],
  spine: ["spine", "spine01", "spine_01", "abdomen"],
  chest: ["spine2", "spine02", "spine_03", "chest", "upperchest", "spine1", "spine_02"],
  neck: ["neck", "neck01", "neck_01"],
  head: ["head"],
  lshoulder: ["leftshoulder", "clavicle_l", "l_clavicle", "shoulder_l", "leftclavicle"],
  rshoulder: ["rightshoulder", "clavicle_r", "r_clavicle", "shoulder_r", "rightclavicle"],
  leyelid: ["lefteyelid", "eyelid_l", "l_eyelid", "lefteyelidupper"],
  reyelid: ["righteyelid", "eyelid_r", "r_eyelid", "righteyelidupper"],
};

interface Rest {
  bone: THREE.Bone;
  pos: THREE.Vector3;
  quat: THREE.Quaternion;
  scale: THREE.Vector3;
}

export interface EngineDebug {
  breath: number;
  blinks: number;
  chestScale: number;
  headYaw: number;
  frames: number;
  ready: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const smooth = (t: number) => t * t * (3 - 2 * t);

export class AvatarEngine {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  private root = new THREE.Group();
  private model: THREE.Object3D | null = null;
  private items = new Map<string, THREE.Object3D>();
  private bones = new Map<string, THREE.Bone>();
  private rest = new Map<string, Rest>();
  private morphMeshes: THREE.Mesh[] = [];
  private mixer: THREE.AnimationMixer | null = null;
  private clock = new THREE.Clock();
  private raf = 0;
  private visible = true;
  private reduced = false;
  private loader = new GLTFLoader();
  private cache = new Map<string, Promise<THREE.Object3D & { animations?: THREE.AnimationClip[] }>>();
  private yaw = 0;
  private config: AvatarConfig | null = null;
  // respiração
  private cycleStart = 0;
  private cycleLen = 4;
  private depth = 1;
  // piscada
  private nextBlink = 1.5;
  private blinkStart = -1;
  private blinkDur = { close: 0.08, hold: 0.05, open: 0.14 };
  private doubleBlink = false;
  readonly debug: EngineDebug = { breath: 0, blinks: 0, chestScale: 1, headYaw: 0, frames: 0, ready: false };
  private io: IntersectionObserver | null = null;
  private onVis = () => this.syncRunning();
  private mql: MediaQueryList | null = null;
  private onMotion = () => {
    this.reduced = !!this.mql?.matches;
    this.syncRunning();
  };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly opts: { interactive?: boolean; onDebug?: (d: EngineDebug) => void } = {},
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.add(this.root);
    this.setupLights();
    this.mql = window.matchMedia?.("(prefers-reduced-motion: reduce)") ?? null;
    this.reduced = !!this.mql?.matches;
    this.mql?.addEventListener?.("change", this.onMotion);
    document.addEventListener("visibilitychange", this.onVis);
    this.io = new IntersectionObserver((e) => {
      this.visible = e.some((x) => x.isIntersecting);
      this.syncRunning();
    });
    this.io.observe(canvas);
    if (opts.interactive) this.enableDrag();
    this.resize();
    this.newCycle(0);
  }

  private setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x1a0505, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(1.6, 3.2, 2.4);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 10;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xff2a1a, 2.4);
    rim.position.set(-2.2, 2.0, -2.0);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xbfcfff, 0.5);
    fill.position.set(-2, 1.2, 2.5);
    this.scene.add(fill);
    // base circular com anel vermelho (como no painel)
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.05, 64), new THREE.MeshStandardMaterial({ color: 0x0c0c0e, metalness: 0.4, roughness: 0.5 }));
    disc.position.y = -0.025;
    disc.receiveShadow = true;
    this.scene.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.008, 8, 96), new THREE.MeshBasicMaterial({ color: 0xe50914 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.002;
    this.scene.add(ring);
  }

  private enableDrag() {
    let down = false;
    let lastX = 0;
    this.canvas.style.touchAction = "pan-y";
    this.canvas.addEventListener("pointerdown", (e) => {
      down = true;
      lastX = e.clientX;
      this.canvas.setPointerCapture?.(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!down) return;
      this.yaw += (e.clientX - lastX) * 0.012;
      lastX = e.clientX;
      this.root.rotation.y = this.yaw;
      if (this.reduced) this.renderOnce();
    });
    const up = () => (down = false);
    this.canvas.addEventListener("pointerup", up);
    this.canvas.addEventListener("pointercancel", up);
  }

  resize() {
    const w = this.canvas.clientWidth || 300;
    const h = this.canvas.clientHeight || 400;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.frame();
    if (this.reduced || !this.raf) this.renderOnce();
  }

  /** Enquadra o personagem inteiro (altura ~1,8 m) com folga para a base. */
  private frame() {
    const box = this.model ? new THREE.Box3().setFromObject(this.model) : new THREE.Box3(new THREE.Vector3(-0.4, 0, -0.3), new THREE.Vector3(0.4, 1.8, 0.3));
    const h = Math.max(0.5, box.max.y - box.min.y);
    const dist = (h * 0.62) / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) / Math.min(1, this.camera.aspect * 1.6);
    this.camera.position.set(0, box.min.y + h * 0.55, dist);
    this.camera.lookAt(0, box.min.y + h * 0.5, 0);
  }

  private load(url: string) {
    let p = this.cache.get(url);
    if (!p)
      this.cache.set(
        url,
        (p = this.loader.loadAsync(url).then((g) => {
          const s = g.scene as THREE.Object3D & { animations?: THREE.AnimationClip[] };
          s.animations = g.animations;
          return s;
        })),
      );
    return p;
  }

  /** Usa um modelo já montado (o manequim de teste da galeria). */
  setModelObject(obj: THREE.Object3D) {
    this.mountBase(obj, []);
  }

  private mountBase(obj: THREE.Object3D, clips: THREE.AnimationClip[]) {
    if (this.model) this.root.remove(this.model);
    for (const it of this.items.values()) it.removeFromParent();
    this.items.clear();
    this.model = obj;
    this.root.add(obj);
    this.bones.clear();
    this.rest.clear();
    this.morphMeshes = [];
    obj.traverse((o) => {
      if ((o as THREE.Bone).isBone) this.bones.set(boneKey(o.name), o as THREE.Bone);
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        if (m.morphTargetDictionary) this.morphMeshes.push(m);
      }
    });
    for (const [role, names] of Object.entries(BONE_ALIASES)) {
      const b = names.map((n) => this.bones.get(n)).find(Boolean);
      if (b) this.rest.set(role, { bone: b, pos: b.position.clone(), quat: b.quaternion.clone(), scale: b.scale.clone() });
    }
    this.mixer = null;
    const idle = clips.find((c) => /idle|parado|respira/i.test(c.name));
    if (idle) {
      this.mixer = new THREE.AnimationMixer(obj);
      this.mixer.clipAction(idle).play();
    }
    this.debug.ready = true;
    this.frame();
  }

  /** Liga as malhas de uma peça ao esqueleto do modelo-base (pelos nomes dos ossos). */
  private bindToBase(piece: THREE.Object3D) {
    piece.traverse((o) => {
      const sm = o as THREE.SkinnedMesh;
      if (!sm.isSkinnedMesh) return;
      const bones = sm.skeleton.bones.map((b) => this.bones.get(boneKey(b.name)) ?? b);
      sm.bind(new THREE.Skeleton(bones, sm.skeleton.boneInverses), sm.bindMatrix);
      sm.castShadow = true;
      if (sm.morphTargetDictionary) this.morphMeshes.push(sm);
    });
  }

  async setConfig(config: AvatarConfig, catalog: readonly AvatarItem[]) {
    this.config = config;
    const byId = new Map(catalog.map((i) => [i.id, i]));
    const base = catalog.find((i) => i.slot === "base" && i.genders.includes(config.gender) && i.modelUrl);
    if (base?.modelUrl) {
      const scene = await this.load(base.modelUrl);
      if (this.config !== config) return;
      if (this.model !== scene) this.mountBase(scene, scene.animations ?? []);
    }
    if (!this.model) return;
    // Peças equipadas (uniforme substitui camiseta e jaqueta).
    const wanted = new Map<string, AvatarItem>();
    for (const [slot, id] of Object.entries(config.equipped) as Array<[Slot, string]>) {
      if (config.equipped.uniforme && (UNIFORM_REPLACES as readonly string[]).includes(slot)) continue;
      const it = byId.get(id);
      if (it?.modelUrl) wanted.set(it.id, it);
    }
    for (const [id, obj] of this.items) {
      if (wanted.has(id)) continue;
      obj.removeFromParent();
      this.items.delete(id);
    }
    const hidden = new Set<string>();
    await Promise.all(
      [...wanted.values()].map(async (it) => {
        for (const h of (it.meta.hides as string[] | undefined) ?? []) hidden.add(h.toLowerCase());
        if (this.items.has(it.id)) return;
        const src = await this.load(it.modelUrl!);
        if (this.config !== config) return;
        const piece = src.clone(true);
        this.bindToBase(piece);
        this.model!.add(piece);
        this.items.set(it.id, piece);
      }),
    );
    if (this.config !== config) return;
    // Partes do corpo cobertas pela roupa (evita a pele "atravessar" o tecido).
    this.model.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && !this.isItemMesh(o)) o.visible = !hidden.has(o.name.toLowerCase());
    });
    this.applyLook(config);
    if (this.reduced || !this.raf) this.renderOnce();
  }

  private isItemMesh(o: THREE.Object3D) {
    for (const it of this.items.values()) {
      let p: THREE.Object3D | null = o;
      while (p) {
        if (p === it) return true;
        p = p.parent;
      }
    }
    return false;
  }

  /** Pele, cabelo, rosto e corpo. */
  private applyLook(c: AvatarConfig) {
    const skin = new THREE.Color(SKIN_TONES.find((s) => s.id === c.skin)?.hex ?? "#D3A27E");
    const hair = new THREE.Color(HAIR_COLORS.find((h) => h.id === c.hairColor)?.hex ?? "#141110");
    this.model?.traverse((o) => {
      const mats = ([] as THREE.Material[]).concat(((o as THREE.Mesh).material as THREE.Material | THREE.Material[]) ?? []);
      for (const m of mats) {
        const sm = m as THREE.MeshStandardMaterial;
        if (!sm.color) continue;
        if (/skin|pele|body|corpo/i.test(m.name)) sm.color.copy(skin);
        else if (/hair|cabelo|beard|barba|brow|sobrancelha/i.test(m.name)) sm.color.copy(hair);
      }
    });
    // Rosto: formas "face_<chave>_<opção>" no modelo (ex.: face_formato_quadrado).
    for (const m of this.morphMeshes) {
      const dict = m.morphTargetDictionary!;
      const inf = m.morphTargetInfluences!;
      for (const [name, idx] of Object.entries(dict)) {
        const f = /^face_([a-z]+)_([a-z_]+)$/.exec(name);
        if (f) inf[idx] = (c.face as Record<string, string>)[f[1]!] === f[2] ? 1 : 0;
        const b = /^body_(estrutura|ombros|constituicao)$/.exec(name);
        if (b) inf[idx] = Math.max(0, (c.body[b[1] as keyof AvatarConfig["body"]] - 50) / 50);
      }
    }
    // Corpo pelo esqueleto, em faixa pequena: ombros afastam as clavículas; estrutura alarga o tórax.
    const ombros = bodyFactor(c.body.ombros, 0.08);
    for (const role of ["lshoulder", "rshoulder"] as const) {
      const r = this.rest.get(role);
      if (r) r.bone.position.set(r.pos.x * ombros, r.pos.y, r.pos.z);
    }
    if (this.model) {
      const alt = bodyFactor(c.body.altura, 0.04);
      this.model.scale.set(1, alt, 1);
    }
  }

  // ---------------------------------------------------------------- animação
  private newCycle(t: number) {
    this.cycleStart = t;
    this.cycleLen = rand(3.4, 5); // 12–18 respirações por minuto
    this.depth = rand(0.85, 1.12);
  }

  /** 0 → 1 → 0: inspiração suave, expiração gradual e pequena pausa no fim. */
  private breathAt(t: number): number {
    let u = (t - this.cycleStart) / this.cycleLen;
    if (u >= 1) {
      this.newCycle(t);
      u = 0;
    }
    if (u < 0.4) return smooth(u / 0.4) * this.depth;
    if (u < 0.88) return (1 - smooth((u - 0.4) / 0.48)) * this.depth;
    return 0;
  }

  private blinkAt(t: number): number {
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
    // às vezes, piscada dupla; senão, intervalo humano de 2 a 7 s
    this.doubleBlink = !this.doubleBlink && Math.random() < 0.15;
    this.nextBlink = t + (this.doubleBlink ? rand(0.12, 0.25) : rand(2, 7));
    return 0;
  }

  private animate(t: number) {
    const b = this.reduced ? 0 : this.breathAt(t);
    const blink = this.reduced ? 0 : this.blinkAt(t);
    const at = (role: string) => this.rest.get(role);
    // Volta à pose de repouso (ou à pose da animação idle do modelo) antes dos ajustes.
    if (!this.mixer) for (const r of this.rest.values()) r.bone.quaternion.copy(r.quat);
    const chest = at("chest");
    if (chest) {
      chest.bone.scale.set(chest.scale.x * (1 + 0.012 * b), chest.scale.y * (1 + 0.006 * b), chest.scale.z * (1 + 0.022 * b));
      chest.bone.rotateX(-0.012 * b);
      this.debug.chestScale = chest.bone.scale.z / chest.scale.z;
    }
    const spine = at("spine");
    if (spine) spine.bone.scale.set(spine.scale.x, spine.scale.y, spine.scale.z * (1 + 0.012 * b));
    for (const [role, sign] of [["lshoulder", 1], ["rshoulder", -1]] as const) {
      const r = at(role);
      if (r) {
        r.bone.quaternion.copy(r.quat);
        r.bone.rotateZ(sign * 0.012 * b);
      }
    }
    // micromovimentos independentes da respiração (somas de senos lentos, sem repetição óbvia)
    const head = at("head");
    if (head && !this.reduced) {
      const yaw = Math.sin(t * 0.31) * 0.035 + Math.sin(t * 0.83 + 1.7) * 0.012;
      const pitch = Math.sin(t * 0.47 + 0.6) * 0.018 + b * 0.008;
      head.bone.rotateY(yaw);
      head.bone.rotateX(pitch);
      this.debug.headYaw = yaw;
    }
    const neck = at("neck");
    if (neck && !this.reduced) neck.bone.rotateZ(Math.sin(t * 0.23 + 2.1) * 0.01);
    const hips = at("hips");
    if (hips && !this.reduced) {
      hips.bone.position.x = hips.pos.x + Math.sin(t * 0.19) * 0.004;
      hips.bone.rotation.z = Math.sin(t * 0.19 + 0.4) * 0.006;
    }
    // piscadas: morph targets (ARKit) ou ossos das pálpebras
    for (const m of this.morphMeshes) {
      const dict = m.morphTargetDictionary!;
      for (const name of ["eyeBlinkLeft", "eyeBlinkRight", "eyeBlink_L", "eyeBlink_R", "blink", "Blink"]) {
        const i = dict[name];
        if (i !== undefined) m.morphTargetInfluences![i] = blink;
      }
    }
    for (const role of ["leyelid", "reyelid"] as const) {
      const r = at(role);
      if (r) {
        r.bone.quaternion.copy(r.quat);
        r.bone.rotateX(0.55 * blink);
      }
    }
    this.debug.breath = b;
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    this.mixer?.update(dt);
    if (this.model) this.animate(t);
    this.renderer.render(this.scene, this.camera);
    this.debug.frames++;
    if (this.debug.frames % 10 === 0) this.opts.onDebug?.(this.debug);
  };

  private renderOnce() {
    if (this.model) this.animate(this.clock.elapsedTime);
    this.renderer.render(this.scene, this.camera);
    this.opts.onDebug?.(this.debug);
  }

  private syncRunning() {
    const run = this.visible && !document.hidden && !this.reduced;
    if (run && !this.raf) {
      this.clock.getDelta();
      this.raf = requestAnimationFrame(this.loop);
    } else if (!run && this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
      this.renderOnce();
    }
  }

  start() {
    this.syncRunning();
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.io?.disconnect();
    document.removeEventListener("visibilitychange", this.onVis);
    this.mql?.removeEventListener?.("change", this.onMotion);
    this.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      m.geometry?.dispose?.();
      for (const mat of ([] as THREE.Material[]).concat((m.material as THREE.Material | THREE.Material[]) ?? [])) mat.dispose?.();
    });
    this.renderer.dispose();
  }
}

/**
 * Manequim de TESTE (só galeria/testes): esqueleto com os mesmos nomes de ossos e morph
 * targets de piscada do contrato dos modelos, para verificar o motor sem os modelos finais.
 * Não é o personagem dos alunos.
 */
export function buildTestMannequin(gender: "m" | "f"): THREE.Object3D {
  const g = new THREE.Group();
  const names = ["Hips", "Spine", "Spine2", "Neck", "Head", "LeftShoulder", "RightShoulder"];
  const bones = Object.fromEntries(names.map((n) => [n, Object.assign(new THREE.Bone(), { name: `mixamorig:${n}` })])) as Record<string, THREE.Bone>;
  const w = gender === "f" ? 0.86 : 1;
  bones.Hips!.position.set(0, 0.95, 0);
  bones.Spine!.position.set(0, 0.12, 0);
  bones.Spine2!.position.set(0, 0.25, 0);
  bones.Neck!.position.set(0, 0.22, 0);
  bones.Head!.position.set(0, 0.1, 0);
  bones.LeftShoulder!.position.set(0.17 * w, 0.18, 0);
  bones.RightShoulder!.position.set(-0.17 * w, 0.18, 0);
  bones.Hips!.add(bones.Spine!);
  bones.Spine!.add(bones.Spine2!);
  bones.Spine2!.add(bones.Neck!, bones.LeftShoulder!, bones.RightShoulder!);
  bones.Neck!.add(bones.Head!);
  g.add(bones.Hips!);
  const skin = new THREE.MeshStandardMaterial({ name: "Skin", color: 0xd3a27e, roughness: 0.6 });
  const cloth = new THREE.MeshStandardMaterial({ name: "Cloth", color: 0x161618, roughness: 0.8 });
  const part = (geo: THREE.BufferGeometry, mat: THREE.Material, bone: THREE.Bone, y = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.y = y;
    m.castShadow = true;
    bone.add(m);
    return m;
  };
  part(new THREE.CapsuleGeometry(0.15 * w, 0.22, 6, 16), cloth, bones.Spine2!, 0.04);
  part(new THREE.CapsuleGeometry(0.14 * w, 0.12, 6, 16), cloth, bones.Spine!, 0);
  part(new THREE.CylinderGeometry(0.05, 0.055, 0.1, 16), skin, bones.Neck!, 0.04);
  const head = part(new THREE.SphereGeometry(0.11, 32, 24), skin, bones.Head!, 0.1);
  for (const sx of [-1, 1]) {
    part(new THREE.CapsuleGeometry(0.045, 0.5, 4, 12), cloth, sx > 0 ? bones.LeftShoulder! : bones.RightShoulder!, -0.28).position.x = sx * 0.04;
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.065 * w + 0.01, 0.78, 4, 12), cloth);
    leg.position.set(sx * 0.09, -0.48, 0);
    bones.Hips!.add(leg);
  }
  // pálpebras com morph target de piscada
  const lid = new THREE.SphereGeometry(0.018, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
  const closed = (lid.attributes.position as THREE.BufferAttribute).clone();
  for (let i = 0; i < closed.count; i++) closed.setY(i, closed.getY(i) * -0.9);
  lid.morphAttributes.position = [closed];
  for (const [sx, name] of [[-1, "eyeBlinkRight"], [1, "eyeBlinkLeft"]] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 16, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
    eye.position.set(sx * 0.038, 0.015, 0.095);
    head.add(eye);
    const l = new THREE.Mesh(lid.clone(), skin);
    l.morphTargetDictionary = { [name]: 0 };
    l.morphTargetInfluences = [0];
    l.position.copy(eye.position);
    head.add(l);
  }
  g.name = "manequim_teste";
  return g;
}
