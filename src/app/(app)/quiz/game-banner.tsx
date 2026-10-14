"use client";

import { useEffect, useRef, useState } from "react";
import { Crosshair, Flame, Heart, Target, Trophy } from "lucide-react";

const MASCOT = "/icons/instrutor-caveira.png";

/** Falas do Instrutor ao tocar nele (motivação; sem dados inventados). */
const LINES = [
  "Missão dada é missão cumprida.",
  "A banca troca uma palavra. Você não cai.",
  "Literalidade é munição. Carregue.",
  "Errar no treino é barato. Na prova, não.",
  "Foco no artigo. O resto é ruído.",
  "Cada lacuna certa é terreno conquistado.",
];

/**
 * Banner do Modo Jogo: título em estêncil, Instrutor que reage ao toque,
 * leve inclinação 3D e mira que segue o dedo/mouse, e o placar da rodada ao vivo.
 */
export function GameBanner({
  topicTitle,
  discipline,
  idx,
  total,
  hearts,
  lives,
  xp,
  streak,
  pct,
  started,
  onStart,
  onPickTarget,
}: {
  topicTitle: string;
  discipline: string;
  idx: number;
  total: number;
  hearts: number;
  lives: number;
  xp: number;
  streak: number;
  pct: number;
  started: boolean;
  onStart: () => void;
  onPickTarget: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const [line, setLine] = useState<number | null>(null);
  const [shown, setShown] = useState(xp);
  const [bump, setBump] = useState(false);

  // XP sobe contando quando muda.
  const prev = useRef(xp);
  useEffect(() => {
    const from = prev.current;
    prev.current = xp;
    if (from === xp) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - t0) / 700);
      setShown(Math.round(from + (xp - from) * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame((t) => {
      setBump(true);
      setTimeout(() => setBump(false), 450);
      tick(t);
    });
    return () => cancelAnimationFrame(raf);
  }, [xp]);

  // Inclinação 3D + mira que segue o ponteiro (desligado para quem prefere menos movimento).
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--x", `${x * 100}%`);
    el.style.setProperty("--y", `${y * 100}%`);
    el.style.setProperty("--rx", `${(0.5 - y) * 5}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 7}deg`);
    el.style.setProperty("--spot", "1");
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--spot", "0");
  };

  const talk = () => setLine((l) => (l === null ? Math.floor(Math.random() * LINES.length) : (l + 1) % LINES.length));
  const done = Math.min(idx, total);

  return (
    <section
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className="jogo-banner relative overflow-hidden rounded-[30px] bg-black ring-1 ring-white/10 transition-transform duration-300 ease-out [transform:perspective(1100px)_rotateX(var(--rx,0deg))_rotateY(var(--ry,0deg))] will-change-transform"
      aria-label="Modo Jogo"
      data-testid="jogo-banner"
    >
      {/* Fundo: brilho vermelho, grade tática, linhas de varredura e mira que segue o ponteiro */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_20%,rgba(225,6,0,0.55),transparent_55%),radial-gradient(ellipse_at_10%_100%,rgba(120,0,0,0.6),transparent_60%)]" aria-hidden />
      <div className="jogo-grid pointer-events-none absolute inset-0" aria-hidden />
      <div className="jogo-scan pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{ opacity: "var(--spot, 0)", background: "radial-gradient(220px circle at var(--x,50%) var(--y,50%), rgba(255,60,48,0.22), transparent 70%)" }}
        aria-hidden
      />

      <div className="relative flex gap-3 p-5 sm:p-7 md:items-center md:gap-6">
        <div className="min-w-0 flex-1">
          <div className="pr-[112px] min-[400px]:pr-[124px] md:pr-0">
          <p className="font-hud flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#FF4D4D] sm:text-[12px] sm:tracking-[0.28em]">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#FF3B30] opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[#FF3B30]" />
            </span>
            Operação • {discipline}
          </p>
          <h2 className="font-stencil jogo-glitch mt-2 text-[40px] leading-[0.9] tracking-[0.02em] text-white [text-shadow:0_0_24px_rgba(255,30,30,0.55)] min-[400px]:text-[46px] sm:text-[64px] lg:text-[76px]" data-text="MODO JOGO">
            MODO JOGO
          </h2>
          </div>
          <p className="font-hud mt-2 line-clamp-2 text-[15px] font-semibold text-white/85 sm:text-[17px]">Alvo: {topicTitle}</p>
          <div className="mt-2 flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10 sm:max-w-56" role="progressbar" aria-label="Domínio do tema" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-gradient-to-r from-[#FF3B30] to-[#E10600] transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="font-hud shrink-0 text-[12px] font-semibold text-white/60">{pct}% dominado</span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onStart}
              className="jogo-shine font-hud flex min-h-12 items-center gap-2 rounded-[14px] bg-[#E10600] px-4 text-[14px] font-bold uppercase tracking-[0.12em] sm:px-6 sm:text-[15px] sm:tracking-[0.16em] text-white shadow-[0_10px_30px_rgba(225,6,0,0.45)] transition-transform hover:-translate-y-0.5 active:scale-95"
            >
              <Crosshair className="h-5 w-5" aria-hidden /> {started ? "Continuar missão" : "Iniciar missão"}
            </button>
            <button
              type="button"
              onClick={onPickTarget}
              className="font-hud flex min-h-12 items-center gap-2 rounded-[14px] px-3.5 text-[12.5px] font-bold uppercase tracking-[0.12em] text-white/80 sm:px-4 sm:text-[13px] sm:tracking-[0.16em] ring-1 ring-white/20 transition-colors hover:bg-white/10 hover:text-white"
            >
              <Target className="h-4 w-4" aria-hidden /> Trocar alvo
            </button>
          </div>
          <p className="font-hud mt-3 min-h-[2.5rem] text-[13.5px] font-semibold leading-snug" role="status" aria-live="polite">
            {line !== null ? (
              <span key={line} className="comic-pop inline-block rounded-[12px] rounded-tl-[4px] bg-white px-3 py-2 text-black shadow-lg">
                <span className="text-[#C40000]">Instrutor:</span> {LINES[line]}
              </span>
            ) : (
              <span className="text-white/45">Toque no Instrutor Caveira para ouvir uma ordem.</span>
            )}
          </p>
        </div>

        {/* Instrutor: toque para ouvir */}
        <div className="absolute right-3 top-3 h-[118px] w-[104px] min-[400px]:h-[132px] min-[400px]:w-[118px] md:relative md:right-auto md:top-auto md:h-[230px] md:w-[250px] md:shrink-0 md:self-center">
          <div className="jogo-radar pointer-events-none absolute inset-3 rounded-full bg-[conic-gradient(from_0deg,rgba(255,59,48,0.35),transparent_35%)]" aria-hidden />
          <div className="pointer-events-none absolute inset-3 rounded-full ring-1 ring-[#FF3B30]/30" aria-hidden />
          <div className="pointer-events-none absolute inset-8 rounded-full ring-1 ring-[#FF3B30]/20 md:inset-12" aria-hidden />
          <button type="button" onClick={talk} className="group absolute inset-0 flex items-center justify-center rounded-full" aria-label="Falar com o Instrutor Caveira">
            <span className="jogo-eyes pointer-events-none absolute left-1/2 top-[52%] h-6 w-16 -translate-x-1/2 rounded-full bg-[#FF1E1E] blur-xl md:h-10 md:w-28 md:blur-2xl" aria-hidden />
            <img src={MASCOT} alt="" className="relative h-[92%] w-auto drop-shadow-[0_18px_30px_rgba(0,0,0,0.7)] transition-transform duration-300 group-hover:scale-105 group-active:scale-95" />
          </button>
        </div>
      </div>

      {/* HUD da rodada */}
      <div className="relative grid grid-cols-2 gap-px border-t border-white/10 bg-white/10 sm:grid-cols-4">
        <Hud label="Missão">
          <span className="text-[20px] font-bold tabular-nums">{Math.min(done + 1, total)}<span className="text-white/45">/{total}</span></span>
          <span className="mt-1.5 flex gap-[3px]" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span key={i} className={`h-1.5 flex-1 rounded-full ${i < done ? "bg-[#FF3B30]" : i === done ? "bg-white" : "bg-white/15"}`} />
            ))}
          </span>
        </Hud>
        <Hud label="Vidas">
          <span className="flex items-center gap-1" aria-label={`${hearts} de ${lives} vidas`}>
            {Array.from({ length: lives }, (_, i) => (
              <Heart key={i} className={`h-5 w-5 transition-all duration-300 ${i < hearts ? "fill-[#FF3B30] text-[#FF3B30]" : "scale-90 text-white/25"}`} aria-hidden />
            ))}
          </span>
        </Hud>
        <Hud label="Ofensiva">
          <span className="flex items-center gap-1.5 text-[20px] font-bold tabular-nums">
            <Flame className="h-5 w-5 text-[#FF3B30]" aria-hidden /> {streak} <span className="text-[13px] font-semibold text-white/55">{streak === 1 ? "dia" : "dias"}</span>
          </span>
        </Hud>
        <Hud label="Pontos">
          <span className={`flex items-center gap-1.5 text-[20px] font-bold tabular-nums transition-transform duration-300 ${bump ? "scale-110 text-[#FF4D4D]" : ""}`}>
            <Trophy className="h-5 w-5 text-[#FF3B30]" aria-hidden /> {shown} <span className="text-[13px] font-semibold text-white/55">XP</span>
          </span>
        </Hud>
      </div>
    </section>
  );
}

function Hud({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="font-hud flex min-h-[74px] flex-col justify-center bg-black/80 px-4 py-3 text-white">
      <span className="text-[10.5px] font-semibold uppercase tracking-[0.24em] text-white/50">{label}</span>
      <span className="mt-1">{children}</span>
    </div>
  );
}
