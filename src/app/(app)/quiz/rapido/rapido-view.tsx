"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, Check, ChevronRight, Flame, RotateCcw, Sparkles, X, Zap } from "lucide-react";
import type { RapidoCheck, RapidoHome, RapidoItem, RapidoMode, RapidoRound } from "@/server/services/quiz-rapido";
import { checkRapidoAction, startRapidoAction } from "./actions";

type Phase = "home" | "play" | "result";

interface Scope {
  discipline: string | null;
  label: string;
  mode: RapidoMode;
}

const press = "transition-[transform,background-color,border-color,box-shadow] duration-150 ease-out active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100";

/** Anel de acerto da tela de resultado. */
function Anel({ pct }: { pct: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const [on, setOn] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOn(true));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <svg viewBox="0 0 128 128" className="h-36 w-36 -rotate-90" aria-hidden>
      <circle cx="64" cy="64" r={r} fill="none" stroke="#EDEEF1" strokeWidth="12" />
      <circle cx="64" cy="64" r={r} fill="none" stroke="#E10600" strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={on ? c * (1 - pct / 100) : c} className="transition-[stroke-dashoffset] duration-700 ease-out motion-reduce:transition-none" />
    </svg>
  );
}

export interface RapidoApi {
  start: typeof startRapidoAction;
  check: typeof checkRapidoAction;
}

/** `api` existe para a galeria de desenvolvimento usar dados de exemplo; em produção vale o padrão (ações do servidor). */
export function RapidoView({ home, api = { start: startRapidoAction, check: checkRapidoAction } }: { home: RapidoHome; api?: RapidoApi }) {
  const [phase, setPhase] = useState<Phase>("home");
  const [round, setRound] = useState<RapidoRound | null>(null);
  const [scope, setScope] = useState<Scope | null>(null);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [check, setCheck] = useState<RapidoCheck | null>(null);
  const [results, setResults] = useState<boolean[]>([]);
  const [xpTotal, setXpTotal] = useState(0);
  const [run, setRun] = useState(0);
  const [bestRun, setBestRun] = useState(0);
  const [levelUp, setLevelUp] = useState<RapidoCheck["levelUp"]>(null);
  const [level, setLevel] = useState(home.level);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shownAt = useRef(0);

  const begin = useCallback(
    (s: Scope) => {
      setError(null);
      start(async () => {
        const res = await api.start(s.discipline, s.mode);
        if (!res.ok) {
          setError(res.error);
          setPhase("home");
          return;
        }
        setRound(res.round);
        setScope({ discipline: res.round.scope.discipline, label: res.round.scope.label, mode: res.round.scope.mode });
        setLevel(res.round.level);
        setIdx(0);
        setPicked(null);
        setCheck(null);
        setResults([]);
        setXpTotal(0);
        setRun(0);
        setBestRun(0);
        setLevelUp(null);
        shownAt.current = Date.now();
        setPhase("play");
      });
    },
    [api],
  );

  const item: RapidoItem | undefined = round?.items[idx];
  const total = round?.items.length ?? 0;

  const verify = useCallback(() => {
    if (!item || !picked || check || pending) return;
    const ms = Date.now() - shownAt.current;
    start(async () => {
      const res = await api.check(item.key, picked, ms);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setError(null);
      const c = res.check;
      setCheck(c);
      setResults((r) => [...r, c.correct]);
      setXpTotal((x) => x + c.xp);
      setRun((r) => {
        const n = c.correct ? r + 1 : 0;
        setBestRun((b) => Math.max(b, n));
        return n;
      });
      setLevel(c.level);
      if (c.levelUp) setLevelUp(c.levelUp);
    });
  }, [item, picked, check, pending, api]);

  const next = useCallback(() => {
    if (!check) return;
    if (idx + 1 >= total) {
      setPhase("result");
      return;
    }
    setIdx((i) => i + 1);
    setPicked(null);
    setCheck(null);
    shownAt.current = Date.now();
  }, [check, idx, total]);

  // Teclado: 1-5 / V / F escolhem; Enter verifica e continua.
  useEffect(() => {
    if (phase !== "play" || !item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "Enter") {
        e.preventDefault();
        if (check) next();
        else verify();
        return;
      }
      if (check) return;
      if (item.kind === "vf") {
        if (e.key.toLowerCase() === "v") setPicked("v");
        if (e.key.toLowerCase() === "f") setPicked("f");
      } else {
        const n = Number(e.key);
        if (n >= 1 && n <= item.options.length) setPicked(item.options[n - 1]!.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, item, check, next, verify]);

  const hits = results.filter(Boolean).length;
  const pct = total ? Math.round((hits / total) * 100) : 0;

  // -------------------------------------------------------------- home
  if (phase === "home") {
    const left = home.total - home.done;
    return (
      <div className="mx-auto max-w-3xl space-y-5" data-testid="rapido-home">
        <Link href="/quiz" className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-[#64666D] hover:text-[#08090B]">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Modo Jogo
        </Link>
        <section className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-[#0B0B0B] via-[#1A0404] to-[#520505] p-6 text-white shadow-[0_24px_60px_-28px_rgba(225,6,0,0.55)]">
          <div className="pointer-events-none absolute inset-0 opacity-[0.12]" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "18px 18px" }} aria-hidden />
          <div className="relative">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/65">Modo Jogo</p>
            <h1 className="mt-1.5 font-[Space_Grotesk] text-[32px] font-[800] leading-none tracking-[-0.02em]">Desafio rápido</h1>
            <p className="mt-2 max-w-md text-[13.5px] text-white/80">Dez perguntas curtas por rodada, de todas as matérias. Responda, veja o porquê na hora e suba de patente.</p>
            <div className="mt-4 flex flex-wrap gap-2 text-[12px] font-bold">
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5">{home.level.patente} · nível {home.level.level}</span>
              <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 tabular-nums">{left.toLocaleString("pt-BR")} perguntas novas</span>
            </div>
            <button type="button" onClick={() => begin({ discipline: null, label: "Todas as matérias", mode: "novas" })} disabled={pending || left === 0} className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#E10600] px-6 text-[15px] font-extrabold text-white shadow-[0_10px_24px_-10px_rgba(225,6,0,0.9)] hover:bg-[#C70500] disabled:opacity-60 sm:w-auto ${press}`} data-testid="rapido-misto">
              <Zap className="h-5 w-5" aria-hidden /> {pending ? "Preparando…" : "Jogar com todas as matérias"}
            </button>
          </div>
        </section>

        {error && (
          <p role="alert" className="rounded-[14px] border border-[#E10600]/30 bg-[#E10600]/5 px-4 py-3 text-[13px] font-semibold text-[#9B0400]" data-testid="rapido-erro">
            {error}
          </p>
        )}

        {home.wrong > 0 && (
          <button type="button" onClick={() => begin({ discipline: null, label: "Revisão de erros", mode: "erros" })} disabled={pending} className={`flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-[#E6E7EB] bg-white px-4 text-left hover:border-[#E10600]/50 ${press}`} data-testid="rapido-revisar">
            <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-[#E10600]/10 text-[#E10600]">
              <RotateCcw className="h-5 w-5" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-[14px] font-extrabold text-[#08090B]">Revisar meus erros</span>
              <span className="block text-[12px] text-[#64666D]">{home.wrong} {home.wrong === 1 ? "pergunta para refazer" : "perguntas para refazer"}</span>
            </span>
            <ChevronRight className="h-5 w-5 text-[#9A9CA3]" aria-hidden />
          </button>
        )}

        <h2 className="pt-1 font-[Space_Grotesk] text-[18px] font-[800] text-[#08090B]">Por matéria</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="rapido-materias">
          {home.disciplines.map((d) => {
            const p = d.total ? Math.round((d.done / d.total) * 100) : 0;
            const novas = d.total - d.done;
            return (
              <li key={d.slug}>
                <button type="button" onClick={() => begin({ discipline: d.slug, label: d.label, mode: "novas" })} disabled={pending || novas === 0} className={`w-full rounded-[18px] border border-[#E6E7EB] bg-white p-4 text-left hover:border-[#E10600]/50 disabled:opacity-60 ${press}`}>
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="text-[14.5px] font-extrabold leading-tight text-[#08090B]">{d.label}</span>
                    <span className="text-[11.5px] font-semibold tabular-nums text-[#64666D]">{novas.toLocaleString("pt-BR")} novas</span>
                  </span>
                  <span className="mt-3 block h-2 overflow-hidden rounded-full bg-[#EDEEF1]" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso em ${d.label}`}>
                    <span className="block h-full rounded-full bg-[#E10600]" style={{ width: `${p}%` }} />
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // -------------------------------------------------------------- resultado
  if (phase === "result") {
    const msg = pct >= 90 ? "Missão cumprida com louvor." : pct >= 70 ? "Bom ritmo. Continue." : pct >= 50 ? "No caminho. Revise os erros." : "Errar no treino é barato. Refaça.";
    return (
      <div className="mx-auto max-w-md space-y-5 text-center" data-testid="rapido-resultado">
        <div className="rounded-[28px] border border-[#E6E7EB] bg-white p-6 shadow-[0_18px_40px_-28px_rgba(8,9,11,0.35)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#64666D]">{scope?.label}</p>
          <div className="relative mx-auto mt-3 grid h-36 w-36 place-items-center">
            <div className="absolute inset-0">
              <Anel pct={pct} />
            </div>
            <div>
              <p className="font-[Space_Grotesk] text-[40px] font-[800] leading-none tabular-nums text-[#08090B]">{hits}<span className="text-[22px] text-[#9A9CA3]">/{total}</span></p>
            </div>
          </div>
          <p className="mt-3 font-[Space_Grotesk] text-[19px] font-[800] text-[#08090B]">{msg}</p>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-[14px] bg-[#F7F8FA] p-3">
              <dt className="text-[10.5px] font-bold uppercase tracking-wider text-[#64666D]">XP</dt>
              <dd className="font-[Space_Grotesk] text-[20px] font-[800] tabular-nums text-[#E10600]">+{xpTotal}</dd>
            </div>
            <div className="rounded-[14px] bg-[#F7F8FA] p-3">
              <dt className="text-[10.5px] font-bold uppercase tracking-wider text-[#64666D]">Acerto</dt>
              <dd className="font-[Space_Grotesk] text-[20px] font-[800] tabular-nums text-[#08090B]">{pct}%</dd>
            </div>
            <div className="rounded-[14px] bg-[#F7F8FA] p-3">
              <dt className="text-[10.5px] font-bold uppercase tracking-wider text-[#64666D]">Sequência</dt>
              <dd className="font-[Space_Grotesk] text-[20px] font-[800] tabular-nums text-[#08090B]">{bestRun}</dd>
            </div>
          </dl>
          {levelUp ? (
            <p className="mt-4 rounded-[14px] bg-[#E10600]/10 px-3 py-2.5 text-[13px] font-extrabold text-[#9B0400]" data-testid="rapido-levelup">
              <Sparkles className="mr-1 inline h-4 w-4" aria-hidden /> Subiu de patente: {levelUp.patente} (nível {levelUp.to})
            </p>
          ) : (
            <p className="mt-4 text-[12.5px] text-[#64666D]">{level.patente} · faltam {level.toNext} respostas para o próximo nível.</p>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          <button type="button" onClick={() => scope && begin(scope)} disabled={pending} className={`inline-flex min-h-12 items-center justify-center rounded-full bg-[#E10600] px-6 text-[15px] font-extrabold text-white hover:bg-[#C70500] disabled:opacity-60 ${press}`} data-testid="rapido-outra">
            {pending ? "Preparando…" : "Nova rodada"}
          </button>
          {hits < total && (
            <button type="button" onClick={() => begin({ discipline: null, label: "Revisão de erros", mode: "erros" })} disabled={pending} className={`inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-[#E6E7EB] bg-white px-6 text-[14px] font-bold text-[#08090B] hover:border-[#E10600]/50 ${press}`}>
              <RotateCcw className="h-4 w-4" aria-hidden /> Revisar erros
            </button>
          )}
          <button type="button" onClick={() => { setPhase("home"); }} className="min-h-11 text-[13px] font-semibold text-[#64666D] hover:text-[#08090B]">
            Voltar às matérias
          </button>
        </div>
        {error && <p role="alert" className="text-[13px] font-semibold text-[#9B0400]">{error}</p>}
      </div>
    );
  }

  // -------------------------------------------------------------- jogo
  if (!item || !round) return null;
  const options = item.kind === "vf" ? [{ id: "v", text: "Verdadeiro" }, { id: "f", text: "Falso" }] : item.options;
  const barPct = Math.round(((idx + (check ? 1 : 0)) / total) * 100);
  return (
    <div className="mx-auto flex min-h-[70dvh] max-w-xl flex-col" data-testid="rapido-jogo">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setPhase("home")} className={`grid h-11 w-11 place-items-center rounded-full text-[#64666D] hover:bg-[#EDEEF1] ${press}`} aria-label="Sair da rodada">
          <X className="h-5 w-5" aria-hidden />
        </button>
        <div className="h-3 flex-1 overflow-hidden rounded-full bg-[#EDEEF1]" role="progressbar" aria-valuenow={barPct} aria-valuemin={0} aria-valuemax={100} aria-label="Progresso da rodada">
          <div className="h-full rounded-full bg-[#E10600] transition-[width] duration-300 ease-out motion-reduce:transition-none" style={{ width: `${barPct}%` }} />
        </div>
        <span className="flex items-center gap-1 text-[13px] font-extrabold tabular-nums text-[#E10600]" aria-live="polite">
          <Zap className="h-4 w-4" aria-hidden /> {xpTotal}
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#64666D]">
        <span>{item.discipline}</span>
        <span className="flex items-center gap-2 tabular-nums">
          {run >= 2 && (
            <span className="flex items-center gap-1 text-[#E10600]" data-testid="rapido-streak">
              <Flame className="h-3.5 w-3.5" aria-hidden /> {run}
            </span>
          )}
          {idx + 1}/{total}
        </span>
      </div>

      <div key={item.key} className="rp-in mt-3">
        <h2 className="font-[Space_Grotesk] text-[22px] font-[800] leading-snug tracking-[-0.01em] text-[#08090B] sm:text-[24px]" data-testid="rapido-enunciado">
          {item.kind === "vf" && <span className="mb-1.5 block text-[11.5px] font-bold uppercase tracking-[0.14em] text-[#64666D]">Verdadeiro ou falso?</span>}
          {item.prompt}
        </h2>
        <p className="mt-1.5 text-[12px] text-[#9A9CA3]">{item.subject}</p>

        <ul className="mt-5 space-y-2.5" role="radiogroup" aria-label="Alternativas">
          {options.map((o, i) => {
            const selected = picked === o.id;
            const isRight = !!check && check.correctId === o.id;
            const isWrongPick = !!check && selected && !check.correct;
            const base = "flex w-full min-h-14 items-center gap-3 rounded-[16px] border-2 px-4 py-3 text-left text-[15px] font-semibold leading-snug";
            const tone = check
              ? isRight
                ? "border-[#12A150] bg-[#12A150]/10 text-[#0B6B35]"
                : isWrongPick
                  ? "border-[#E10600] bg-[#E10600]/10 text-[#9B0400]"
                  : "border-[#E6E7EB] bg-white text-[#9A9CA3]"
              : selected
                ? "border-[#E10600] bg-[#E10600]/5 text-[#08090B] shadow-[0_6px_16px_-10px_rgba(225,6,0,0.7)]"
                : "border-[#E6E7EB] bg-white text-[#08090B] hover:border-[#C9CAD0]";
            return (
              <li key={o.id}>
                <button type="button" role="radio" aria-checked={selected} disabled={!!check} onClick={() => setPicked(o.id)} className={`${base} ${tone} ${press} ${isWrongPick ? "rp-shake" : ""}`} data-testid={item.kind === "vf" ? `rapido-${o.id}` : `rapido-op-${i + 1}`}>
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 text-[12px] font-extrabold ${check ? (isRight ? "border-[#12A150] bg-[#12A150] text-white" : isWrongPick ? "border-[#E10600] bg-[#E10600] text-white" : "border-[#E6E7EB]") : selected ? "border-[#E10600] bg-[#E10600] text-white" : "border-[#D5D6DB] text-[#64666D]"}`} aria-hidden>
                    {check && isRight ? <Check className="h-4 w-4" /> : check && isWrongPick ? <X className="h-4 w-4" /> : item.kind === "vf" ? o.id.toUpperCase() : i + 1}
                  </span>
                  <span className="flex-1">{o.text}</span>
                </button>
              </li>
            );
          })}
        </ul>
        {error && <p role="alert" className="mt-3 text-[13px] font-semibold text-[#9B0400]">{error}</p>}
      </div>

      <div className={`mt-5 rounded-[20px] border-2 p-4 transition-colors duration-200 motion-reduce:transition-none ${check ? (check.correct ? "border-[#12A150]/40 bg-[#EAF7EF]" : "border-[#E10600]/30 bg-[#FDECEB]") : "border-transparent bg-transparent p-0"}`}>
        <div>
          {check && (
            <div className="rp-in mb-3" role="status" aria-live="polite" data-testid="rapido-feedback">
              <p className={`flex items-center gap-2 font-[Space_Grotesk] text-[18px] font-[800] ${check.correct ? "text-[#0B6B35]" : "text-[#9B0400]"}`}>
                {check.correct ? <Check className="h-5 w-5" aria-hidden /> : <X className="h-5 w-5" aria-hidden />}
                {check.correct ? (check.repeated ? "Certo!" : check.bonus ? `Certo! +${check.xp} XP (sequência +${check.bonus})` : `Certo! +${check.xp} XP`) : "Não foi dessa vez"}
              </p>
              {!check.correct && (
                <p className="mt-1 text-[13px] font-bold text-[#08090B]">
                  Resposta: <span className="font-semibold">{check.correctText}</span>
                </p>
              )}
              <p className="mt-1 text-[13px] leading-snug text-[#2B2D33]">{check.explanation}</p>
              {check.pickedNote && <p className="mt-1 text-[12px] text-[#64666D]">Sua escolha: {check.pickedNote}</p>}
            </div>
          )}
          <button type="button" onClick={check ? next : verify} disabled={!check && (!picked || pending)} className={`inline-flex min-h-12 w-full items-center justify-center rounded-full text-[15px] font-extrabold text-white disabled:cursor-not-allowed disabled:bg-[#D5D6DB] ${check ? (check.correct ? "bg-[#12A150] hover:bg-[#0E8744]" : "bg-[#E10600] hover:bg-[#C70500]") : "bg-[#E10600] hover:bg-[#C70500]"} ${press}`} data-testid={check ? "rapido-continuar" : "rapido-verificar"}>
            {check ? (idx + 1 >= total ? "Ver resultado" : "Continuar") : pending ? "Conferindo…" : "Verificar"}
          </button>
        </div>
      </div>
    </div>
  );
}
