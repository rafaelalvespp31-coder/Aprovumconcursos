"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as PE } from "react";
import { COOKIE_INTRO } from "./intro-constantes";
import "./intro-mentor.css";

/** Instante (s) em que a placa "Começar a estudar" já está inteira na tela e o botão passa a valer. */
const PLACA_PRONTA = 5.4;

/**
 * Abertura antes da Central, em vídeo (8 s): o Mentor de braços cruzados ergue a placa "Começar a estudar", que fica na tela.
 * Entra em modo cinema (barras que abrem, vinheta, grão de filme, dolly lento). A placa é o botão: ao tocar nela, a câmera
 * avança contra o rosto, a onda de choque sai da placa, o clarão vermelho cobre a tela e a Central (caveira com a esfera) emerge do preto.
 * Sem autoplay (ou com movimento reduzido) mostra o último quadro, já com a placa ativa.
 */
export function IntroMentor({ aoRevelar, aoFim }: { aoRevelar: () => void; aoFim: () => void }) {
  const [etapa, setEtapa] = useState<"espera" | "indo" | "revela">("espera");
  const [ondas, setOndas] = useState<{ id: number; x: number; y: number }[]>([]);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const cenaRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [pronto, setPronto] = useState(false); // primeiro quadro do vídeo na tela: a abertura "acende"
  const [placa, setPlaca] = useState(false); // placa inteira: o botão vale
  const [estatico, setEstatico] = useState(false); // sem vídeo (movimento reduzido ou autoplay barrado): vale o último quadro
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
    const v = videoRef.current;
    if (!v) return;
    const parar = () => { v.pause(); setEstatico(true); setPronto(true); setPlaca(true); };
    let t: ReturnType<typeof setTimeout>;
    if (reduzido()) {
      t = setTimeout(parar, 0);
    } else {
      v.muted = true;
      v.play().catch(() => { t = setTimeout(parar, 0); }); // autoplay barrado: fica o último quadro, com a placa ativa
      t = setTimeout(() => setPronto(true), 2800); // rede lenta: não segura a tela preta
    }
    return () => clearTimeout(t);
  }, []);

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
    <div className="hm-intro" data-etapa={etapa} data-pronto={pronto ? "" : undefined} data-estatico={estatico ? "" : undefined} role="region" aria-label="Abertura">
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
            <video
              ref={videoRef}
              className="hm-intro-arte"
              src="/home/abertura/mentor.mp4"
              poster="/home/abertura/poster.webp"
              muted
              playsInline
              autoPlay
              preload="auto"
              aria-label="Mentor Aprovum ergue a placa Começar a estudar"
              onLoadedData={() => setPronto(true)}
              onTimeUpdate={(e) => { if (e.currentTarget.currentTime >= PLACA_PRONTA) setPlaca(true); }}
              onEnded={() => setPlaca(true)}
              onError={() => { setPronto(true); setPlaca(true); }}
            />
            {/* último quadro por baixo: se o vídeo falhar ou o navegador não tocar, a placa continua aparecendo */}
            <div className="hm-intro-final" aria-hidden />
            <div className="hm-intro-luzhomem" aria-hidden />
          </div>
          {ondas.map((w) => <i key={w.id} className="hm-intro-toque" aria-hidden style={{ left: w.x, top: w.y }} />)}
          <button ref={botaoRef} type="button" className="hm-intro-botao" data-pronto={placa ? "" : undefined} onClick={comecar} disabled={etapa !== "espera" || !placa} aria-label="Começar a estudar"
            onPointerMove={botaoMover} onPointerDown={botaoMover} onPointerLeave={botaoSair}>
            <span className="hm-intro-brilho" aria-hidden />
            <span className="hm-intro-luz" aria-hidden />
            <span className="hm-intro-pulso" aria-hidden />
          </button>
        </div>
      </div>
      {/* modo cinema: vinheta, grão de filme, reflexo e barras que se abrem quando o primeiro quadro chega */}
      <div className="hm-intro-cine" data-pronto={pronto ? "" : undefined} aria-hidden>
        <i className="hm-cine-vinheta" /><i className="hm-cine-graos" /><i className="hm-cine-reflexo" />
        <i className="hm-cine-faixa hm-cine-faixa-c" /><i className="hm-cine-faixa hm-cine-faixa-b" />
      </div>
      {etapa === "espera" && !placa && <button type="button" className="hm-intro-pular" onClick={() => setPlaca(true)}>Pular</button>}
      <div className="hm-intro-linhas" aria-hidden />
      <div className="hm-intro-onda" aria-hidden />
      <div className="hm-intro-clarao" aria-hidden />
      <div className="hm-intro-barra hm-intro-barra-c" aria-hidden />
      <div className="hm-intro-barra hm-intro-barra-b" aria-hidden />
      <div className="hm-intro-preto" aria-hidden />
    </div>
  );
}
