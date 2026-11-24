"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import { COOKIE_INTRO } from "./intro-constantes";
import "./intro-mentor.css";

/** Quanto tempo a caveira leva para cobrir a tela (ida) e para recuar (volta), em segundos. */
const T_IDA = 0.95;
const T_VOLTA = 0.55;
/** No toque, a caveira fica um instante depois que o dedo sai e então recua. */
const SEGURA_TOQUE_MS = 1300;

const suave = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/** Neon do ícone de play: coordenadas em que o anel desenhado na arte tem raio 100 e o centro é (0,0). */
function NeonPlay() {
  return (
    <svg className="hm-neon" viewBox="-125 -125 250 250" aria-hidden focusable="false">
      <defs>
        <filter id="hmn-glow" x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.4" result="a" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="b" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="11" result="c" />
          <feMerge><feMergeNode in="c" /><feMergeNode in="b" /><feMergeNode in="a" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id="hmn-bloom" r="50%">
          <stop offset="0" stopColor="#ff2a35" stopOpacity="0.34" />
          <stop offset="0.55" stopColor="#ff2a35" stopOpacity="0.12" />
          <stop offset="1" stopColor="#ff2a35" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hmn-fill" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#ff3b44" stopOpacity="0.05" />
          <stop offset="1" stopColor="#ff6a5c" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      <circle className="hm-neon-bloom" r="118" fill="url(#hmn-bloom)" />
      <circle className="hm-neon-pulso" r="64" />
      <circle className="hm-neon-pulso hm-neon-pulso-2" r="64" />

      {/* anel externo de marcas e arcos que giram em sentidos opostos */}
      <circle className="hm-neon-marcas" r="116" pathLength="120" />
      <circle className="hm-neon-arcos" r="109" pathLength="100" />

      {/* arco de varredura com cauda e o ponto que orbita */}
      <g className="hm-neon-varre" filter="url(#hmn-glow)">
        <circle className="hm-neon-cauda" r="100" pathLength="100" />
        <circle className="hm-neon-arco" r="100" pathLength="100" />
        <circle className="hm-neon-ponto" cx="100" cy="0" r="3.4" />
      </g>

      {/* triângulo em tubo de neon: contorno aceso, luz que corre e falha rara de tensão */}
      <g className="hm-neon-play" filter="url(#hmn-glow)">
        <polygon className="hm-neon-miolo" points="-15,-47 59,-5 -15,42" />
        <polygon className="hm-neon-tubo" points="-15,-47 59,-5 -15,42" />
        <polygon className="hm-neon-corre" points="-15,-47 59,-5 -15,42" pathLength="100" />
      </g>
    </svg>
  );
}

/**
 * Abertura antes da Central: o retrato e o "Começar a estudar". Passando o mouse (ou arrastando o dedo) sobre o homem,
 * a caveira abre a partir do ponto tocado e cobre o retrato; ao sair, recua. Ao tocar no botão, a câmera avança contra o
 * rosto, a onda de choque sai do botão, o clarão vermelho cobre a tela e a Central do Mentor emerge do preto.
 */
export function IntroMentor({ aoRevelar, aoFim }: { aoRevelar: () => void; aoFim: () => void }) {
  const [etapa, setEtapa] = useState<"espera" | "indo" | "revela">("espera");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cenaRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const etapaRef = useRef(etapa);
  useEffect(() => { etapaRef.current = etapa; }, [etapa]);

  /** Estado da transição da caveira, fora do React para não re-renderizar a cada quadro. */
  const rev = useRef({ alvo: 0, p: 0, x: 0, y: 0, raf: 0, ultimo: 0, segura: 0 as unknown as ReturnType<typeof setTimeout> });

  const desenhar = useCallback(() => {
    const el = cenaRef.current;
    if (!el) return;
    const r = rev.current;
    const w = el.clientWidth;
    const h = el.clientHeight;
    const maxR = Math.hypot(Math.max(r.x, w - r.x), Math.max(r.y, h - r.y)) * 1.08;
    const e = suave(r.p);
    el.style.setProperty("--px", `${r.x.toFixed(1)}px`);
    el.style.setProperty("--py", `${r.y.toFixed(1)}px`);
    el.style.setProperty("--r", `${(e * maxR).toFixed(1)}px`);
    el.style.setProperty("--aro", `${Math.sin(Math.min(1, r.p) * Math.PI).toFixed(3)}`);
    el.dataset.trans = r.p > 0.01 && r.p < 0.985 ? "1" : "0";
    el.dataset.caveira = r.p >= 0.985 ? "1" : "0";
  }, []);

  const mirar = useCallback((alvo: 0 | 1, x?: number, y?: number) => {
    const r = rev.current;
    if (x !== undefined && y !== undefined) { r.x = x; r.y = y; }
    r.alvo = alvo;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { r.p = alvo; desenhar(); return; }
    function quadro(agora: number) {
      const dt = Math.min(0.05, (agora - (r.ultimo || agora)) / 1000);
      r.ultimo = agora;
      if (r.p < r.alvo) r.p = Math.min(r.alvo, r.p + dt / T_IDA);
      else if (r.p > r.alvo) r.p = Math.max(r.alvo, r.p - dt / T_VOLTA);
      desenhar();
      r.raf = r.p !== r.alvo ? requestAnimationFrame(quadro) : 0;
    }
    if (!r.raf) { r.ultimo = 0; r.raf = requestAnimationFrame(quadro); }
    else desenhar();
  }, [desenhar]);

  useEffect(() => {
    const t = timers.current;
    const r = rev.current;
    return () => { t.forEach(clearTimeout); clearTimeout(r.segura); if (r.raf) cancelAnimationFrame(r.raf); };
  }, []);

  const posicao = (e: PE<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  const sobreBotao = (e: PE<HTMLDivElement>) => !!(e.target as Element).closest(".hm-intro-botao");

  const aoMover = (e: PE<HTMLDivElement>) => {
    if (etapaRef.current !== "espera") return;
    if (e.pointerType === "touch" && e.buttons === 0) return;
    if (sobreBotao(e)) { if (e.pointerType === "mouse") mirar(0); return; }
    clearTimeout(rev.current.segura);
    const { x, y } = posicao(e);
    mirar(1, x, y);
  };
  const aoTocar = (e: PE<HTMLDivElement>) => {
    if (etapaRef.current !== "espera" || sobreBotao(e)) return;
    clearTimeout(rev.current.segura);
    const { x, y } = posicao(e);
    mirar(1, x, y);
  };
  const aoSoltar = (e: PE<HTMLDivElement>) => {
    if (e.pointerType === "mouse") return;
    clearTimeout(rev.current.segura);
    rev.current.segura = setTimeout(() => mirar(0), SEGURA_TOQUE_MS);
  };
  const aoSair = (e: PE<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    mirar(0);
  };

  /** Botão: luz que segue o dedo/mouse e leve inclinação 3D. */
  const botaoMover = (e: PE<HTMLButtonElement>) => {
    const el = botaoRef.current;
    if (!el || etapaRef.current !== "espera") return;
    const b = el.getBoundingClientRect();
    const fx = (e.clientX - b.left) / b.width;
    const fy = (e.clientY - b.top) / b.height;
    el.style.setProperty("--mx", `${(fx * 100).toFixed(1)}%`);
    el.style.setProperty("--my", `${(fy * 100).toFixed(1)}%`);
    if (e.pointerType === "mouse") {
      el.style.setProperty("--ry", `${((fx - 0.5) * 5).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - fy) * 7).toFixed(2)}deg`);
    }
  };
  const botaoSair = () => {
    const el = botaoRef.current;
    if (!el) return;
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--rx", "0deg");
  };

  const comecar = () => {
    if (etapa !== "espera") return;
    try { document.cookie = `${COOKIE_INTRO}=1; path=/; SameSite=Lax`; } catch { /* sem cookies: a abertura volta na próxima visita */ }
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    clearTimeout(rev.current.segura);
    rev.current.alvo = 0;
    rev.current.p = 0;
    desenhar();
    setEtapa("indo");
    if (navigator.vibrate) { try { navigator.vibrate(18); } catch { /* sem vibração */ } }
    const tRevela = reduzir ? 140 : 1350;
    timers.current.push(setTimeout(() => { setEtapa("revela"); aoRevelar(); }, tRevela));
    timers.current.push(setTimeout(aoFim, tRevela + (reduzir ? 260 : 900)));
  };

  return (
    <div className="hm-intro" data-etapa={etapa} role="region" aria-label="Abertura">
      <div className="hm-intro-fundo" aria-hidden />
      <div
        className="hm-intro-cena"
        ref={cenaRef}
        data-trans="0"
        data-caveira="0"
        style={{ "--px": "50%", "--py": "35%", "--r": "0px", "--aro": "0" } as CSSProperties}
        onPointerEnter={aoMover}
        onPointerMove={aoMover}
        onPointerDown={aoTocar}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onPointerLeave={aoSair}
      >
        <div className="hm-intro-zoom">
          <div className="hm-intro-retrato" aria-hidden={false}>
            {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa da abertura; WebP já otimizado em public/home */}
            <img className="hm-intro-arte" src="/home/intro-mentor.webp" alt="Mentor Aprovum, de braços cruzados, pronto para começar" width={941} height={1672} fetchPriority="high" decoding="async" draggable={false} />
            {/* eslint-disable-next-line @next/next/no-img-element -- idem: a caveira que abre sobre o retrato */}
            <img className="hm-intro-caveira" src="/home/intro-caveira.webp" alt="" aria-hidden width={941} height={1672} decoding="async" draggable={false} />
          </div>
          <div className="hm-intro-aro" aria-hidden />
          <button ref={botaoRef} type="button" className="hm-intro-botao" onClick={comecar} disabled={etapa !== "espera"} aria-label="Começar a estudar"
            onPointerMove={botaoMover} onPointerDown={botaoMover} onPointerLeave={botaoSair}>
            <span className="hm-intro-brilho" aria-hidden />
            <span className="hm-intro-luz" aria-hidden />
            <span className="hm-intro-icone" aria-hidden><NeonPlay /></span>
          </button>
        </div>
      </div>
      <div className="hm-intro-linhas" aria-hidden />
      <div className="hm-intro-onda" aria-hidden />
      <div className="hm-intro-clarao" aria-hidden />
      <div className="hm-intro-barra hm-intro-barra-c" aria-hidden />
      <div className="hm-intro-barra hm-intro-barra-b" aria-hidden />
      <div className="hm-intro-preto" aria-hidden />
    </div>
  );
}
