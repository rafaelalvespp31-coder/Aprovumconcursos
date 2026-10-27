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

  setView(w: number, h: number) {
    this.view = { w: Math.max(1, w), h: Math.max(1, h) };
  }
  setReduced(v: boolean) {
    this.reduced = v;
  }
  setPointer(x: number, y: number) {
    this.pointer = [Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y))];
  }
  /** Escala que faz a arte cobrir a tela inteira (zoom 1). */
  cover() {
    return Math.max(this.view.w / ART.w, this.view.h / ART.h);
  }
  private clampFocus() {
    const s = this.cover() * this.zoom;
    const hw = this.view.w / 2 / s;
    const hh = this.view.h / 2 / s;
    this.focus = [Math.min(ART.w - hw, Math.max(hw, this.focus[0])), Math.min(ART.h - hh, Math.max(hh, this.focus[1]))];
  }
  zoomBy(f: number) {
    this.zoom = Math.min(2.6, Math.max(1, this.zoom * f));
    this.clampFocus();
  }
  pan(dxScreen: number, dyScreen: number) {
    const s = this.cover() * this.zoom;
    this.focus = [this.focus[0] - dxScreen / s, this.focus[1] - dyScreen / s];
    this.clampFocus();
  }
  focusOn(p: [number, number], zoom: number) {
    this.zoom = Math.min(2.6, Math.max(1, zoom));
    this.focus = [p[0], p[1]];
    this.clampFocus();
  }
  center() {
    this.focus = [ART.w / 2, ART.h / 2];
    this.clampFocus();
  }
  overview() {
    this.zoom = 1;
    this.focus = [ART.w / 2, ART.h / 2];
    this.clampFocus();
  }
  /** Interpola até o alvo; devolve a transformação atual (escala e deslocamento em px de tela). */
  step(dtRaw: number) {
    const dt = Math.min(dtRaw, 0.05);
    const kk = this.reduced ? 1 : 1 - Math.exp(-dt * 3.4);
    const kp = 1 - Math.exp(-dt * 3);
    this.focusNow[0] += (this.focus[0] - this.focusNow[0]) * kk;
    this.focusNow[1] += (this.focus[1] - this.focusNow[1]) * kk;
    this.zoomNow += (this.zoom - this.zoomNow) * kk;
    this.pointerNow[0] += (this.pointer[0] - this.pointerNow[0]) * kp;
    this.pointerNow[1] += (this.pointer[1] - this.pointerNow[1]) * kp;
    // Margem para o parallax nunca mostrar a borda da arte.
    const s = this.cover() * this.zoomNow * 1.035;
    const par = this.reduced ? 0 : 1;
    const tx = this.view.w / 2 - this.focusNow[0] * s - this.pointerNow[0] * 14 * par;
    const ty = this.view.h / 2 - this.focusNow[1] * s - this.pointerNow[1] * 9 * par;
    return { s, tx, ty };
  }
  /** Retângulo visível, normalizado (0..1) na arte — para o radar. */
  visible(t: { s: number; tx: number; ty: number }) {
    return { x: -t.tx / t.s / ART.w, y: -t.ty / t.s / ART.h, w: this.view.w / t.s / ART.w, h: this.view.h / t.s / ART.h };
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
  onSelect: (t: Territory) => void;
  onSelectCore: () => void;
  onSelectTopic: (t: Territory, topic: MapTopic) => void;
}

export function ImageStage({ cam, territories, selected, labels, topicOffsets, onView, onSelect, onSelectCore }: ImageStageProps) {
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
    const resize = () => {
      const r = el.getBoundingClientRect();
      cam.setView(r.width, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      cv.width = Math.round(r.width * dpr);
      cv.height = Math.round(r.height * dpr);
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    const N = window.innerWidth < 900 ? 70 : 150;
    let seed = 17;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const parts = Array.from({ length: N }, () => ({ x: rnd(), y: rnd(), v: 0.02 + rnd() * 0.05, r: 0.6 + rnd() * 1.6, a: 0.3 + rnd() * 0.7, d: (rnd() - 0.5) * 0.02 }));
    let last = performance.now();
    let raf = 0;
    let nextFlash = 5 + rnd() * 6;
    let flashT = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      const t = cam.step(dt);
      ly.style.transform = `translate3d(${t.tx.toFixed(2)}px, ${t.ty.toFixed(2)}px, 0) scale(${t.s.toFixed(5)})`;
      // Placas das matérias e dos assuntos (em px de tela).
      const map = labels.current;
      if (map) {
        for (const tr of territories) {
          const sl = slotFor(tr.id);
          const x = sl.plate[0] * t.s + t.tx;
          const y = sl.plate[1] * t.s + t.ty;
          const elp = map.get(`t:${tr.id}`);
          if (elp) {
            elp.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
            elp.style.visibility = x < -260 || x > cam.view.w + 260 || y < -120 || y > cam.view.h + 120 ? "hidden" : "visible";
          }
          for (const tp of tr.topics) {
            const ea = map.get(`a:${tp.id}`);
            const off = topicOffsets.get(tp.id);
            if (!ea || !off) continue;
            const bx = sl.base[0] * t.s + t.tx;
            const by = sl.base[1] * t.s + t.ty;
            ea.style.transform = `translate3d(${(bx + off[0]).toFixed(1)}px, ${(by + off[1]).toFixed(1)}px, 0)`;
            ea.style.visibility = "visible";
          }
        }
      }
      onView(cam.visible(t));
      // Brasas subindo (canvas leve).
      if (ctx && !cam.reduced) {
        const w = cam.view.w;
        const h = cam.view.h;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = "lighter";
        for (const p of parts) {
          p.y -= p.v * dt;
          p.x += p.d * dt + Math.sin(now / 900 + p.r * 9) * 0.0004;
          if (p.y < -0.02) {
            p.y = 1.02;
            p.x = rnd();
          }
          const px = p.x * w;
          const py = p.y * h;
          const g = ctx.createRadialGradient(px, py, 0, px, py, p.r * 3);
          g.addColorStop(0, `rgba(255,170,90,${p.a})`);
          g.addColorStop(1, "rgba(255,60,20,0)");
          ctx.fillStyle = g;
          ctx.fillRect(px - p.r * 3, py - p.r * 3, p.r * 6, p.r * 6);
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
    };
  }, [cam, territories, labels, topicOffsets, onView]);

  return (
    <div ref={holder} className="km-art" aria-hidden>
      <div ref={layer} className="km-art-layer" style={{ width: ART.w, height: ART.h }}>
        <picture>
          <source media="(max-width: 700px)" srcSet={ART.srcSm} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ART.src} alt="" width={ART.w} height={ART.h} draggable={false} className="km-art-img" />
        </picture>
        {/* Feixe e pulsos do núcleo (clicável). */}
        <button type="button" tabIndex={-1} className="km-art-core" style={{ left: CORE[0], top: CORE[1] }} onClick={onSelectCore} aria-hidden>
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
    </div>
  );
}
