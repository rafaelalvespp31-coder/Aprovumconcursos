"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, Crown, Medal, Trophy, X } from "lucide-react";
import type { QuizLevel, RankingRow } from "@/server/services/quiz";
import { rankingAction } from "./actions";

const MASCOT = "/icons/instrutor-caveira.png";

/** Divisas da patente (uma por nível, até 5; depois estrelas). */
function Insignia({ level, className = "" }: { level: number; className?: string }) {
  const chevrons = Math.min(5, level);
  const stars = Math.max(0, Math.min(3, level - 5));
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden>
      <defs>
        <linearGradient id="ins-g" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF3B30" />
          <stop offset="1" stopColor="#8A0000" />
        </linearGradient>
      </defs>
      <path d="M60 6 L108 26 V62 C108 88 86 106 60 114 C34 106 12 88 12 62 V26 Z" fill="#0B0B0B" stroke="url(#ins-g)" strokeWidth="5" />
      {Array.from({ length: chevrons }, (_, i) => (
        <path key={i} className="lvl-chevron" style={{ animationDelay: `${700 + i * 140}ms` }} d={`M32 ${44 + i * 11} L60 ${30 + i * 11} L88 ${44 + i * 11}`} fill="none" stroke="#FF3B30" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {Array.from({ length: stars }, (_, i) => (
        <path key={i} className="lvl-chevron" style={{ animationDelay: `${1400 + i * 140}ms` }} transform={`translate(${42 + i * 18 - (stars - 1) * 9 + 9} 96) scale(0.5)`} d="M0 -14 L4 -4 L15 -4 L6 3 L9 14 L0 7 L-9 14 L-6 3 L-15 -4 L-4 -4 Z" fill="#FFFFFF" />
      ))}
    </svg>
  );
}

/**
 * Popup de passagem de nível (animação + ranking) — ou só o ranking, quando aberto pelo botão.
 * Usa <dialog> nativo: foco preso no popup, Esc fecha.
 */
export function LevelUpDialog({
  open,
  levelUp,
  onClose,
  onNext,
  previewRows,
}: {
  open: boolean;
  levelUp: { from: QuizLevel; to: QuizLevel } | null;
  onClose: () => void;
  onNext?: () => void;
  /** Só na galeria: ranking de exemplo, sem consultar o servidor. */
  previewRows?: RankingRow[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [fetched, setFetched] = useState<RankingRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rows = previewRows ?? fetched;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      if (previewRows) return;
      let alive = true;
      rankingAction().then((r) => {
        if (!alive) return;
        if (r.ok) setFetched(r.rows);
        else setError(r.error);
      });
      return () => {
        alive = false;
      };
    }
    if (!open && d.open) d.close();
  }, [open, previewRows]);

  const close = () => {
    setFetched(null);
    setError(null);
    onClose();
  };

  const me = rows?.find((r) => r.isMe);
  const to = levelUp?.to;

  return (
    <dialog
      ref={ref}
      onClose={close}
      onCancel={close}
      className="m-auto w-[min(560px,calc(100vw-24px))] max-w-none overflow-visible bg-transparent p-0 outline-none focus-visible:outline-none text-white backdrop:bg-black/80 backdrop:backdrop-blur-sm"
      aria-label={to ? `Você subiu para o nível ${to.level}` : "Ranking do Modo Jogo"}
      data-testid="level-up"
    >
      {open && (
        <div className="relative max-h-[calc(100dvh-24px)] overflow-y-auto rounded-[30px] bg-[#0A0A0A] ring-1 ring-white/10">
          <button type="button" onClick={close} className="absolute right-3 top-3 z-10 rounded-full bg-white/10 p-2 hover:bg-white/20" aria-label="Fechar">
            <X className="h-5 w-5" aria-hidden />
          </button>

          {to ? (
            <div className="relative overflow-hidden px-6 pb-6 pt-8 text-center">
              {/* Raios girando e faíscas */}
              <div className="lvl-rays pointer-events-none absolute left-1/2 top-[120px] h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[repeating-conic-gradient(from_0deg,rgba(225,6,0,0.32)_0deg_9deg,transparent_9deg_24deg)] [mask-image:radial-gradient(circle,#000_15%,transparent_62%)]" aria-hidden />
              {Array.from({ length: 14 }, (_, i) => (
                <span
                  key={i}
                  className="lvl-spark pointer-events-none absolute left-1/2 top-[120px] h-2 w-2 rounded-[2px] bg-[#FF3B30]"
                  style={{ ["--a" as string]: `${(i / 14) * 360}deg`, ["--d" as string]: `${110 + (i % 4) * 26}px`, animationDelay: `${450 + (i % 5) * 60}ms` } as React.CSSProperties}
                  aria-hidden
                />
              ))}
              <p className="lvl-in font-hud relative text-[12px] font-semibold uppercase tracking-[0.32em] text-[#FF4D4D]">Promoção confirmada</p>
              <div className="lvl-pop relative mx-auto mt-3 h-[150px] w-[150px]">
                <Insignia level={to.level} className="h-full w-full drop-shadow-[0_0_30px_rgba(255,30,30,0.55)]" />
              </div>
              <p className="font-stencil relative mt-2 text-[20px] text-white/50">
                <span className="lvl-old inline-block">Nível {levelUp!.from.level}</span>
                <ArrowRight className="mx-2 inline h-5 w-5 align-[-2px] text-[#FF3B30]" aria-hidden />
              </p>
              <h2 className="lvl-big font-stencil relative text-[64px] leading-none text-white [text-shadow:0_0_30px_rgba(255,30,30,0.7)]">NÍVEL {to.level}</h2>
              <p className="lvl-in font-hud relative mt-2 text-[22px] font-bold uppercase tracking-[0.12em]" style={{ animationDelay: "900ms" }}>
                {to.patente}
              </p>
              <div className="lvl-in relative mx-auto mt-4 flex max-w-sm items-center gap-3 rounded-[16px] bg-gradient-to-br from-[#D90A00] to-[#6E0000] px-4 py-3 text-left" style={{ animationDelay: "1100ms" }}>
                <img src={MASCOT} alt="" className="h-11 w-11 shrink-0 rounded-full bg-black object-contain p-0.5" />
                <p className="font-hud text-[14px] font-semibold leading-snug">
                  Dificuldade agora: <strong className="font-bold">{to.tier.label}</strong> — {to.tier.description}. Cada acerto vale <strong>+{to.tier.xp} XP</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="px-6 pb-2 pt-8 text-center">
              <Trophy className="mx-auto h-10 w-10 text-[#FF3B30]" aria-hidden />
              <h2 className="font-stencil mt-2 text-[40px] leading-none">RANKING</h2>
              <p className="font-hud mt-1 text-[14px] text-white/60">Todos os alunos do APROVUM no Modo Jogo</p>
            </div>
          )}

          {/* Ranking */}
          <section className="px-4 pb-5 sm:px-6" aria-label="Ranking de todos os alunos">
            <div className="flex items-center justify-between">
              <h3 className="font-hud flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.2em] text-white/70">
                <Crown className="h-4 w-4 text-[#FF3B30]" aria-hidden /> Ranking geral
              </h3>
              {me && <span className="font-hud rounded-full bg-[#E10600] px-3 py-1 text-[12px] font-bold">Você: {me.pos}º</span>}
            </div>
            <ol className="mt-3 flex flex-col gap-2">
              {rows === null && !error && Array.from({ length: 5 }, (_, i) => <li key={i} className="h-[52px] animate-pulse rounded-[14px] bg-white/5" />)}
              {error && <li className="rounded-[14px] bg-white/5 px-4 py-3 text-[14px] text-white/70">{error}</li>}
              {rows?.length === 0 && <li className="rounded-[14px] bg-white/5 px-4 py-3 text-[14px] text-white/70">Ninguém pontuou ainda. Seja o primeiro.</li>}
              {rows?.map((r, i) => (
                <li
                  key={`${r.pos}-${r.name}-${i}`}
                  className={`lvl-row font-hud flex items-center gap-3 rounded-[14px] px-3 py-2.5 ${r.isMe ? "bg-gradient-to-r from-[#D90A00] to-[#7A0000] ring-2 ring-white/30" : "bg-[#141414] ring-1 ring-white/5"}`}
                  style={{ animationDelay: `${(to ? 1300 : 150) + i * 70}ms` }}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold ${r.pos === 1 ? "bg-[#F5C542] text-black" : r.pos === 2 ? "bg-[#C9CED6] text-black" : r.pos === 3 ? "bg-[#C47A3A] text-black" : r.isMe ? "bg-black/35" : "bg-white/10"}`}>
                    {r.pos <= 3 ? <Medal className="h-4 w-4" aria-label={`${r.pos}º lugar`} /> : r.pos}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-bold">{r.name}{r.isMe ? " (você)" : ""}</span>
                    <span className={`block text-[12px] ${r.isMe ? "text-white/80" : "text-white/50"}`}>{r.patente} • {r.answered} questões</span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-[17px] font-bold tabular-nums">{r.xp}</span>
                    <span className={`block text-[11px] ${r.isMe ? "text-white/80" : "text-white/50"}`}>XP</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="font-hud mt-3 text-center text-[11.5px] text-white/40">O ranking mostra só o primeiro nome e a inicial do sobrenome.</p>
          </section>

          <div className="sticky bottom-0 bg-gradient-to-t from-[#0A0A0A] via-[#0A0A0A] to-transparent px-4 pb-5 pt-3 sm:px-6">
            <button
              type="button"
              onClick={() => {
                setFetched(null);
                setError(null);
                (onNext ?? onClose)();
              }}
              className="jogo-shine font-hud flex min-h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-[#E10600] text-[15px] font-bold uppercase tracking-[0.14em] shadow-[0_10px_30px_rgba(225,6,0,0.45)] active:scale-[0.99]"
            >
              {to ? `Próxima missão • Nível ${to.level}` : "Voltar ao jogo"} <ArrowRight className="h-5 w-5" aria-hidden />
            </button>
          </div>
        </div>
      )}
    </dialog>
  );
}
