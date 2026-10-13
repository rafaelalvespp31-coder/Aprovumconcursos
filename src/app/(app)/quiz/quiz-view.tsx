"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { ArrowRight, BookOpen, Check, Clock, Crown, Crosshair, FileText, Flame, Heart, Lightbulb, MessageSquare, Plus, RotateCcw, ShieldCheck, Trophy, X, Zap } from "lucide-react";
import { Markdown } from "@/components/markdown";
import type { QuizCheck, QuizHome, QuizRound } from "@/server/services/quiz";
import { checkAnswerAction, startRoundAction } from "./actions";

const MASCOT = "/icons/instrutor-caveira.png";

type Tab = "explicacao" | "banca" | "dica";

export function QuizView({ home, initialRound, lives, dailyGoal }: { home: QuizHome; initialRound: QuizRound; lives: number; dailyGoal: number }) {
  const [round, setRound] = useState(initialRound);
  const [idx, setIdx] = useState(0);
  const [slots, setSlots] = useState<(string | null)[]>(() => Array(initialRound.items[0]?.blanks ?? 0).fill(null));
  const [check, setCheck] = useState<QuizCheck | null>(null);
  const [hearts, setHearts] = useState(lives);
  const [hits, setHits] = useState(0);
  const [roundXp, setRoundXp] = useState(0);
  const [xp, setXp] = useState(home.xp);
  const [todayHits, setTodayHits] = useState(home.todayHits);
  const [mastered, setMastered] = useState(() => new Map(home.topics.map((t) => [t.id, t.mastered])));
  const [tab, setTab] = useState<Tab>("explicacao");
  const [filter, setFilter] = useState("Todos");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);

  const item = round.items[idx];
  const total = round.items.length;
  const finished = idx >= total || hearts <= 0;
  const topic = round.topic;
  const topicMastered = mastered.get(topic.id) ?? topic.mastered;
  const pct = Math.round((topicMastered / Math.max(1, topic.total)) * 100);
  const filled = slots.filter(Boolean).length;
  const used = useMemo(() => new Set(slots.filter(Boolean) as string[]), [slots]);
  const disciplines = useMemo(() => ["Todos", ...new Set(home.topics.map((t) => t.discipline))], [home.topics]);

  const place = (w: string) => {
    if (check || used.has(w)) return;
    const i = slots.findIndex((s) => !s);
    if (i < 0) return;
    setSlots(slots.map((s, j) => (j === i ? w : s)));
  };
  const clear = (i: number) => !check && setSlots(slots.map((s, j) => (j === i ? null : s)));

  const verify = () => {
    if (!item || filled < item.blanks) return;
    setError(null);
    start(async () => {
      const r = await checkAnswerAction(topic.id, item.nodeKey, slots as string[]);
      if (!r.ok) return setError(r.error);
      setCheck(r.check);
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

  const next = () => {
    const n = idx + 1;
    setIdx(n);
    setCheck(null);
    setSlots(Array(round.items[n]?.blanks ?? 0).fill(null));
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const newRound = (topicId = topic.id) => {
    setError(null);
    start(async () => {
      const r = await startRoundAction(topicId);
      if (!r.ok) return setError(r.error);
      setRound(r.round);
      setIdx(0);
      setCheck(null);
      setSlots(Array(r.round.items[0]?.blanks ?? 0).fill(null));
      setHearts(lives);
      setHits(0);
      setRoundXp(0);
      setMastered((m) => new Map(m).set(r.round.topic.id, r.round.topic.mastered));
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_330px] xl:gap-8" data-testid="quiz">
      <div className="min-w-0">
        {/* Barra de status */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="basis-full sm:basis-auto sm:min-w-[200px] sm:flex-1">
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C8C8C]">
              <Crosshair className="h-3.5 w-3.5 text-[#E10600]" aria-hidden /> Progresso no tema
              <span className="ml-auto rounded-full border border-[#E5E5E5] px-2 py-0.5 text-[11px] tracking-normal text-[#1A1A1A]">{pct}%</span>
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[#EEEEEE]" role="progressbar" aria-label="Dispositivos dominados no tema" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-[#E10600] transition-[width] duration-500" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-[#ECECEC] bg-white px-3 py-1.5 text-[13px] font-bold shadow-[0_2px_8px_rgba(0,0,0,0.04)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#FFF1F1]"><Flame className="h-3.5 w-3.5 text-[#E10600]" aria-hidden /></span>
            {home.streak.current} {home.streak.current === 1 ? "dia" : "dias"} <span className="font-medium text-[#8C8C8C]">ofensiva</span>
          </span>
          <span className="flex items-center gap-1.5 rounded-full border border-[#ECECEC] bg-white px-3 py-1.5 text-[13px] font-bold" aria-label={`${hearts} vidas`}>
            <Heart className="h-4 w-4 fill-[#E10600] text-[#E10600]" aria-hidden /> {hearts}
          </span>
          <span className="flex items-center gap-2 rounded-full bg-[#0E0E0E] px-3.5 py-1.5 text-[13px] font-bold text-white">
            <Trophy className="h-4 w-4 text-[#FF4D4D]" aria-hidden /> {xp} XP
          </span>
        </div>

        {/* Trilha */}
        <div ref={cardRef} className="mt-5 flex scroll-mt-24 flex-wrap items-center gap-2 text-[13px]">
          <span className="rounded-full border border-[#E5E5E5] bg-white px-3 py-1 font-medium text-[#4D4D4D]">{topic.discipline}</span>
          <span className="text-[#C4C4C4]">/</span>
          {item && <span className="rounded-full bg-[#E10600] px-3 py-1 font-bold text-white">{item.ref}</span>}
          <span className="flex items-center gap-1 rounded-full border border-[#E5E5E5] bg-white px-2.5 py-1 text-[12px] text-[#8C8C8C]">
            <Clock className="h-3.5 w-3.5" aria-hidden /> ~1 min
          </span>
        </div>

        {error && <p className="mt-3 rounded-[12px] bg-[#FFF1F1] px-3 py-2 text-[14px] font-semibold text-[#B30000]" role="alert">{error}</p>}

        {finished ? (
          <RoundEnd hearts={hearts} hits={hits} total={total} answered={Math.min(idx + (check ? 1 : 0), total)} roundXp={roundXp} pending={pending} onAgain={() => newRound()} />
        ) : item ? (
          <section className="relative mt-4 overflow-hidden rounded-[28px] border border-[#EFEFEF] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.06)]" aria-label="Questão do quiz">
            <div className="absolute inset-x-0 top-0 h-1 bg-[#F2F2F2]">
              <div className="h-full bg-[#E10600] transition-[width] duration-500" style={{ width: `${((idx + (check ? 1 : 0)) / total) * 100}%` }} />
            </div>
            <header className="flex items-center gap-3 border-b border-[#F2F2F2] px-4 py-4 sm:px-7">
              <img src={MASCOT} alt="" className="h-11 w-11 shrink-0 rounded-full bg-[#0E0E0E] object-contain p-0.5" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 whitespace-nowrap text-[15px] font-bold">
                  Instrutor Caveira <span className="hidden rounded-[4px] bg-[#E10600] px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white min-[400px]:inline">APROVUM</span>
                </p>
                <p className="flex items-center gap-1 truncate text-[12.5px] text-[#666]">
                  <BookOpen className="h-3.5 w-3.5 shrink-0 text-[#E10600]" aria-hidden /> Complete a lei<span className="hidden sm:inline"> — texto literal</span>
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-[#E5E5E5] px-2.5 py-1 text-[12px] font-semibold text-[#4D4D4D]">
                {idx + 1}/{total}
              </span>
            </header>

            <div className="px-4 pb-6 pt-5 sm:px-7">
              {/* Balão com o dispositivo */}
              <div className="relative rounded-[20px] border border-[#ECECEC] bg-[#FAFAFA] px-4 py-4 sm:px-6 sm:py-5">
                <span className="absolute -left-2 top-6 h-4 w-4 rotate-45 border-b border-l border-[#ECECEC] bg-[#FAFAFA]" aria-hidden />
                {item.context && <p className="mb-2 text-[13.5px] leading-snug text-[#8C8C8C]">{item.context}</p>}
                <p className="text-[16px] leading-[1.95] text-[#1A1A1A] sm:text-[18px]">
                  {item.parts.map((p, i) =>
                    "text" in p ? (
                      <span key={i}>{p.text}</span>
                    ) : (
                      <Blank key={i} n={p.blank} word={slots[p.blank] ?? null} state={check ? (check.results[p.blank] ? "ok" : "erro") : null} answer={check?.answers[p.blank]} />
                    ),
                  )}
                </p>
                <p className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-[#8C8C8C]">
                  <span className="rounded-full bg-[#0E0E0E] px-2.5 py-1 font-bold text-white">{topic.lawCode ? `${topic.lawCode} • ` : ""}{item.ref}</span>
                  Texto literal do dispositivo
                </p>
              </div>

              {/* Resposta */}
              <div className="mt-6 flex items-center justify-between gap-2">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C8C8C]">
                  <Crosshair className="h-3.5 w-3.5 text-[#E10600]" aria-hidden /> Sua resposta
                </p>
                <span className="rounded-full border border-[#FFD0D0] px-2.5 py-1 text-[12px] font-bold text-[#E10600]">
                  {filled}/{item.blanks} preenchidos
                </span>
              </div>
              <div className={`mt-3 grid gap-3 ${item.blanks > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {slots.map((w, i) => {
                  const st = check ? (check.results[i] ? "ok" : "erro") : null;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => clear(i)}
                      disabled={!w || !!check}
                      aria-label={w ? `Espaço ${i + 1}: ${w}. Toque para tirar` : `Espaço ${i + 1} vazio`}
                      className={`flex min-h-[74px] flex-col items-center justify-center gap-1 rounded-[16px] border-2 border-dashed px-3 text-center transition-all ${
                        st === "ok" ? "border-solid border-[#15803d] bg-[#ECF8F0]" : st === "erro" ? "border-solid border-[#E10600] bg-[#FFF1F1]" : w ? "border-solid border-[#1A1A1A] bg-white" : "border-[#F2A3A3] bg-white"
                      }`}
                    >
                      {w ? (
                        <span className={`text-[16px] font-bold ${st === "erro" ? "text-[#B30000] line-through" : st === "ok" ? "text-[#15803d]" : ""}`}>{w}</span>
                      ) : (
                        <>
                          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[#F2A3A3]"><Plus className="h-3 w-3 text-[#E10600]" aria-hidden /></span>
                          <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#F08A8A]">Espaço {i + 1}</span>
                        </>
                      )}
                      {st === "erro" && check && <span className="text-[13px] font-bold text-[#15803d]">{check.answers[i]}</span>}
                    </button>
                  );
                })}
              </div>

              {/* Banco de palavras */}
              <div className="mt-6 flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#8C8C8C]">Banco de palavras</p>
                {!check && <p className="text-[12px] text-[#A3A3A3]">Toque para encaixar →</p>}
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {item.bank.map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => place(w)}
                    disabled={!!check || used.has(w) || filled >= item.blanks}
                    className={`min-h-12 rounded-full border px-5 text-[16px] font-semibold transition-all active:scale-95 ${
                      used.has(w) ? "border-dashed border-[#E5E5E5] bg-[#F7F7F7] text-[#C4C4C4]" : "border-[#E5E5E5] bg-white text-[#1A1A1A] shadow-[0_2px_6px_rgba(0,0,0,0.05)] hover:border-[#E10600]"
                    } disabled:cursor-default`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            {/* Ação */}
            <div className="border-t border-[#F2F2F2] bg-[#FCFCFC] px-4 py-5 sm:px-7">
              {check && (
                <div className={`entrar mb-4 flex items-start gap-3 rounded-[16px] px-4 py-3 ${check.correct ? "bg-[#ECF8F0]" : "bg-[#FFF1F1]"}`} role="status">
                  <img src={MASCOT} alt="" className="h-10 w-10 shrink-0 rounded-full bg-[#0E0E0E] object-contain p-0.5" />
                  <div>
                    <p className={`text-[15px] font-black ${check.correct ? "text-[#15803d]" : "text-[#B30000]"}`}>
                      {check.correct ? `Na mosca! +${check.xp} XP` : hearts > 0 ? "Errou. Menos uma vida." : "Errou. Acabaram as vidas."}
                    </p>
                    <p className="text-[13.5px] text-[#4D4D4D]">
                      {check.correct ? "Literalidade em dia. É assim que se vence a banca." : `Texto certo: ${check.answers.join(" · ")}. Leia a explicação abaixo.`}
                    </p>
                  </div>
                </div>
              )}
              {!check ? (
                <button
                  type="button"
                  onClick={verify}
                  disabled={pending || filled < item.blanks}
                  className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#E10600] text-[15px] font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_24px_rgba(225,6,0,0.3)] transition-all active:scale-[0.99] disabled:bg-[#F2F2F2] disabled:text-[#B3B3B3] disabled:shadow-none"
                >
                  <Crosshair className="h-5 w-5" aria-hidden /> {pending ? "Conferindo…" : "Verificar resposta"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={next}
                  className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-[#0E0E0E] text-[15px] font-black uppercase tracking-[0.08em] text-white transition-all active:scale-[0.99]"
                >
                  {hearts <= 0 || idx + 1 >= total ? "Ver resultado" : "Próxima questão"} <ArrowRight className="h-5 w-5" aria-hidden />
                </button>
              )}
              <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-[#8C8C8C]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#E10600]" aria-hidden /> Resposta conferida no servidor • texto do catálogo APROVUM
              </p>
            </div>
          </section>
        ) : null}

        {/* Abas: explicação, banca, dica */}
        {!finished && item && (
          <div className="mt-6">
            <div className="inline-flex rounded-full border border-[#ECECEC] bg-white p-1" role="tablist" aria-label="Explicação da questão">
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
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-bold transition-colors ${tab === k ? "bg-[#0E0E0E] text-white" : "text-[#8C8C8C]"}`}
                >
                  <Icon className={`h-4 w-4 ${tab === k ? "text-[#FF4D4D]" : ""}`} aria-hidden /> {label}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded-[20px] border border-[#EFEFEF] bg-white px-5 py-4 text-[15px] leading-relaxed text-[#333]" role="tabpanel">
              {!check ? (
                <p className="text-[#8C8C8C]">Responda para liberar a explicação deste dispositivo.</p>
              ) : (
                <HelpText text={tab === "explicacao" ? check.help.explicacao : tab === "banca" ? check.help.banca : check.help.dica} empty={tab === "dica" ? "Sem dica específica para este dispositivo. Releia o texto literal acima." : "Sem trecho da aula para este dispositivo."} />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Coluna lateral */}
      <aside className="flex min-w-0 flex-col gap-5">
        <StreakCard streak={home.streak} pct={pct} remaining={topic.total - topicMastered} onKeep={() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })} />

        <section aria-label="Próximas lições">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-[15px] font-black"><BookOpen className="h-4 w-4 text-[#E10600]" aria-hidden /> Próximas lições</h2>
            <span className="rounded-full border border-[#E5E5E5] px-2.5 py-0.5 text-[12px] text-[#8C8C8C]">{home.topics.length} {home.topics.length === 1 ? "disponível" : "disponíveis"}</span>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {disciplines.map((d) => (
              <button key={d} type="button" onClick={() => setFilter(d)} className={`shrink-0 rounded-full border px-4 py-2 text-[13px] font-semibold ${filter === d ? "border-[#E10600] bg-[#E10600] text-white" : "border-[#E5E5E5] bg-white text-[#4D4D4D]"}`}>
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
                        window.history.replaceState(null, "", `/quiz?tema=${t.id}`);
                        newRound(t.id);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-[18px] border bg-white p-3 transition-shadow hover:shadow-md ${current ? "border-[#E10600]" : "border-[#EFEFEF]"}`}
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#FF1E1E] to-[#8a0303] text-[22px] font-black text-white">§</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-2">
                        <span className="truncate text-[14.5px] font-bold">{t.title}</span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${done ? "bg-[#ECF8F0] text-[#15803d]" : m ? "border border-[#FFD0D0] text-[#E10600]" : "border border-[#E5E5E5] text-[#8C8C8C]"}`}>
                          {done ? "Dominado" : m ? "Em andamento" : "Novo"}
                        </span>
                      </span>
                      <span className="block text-[12.5px] text-[#8C8C8C]">{t.discipline}{current ? " • jogando agora" : ""}</span>
                      <span className="mt-1 flex items-center gap-2 text-[11.5px] font-semibold text-[#8C8C8C]">
                        <span className="flex items-center gap-1 rounded-full border border-[#EFEFEF] px-2 py-0.5"><Clock className="h-3 w-3" aria-hidden /> {Math.max(1, Math.round(t.total * 0.6))} min</span>
                        <span className="flex items-center gap-1 text-[#E10600]"><BookOpen className="h-3 w-3" aria-hidden /> {m}/{t.total} dispositivos</span>
                      </span>
                    </span>
                  </Link>
                );
              })}
          </div>
        </section>

        <Link href="/questoes" className="flex items-center gap-3 rounded-[18px] border border-dashed border-[#E5E5E5] bg-white p-3.5 hover:shadow-md">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#0E0E0E] text-white"><FileText className="h-4 w-4" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-bold">Questões de prova</span>
            <span className="block text-[12.5px] text-[#8C8C8C]">Fácil, médio e difícil dos seus estudos</span>
          </span>
          <span className="rounded-full bg-[#E10600] px-3 py-1 text-[12px] font-bold text-white">Abrir</span>
        </Link>

        <section className="relative overflow-hidden rounded-[22px] bg-[#0E0E0E] p-4 text-white" aria-label="Desafio do dia">
          <div className="flex gap-3">
            <img src={MASCOT} alt="" className="h-14 w-14 shrink-0 rounded-full bg-white object-contain p-0.5" />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 text-[14px] font-bold">Instrutor te desafia <span className="rounded-[4px] bg-[#E10600] px-1.5 py-0.5 text-[9px] font-black">HOJE</span></p>
              <p className="mt-1 text-[12.5px] leading-snug text-[#BDBDBD]">
                Acerte {dailyGoal} lacunas hoje.{" "}
                {todayHits >= dailyGoal ? <strong className="text-white">Desafio cumprido!</strong> : <>Você está em {todayHits} de {dailyGoal}.</>}
              </p>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#2A2A2A]">
                <div className="h-full rounded-full bg-[#E10600] transition-[width] duration-500" style={{ width: `${Math.min(100, (todayHits / dailyGoal) * 100)}%` }} />
              </div>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}

function Blank({ n, word, state, answer }: { n: number; word: string | null; state: "ok" | "erro" | null; answer?: string }) {
  const base = "mx-1 inline-flex min-w-[64px] items-center justify-center rounded-[10px] border-2 px-2 align-middle text-[15px] font-bold leading-8";
  if (state === "ok") return <span className={`${base} border-[#15803d] bg-[#ECF8F0] text-[#15803d]`}>{word}</span>;
  if (state === "erro") return <span className={`${base} border-[#15803d] bg-[#ECF8F0] text-[#15803d]`} title={`Você marcou: ${word ?? "—"}`}>{answer}</span>;
  return word ? (
    <span className={`${base} border-[#1A1A1A] bg-white`}>{word}</span>
  ) : (
    <span className={`${base} border-dashed border-[#F2A3A3] bg-white text-[#E10600]`} aria-label={`Lacuna ${n + 1}`}>__</span>
  );
}

function HelpText({ text, empty }: { text: string | null; empty: string }) {
  if (!text) return <p className="text-[#8C8C8C]">{empty}</p>;
  return (
    <div className="leitura !max-w-none !text-[15px]">
      <Markdown>{text}</Markdown>
    </div>
  );
}

function StreakCard({ streak, pct, remaining, onKeep }: { streak: QuizHome["streak"]; pct: number; remaining: number; onKeep: () => void }) {
  const today = streak.last7.length - 1;
  return (
    <section className="relative overflow-hidden rounded-[24px] border border-[#EFEFEF] bg-white p-5 shadow-[0_10px_30px_rgba(0,0,0,0.04)]" aria-label="Ofensiva">
      <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FFECEC] blur-2xl" aria-hidden />
      <div className="relative flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E10600]"><Flame className="h-4 w-4 text-white" aria-hidden /></span>
        <p className="text-[12px] font-black uppercase tracking-[0.14em]">Ofensiva • {streak.current} {streak.current === 1 ? "dia" : "dias"}</p>
        {streak.best > 0 && <span className="ml-auto rounded-full bg-[#0E0E0E] px-2.5 py-1 text-[11px] font-bold text-white">Recorde {streak.best}</span>}
      </div>
      <p className="relative mt-4 font-[Space_Grotesk] text-[24px] font-black uppercase leading-[0.95] tracking-[-0.01em]">
        {streak.studiedToday ? "Continue" : "Não quebre"}
        <span className="block text-[#E10600]">{streak.studiedToday ? "assim, guerreiro" : "a sequência"}</span>
      </p>
      <p className="relative mt-2 text-[13.5px] leading-snug text-[#666]">{streak.message}.</p>
      <ol className="relative mt-4 flex items-center justify-between gap-1" aria-label="Últimos 7 dias">
        {streak.last7.map((on, i) => (
          <li key={i} className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-black ${i === today ? (on ? "bg-[#E10600] text-white" : "border-2 border-dashed border-[#E10600] text-[#E10600]") : on ? "bg-[#F4F4F4] text-[#1A1A1A]" : "bg-white text-[#D4D4D4] ring-1 ring-[#EFEFEF]"}`}>
            {i === today ? (on ? streak.current : "•") : on ? <Check className="h-3.5 w-3.5" aria-label="estudou" /> : <X className="h-3 w-3" aria-label="não estudou" />}
          </li>
        ))}
      </ol>
      <div className="relative mt-4 flex items-center gap-2">
        <button type="button" onClick={onKeep} className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-[#0E0E0E] text-[14px] font-bold text-white">
          Manter ofensiva
        </button>
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-[#FFD0D0] bg-white"><Zap className="h-5 w-5 text-[#E10600]" aria-hidden /></span>
      </div>
      <p className="relative mt-3 text-right text-[12px] text-[#8C8C8C]">{pct}% do tema dominado • {remaining} {remaining === 1 ? "dispositivo restante" : "dispositivos restantes"}</p>
    </section>
  );
}

function RoundEnd({ hearts, hits, total, answered, roundXp, pending, onAgain }: { hearts: number; hits: number; total: number; answered: number; roundXp: number; pending: boolean; onAgain: () => void }) {
  const lost = hearts <= 0;
  return (
    <section className="entrar mt-4 rounded-[28px] border border-[#EFEFEF] bg-white px-6 py-8 text-center shadow-[0_18px_50px_rgba(0,0,0,0.06)]" aria-label="Resultado da rodada" data-testid="quiz-fim">
      <img src={MASCOT} alt="" className="mx-auto h-24 w-24 rounded-full bg-[#0E0E0E] object-contain p-1" />
      <p className="mt-4 font-[Space_Grotesk] text-[26px] font-black uppercase leading-none">{lost ? "Sem vidas" : "Missão cumprida"}</p>
      <p className="mt-2 text-[15px] text-[#666]">{lost ? "A banca venceu esta. Revise e volte para a próxima rodada." : "Rodada concluída. Mantenha o ritmo."}</p>
      <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
        {[
          ["Acertos", `${hits}/${answered || total}`],
          ["XP ganho", `+${roundXp}`],
          ["Vidas", `${Math.max(0, hearts)}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[16px] border border-[#EFEFEF] px-2 py-3">
            <p className="text-[22px] font-black">{v}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#8C8C8C]">{k}</p>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAgain} disabled={pending} className="mx-auto mt-7 flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-[#E10600] text-[15px] font-black uppercase tracking-[0.08em] text-white shadow-[0_10px_24px_rgba(225,6,0,0.3)] disabled:opacity-60">
        <RotateCcw className="h-5 w-5" aria-hidden /> {pending ? "Preparando…" : "Nova rodada"}
      </button>
    </section>
  );
}
