"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  Check,
  Clock,
  Crown,
  FileText,
  Flame,
  GripVertical,
  Lightbulb,
  MessageSquare,
  Move,
  RotateCcw,
  RotateCw,
  ShieldCheck,
  Star,
  Target,
  Timer,
  Volume2,
  X,
  Zap,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import type {
  QuizCheck,
  QuizHome,
  QuizLevel,
  QuizRound,
  RankingRow,
} from "@/server/services/quiz";
import { checkAnswerAction, startRoundAction } from "./actions";
import { Countdown, QUESTION_SECONDS } from "./countdown";
import { GameBanner } from "./game-banner";
import { JogoHero } from "./jogo-hero";
import { LevelUpDialog } from "./level-up";

const MASCOT = "/icons/instrutor-caveira.png";

const LAW_NAMES: Record<string, string> = {
  CP: "o Código Penal",
  CPP: "o Código de Processo Penal",
  CF: "a Constituição Federal",
  CTB: "o Código de Trânsito Brasileiro",
  LEP: "a Lei de Execução Penal",
  CPM: "o Código Penal Militar",
};
const lawName = (code: string | null) =>
  (code && LAW_NAMES[code.toUpperCase()]) || "o texto da lei";

const FRASES = [
  "O que hoje é esforço, amanhã é conquista.",
  "Literalidade é ponto garantido na prova.",
  "Cada lacuna acertada é um passo rumo à posse.",
  "Disciplina hoje, resultado amanhã.",
];

/** Lê a frase em voz alta (lacunas vazias são lidas como "lacuna"). */
function speak(
  parts: QuizRound["items"][number]["parts"],
  slots: (string | null)[],
) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  const text = parts
    .map((p) => ("text" in p ? p.text : (slots[p.blank] ?? "lacuna")))
    .join("");
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR";
  window.speechSynthesis.speak(u);
}

type Tab = "explicacao" | "banca" | "dica";

export function QuizView({
  home,
  initialRound,
  lives,
  dailyGoal,
  previewLevelUp,
  previewRanking,
}: {
  home: QuizHome;
  initialRound: QuizRound;
  lives: number;
  dailyGoal: number;
  /** Só na galeria: abre o popup de nível ao carregar. */
  previewLevelUp?: { from: QuizLevel; to: QuizLevel };
  previewRanking?: RankingRow[];
}) {
  const [round, setRound] = useState(initialRound);
  const [level, setLevel] = useState<QuizLevel>(initialRound.level);
  const [levelUp, setLevelUp] = useState<{
    from: QuizLevel;
    to: QuizLevel;
  } | null>(previewLevelUp ?? null);
  const [dialog, setDialog] = useState<"level" | "ranking" | null>(
    previewLevelUp ? "level" : null,
  );
  const [idx, setIdx] = useState(0);
  const [slots, setSlots] = useState<(string | null)[]>(() =>
    Array(initialRound.items[0]?.blanks ?? 0).fill(null),
  );
  const [check, setCheck] = useState<QuizCheck | null>(null);
  const [hearts, setHearts] = useState(lives);
  const [hits, setHits] = useState(0);
  const [roundXp, setRoundXp] = useState(0);
  const [xp, setXp] = useState(home.xp);
  const [todayHits, setTodayHits] = useState(home.todayHits);
  const [mastered, setMastered] = useState(
    () => new Map(home.topics.map((t) => [t.id, t.mastered])),
  );
  const [tab, setTab] = useState<Tab>("explicacao");
  const [filter, setFilter] = useState("Todos");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [roundNo, setRoundNo] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const [inView, setInView] = useState(false);
  const [hint, setHint] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const cardRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLElement>(null);
  const lessonsRef = useRef<HTMLElement>(null);

  const item = round.items[idx];
  const total = round.items.length;
  const finished = idx >= total || hearts <= 0;
  const topic = round.topic;
  const topicMastered = mastered.get(topic.id) ?? topic.mastered;
  const pct = Math.round((topicMastered / Math.max(1, topic.total)) * 100);
  const filled = slots.filter(Boolean).length;
  const used = useMemo(
    () => new Set(slots.filter(Boolean) as string[]),
    [slots],
  );
  // Progresso geral do Modo Jogo: dispositivos dominados somando todos os temas (atualiza ao acertar).
  const overall = useMemo(
    () =>
      home.topics.reduce(
        (acc, t) => ({
          mastered:
            acc.mastered + Math.min(t.total, mastered.get(t.id) ?? t.mastered),
          total: acc.total + t.total,
        }),
        { mastered: 0, total: 0 },
      ),
    [home.topics, mastered],
  );
  const disciplines = useMemo(
    () => ["Todos", ...new Set(home.topics.map((t) => t.discipline))],
    [home.topics],
  );

  // O cronômetro só corre com a questão na tela e a aba ativa (não pune quem ainda está lendo o banner).
  const hasQuestion = !finished && !!item;
  useEffect(() => {
    const el = questionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([e]) => setInView(!!e && e.intersectionRatio >= 0.35),
      { threshold: [0, 0.35, 0.6] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasQuestion]);
  useEffect(() => {
    const on = () => setPageVisible(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  const timerRunning =
    hasQuestion &&
    inView &&
    pageVisible &&
    !check &&
    !pending &&
    !timedOut &&
    dialog === null;

  // Frase grande: a fonte e os espaços encolhem até a questão inteira (frase, palavras e Confirmar) caber
  // na tela, sem rolar. Só se nem assim couber, a frase rola dentro do próprio quadro.
  const filledCount = slots.filter(Boolean).length;
  const fitKey = useRef("");
  useLayoutEffect(() => {
    const card = questionRef.current;
    const fr = card?.querySelector<HTMLElement>(".jogo-frase");
    if (!card || !fr || check) return;
    const fit = () => {
      const w = window.innerWidth;
      const wide = w >= 640;
      const max = wide ? 18.5 : 16;
      const min = wide ? 12.5 : 11.5;
      // Espaço da questão quando o topo do jogo está encostado sob o cabeçalho: tela - cabeçalho - o que vem antes do card - rodapé.
      const topo = document.querySelector<HTMLElement>(".jogo-topo");
      const before = topo ? card.getBoundingClientRect().top - topo.getBoundingClientRect().top : 0;
      const avail = window.innerHeight - (w >= 1024 ? 96 : 94) - before - (w >= 1024 ? 16 : 104);
      const set = (f: number) => {
        fr.style.setProperty("--jf", `${f}px`);
        fr.style.setProperty("--jl", String(+(1.55 + ((f - min) / (max - min)) * 0.6).toFixed(2)));
      };
      // Nova questão ou tela redimensionada: recomeça do tamanho cheio. Ao preencher lacunas: só encolhe mais, se precisar.
      const key = `${roundNo}-${idx}-${w}x${window.innerHeight}`;
      const fresh = key !== fitKey.current;
      fitKey.current = key;
      if (fresh) delete card.dataset.compact;
      fr.style.maxHeight = "none";
      let f = fresh ? max : parseFloat(fr.style.getPropertyValue("--jf")) || max;
      set(f);
      while (card.offsetHeight > avail && f > min) {
        f -= 0.5;
        set(f);
      }
      if (card.offsetHeight > avail) {
        card.dataset.compact = "1";
      }
      if (card.offsetHeight > avail) {
        fr.style.maxHeight = `${Math.max(96, fr.offsetHeight - (card.offsetHeight - avail))}px`;
      }
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [item, idx, roundNo, check, hint, filledCount, hasQuestion]);

  const place = (w: string) => {
    if (check || timedOut || used.has(w)) return;
    const i = slots.findIndex((s) => !s);
    if (i < 0) return;
    setSlots(slots.map((s, j) => (j === i ? w : s)));
  };
  // Arrastar para uma lacuna: a palavra sai de onde estava e substitui a que estiver ali.
  const placeAt = (i: number, w: string) => {
    if (check || timedOut || !item?.bank.includes(w)) return;
    setSlots(slots.map((s, j) => (j === i ? w : s === w ? null : s)));
  };
  const clear = (i: number) =>
    !check && !timedOut && setSlots(slots.map((s, j) => (j === i ? null : s)));

  const submit = (given: string[]) => {
    if (!item || check) return;
    setError(null);
    start(async () => {
      const r = await checkAnswerAction(
        topic.id,
        item.nodeKey,
        given,
        round.level.tier.tier,
      );
      if (!r.ok) return setError(r.error);
      setCheck(r.check);
      setLevel(r.check.level);
      if (r.check.levelUp) {
        const lu = r.check.levelUp;
        setTimeout(() => {
          setLevelUp(lu);
          setDialog("level");
        }, 900);
      }
      setTab("explicacao");
      setXp(r.check.totals.xp);
      setTodayHits(r.check.totals.todayHits);
      setMastered((m) => new Map(m).set(topic.id, r.check.totals.mastered));
      if (r.check.correct) {
        setHits((h) => h + 1);
        setRoundXp((x) => x + r.check.xp);
      } else setHearts((h) => h - 1);
    });
  };
  const verify = () => {
    if (item && filled >= item.blanks) submit(slots as string[]);
  };
  // Tempo esgotado: confere o que estiver preenchido (espaço vazio conta como erro).
  const expire = () => {
    if (!item || check) return;
    setTimedOut(true);
    submit(slots.map((s) => s ?? ""));
  };

  const next = () => {
    const n = idx + 1;
    setIdx(n);
    setCheck(null);
    setTimedOut(false);
    setHint(false);
    setSlots(Array(round.items[n]?.blanks ?? 0).fill(null));
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const newRound = (topicId = topic.id) => {
    setError(null);
    start(async () => {
      const r = await startRoundAction(topicId);
      if (!r.ok) return setError(r.error);
      setRound(r.round);
      setLevel(r.round.level);
      setIdx(0);
      setCheck(null);
      setTimedOut(false);
      setHint(false);
      setRoundNo((x) => x + 1);
      setSlots(Array(r.round.items[0]?.blanks ?? 0).fill(null));
      setHearts(lives);
      setHits(0);
      setRoundXp(0);
      setMastered((m) =>
        new Map(m).set(r.round.topic.id, r.round.topic.mastered),
      );
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    // Modo Jogo: palco preto ocupando toda a área de conteúdo; cards vermelhos; texto branco.
    <div
      className="jogo relative -mx-4 -mb-28 -mt-7 min-h-[calc(100dvh-5rem)] bg-[#070707] px-4 pb-32 pt-6 text-white sm:-mx-5 sm:px-5 lg:-mx-10 lg:-mb-12 lg:px-10 lg:pb-14"
      data-testid="quiz"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(225,6,0,0.22),transparent_65%)]"
        aria-hidden
      />
      {/* Abertura: arte com fogo nos olhos, progresso real, placa da marca e atalhos */}
      <JogoHero
        mastered={overall.mastered}
        total={overall.total}
        streak={home.streak.current}
        last7={home.streak.last7}
        onPlay={() =>
          cardRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          })
        }
      />
      <div className="relative mx-auto max-w-[1180px]">
        <GameBanner
          topicTitle={topic.title}
          discipline={topic.discipline}
          idx={idx}
          total={total}
          hearts={Math.max(0, hearts)}
          lives={lives}
          xp={xp}
          level={level}
          streak={home.streak.current}
          pct={pct}
          started={idx > 0 || !!check || filled > 0}
          onStart={() =>
            finished
              ? newRound()
              : cardRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                })
          }
          onPickTarget={() =>
            lessonsRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            })
          }
          onRanking={() => setDialog("ranking")}
          mood={check ? (check.correct ? "ok" : "erro") : null}
        />
        <LevelUpDialog
          open={dialog !== null}
          levelUp={dialog === "level" ? levelUp : null}
          onClose={() => setDialog(null)}
          previewRows={previewRanking}
          onNext={
            dialog === "level"
              ? () => {
                  setDialog(null);
                  newRound();
                }
              : undefined
          }
        />
      </div>
      <div className="relative mx-auto mt-6 grid max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,1fr)_330px] xl:gap-8">
        <div className="min-w-0">
          {/* Matéria, tema e cronômetro */}
          <div
            ref={cardRef}
            className="jogo-topo mt-5 flex items-center justify-between gap-3"
          >
            {!finished && item && (
              <div
                className="flex min-w-0 flex-1 items-center gap-2 sm:hidden"
                aria-label={`Questão ${idx + 1} de ${total}`}
              >
                <div className="flex flex-1 gap-1.5">
                  {Array.from({ length: total }, (_, i) => {
                    const done = i < idx + (check ? 1 : 0);
                    return (
                      <span
                        key={i}
                        className={`h-2 flex-1 rounded-full ${done ? "bg-[#FF1E12] shadow-[0_0_10px_rgba(255,30,18,0.6)]" : i === idx ? "bg-white/35" : "border border-white/15 bg-white/5"}`}
                      />
                    );
                  })}
                </div>
                <span className="text-[15px] font-bold tabular-nums text-white/85">
                  {idx + 1}/{total}
                </span>
              </div>
            )}
            <div className="flex min-w-0 flex-1 items-center gap-3 max-sm:hidden">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#FF1E12] to-[#A30000] shadow-[0_8px_22px_rgba(225,6,0,0.35)] sm:h-12 sm:w-12 sm:rounded-[14px]"
                aria-hidden
              >
                <BookOpen className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12px] font-black uppercase tracking-[0.06em] text-[#FF3B30] sm:text-[13px]">
                  {topic.discipline}
                </p>
                <p className="truncate text-[13px] text-white/85 sm:text-[14px]">
                  Tema: {topic.title}
                </p>
              </div>
            </div>
            {!finished && item && (
              <Countdown
                key={`${roundNo}-${idx}`}
                running={timerRunning}
                result={check ? (check.correct ? "ok" : "erro") : null}
                onExpire={expire}
              />
            )}
          </div>

          {/* Progresso da rodada em segmentos */}
          {!finished && item && (
            <div
              className="mt-3 flex items-center gap-3 max-sm:hidden"
              aria-label={`Questão ${idx + 1} de ${total}`}
            >
              <div className="flex flex-1 gap-1.5">
                {Array.from({ length: total }, (_, i) => {
                  const done = i < idx + (check ? 1 : 0);
                  return (
                    <span
                      key={i}
                      className={`h-2 flex-1 rounded-full ${done ? "bg-[#FF1E12] shadow-[0_0_10px_rgba(255,30,18,0.6)]" : i === idx ? "bg-white/35" : "border border-white/15 bg-white/5"}`}
                    />
                  );
                })}
              </div>
              <span className="text-[15px] font-bold tabular-nums text-white/85">
                {idx + 1}/{total}
              </span>
            </div>
          )}

          {error && (
            <p
              className="mt-3 rounded-[12px] border border-[#FF3B30]/50 bg-[#2A0606] px-3 py-2 text-[14px] font-semibold text-white"
              role="alert"
            >
              {error}
            </p>
          )}

          {finished ? (
            <RoundEnd
              hearts={hearts}
              hits={hits}
              total={total}
              answered={Math.min(idx + (check ? 1 : 0), total)}
              roundXp={roundXp}
              pending={pending}
              level={level}
              onAgain={() => newRound()}
              onRanking={() => setDialog("ranking")}
            />
          ) : item ? (
            <>
              <section
                ref={questionRef}
                className="jogo-card relative mt-2.5 overflow-hidden rounded-[26px] border border-[#E10600]/70 bg-[#0B0B0C] shadow-[0_0_0_1px_rgba(225,6,0,0.15),0_24px_60px_rgba(225,6,0,0.22)]"
                aria-label="Questão do jogo"
              >
                <div className="relative px-3.5 pb-3.5 pt-3.5 sm:px-6 sm:pb-4 sm:pt-4">
                  {/* Cabeçalho do card */}
                  <div className="jogo-cab flex items-center gap-2">
                    <span className="flex items-center overflow-hidden rounded-full border border-[#E10600] bg-black/40 text-[12px] font-black uppercase tracking-[0.04em] text-[#FF3B30] sm:text-[13px]">
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E10600] text-white sm:h-9 sm:w-9"
                        aria-hidden
                      >
                        <FileText className="h-4 w-4" />
                      </span>
                      <span className="px-3">Frase da lei</span>
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[12.5px] text-white/90 max-sm:hidden">
                      Questão <strong className="font-black">{idx + 1}</strong>{" "}
                      de {total}
                    </span>
                    <span className="ml-auto flex items-center gap-1.5 rounded-full bg-[#E10600] px-3 py-1.5 text-[12.5px] font-black text-white shadow-[0_6px_18px_rgba(225,6,0,0.45)] sm:px-3.5 sm:py-2 sm:text-[13px]">
                      <Star className="h-4 w-4" aria-hidden />
                      <span data-testid="quiz-dificuldade">
                        {round.level.tier.label}
                      </span>
                    </span>
                  </div>

                  {/* Enunciado */}
                  <div className="mt-2.5 flex items-center gap-2.5 sm:mt-3">
                    <h2 className="flex-1 text-[14px] font-bold leading-snug text-[#8EC5FF] sm:text-[16px]">
                      Complete a frase de acordo com {lawName(topic.lawCode)}.
                    </h2>
                    <button
                      type="button"
                      onClick={() => speak(item.parts, slots)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/85 hover:border-white/40"
                      aria-label="Ouvir a frase"
                    >
                      <Volume2 className="h-5 w-5" aria-hidden />
                    </button>
                  </div>

                  {/* Frase da lei com as lacunas */}
                  <div className={`jogo-frase relative mt-2.5 overflow-y-auto overscroll-contain rounded-[18px] border bg-black/40 px-3 pb-3 pt-4 sm:mt-3 sm:px-5 ${check ? (check.correct ? "jogo-acerto" : "jogo-erro") : "border-white/10"}`}>
                    <span
                      className="absolute left-3 top-1 font-serif text-[46px] font-black leading-none text-[#FF1E12]"
                      aria-hidden
                    >
                      “
                    </span>
                    <div>
                      {item.context && (
                        <p className="mb-2 pl-7 text-[13.5px] leading-snug text-white/60">
                          {item.context}
                        </p>
                      )}
                      <p className="jogo-frase-p pl-7 text-white">
                        {item.parts.map((p, i) =>
                          "text" in p ? (
                            <span key={i}>{p.text}</span>
                          ) : (
                            <Blank
                              key={i}
                              n={p.blank}
                              word={slots[p.blank] ?? null}
                              state={
                                check
                                  ? check.results[p.blank]
                                    ? "ok"
                                    : "erro"
                                  : null
                              }
                              answer={check?.answers[p.blank]}
                              locked={!!check || timedOut}
                              onClear={() => clear(p.blank)}
                              onDropWord={(w) => placeAt(p.blank, w)}
                            />
                          ),
                        )}
                        <span
                          className="ml-1 align-top font-serif text-[40px] font-black leading-none text-[#FF1E12]"
                          aria-hidden
                        >
                          ”
                        </span>
                      </p>
                    </div>
                    <p className="mt-2 pl-7 text-[13px] text-white/55">
                      {item.ref}
                      {topic.lawCode ? `, ${topic.lawCode}` : ""}
                    </p>
                  </div>

                  {/* Banco de palavras */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Move
                        className="h-4 w-4 shrink-0 text-[#FF3B30]"
                        aria-hidden
                      />
                      <p className="min-w-0 truncate text-[12.5px] leading-tight">
                        <span className="font-bold uppercase tracking-[0.06em] text-white">
                          Toque ou arraste
                        </span>
                        <span className="text-white/60">
                          {" "}
                          · {filled}/{item.blanks} preenchidos
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setHint((v) => !v)}
                      aria-expanded={hint}
                      className="flex shrink-0 items-center gap-1 rounded-full border border-[#E10600] px-3 py-1 text-[13px] font-bold text-white hover:bg-[#E10600]/15"
                    >
                      <Lightbulb
                        className="h-4 w-4 text-[#FF3B30]"
                        aria-hidden
                      />{" "}
                      Dica
                    </button>
                  </div>
                  {hint && (
                    <p
                      className="entrar mt-2 rounded-[14px] border border-[#E10600]/40 bg-[#1A0505] px-3 py-2 text-[13px] leading-snug text-white/85"
                      role="note"
                    >
                      Leia a frase inteira antes de escolher: a palavra certa
                      precisa encaixar no sentido e na concordância do trecho.
                      {item.blanks > 1
                        ? ` São ${item.blanks} espaços, e cada palavra só pode ser usada uma vez.`
                        : " Há só um espaço: as outras palavras são distratores."}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    {item.bank.map((w) => {
                      const on = used.has(w);
                      return (
                        <button
                          key={w}
                          type="button"
                          draggable={!check && !timedOut && !on}
                          onDragStart={(e) =>
                            e.dataTransfer.setData("text/plain", w)
                          }
                          onClick={() => place(w)}
                          disabled={
                            !!check || timedOut || on || filled >= item.blanks
                          }
                          aria-pressed={on}
                          data-testid="palavra"
                          className={`flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-left text-[14.5px] font-semibold leading-tight sm:min-h-11 sm:px-4 sm:text-[15px] transition-all active:scale-[0.98] disabled:cursor-default ${
                            on
                              ? "border-[#FF1E12] bg-[#1A0505] text-white/70 shadow-[0_0_18px_rgba(255,30,18,0.35)]"
                              : "border-white/12 bg-[#141416] text-white hover:border-white/35 disabled:opacity-60"
                          }`}
                        >
                          <GripVertical
                            className="h-4 w-4 shrink-0 text-white/40 max-sm:hidden"
                            aria-hidden
                          />
                          <span className="min-w-0">{w}</span>
                        </button>
                      );
                    })}
                  </div>
                  {/* Resultado e ações: presos na base da tela, sempre visíveis sem rolar */}
                  <div className="jogo-acoes mt-3" data-testid="jogo-acoes">
                    {check && (
                      <div
                        className={`entrar jogo-res mb-2 flex items-center gap-3 rounded-[16px] px-4 py-3 ${check.correct ? "jogo-res-ok" : "jogo-res-erro"}`}
                        role="status"
                        data-testid={check.correct ? "resultado-acerto" : "resultado-erro"}
                      >
                        <span className="jogo-res-ico" aria-hidden>{check.correct ? "✓" : "✕"}</span>
                        <div className="min-w-0">
                          <p className="text-[18px] font-black uppercase leading-tight tracking-wide text-white sm:text-[20px]">
                            {check.correct
                              ? `Acertou! +${check.xp} XP`
                              : `${timedOut ? "Tempo esgotado!" : "Errou!"} ${hearts > 0 ? "Menos uma vida." : "Acabaram as vidas."}`}
                          </p>
                          <p className="text-[13.5px] font-semibold text-white/90">
                            {check.correct
                              ? "Literalidade em dia. É assim que se vence a banca."
                              : `Texto certo: ${check.answers.join(" · ")}. Leia a explicação abaixo.`}
                          </p>
                        </div>
                      </div>
                    )}
                    <div>
                      {!check && timedOut ? (
                        <button
                          type="button"
                          onClick={expire}
                          disabled={pending}
                          className="flex min-h-12 sm:min-h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-black text-[15px] font-black uppercase tracking-[0.1em] text-[#FFD60A] ring-1 ring-[#FFD60A]/40 transition-all active:scale-[0.99] disabled:opacity-70"
                        >
                          <Timer className="h-5 w-5" aria-hidden />{" "}
                          {pending ? "Conferindo…" : "Tempo esgotado!"}
                        </button>
                      ) : !check ? (
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setSlots(slots.map(() => null))}
                            disabled={pending || filled === 0}
                            className="flex min-h-12 sm:min-h-14 items-center justify-center gap-2.5 rounded-[16px] border border-white/25 bg-[#0B0B0C] text-[15px] font-black uppercase tracking-[0.08em] text-white transition-all active:scale-[0.99] disabled:opacity-45"
                          >
                            <RotateCw className="h-5 w-5" aria-hidden /> Limpar
                          </button>
                          <button
                            type="button"
                            onClick={verify}
                            disabled={pending || filled < item.blanks}
                            className="flex min-h-12 sm:min-h-14 items-center justify-center gap-2.5 rounded-[16px] bg-gradient-to-b from-[#FF1E12] to-[#C20800] text-[15px] font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_28px_rgba(225,6,0,0.4)] transition-all active:scale-[0.99] disabled:from-[#3A0B0B] disabled:to-[#2A0606] disabled:text-white/45 disabled:shadow-none"
                          >
                            <Check className="h-5 w-5" aria-hidden />{" "}
                            {pending ? "Conferindo…" : "Confirmar"}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={next}
                          className="flex min-h-12 sm:min-h-14 w-full items-center justify-center gap-2 rounded-[16px] bg-gradient-to-b from-[#FF1E12] to-[#C20800] text-[15px] font-black uppercase tracking-[0.1em] text-white shadow-[0_10px_28px_rgba(225,6,0,0.4)] transition-all active:scale-[0.99]"
                        >
                          {hearts <= 0 || idx + 1 >= total
                            ? "Ver resultado"
                            : "Próxima questão"}{" "}
                          <ArrowRight className="h-5 w-5" aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-white/55">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Resposta
                conferida no servidor • texto do catálogo APROVUM •{" "}
                {QUESTION_SECONDS} s por questão
              </p>
              {/* Foco no objetivo */}
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[20px] border border-white/10 bg-[#0B0B0C] px-4 py-3.5 sm:flex-nowrap sm:px-5">
                <Brain
                  className="h-9 w-9 shrink-0 text-[#FF1E12]"
                  aria-hidden
                />
                <div className="min-w-0 flex-1 basis-[180px]">
                  <p className="text-[13px] font-black uppercase tracking-[0.06em] text-[#FF3B30]">
                    Foco no objetivo
                  </p>
                  <p className="text-[13.5px] text-white/80">
                    {FRASES[(roundNo + idx) % FRASES.length]}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2 rounded-[14px] border border-[#E10600]/60 bg-black/50 px-3 py-2 max-sm:w-full">
                  <Target className="h-6 w-6 text-[#FF1E12]" aria-hidden />
                  <p className="leading-tight">
                    <span className="block text-[14px] font-bold text-[#FF3B30]">
                      {hearts >= lives ? "Continue" : "Atenção"}
                    </span>
                    <span className="block text-[11.5px] text-white/75">
                      {hearts >= lives
                        ? "você está indo bem!"
                        : `${Math.max(0, hearts)} ${hearts === 1 ? "vida restante" : "vidas restantes"}`}
                    </span>
                  </p>
                </div>
              </div>
            </>
          ) : null}

          {/* Abas: explicação, banca, dica */}
          {!finished && item && (
            <div className="mt-6">
              <div
                className="inline-flex rounded-full bg-[#141414] p-1 ring-1 ring-white/10"
                role="tablist"
                aria-label="Explicação da questão"
              >
                {(
                  [
                    ["explicacao", "Explicação", Lightbulb],
                    ["banca", "Banca", MessageSquare],
                    ["dica", "Dica do Instrutor", Crown],
                  ] as const
                ).map(([k, label, Icon]) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={tab === k}
                    onClick={() => setTab(k)}
                    className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${tab === k ? "bg-[#E10600] text-white" : "text-white/60 hover:text-white"}`}
                  >
                    <Icon className="h-4 w-4" aria-hidden /> {label}
                  </button>
                ))}
              </div>
              <div
                className="mt-3 rounded-[20px] bg-[#141414] px-5 py-4 text-[15px] leading-relaxed text-white/90 ring-1 ring-white/10"
                role="tabpanel"
              >
                {!check ? (
                  <p className="text-white/55">
                    Responda para liberar a explicação deste dispositivo.
                  </p>
                ) : (
                  <HelpText
                    text={
                      tab === "explicacao"
                        ? check.help.explicacao
                        : tab === "banca"
                          ? check.help.banca
                          : check.help.dica
                    }
                    empty={
                      tab === "dica"
                        ? "Sem dica específica para este dispositivo. Releia o texto literal acima."
                        : "Sem trecho da aula para este dispositivo."
                    }
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Coluna lateral */}
        <aside className="flex min-w-0 flex-col gap-5">
          <LevelCard level={level} onRanking={() => setDialog("ranking")} />
          <StreakCard
            streak={home.streak}
            pct={pct}
            remaining={topic.total - topicMastered}
            onKeep={() =>
              cardRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
              })
            }
          />

          <section
            ref={lessonsRef}
            className="scroll-mt-24"
            aria-label="Próximas lições"
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-[15px] font-black">
                <BookOpen className="h-4 w-4 text-[#FF3B30]" aria-hidden />{" "}
                Próximas lições
              </h2>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] text-white/70">
                {home.topics.length}{" "}
                {home.topics.length === 1 ? "disponível" : "disponíveis"}
              </span>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {disciplines.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setFilter(d)}
                  className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${filter === d ? "bg-[#E10600] text-white" : "bg-[#141414] text-white/70 ring-1 ring-white/10"}`}
                >
                  {d}
                </button>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-3">
              {home.topics
                .filter((t) => filter === "Todos" || t.discipline === filter)
                .map((t) => {
                  const m = mastered.get(t.id) ?? t.mastered;
                  const done = m >= t.total;
                  const current = t.id === topic.id;
                  return (
                    <Link
                      key={t.id}
                      href={`/quiz?tema=${t.id}`}
                      onClick={(e) => {
                        e.preventDefault();
                        if (!current) {
                          window.history.replaceState(
                            null,
                            "",
                            `/quiz?tema=${t.id}`,
                          );
                          newRound(t.id);
                        }
                      }}
                      className={`flex items-center gap-3 rounded-[18px] p-3 transition-transform active:scale-[0.99] ${
                        current
                          ? "bg-gradient-to-br from-[#D90A00] to-[#7A0000] shadow-[0_12px_30px_rgba(225,6,0,0.3)]"
                          : "bg-[#3A0808] ring-1 ring-[#E10600]/30 hover:ring-[#E10600]/70"
                      }`}
                    >
                      <span
                        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] text-[22px] font-black ${current ? "bg-black/35" : "bg-[#E10600]"}`}
                      >
                        §
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="truncate text-[14.5px] font-black">
                            {t.title}
                          </span>
                          <span
                            className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${done ? "bg-[#22C55E] text-black" : "bg-black/35 text-white"}`}
                          >
                            {done
                              ? "Dominado"
                              : current
                                ? "Jogando"
                                : m
                                  ? "Em andamento"
                                  : "Novo"}
                          </span>
                        </span>
                        <span className="block text-[12.5px] text-white/70">
                          {t.discipline}
                        </span>
                        <span className="mt-1 flex items-center gap-2 text-[11.5px] font-semibold text-white/80">
                          <span className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5">
                            <Clock className="h-3 w-3" aria-hidden />{" "}
                            {Math.max(1, Math.round(t.total * 0.6))} min
                          </span>
                          <span className="flex items-center gap-1">
                            <BookOpen className="h-3 w-3" aria-hidden /> {m}/
                            {t.total} dispositivos
                          </span>
                        </span>
                      </span>
                    </Link>
                  );
                })}
            </div>
          </section>

          <Link
            href="/questoes"
            className="flex items-center gap-3 rounded-[18px] bg-[#3A0808] p-3.5 ring-1 ring-[#E10600]/30 hover:ring-[#E10600]/70"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-black">
                Questões de prova
              </span>
              <span className="block text-[12.5px] text-white/70">
                Cadernos por matéria, concurso e banca
              </span>
            </span>
            <span className="rounded-full bg-[#E10600] px-3 py-1 text-[12px] font-bold text-white">
              Abrir
            </span>
          </Link>

          <section
            className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#D90A00] to-[#6E0000] p-4 shadow-[0_12px_30px_rgba(225,6,0,0.25)]"
            aria-label="Desafio do dia"
          >
            <div className="flex gap-3">
              <img
                src={MASCOT}
                alt=""
                className="h-14 w-14 shrink-0 rounded-full bg-black object-contain p-0.5 ring-2 ring-white/30"
              />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14px] font-black">
                  Instrutor te desafia{" "}
                  <span className="rounded-[4px] bg-black px-1.5 py-0.5 text-[9px] font-black">
                    HOJE
                  </span>
                </p>
                <p className="mt-1 text-[12.5px] leading-snug text-white/80">
                  Acerte {dailyGoal} lacunas hoje.{" "}
                  {todayHits >= dailyGoal ? (
                    <strong className="text-white">Desafio cumprido!</strong>
                  ) : (
                    <>
                      Você está em {todayHits} de {dailyGoal}.
                    </>
                  )}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/35">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-500"
                    style={{
                      width: `${Math.min(100, (todayHits / dailyGoal) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
      <div className="jogo-rodape relative mx-auto max-w-[1180px]">
        <p>
          <span className="jogo-rodape-barras" aria-hidden>
            {"///"}
          </span>{" "}
          APROVUM{" "}
          <span aria-hidden className="text-[#ff1e12]">
            •
          </span>
          <span className="text-white/60">Preparação de alto desempenho</span>
        </p>
        <span className="jogo-rodape-linha" aria-hidden />
        <span className="jogo-rodape-barras" aria-hidden>
          {"///"}
        </span>
      </div>
    </div>
  );
}

function Blank({
  n,
  word,
  state,
  answer,
  locked,
  onClear,
  onDropWord,
}: {
  n: number;
  word: string | null;
  state: "ok" | "erro" | null;
  answer?: string;
  locked: boolean;
  onClear: () => void;
  onDropWord: (w: string) => void;
}) {
  const [over, setOver] = useState(false);
  const base =
    "jogo-lacuna mx-1 inline-flex min-h-[1.7em] min-w-[6.5em] items-center justify-center rounded-[10px] border-2 px-[0.7em] align-middle text-[0.92em] font-black leading-tight";
  if (state === "ok")
    return (
      <span className={`${base} border-[#22C55E] bg-[#0F2A18] text-[#4ADE80]`}>
        {word}
      </span>
    );
  if (state === "erro")
    return (
      <span
        className={`${base} border-[#22C55E] bg-[#0F2A18] text-[#4ADE80]`}
        title={`Você marcou: ${word || "—"}`}
      >
        {answer}
      </span>
    );
  return (
    <button
      type="button"
      onClick={onClear}
      disabled={!word || locked}
      onDragOver={(e) => {
        if (locked) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        const w = e.dataTransfer.getData("text/plain");
        if (w) onDropWord(w);
      }}
      aria-label={
        word
          ? `Espaço ${n + 1}: ${word}. Toque para tirar`
          : `Espaço ${n + 1} vazio`
      }
      className={`${base} ${word ? "border-[#FF1E12] bg-[#1A0505] text-white shadow-[0_0_14px_rgba(255,30,18,0.35)]" : `border-dashed ${over ? "border-white bg-white/10" : "border-[#FF1E12]"} text-transparent`} disabled:cursor-default`}
    >
      {word ?? "\u00a0"}
    </button>
  );
}

function HelpText({ text, empty }: { text: string | null; empty: string }) {
  if (!text) return <p className="text-white/55">{empty}</p>;
  return (
    <div className="leitura jogo-texto !max-w-none !text-[15px]">
      <Markdown>{text}</Markdown>
    </div>
  );
}

function StreakCard({
  streak,
  pct,
  remaining,
  onKeep,
}: {
  streak: QuizHome["streak"];
  pct: number;
  remaining: number;
  onKeep: () => void;
}) {
  const today = streak.last7.length - 1;
  return (
    <section
      className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#D90A00] via-[#B10400] to-[#6E0000] p-5 shadow-[0_18px_44px_rgba(225,6,0,0.3)]"
      aria-label="Ofensiva"
    >
      <span
        className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35">
          <Flame className="h-4 w-4" aria-hidden />
        </span>
        <p className="text-[12px] font-black uppercase tracking-[0.14em]">
          Ofensiva • {streak.current} {streak.current === 1 ? "dia" : "dias"}
        </p>
        {streak.best > 0 && (
          <span className="ml-auto rounded-full bg-black px-2.5 py-1 text-[11px] font-bold">
            Recorde {streak.best}
          </span>
        )}
      </div>
      <p className="relative mt-4 font-[Space_Grotesk] text-[25px] font-black uppercase leading-[0.95] tracking-[-0.01em]">
        {streak.studiedToday ? "Continue" : "Não quebre"}
        <span className="block text-black/80">
          {streak.studiedToday ? "assim, guerreiro" : "a sequência"}
        </span>
      </p>
      <p className="relative mt-2 text-[13.5px] leading-snug text-white/85">
        {streak.message}.
      </p>
      <ol
        className="relative mt-4 flex items-center justify-between gap-1"
        aria-label="Últimos 7 dias"
      >
        {streak.last7.map((on, i) => (
          <li
            key={i}
            className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-black ${i === today ? (on ? "bg-white text-[#B10400]" : "border-2 border-dashed border-white text-white") : on ? "bg-black/40 text-white" : "bg-black/15 text-white/40"}`}
          >
            {i === today ? (
              on ? (
                streak.current
              ) : (
                "•"
              )
            ) : on ? (
              <Check className="h-3.5 w-3.5" aria-label="estudou" />
            ) : (
              <X className="h-3 w-3" aria-label="não estudou" />
            )}
          </li>
        ))}
      </ol>
      <div className="relative mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onKeep}
          className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-black text-[14px] font-black"
        >
          Manter ofensiva
        </button>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#B10400]">
          <Zap className="h-5 w-5" aria-hidden />
        </span>
      </div>
      <p className="relative mt-3 text-right text-[12px] text-white/75">
        {pct}% do tema dominado • {remaining}{" "}
        {remaining === 1 ? "dispositivo restante" : "dispositivos restantes"}
      </p>
    </section>
  );
}

function RoundEnd({
  hearts,
  hits,
  total,
  answered,
  roundXp,
  pending,
  level,
  onAgain,
  onRanking,
}: {
  hearts: number;
  hits: number;
  total: number;
  answered: number;
  roundXp: number;
  pending: boolean;
  level: QuizLevel;
  onAgain: () => void;
  onRanking: () => void;
}) {
  const lost = hearts <= 0;
  return (
    <section
      className="entrar relative mt-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#D90A00] via-[#B10400] to-[#6E0000] px-6 py-8 text-center shadow-[0_24px_60px_rgba(225,6,0,0.28)]"
      aria-label="Resultado da rodada"
      data-testid="quiz-fim"
    >
      <img
        src={MASCOT}
        alt=""
        className="mx-auto h-24 w-24 rounded-full bg-black object-contain p-1 ring-4 ring-white/25"
      />
      <p className="mt-4 font-[Space_Grotesk] text-[28px] font-black uppercase leading-none">
        {lost ? "Sem vidas" : "Missão cumprida"}
      </p>
      <p className="mt-2 text-[15px] text-white/85">
        {lost
          ? "A banca venceu esta. Revise e volte para a próxima rodada."
          : "Rodada concluída. Mantenha o ritmo."}
      </p>
      <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
        {[
          ["Acertos", `${hits}/${answered || total}`],
          ["XP ganho", `+${roundXp}`],
          ["Vidas", `${Math.max(0, hearts)}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[16px] bg-black/35 px-2 py-3">
            <p className="text-[22px] font-black">{v}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">
              {k}
            </p>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAgain}
        disabled={pending}
        className="mx-auto mt-7 flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-white text-[15px] font-black uppercase tracking-[0.1em] text-[#B10400] disabled:opacity-60"
      >
        <RotateCcw className="h-5 w-5" aria-hidden />{" "}
        {pending ? "Preparando…" : "Nova rodada"}
      </button>
      <p className="mt-4 text-[13px] text-white/80">
        Nível {level.level} • {level.patente} • faltam {level.toNext}{" "}
        {level.toNext === 1 ? "questão" : "questões"} para {level.nextPatente}
      </p>
      <button
        type="button"
        onClick={onRanking}
        className="mx-auto mt-3 flex min-h-12 items-center justify-center gap-2 rounded-full bg-black/35 px-5 text-[14px] font-black"
      >
        <BarChart3 className="h-4 w-4" aria-hidden /> Ver ranking
      </button>
    </section>
  );
}

function LevelCard({
  level,
  onRanking,
}: {
  level: QuizLevel;
  onRanking: () => void;
}) {
  const done = 10 - level.toNext;
  return (
    <section
      className="relative overflow-hidden rounded-[24px] bg-[#111] p-5 ring-1 ring-[#E10600]/40"
      aria-label="Nível"
      data-testid="quiz-nivel"
    >
      <div className="flex items-center gap-3">
        <span className="font-stencil flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-[#E10600] text-[26px] leading-none">
          {level.level}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-hud text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
            Nível {level.level}
          </p>
          <p className="font-hud truncate text-[19px] font-bold">
            {level.patente}
          </p>
          <p className="text-[12.5px] text-white/70">
            Dificuldade:{" "}
            <strong className="text-white">{level.tier.label}</strong> • +
            {level.tier.xp} XP por acerto
          </p>
        </div>
      </div>
      <div
        className="mt-4 flex gap-[3px]"
        role="progressbar"
        aria-label="Progresso até o próximo nível"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={10}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <span
            key={i}
            className={`h-2 flex-1 rounded-full ${i < done ? "bg-[#FF3B30]" : "bg-white/10"}`}
          />
        ))}
      </div>
      <p className="mt-2 text-[12.5px] text-white/70">
        Faltam <strong className="text-white">{level.toNext}</strong>{" "}
        {level.toNext === 1 ? "questão" : "questões"} para {level.nextPatente}.
        A cada 10 respondidas, a dificuldade sobe.
      </p>
      <button
        type="button"
        onClick={onRanking}
        className="font-hud mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-white text-[14px] font-bold uppercase tracking-[0.12em] text-[#B10400]"
      >
        <BarChart3 className="h-4 w-4" aria-hidden /> Ranking geral
      </button>
    </section>
  );
}
