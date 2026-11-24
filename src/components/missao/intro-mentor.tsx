"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import { COOKIE_INTRO } from "./intro-constantes";
import "./intro-mentor.css";

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
        <linearGradient id="hmn-radar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff3b44" stopOpacity="0" />
          <stop offset="1" stopColor="#ff6a5c" stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id="hmn-fill" x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#ff3b44" stopOpacity="0.05" />
          <stop offset="1" stopColor="#ff6a5c" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      <circle className="hm-neon-bloom" r="165" fill="url(#hmn-bloom)" />
      <circle className="hm-neon-pulso" r="64" />
      <circle className="hm-neon-pulso hm-neon-pulso-2" r="64" />

      {/* anel externo de marcas e arcos que giram em sentidos opostos */}
      <circle className="hm-neon-marcas" r="116" pathLength="120" />
      <circle className="hm-neon-arcos" r="109" pathLength="100" />

      {/* radar interno, anel de segmentos e faíscas em órbitas diferentes */}
      <path className="hm-neon-radar" d="M0 0 L88 0 A88 88 0 0 0 62.2 -62.2 Z" fill="url(#hmn-radar)" />
      <circle className="hm-neon-segmentos" r="80" pathLength="100" />
      <g className="hm-neon-faisca hm-neon-f1"><circle cx="92" cy="0" r="1.8" /></g>
      <g className="hm-neon-faisca hm-neon-f2"><circle cx="-76" cy="0" r="1.4" /></g>
      <g className="hm-neon-faisca hm-neon-f3"><circle cx="0" cy="-122" r="2" /></g>
      <g className="hm-neon-faisca hm-neon-f4"><circle cx="0" cy="104" r="1.3" /></g>

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
 * Abertura antes da Central: o retrato e o "Começar a estudar". O homem responde ao mouse e ao dedo (inclina em 3D, a luz
 * vermelha o acompanha, o toque solta uma onda) e o botão reage com luz, inclinação e ímã. Ao tocar no botão, a câmera
 * avança contra o rosto, a onda de choque sai do botão, o clarão vermelho cobre a tela e a Central emerge do preto.
 */
export function IntroMentor({ aoRevelar, aoFim }: { aoRevelar: () => void; aoFim: () => void }) {
  const [etapa, setEtapa] = useState<"espera" | "indo" | "revela">("espera");
  const [ondas, setOndas] = useState<{ id: number; x: number; y: number }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cenaRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const etapaRef = useRef(etapa);
  useEffect(() => { etapaRef.current = etapa; }, [etapa]);
  const idOnda = useRef(0);

  /** Posição suavizada do ponteiro (-1..1) e da luz; fora do React para não re-renderizar a cada quadro. */
  const mov = useRef({ alvoX: 0, alvoY: 0, x: 0, y: 0, luz: 0, alvoLuz: 0, lx: 50, ly: 35, raf: 0 });

  const reduzido = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const pintar = useCallback(() => {
    const el = cenaRef.current;
    if (!el) return;
    const m = mov.current;
    el.style.setProperty("--tx", m.x.toFixed(3));
    el.style.setProperty("--ty", m.y.toFixed(3));
    el.style.setProperty("--luz", m.luz.toFixed(3));
    el.style.setProperty("--lx", `${m.lx.toFixed(1)}%`);
    el.style.setProperty("--ly", `${m.ly.toFixed(1)}%`);
  }, []);

  const mirar = useCallback((x: number, y: number, luz: number) => {
    const m = mov.current;
    m.alvoX = x; m.alvoY = y; m.alvoLuz = luz;
    if (reduzido()) return;
    function quadro() {
      m.x += (m.alvoX - m.x) * 0.1;
      m.y += (m.alvoY - m.y) * 0.1;
      m.luz += (m.alvoLuz - m.luz) * 0.09;
      pintar();
      const parado = Math.abs(m.alvoX - m.x) < 0.002 && Math.abs(m.alvoY - m.y) < 0.002 && Math.abs(m.alvoLuz - m.luz) < 0.004;
      m.raf = parado ? 0 : requestAnimationFrame(quadro);
    }
    if (!m.raf) m.raf = requestAnimationFrame(quadro);
  }, [pintar]);

  useEffect(() => {
    const t = timers.current;
    const m = mov.current;
    return () => { t.forEach(clearTimeout); if (m.raf) cancelAnimationFrame(m.raf); };
  }, []);

  const dentro = (e: PE<HTMLDivElement>) => {
    const b = e.currentTarget.getBoundingClientRect();
    return { fx: (e.clientX - b.left) / b.width, fy: (e.clientY - b.top) / b.height, b };
  };
  const sobreBotao = (e: PE<HTMLDivElement>) => !!(e.target as Element).closest(".hm-intro-botao");

  const aoMover = (e: PE<HTMLDivElement>) => {
    if (etapaRef.current !== "espera") return;
    if (e.pointerType === "touch" && e.buttons === 0) return;
    const { fx, fy, b } = dentro(e);
    mov.current.lx = fx * 100; mov.current.ly = fy * 100;
    mirar((fx - 0.5) * 2, (fy - 0.5) * 2, sobreBotao(e) ? 0.25 : 1);
    // ímã: o botão se inclina para o mouse quando ele chega perto
    const bt = botaoRef.current;
    if (bt && e.pointerType === "mouse") {
      const r = bt.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const perto = Math.max(0, 1 - Math.hypot(dx, dy) / (b.width * 0.9));
      bt.style.setProperty("--bx", `${(dx * 0.035 * perto).toFixed(1)}px`);
      bt.style.setProperty("--by", `${(dy * 0.05 * perto).toFixed(1)}px`);
    }
  };
  const aoTocar = (e: PE<HTMLDivElement>) => {
    if (etapaRef.current !== "espera" || sobreBotao(e)) return;
    const { fx, fy, b } = dentro(e);
    mov.current.lx = fx * 100; mov.current.ly = fy * 100;
    mirar((fx - 0.5) * 2, (fy - 0.5) * 2, 1);
    const id = ++idOnda.current;
    setOndas((o) => [...o.slice(-2), { id, x: e.clientX - b.left, y: e.clientY - b.top }]);
    timers.current.push(setTimeout(() => setOndas((o) => o.filter((w) => w.id !== id)), 900));
    if (e.pointerType === "touch" && navigator.vibrate) { try { navigator.vibrate(6); } catch { /* sem vibração */ } }
  };
  const aoSoltar = (e: PE<HTMLDivElement>) => {
    if (e.pointerType === "mouse") return;
    timers.current.push(setTimeout(() => mirar(0, 0, 0), 700));
  };
  const aoSair = (e: PE<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    mirar(0, 0, 0);
    const bt = botaoRef.current;
    if (bt) { bt.style.setProperty("--bx", "0px"); bt.style.setProperty("--by", "0px"); }
  };

  /** Botão: luz que segue o dedo/mouse e inclinação 3D. */
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
    const reduzir = reduzido();
    mirar(0, 0, 0);
    setEtapa("indo");
    if (navigator.vibrate) { try { navigator.vibrate(18); } catch { /* sem vibração */ } }
    const tRevela = reduzir ? 140 : 1350;
    timers.current.push(setTimeout(() => { setEtapa("revela"); aoRevelar(); }, tRevela));
    timers.current.push(setTimeout(aoFim, tRevela + (reduzir ? 260 : 900)));
  };

  return (
    <div className="hm-intro" data-etapa={etapa} role="region" aria-label="Abertura">
      <div className="hm-intro-fundo" aria-hidden />
      {/* só em tela larga: o lema à esquerda e o que o app faz à direita, para a abertura ocupar a tela toda */}
      <div className="hm-intro-lado hm-intro-lado-e" aria-hidden>
        <p className="hm-intro-lema"><span>Sua preparação.</span><span>Seu próximo cargo.</span></p>
        <p className="hm-intro-sub">Estude com um Mentor que responde por voz, aulas passo a passo e questões no estilo da banca.</p>
      </div>
      <ul className="hm-intro-lado hm-intro-lado-d" aria-hidden>
        <li><b>01</b><span>Mentor por voz</span><small>Peça uma aula ou uma página e ele abre na hora.</small></li>
        <li><b>02</b><span>Aulas passo a passo</span><small>Contas no caderno, do jeito que se faz à mão.</small></li>
        <li><b>03</b><span>Modo Jogo</span><small>Treine por matéria, com patentes e ranking.</small></li>
      </ul>
      <div
        className="hm-intro-cena"
        ref={cenaRef}
        style={{ "--tx": "0", "--ty": "0", "--luz": "0", "--lx": "50%", "--ly": "35%" } as CSSProperties}
        onPointerEnter={aoMover}
        onPointerMove={aoMover}
        onPointerDown={aoTocar}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        onPointerLeave={aoSair}
      >
        <div className="hm-intro-zoom">
          <div className="hm-intro-retrato">
            {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa da abertura; WebP já otimizado em public/home */}
            <img className="hm-intro-arte" src="/home/intro-mentor.webp" alt="Mentor Aprovum, de braços cruzados, pronto para começar" width={941} height={1672} fetchPriority="high" decoding="async" draggable={false} />
            <div className="hm-intro-luzhomem" aria-hidden />
          </div>
          {ondas.map((w) => <i key={w.id} className="hm-intro-toque" aria-hidden style={{ left: w.x, top: w.y }} />)}
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
