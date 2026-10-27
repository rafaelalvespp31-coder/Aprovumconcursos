"use client";

import { useEffect, useRef } from "react";
import type { MapTopic, Territory } from "@/domain/knowledge-map/model";

/**
 * Palco cinematográfico: a arte de referência do Aprovum (campo de guerra, núcleo vermelho,
 * soldado com o fuzil) como cenário, sem a HUD que vinha desenhada nela — a HUD real é HTML.
 * A "câmera" é 2D: aproxima, afasta, desloca e acompanha o mouse/toque com parallax; brasas,
 * pulsos, feixe e relâmpagos são animados por cima. As placas ficam fora da camada que escala
 * (o texto não aumenta junto com o zoom).
 */

export const ART = { w: 3344, h: 1882, src: "/images/knowledge-ops/territorio.webp", srcSm: "/images/knowledge-ops/territorio-sm.webp" };
/** Braços e fuzil recortados da arte (camada própria, em primeira pessoa). */
// O recorte continua (escurecendo) para baixo e para a direita da tela: ao girar ou subir a arma,
// o braço nunca mostra a borda do recorte. "vh" é a altura da parte visível original.
const RIFLE = { src: "/images/knowledge-ops/fuzil.webp", x: 1424, y: 792, w: 2783, h: 1853, vh: 1090, muzzle: [1786, 960] as [number, number], pivot: [2420, 1500] as [number, number] };
/** Fumaça: colunas que sobem dos incêndios e névoa baixa sobre o rio (coordenadas da arte). */
const SMOKE: Array<{ x: number; y: number; kind: "coluna" | "nevoa"; size: number }> = [
  { x: 700, y: 330, kind: "coluna", size: 120 },
  { x: 1700, y: 420, kind: "coluna", size: 110 },
  { x: 1580, y: 470, kind: "coluna", size: 90 },
  { x: 3200, y: 420, kind: "coluna", size: 150 },
  { x: 3080, y: 520, kind: "coluna", size: 110 },
  { x: 1150, y: 360, kind: "coluna", size: 70 },
  { x: 650, y: 1140, kind: "nevoa", size: 240 },
  { x: 3150, y: 960, kind: "nevoa", size: 220 },
  { x: 2700, y: 1180, kind: "nevoa", size: 200 },
  { x: 260, y: 1250, kind: "nevoa", size: 230 },
];
/** Focos de fogo que tremulam. */
const FIRES: Array<[number, number, number]> = [
  [3190, 525, 90],
  [3050, 540, 60],
  [1570, 475, 40],
  [1150, 365, 34],
  [2060, 360, 30],
];
/** Coordenadas na arte original (1672×941) multiplicadas por 2. */
const k = (x: number, y: number): [number, number] => [x * 2, y * 2];

export interface ArtSlot {
  /** Onde fica a placa holográfica. */
  plate: [number, number];
  /** Base luminosa da instalação (foco da câmera e pulsos). */
  base: [number, number];
  /** A instalação já existe na arte (senão, o palco desenha um farol). */
  drawn: boolean;
}

/** Instalações da arte por matéria (as seis da referência + pontos extras para outras matérias). */
export const ART_SLOTS: Record<string, ArtSlot> = {
  lingua_portuguesa: { plate: k(448, 222), base: k(415, 282), drawn: true },
  informatica: { plate: k(500, 408), base: k(460, 462), drawn: true },
  matematica: { plate: k(616, 574), base: k(600, 628), drawn: true },
  direito_penal: { plate: k(998, 250), base: k(910, 385), drawn: true },
  direito_constitucional: { plate: k(1408, 244), base: k(1357, 302), drawn: true },
  direito_administrativo: { plate: k(1503, 395), base: k(1432, 462), drawn: true },
  direito_processual_penal: { plate: k(700, 300), base: k(705, 362), drawn: false },
  legislacao_especial: { plate: k(1240, 330), base: k(1232, 388), drawn: false },
  raciocinio_logico: { plate: k(300, 330), base: k(285, 384), drawn: false },
  conhecimentos_especificos: { plate: k(330, 560), base: k(320, 614), drawn: false },
  outras: { plate: k(780, 470), base: k(770, 520), drawn: false },
};
export const ART_ORDER_DRAWN = ["lingua_portuguesa", "informatica", "matematica", "direito_penal", "direito_constitucional", "direito_administrativo"];
const CORE = k(910, 390);

export function slotFor(id: string): ArtSlot {
  return ART_SLOTS[id] ?? ART_SLOTS.outras!;
}

/**
 * Faixa da arte que contém todas as instalações (px da arte). No celular em pé a câmera
 * enquadra essa faixa inteira na largura da tela: o mapa todo cabe, sem cortar nada.
 */
const FIT = { x0: 700, x1: 3140, cx: 1920, cy: 860 };

/** Folga da arte além da tela (computador): é o quanto a câmera pode "olhar" para os lados. */
const LOOK_MARGIN = 1.5;
/** Tamanho do braço/fuzil na tela (independe da folga da câmera). */
const RIFLE_SCALE = 1.22;

/** Cópias espelhadas em volta da arte (só aparecem no celular em pé). */
const MIRRORS: Array<[number, number]> = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];

/** Câmera 2D sobre a arte (valores em pixels da arte). */
export class PlateCamera {
  focus: [number, number] = [ART.w / 2, ART.h / 2];
  focusNow: [number, number] = [ART.w / 2, ART.h / 2 + 60];
  zoom = 1;
  zoomNow = 1.08;
  pointer: [number, number] = [0, 0];
  pointerNow: [number, number] = [0, 0];
  reduced = false;
  view = { w: 1, h: 1 };
  /** Posição exata do cursor/dedo na tela (px) — o fuzil aponta para ela. */
  screenPointer: [number, number] | null = null;
  /** "cobrir" (computador, paisagem) ou "caber" (celular em pé: o mapa inteiro na tela). */
  mode: "cobrir" | "caber" = "cobrir";

  setView(w: number, h: number) {
    this.view = { w: Math.max(1, w), h: Math.max(1, h) };
    const next = this.view.w / this.view.h < 1.05 ? "caber" : "cobrir";
    if (next !== this.mode) {
      this.mode = next;
      this.overview();
      this.focusNow = [...this.focus];
      this.zoomNow = this.zoom;
    } else this.clampFocus();
  }
  setReduced(v: boolean) {
    this.reduced = v;
  }
  setPointer(x: number, y: number) {
    this.pointer = [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))];
  }
  setScreenPointer(p: [number, number] | null) {
    this.screenPointer = p;
  }
  /** Cursor sobre um card (ou card apertado): a câmera segura o olhar para o clique acertar. */
  hold = false;
  private resume = 0;
  setHold(v: boolean) {
    if (this.hold && !v) this.resume = 0.3;
    this.hold = v;
  }
  /** Com a mira travada, a câmera fica no alvo (não segue o cursor). */
  locked = false;
  setLocked(v: boolean) {
    this.locked = v;
  }
  /** Escala no zoom 1: cobre a tela (computador) ou cabe a faixa das instalações (celular). */
  cover() {
    // Celular em pé: a faixa das instalações quase na largura toda (cards legíveis; as bordas são presas na tela).
    if (this.mode === "caber") return Math.min(this.view.w / ((FIT.x1 - FIT.x0) * 0.86), (this.view.h * 0.62) / ART.h * 1.6);
    return Math.max(this.view.w / ART.w, this.view.h / ART.h);
  }
  /** Centro vertical da cena na tela (no celular fica acima, deixando o fuzil embaixo). */
  cy() {
    return this.mode === "caber" ? this.view.h * 0.4 : this.view.h / 2;
  }
  maxZoom() {
    return this.mode === "caber" ? 3.2 : 2.6;
  }
  private clampFocus() {
    const s = this.cover() * this.zoom;
    const left = this.view.w / 2 / s;
    const right = this.view.w / 2 / s;
    const up = this.cy() / s;
    const down = (this.view.h - this.cy()) / s;
    // Eixo maior que a arte: trava no centro da arte (o fundo desfocado completa a tela).
    const fx = left + right >= ART.w ? ART.w / 2 : Math.min(ART.w - right, Math.max(left, this.focus[0]));
    const fy = up + down >= ART.h ? (this.mode === "caber" ? FIT.cy : ART.h / 2) : Math.min(ART.h - down, Math.max(up, this.focus[1]));
    this.focus = [fx, fy];
  }
  /** Zoom; com um ponto da tela (cursor/pinça), o que está sob ele continua no mesmo lugar. */
  zoomBy(f: number, at?: [number, number]) {
    const before = this.cover() * this.zoom;
    const next = Math.min(this.maxZoom(), Math.max(1, this.zoom * f));
    if (at) {
      const ax = this.focus[0] + (at[0] - this.view.w / 2) / before;
      const ay = this.focus[1] + (at[1] - this.cy()) / before;
      const after = this.cover() * next;
      this.focus = [ax - (at[0] - this.view.w / 2) / after, ay - (at[1] - this.cy()) / after];
    }
    this.zoom = next;
    this.clampFocus();
  }
  pan(dxScreen: number, dyScreen: number) {
    const s = this.cover() * this.zoom;
    this.focus = [this.focus[0] - dxScreen / s, this.focus[1] - dyScreen / s];
    this.clampFocus();
  }
  /** Traz um ponto para dentro da área livre da tela, sem mudar o zoom. */
  reveal(p: [number, number], inset: { left?: number; right?: number; bottom?: number } = {}) {
    if (!this.inView(p, inset)) this.revealAt(p, inset);
  }
  private bounds(inset: { left?: number; right?: number; bottom?: number }) {
    const below = this.view.h - this.cy();
    return {
      minX: Math.max(-this.view.w * 0.3, -this.view.w / 2 + (inset.left ?? 0) + 120),
      maxX: Math.min(this.view.w * 0.3, this.view.w / 2 - (inset.right ?? 0) - 160),
      minY: -this.cy() * 0.6,
      maxY: Math.min(below * 0.6, below - (inset.bottom ?? 0) - 90),
    };
  }
  private inView(p: [number, number], inset: { left?: number; right?: number; bottom?: number }) {
    const s = this.cover() * this.zoom;
    const b = this.bounds(inset);
    const sx = (p[0] - this.focus[0]) * s;
    const sy = (p[1] - this.focus[1]) * s;
    return sx >= b.minX - 2 && sx <= b.maxX + 2 && sy >= b.minY - 2 && sy <= b.maxY + 2;
  }
  private revealAt(p: [number, number], inset: { left?: number; right?: number; bottom?: number }) {
    const s = this.cover() * this.zoom;
    const sx = (p[0] - this.focus[0]) * s;
    const sy = (p[1] - this.focus[1]) * s;
    const { minX, maxX, minY, maxY } = this.bounds(inset);
    const dx = sx < minX ? sx - minX : sx > maxX ? sx - maxX : 0;
    const dy = sy < minY ? sy - minY : sy > maxY ? sy - maxY : 0;
    if (dx || dy) {
      this.focus = [this.focus[0] + dx / s, this.focus[1] + dy / s];
      this.clampFocus();
    }
  }
  focusOn(p: [number, number], zoom: number, offset: [number, number] = [0, 0]) {
    this.zoom = Math.min(this.maxZoom(), Math.max(1, zoom));
    // offset: onde o ponto deve ficar na tela, em fração do tamanho da tela a partir do centro.
    const s = this.cover() * this.zoom * (this.mode === "cobrir" ? LOOK_MARGIN : 1);
    this.focus = [p[0] - (offset[0] * this.view.w) / s, p[1] - (offset[1] * this.view.h) / s];
    this.clampFocus();
  }
  private home(): [number, number] {
    return this.mode === "caber" ? [FIT.cx, FIT.cy] : [ART.w / 2, ART.h / 2];
  }
  center() {
    this.focus = this.home();
    this.clampFocus();
  }
  overview() {
    this.zoom = 1;
    this.focus = this.home();
    this.clampFocus();
  }
  /** Interpola até o alvo; devolve a transformação atual (escala e deslocamento em px de tela). */
  step(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);
    const kk = this.reduced ? 1 : 1 - Math.exp(-dt * 3.4);
    // O olhar acompanha o cursor/dedo em sincronia com a arma (sem atraso); ao soltar, volta suave.
    // Saindo de cima de um card, o olhar volta suave (0,3 s) e depois segue sem atraso.
    this.resume = Math.max(0, this.resume - dt);
    const sync = this.screenPointer && !this.locked && this.resume <= 0;
    const kp = this.hold ? 0 : this.reduced || sync ? 1 : 1 - Math.exp(-dt * 12);
    this.focusNow[0] += (this.focus[0] - this.focusNow[0]) * kk;
    this.focusNow[1] += (this.focus[1] - this.focusNow[1]) * kk;
    this.zoomNow += (this.zoom - this.zoomNow) * kk;
    this.pointerNow[0] += (this.pointer[0] - this.pointerNow[0]) * kp;
    this.pointerNow[1] += (this.pointer[1] - this.pointerNow[1]) * kp;
    // Margem para o parallax nunca mostrar a borda da arte (só quando ela cobre a tela).
    const s = this.cover() * this.zoomNow * (this.mode === "cobrir" ? LOOK_MARGIN : 1);
    // Câmera olha para onde o cursor/dedo aponta: usa toda a folga da arte além da tela.
    const look = this.reduced || this.locked ? 0 : 1;
    const w = ART.w * s;
    const h = ART.h * s;
    // Celular em pé: a arte espelhada preenche as bordas, então a câmera pode virar além dela.
    const caber = this.mode === "caber";
    const panX = caber ? this.view.w * 0.32 : Math.max(0, (w - this.view.w) / 2);
    const panY = caber ? this.view.h * 0.1 : Math.max(0, (h - this.view.h) / 2);
    let tx = this.view.w / 2 - this.focusNow[0] * s - this.pointerNow[0] * panX * look;
    let ty = this.cy() - this.focusNow[1] * s - this.pointerNow[1] * panY * look;
    // Computador: nunca mostrar a borda da arte (quando ela é maior que a tela).
    if (!caber && w >= this.view.w) tx = Math.min(0, Math.max(this.view.w - w, tx));
    if (!caber && h >= this.view.h) ty = Math.min(0, Math.max(this.view.h - h, ty));
    return { s, tx, ty };
  }
  /** Retângulo visível, normalizado (0..1) na arte — para o radar. */
  visible(t: { s: number; tx: number; ty: number }) {
    const x = Math.max(0, -t.tx / t.s / ART.w);
    const y = Math.max(0, -t.ty / t.s / ART.h);
    return { x, y, w: Math.min(1 - x, this.view.w / t.s / ART.w), h: Math.min(1 - y, this.view.h / t.s / ART.h) };
  }
}

export interface ImageStageProps {
  cam: PlateCamera;
  territories: Territory[];
  selected: string | null;
  selectedTopic: string | null;
  /** Placas HTML (fora da camada que escala), posicionadas a cada quadro. */
  labels: React.RefObject<Map<string, HTMLElement>>;
  /** Posição de cada assunto (leque em volta da placa da matéria), em px de tela relativos à placa. */
  topicOffsets: Map<string, [number, number]>;
  onView: (rect: { x: number; y: number; w: number; h: number }) => void;
  /** Para onde o soldado mira (ponto da arte): matéria em foco ou sob o cursor. */
  aim: React.RefObject<[number, number] | null>;
  /** Mira travada: animação de mira a laser e foco total na matéria escolhida. */
  lock: React.RefObject<{ at: number; target: [number, number]; label: string } | null>;
  onSelect: (t: Territory) => void;
  onSelectCore: () => void;
  onSelectTopic: (t: Territory, topic: MapTopic) => void;
}

export function ImageStage({ cam, territories, selected, labels, topicOffsets, onView, onSelect, onSelectCore, aim, lock }: ImageStageProps) {
  const rifle = useRef<HTMLDivElement>(null);
  const scope = useRef<HTMLDivElement>(null);
  const lockBox = useRef<HTMLDivElement>(null);
  const laser = useRef<HTMLCanvasElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const holder = useRef<HTMLDivElement>(null);
  const embers = useRef<HTMLCanvasElement>(null);
  const flash = useRef<HTMLDivElement>(null);

  // Laço de animação: câmera, placas, brasas e relâmpagos. Pausa sozinho com a aba oculta (rAF).
  useEffect(() => {
    const el = holder.current;
    const ly = layer.current;
    const cv = embers.current;
    if (!el || !ly || !cv) return;
    const ctx = cv.getContext("2d");
    // Aparelhos mais fracos/celular: menos partículas, canvas em 1x e efeitos a ~30 fps.
    const light = window.innerWidth < 900 || (navigator.hardwareConcurrency ?? 8) <= 4;
    // Geometria do fuzil em px de tela: só muda com o tamanho da tela (nada de layout por quadro).
    const rg = { s0: 1, tx0: 0, ty0: 0 };
    const resize = () => {
      const r = el.getBoundingClientRect();
      cam.setView(r.width, r.height);
      el.dataset.enquadramento = cam.mode;
      // Fumaça e brasas são macias: meia resolução (o CSS estica) = 4x menos para pintar e enviar à tela.
      const dpr = 0.5;

      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (cam.mode === "caber") {
        // Celular em pé: braços e fuzil grandes na parte de baixo da tela, apontando para o mapa.
        const rw = Math.min(cam.view.w * 1.55, cam.view.h * 0.95);
        rg.s0 = rw / RIFLE.w;
        // Boca do cano a ~1/3 da largura e logo abaixo do mapa.
        const left = cam.view.w * 0.32 - (RIFLE.muzzle[0] - RIFLE.x) * rg.s0;
        const top = Math.min(cam.view.h * 0.66 - (RIFLE.muzzle[1] - RIFLE.y) * rg.s0, cam.view.h - RIFLE.vh * rg.s0 * 0.8);
        rg.tx0 = left - RIFLE.x * rg.s0;
        rg.ty0 = top - RIFLE.y * rg.s0;
      } else {
        rg.s0 = cam.cover() * RIFLE_SCALE;
        rg.tx0 = cam.view.w / 2 - (ART.w / 2) * rg.s0;
        rg.ty0 = cam.view.h / 2 - (ART.h / 2) * rg.s0;
      }
      const rf = rifle.current;
      if (rf) {
        rf.style.left = `${(RIFLE.x * rg.s0 + rg.tx0).toFixed(1)}px`;
        rf.style.top = `${(RIFLE.y * rg.s0 + rg.ty0).toFixed(1)}px`;
        rf.style.width = `${(RIFLE.w * rg.s0).toFixed(1)}px`;
        rf.style.height = `${(RIFLE.h * rg.s0).toFixed(1)}px`;
        rf.style.transformOrigin = `${((RIFLE.pivot[0] - RIFLE.x) * rg.s0).toFixed(1)}px ${((RIFLE.pivot[1] - RIFLE.y) * rg.s0).toFixed(1)}px`;
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const N = light ? 36 : 70;
    let seed = 17;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const parts = Array.from({ length: N }, () => ({ x: rnd(), y: rnd(), v: 0.02 + rnd() * 0.05, r: 0.6 + rnd() * 1.6, a: 0.3 + rnd() * 0.7, d: (rnd() - 0.5) * 0.02 }));
    let last = performance.now();
    let raf = 0;
    let nextFlash = 5 + rnd() * 6;
    let flashT = 0;
    // Mira do soldado (ângulo e deslocamento atuais, suavizados).
    let aimA = 0;
    let aimX = 0;
    let aimY = 0;
    // Fumaça: sprite macio gerado uma vez; cada fonte solta baforadas que sobem e se espalham.
    const sprite = document.createElement("canvas");
    sprite.width = sprite.height = 128;
    const sg = sprite.getContext("2d");
    if (sg) {
      for (let i = 0; i < 26; i++) {
        const x = 64 + (rnd() - 0.5) * 60;
        const y = 64 + (rnd() - 0.5) * 60;
        const r = 16 + rnd() * 34;
        const g = sg.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, "rgba(120,112,108,0.07)");
        g.addColorStop(1, "rgba(120,112,108,0)");
        sg.fillStyle = g;
        sg.fillRect(0, 0, 128, 128);
      }
    }
    const PER = light ? 3 : 4;
    // Brasa e fogo pré-desenhados (sem criar gradientes a cada quadro).
    const mk = (r: number, stops: Array<[number, string]>) => {
      const c = document.createElement("canvas");
      c.width = c.height = r * 2;
      const g2 = c.getContext("2d");
      if (g2) {
        const g = g2.createRadialGradient(r, r, 0, r, r, r);
        for (const [o, col] of stops) g.addColorStop(o, col);
        g2.fillStyle = g;
        g2.fillRect(0, 0, r * 2, r * 2);
      }
      return c;
    };
    const ember = mk(16, [
      [0, "rgba(255,180,100,1)"],
      [0.35, "rgba(255,110,40,0.6)"],
      [1, "rgba(255,60,20,0)"],
    ]);
    const fireSpr = mk(64, [
      [0, "rgba(255,170,60,0.6)"],
      [0.5, "rgba(255,70,20,0.24)"],
      [1, "rgba(255,40,0,0)"],
    ]);
    let frame = 0;
    let fxDt = 0;
    // Tamanho das placas sem forçar layout: o observador avisa quando muda.
    const sizes = new WeakMap<HTMLElement, [number, number]>();
    const observed = new WeakSet<HTMLElement>();
    const plateRo = new ResizeObserver((entries) => {
      for (const e of entries) {
        const box = e.borderBoxSize?.[0];
        const w = box ? box.inlineSize : e.contentRect.width;
        const h = box ? box.blockSize : e.contentRect.height;
        sizes.set(e.target as HTMLElement, [Math.ceil(w / 2), Math.ceil(h / 2)]);
      }
    });
    // Só escreve no DOM quando o valor muda (menos recálculo de estilo por quadro).
    const setVis = (elx: HTMLElement, v: string) => {
      if (elx.style.visibility !== v) elx.style.visibility = v;
    };
    const setOp = (elx: HTMLElement, v: string) => {
      if (elx.style.opacity !== v) elx.style.opacity = v;
    };
    let lastView = "";
    let laserDirty = true;
    let lastRifle = "";
    const puffs = SMOKE.flatMap((src, i) => Array.from({ length: PER }, (_, j) => ({ i, u: j / PER + rnd() * 0.08, sp: 0.03 + rnd() * 0.025, rot: rnd() * 6.28, dr: (rnd() - 0.5) * 0.2 })));
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const t = cam.step(dt);
      ly.style.transform = `translate3d(${t.tx.toFixed(2)}px, ${t.ty.toFixed(2)}px, 0) scale(${t.s.toFixed(5)})`;
      const map = labels.current;
      // Meia largura/altura das placas: medidas pelo ResizeObserver (nunca lidas no laço).
      if (map && frame % 60 === 0)
        for (const [key, elp] of map) {
          if (key.startsWith("t:") && !observed.has(elp)) {
            observed.add(elp);
            plateRo.observe(elp);
          }
        }
      if (map) {
        for (const tr of territories) {
          const sl = slotFor(tr.id);
          const x = sl.plate[0] * t.s + t.tx;
          const y = sl.plate[1] * t.s + t.ty;
          const elp = map.get(`t:${tr.id}`);
          if (elp) {
            // No celular a placa nunca vaza da tela: fica presa às bordas.
            const sz = sizes.get(elp);
            const half = sz ? sz[0] : cam.mode === "caber" ? 56 : 0;
            const cx = half ? Math.min(cam.view.w - half - 6, Math.max(half + 6, x)) : x;
            elp.style.transform = `translate3d(${cx.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            // Linha de luz ligando a placa à instalação no chão (sem desfoque, só gradiente).
            const lead = map.get(`l:${tr.id}`);
            if (lead) {
              const top = y + (sz ? sz[1] : 22);
              const bottom = sl.base[1] * t.s + t.ty;
              const len = Math.max(0, bottom - top);
              const bx = sl.base[0] * t.s + t.tx;
              const ang = Math.atan2(bx - cx, len || 1);
              lead.style.transform = `translate3d(${cx.toFixed(1)}px, ${top.toFixed(1)}px, 0) rotate(${(-ang).toFixed(4)}rad) scaleY(${(Math.hypot(len, bx - cx) / 100).toFixed(4)})`;
              setOp(lead, elp.dataset.dim !== undefined || len < 4 ? "0" : "1");
            }
            setVis(elp, x < -260 || x > cam.view.w + 260 || y < -120 || y > cam.view.h + 120 ? "hidden" : "visible");
          }
          for (const tp of tr.topics) {
            const ea = map.get(`a:${tp.id}`);
            const off = topicOffsets.get(tp.id);
            if (!ea || !off) continue;
            const bx = sl.base[0] * t.s + t.tx;
            const by = sl.base[1] * t.s + t.ty;
            ea.style.transform = `translate3d(${(bx + off[0]).toFixed(1)}px, ${(by + off[1]).toFixed(1)}px, 0)`;
            setVis(ea, "visible");
          }
        }
      }
      const vr = cam.visible(t);
      const vk = `${vr.x.toFixed(3)}:${vr.y.toFixed(3)}:${vr.w.toFixed(3)}:${vr.h.toFixed(3)}`;
      if (vk !== lastView) {
        lastView = vk;
        onView(vr);
      }
      // Fumaça, fogo e brasas (canvas leve, em coordenadas de tela); no modo leve, um quadro sim, outro não.
      frame++;
      fxDt += dt;
      // Efeitos a ~30 qps em qualquer tela (60, 90 ou 120 Hz): fumaça e brasas não pedem mais que isso.
      if (ctx && !cam.reduced && fxDt >= (light ? 1 / 24 : 1 / 30)) {
        const fdt = fxDt;
        fxDt = 0;
        const w = cam.view.w;
        const h = cam.view.h;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "source-over";
        for (const p of puffs) {
          const src = SMOKE[p.i]!;
          p.u += p.sp * fdt * (src.kind === "nevoa" ? 0.45 : 1);
          if (p.u > 1) p.u -= 1;
          const col = src.kind === "coluna";
          const ax = src.x + (col ? p.u * 260 + Math.sin(p.u * 6 + p.i) * 30 : (p.u - 0.5) * 900);
          const ay = src.y - (col ? p.u * 420 : Math.sin(p.u * 3.14) * 40);
          const size = src.size * (col ? 1 + p.u * 2.4 : 2) * t.s * 1.8;
          const x = ax * t.s + t.tx;
          const y = ay * t.s + t.ty;
          if (x < -size || x > w + size || y < -size || y > h + size) continue;
          ctx.globalAlpha = Math.sin(Math.PI * p.u) * (col ? 0.75 : 0.4);
          // Sem girar (num borrão macio não se vê) e sem save/restore: bem mais barato por baforada.
          ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "lighter";
        for (const [fx, fy, fr] of FIRES) {
          const fl = 0.75 + Math.sin(now / 90 + fx) * 0.12 + Math.sin(now / 37 + fy) * 0.08;
          const x = fx * t.s + t.tx;
          const y = fy * t.s + t.ty;
          const r = fr * t.s * 2 * fl;
          ctx.globalAlpha = Math.min(1, fl);
          ctx.drawImage(fireSpr, x - r, y - r, r * 2, r * 2);
        }
        for (const p of parts) {
          p.y -= p.v * fdt;
          p.x += p.d * fdt + Math.sin(now / 900 + p.r * 9) * 0.0004;
          if (p.y < -0.02) {
            p.y = 1.02;
            p.x = rnd();
          }
          const px = p.x * w;
          const py = p.y * h;
          ctx.globalAlpha = p.a;
          ctx.drawImage(ember, px - p.r * 3, py - p.r * 3, p.r * 6, p.r * 6);
        }
        ctx.globalAlpha = 1;
      }
      // Soldado em primeira pessoa: fica no enquadramento da tela (não entra no zoom) e gira o
      // fuzil para mirar na matéria em foco (ou sob o cursor), sem precisar aproximar.
      const rf = rifle.current;
      if (rf) {
        const { s0, tx0, ty0 } = rg;
        const px = RIFLE.pivot[0] * s0 + tx0;
        const py = RIFLE.pivot[1] * s0 + ty0;
        const mx = RIFLE.muzzle[0] * s0 + tx0;
        const my = RIFLE.muzzle[1] * s0 + ty0;
        const lk = lock.current;
        if (lk && lk.at < 0) lk.at = now;
        // Prioridade: mira travada > cursor/dedo exato > matéria em foco.
        const sp = cam.screenPointer;
        let target: [number, number] | null = null;
        if (lk) target = [lk.target[0] * t.s + t.tx, lk.target[1] * t.s + t.ty];
        else if (sp) target = sp;
        else if (aim.current) target = [aim.current[0] * t.s + t.tx, aim.current[1] * t.s + t.ty];
        // Ao travar a mira o soldado sobe a arma (como quem mira pela mira).
        const since = lk ? now - lk.at : 1e9;
        // Sobe a arma ao mirar e, com o alvo travado, abaixa um pouco para liberar a vista.
        const raise = lk ? Math.min(1, since / 350) : 0;
        const settle = lk ? Math.max(0, Math.min(1, (since - 1300) / 500)) : 0;
        // Braço e fuzil FIXOS no quadro (primeira pessoa): quem vira é a câmera. Só a mira travada
        // sobe e abaixa a arma um pouco (o recorte continua fora da tela nesse movimento).
        const breathe = 0;
        const sway = 0;
        // Nenhum movimento do braço ao clicar/tocar (nem ao travar a mira): ele é fixo.
        const wantY = 0 * (raise + settle);
        const ka = cam.reduced ? 1 : 1 - Math.exp(-dt * 9);
        aimA += (0 - aimA) * ka;
        aimX += (0 - aimX) * ka;
        aimY += (wantY - aimY) * ka;
        const rt = `translate3d(${aimX.toFixed(1)}px, ${(aimY + breathe).toFixed(1)}px, 0) rotate(${(aimA + sway).toFixed(4)}rad)`;
        if (rt !== lastRifle) {
          lastRifle = rt;
          rf.style.transform = rt;
        }

        // Laser, luneta e marcação de alvo travado.
        const lc = laser.current;
        const lctx = lc && (lk || laserDirty) ? lc.getContext("2d") : null;
        if (lc && lctx) {
          if (lc.width !== Math.round(cam.view.w) || lc.height !== Math.round(cam.view.h)) {
            lc.width = Math.round(cam.view.w);
            lc.height = Math.round(cam.view.h);
          }
          // Sem mira travada a tela do laser fica vazia: limpa uma vez e para de desenhar.
          lctx.clearRect(0, 0, lc.width, lc.height);
          laserDirty = !!lk;
          lc.style.display = lk ? "" : "none";
          if (lk && target) {
            // Boca do cano depois da rotação do fuzil.
            const a = aimA + sway;
            const vx = mx - px;
            const vy = my - py;
            const bx = px + vx * Math.cos(a) - vy * Math.sin(a) + aimX;
            const by = py + vx * Math.sin(a) + vy * Math.cos(a) + aimY + breathe;
            const grow = Math.min(1, since / 380);
            const ex = bx + (target[0] - bx) * grow;
            const ey = by + (target[1] - by) * grow;
            const alpha = since < 1600 ? 1 : 0.55;
            lctx.lineCap = "round";
            lctx.strokeStyle = `rgba(255,40,40,${0.25 * alpha})`;
            lctx.lineWidth = 7;
            lctx.beginPath();
            lctx.moveTo(bx, by);
            lctx.lineTo(ex, ey);
            lctx.stroke();
            lctx.strokeStyle = `rgba(255,90,90,${0.95 * alpha})`;
            lctx.lineWidth = 1.6;
            lctx.stroke();
            if (grow >= 1) {
              const pulse = 5 + Math.sin(now / 120) * 1.5;
              lctx.fillStyle = `rgba(255,60,60,${0.9 * alpha})`;
              lctx.beginPath();
              lctx.arc(ex, ey, pulse * 0.6, 0, Math.PI * 2);
              lctx.fill();
              lctx.strokeStyle = `rgba(255,120,120,${0.6 * alpha})`;
              lctx.lineWidth = 1;
              lctx.beginPath();
              lctx.arc(ex, ey, pulse * 2.2, 0, Math.PI * 2);
              lctx.stroke();
            }
          }
        }
        const sc = scope.current;
        if (sc) {
          // Luneta: entra durante a aproximação e sai quando o foco termina.
          const o = lk && !cam.reduced ? (since < 250 ? 0 : since < 550 ? (since - 250) / 300 : since < 1200 ? 1 : since < 1600 ? 1 - (since - 1200) / 400 : 0) : 0;
          sc.style.opacity = o.toFixed(3);
          if (o > 0 && target) sc.style.transform = `translate3d(${target[0].toFixed(1)}px, ${target[1].toFixed(1)}px, 0) scale(${(1.25 - 0.25 * Math.min(1, since / 900)).toFixed(3)})`;
        }
        const lb = lockBox.current;
        if (lb) {
          const o = lk && target && since > 350 ? Math.min(1, (since - 350) / 300) : 0;
          lb.style.opacity = o.toFixed(3);
          if (o > 0 && target) {
            lb.style.transform = `translate3d(${target[0].toFixed(1)}px, ${target[1].toFixed(1)}px, 0) scale(${(1 + Math.max(0, 1 - (since - 350) / 400) * 0.6).toFixed(3)})`;
            if (lk && lb.dataset.label !== lk.label) {
              lb.dataset.label = lk.label;
              const tag = lb.querySelector("b");
              if (tag) tag.textContent = lk.label;
            }
          }
        }
      }
      // Relâmpago ocasional nas nuvens.
      if (!cam.reduced && flash.current) {
        nextFlash -= dt;
        if (nextFlash <= 0) {
          flashT = 1;
          nextFlash = 8 + rnd() * 10;
        }
        flashT = Math.max(0, flashT - dt * (flashT > 0.5 ? 5 : 1.8));
        flash.current.style.opacity = (flashT * (0.55 + 0.45 * Math.sin(now / 16))).toFixed(3);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      plateRo.disconnect();
    };
  }, [cam, territories, labels, topicOffsets, onView, aim, lock]);

  return (
    <div ref={holder} className="km-art" aria-hidden>
      {/* Fundo desfocado: completa a tela no celular, quando o mapa inteiro é enquadrado. */}
      <div className="km-art-fill" style={{ backgroundImage: `url(${ART.srcSm})` }} />
      <div ref={layer} className="km-art-layer" style={{ width: ART.w, height: ART.h }}>
        {/* Celular em pé: a arte continua espelhada nas bordas e preenche a tela toda, sem emenda. */}
        {MIRRORS.map(([dx, dy]) => (
          <span
            key={`${dx}:${dy}`}
            className="km-art-mirror"
            data-lado={dy < 0 ? "cima" : dy > 0 ? "baixo" : "lado"}
            style={{ left: dx * ART.w, top: dy * ART.h, width: ART.w, height: ART.h, backgroundImage: `url(${ART.srcSm})`, transform: `scale(${dx ? -1 : 1}, ${dy ? -1 : 1})` }}
          />
        ))}
        <picture>
          <source media="(max-width: 700px)" srcSet={ART.srcSm} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.src} alt="" width={ART.w} height={ART.h} draggable={false} className="km-art-img" />
        </picture>
        {/* Feixe e pulsos do núcleo (clicável). */}
        <button type="button" tabIndex={-1} className="km-art-core" data-pick="" style={{ left: CORE[0], top: CORE[1] }} onClick={onSelectCore} aria-hidden>
          <i />
          <i />
          <i />
        </button>
        <span className="km-art-beam" style={{ left: CORE[0], top: 0, height: CORE[1] }} />
        {territories.map((t) => {
          const sl = slotFor(t.id);
          return (
            <button
              key={t.id}
              type="button"
              tabIndex={-1}
              aria-hidden
              className="km-art-base"
              data-pick=""
              data-drawn={sl.drawn ? "1" : undefined}
              data-sel={selected === t.id ? "1" : undefined}
              data-vazio={t.topics.length ? undefined : "1"}
              style={{ left: sl.base[0], top: sl.base[1], ["--c" as string]: t.color }}
              onClick={() => onSelect(t)}
            >
              <i />
              <i />
              <b />
            </button>
          );
        })}
        <div ref={flash} className="km-art-flash" />
      </div>
      <canvas ref={embers} className="km-art-embers" />
      <canvas ref={laser} className="km-laser" />
      <div ref={scope} className="km-scope">
        <i />
      </div>
      <div ref={lockBox} className="km-lock">
        <span />
        <span />
        <span />
        <span />
        <em>Alvo travado</em>
        <b />
      </div>
      <div ref={rifle} className="km-rifle">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={RIFLE.src} alt="" draggable={false} />
      </div>
    </div>
  );
}
