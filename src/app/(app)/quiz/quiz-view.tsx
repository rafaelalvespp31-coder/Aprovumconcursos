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
    // Modo Jogo: palco preto ocupando toda a área de conteúdo; cards vermelhos; texto branco.
    <div className="jogo relative -mx-4 -mb-28 -mt-7 min-h-[calc(100dvh-5rem)] bg-[#070707] px-4 pb-32 pt-6 text-white sm:-mx-5 sm:px-5 lg:-mx-10 lg:-mb-12 lg:px-10 lg:pb-14" data-testid="quiz">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,rgba(225,6,0,0.22),transparent_65%)]" aria-hidden />
      <div className="relative mx-auto grid max-w-[1180px] gap-6 lg:grid-cols-[minmax(0,1fr)_330px] xl:gap-8">
        <div className="min-w-0">
          {/* Placar */}
          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center">
            <div className="col-span-3 rounded-[18px] border border-white/10 bg-[#121212] px-4 py-3 sm:col-span-1">
              <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
                <Crosshair className="h-3.5 w-3.5 text-[#FF3B30]" aria-hidden /> Progresso no tema
                <span className="ml-auto text-[13px] font-black tracking-normal text-white">{pct}%</span>
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label="Dispositivos dominados no tema" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                <div className="h-full rounded-full bg-gradient-to-r from-[#FF3B30] to-[#E10600] transition-[width] duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <Stat icon={<Flame className="h-4 w-4" aria-hidden />} value={home.streak.current} label={home.streak.current === 1 ? "dia" : "dias"} />
            <Stat icon={<Heart className="h-4 w-4 fill-current" aria-hidden />} value={hearts} label={hearts === 1 ? "vida" : "vidas"} ariaLabel={`${hearts} vidas`} />
            <Stat icon={<Trophy className="h-4 w-4" aria-hidden />} value={xp} label="XP" accent />
          </div>

          {/* Trilha */}
          <div ref={cardRef} className="mt-5 flex scroll-mt-24 flex-wrap items-center gap-2 text-[13px]">
            <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-medium text-white/80">{topic.discipline}</span>
            <span className="text-white/30">/</span>
            {item && <span className="rounded-full bg-[#E10600] px-3 py-1 font-bold text-white">{item.ref}</span>}
            <span className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[12px] text-white/60">
              <Clock className="h-3.5 w-3.5" aria-hidden /> ~1 min
            </span>
          </div>

          {error && <p className="mt-3 rounded-[12px] border border-[#FF3B30]/50 bg-[#2A0606] px-3 py-2 text-[14px] font-semibold text-white" role="alert">{error}</p>}

          {finished ? (
            <RoundEnd hearts={hearts} hits={hits} total={total} answered={Math.min(idx + (check ? 1 : 0), total)} roundXp={roundXp} pending={pending} onAgain={() => newRound()} />
          ) : item ? (
            <section className="relative mt-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#D90A00] via-[#B10400] to-[#6E0000] shadow-[0_24px_60px_rgba(225,6,0,0.28)] ring-1 ring-white/10" aria-label="Questão do jogo">
              <div className="absolute inset-x-0 top-0 h-1 bg-black/25">
                <div className="h-full bg-white transition-[width] duration-500" style={{ width: `${((idx + (check ? 1 : 0)) / total) * 100}%` }} />
              </div>
              <span className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" aria-hidden />

              <header className="relative flex items-center gap-3 border-b border-white/15 px-4 py-4 sm:px-7">
                <img src={MASCOT} alt="" className="h-12 w-12 shrink-0 rounded-full bg-black object-contain p-0.5 ring-2 ring-white/30" />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 whitespace-nowrap text-[15px] font-black">
                    Instrutor Caveira <span className="hidden rounded-[4px] bg-black px-1.5 py-0.5 text-[9px] font-black tracking-wide text-white min-[400px]:inline">APROVUM</span>
                  </p>
                  <p className="flex items-center gap-1 truncate text-[12.5px] text-white/75">
                    <BookOpen className="h-3.5 w-3.5 shrink-0" aria-hidden /> Complete a lei<span className="hidden sm:inline"> — texto literal</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-black/30 px-3 py-1 text-[12px] font-bold tabular-nums">
                  {idx + 1}/{total}
                </span>
              </header>

              <div className="relative px-4 pb-6 pt-5 sm:px-7">
                {/* Dispositivo */}
                <div className="relative rounded-[20px] bg-black/45 px-4 py-4 ring-1 ring-white/10 sm:px-6 sm:py-5">
                  {item.context && <p className="mb-2 text-[13.5px] leading-snug text-white/60">{item.context}</p>}
                  <p className="text-[16px] leading-[1.95] sm:text-[18px]">
                    {item.parts.map((p, i) =>
                      "text" in p ? (
                        <span key={i}>{p.text}</span>
                      ) : (
                        <Blank key={i} n={p.blank} word={slots[p.blank] ?? null} state={check ? (check.results[p.blank] ? "ok" : "erro") : null} answer={check?.answers[p.blank]} />
                      ),
                    )}
                  </p>
                  <p className="mt-4 flex flex-wrap items-center gap-2 text-[12px] text-white/60">
                    <span className="rounded-full bg-white px-2.5 py-1 font-black text-[#B10400]">{topic.lawCode ? `${topic.lawCode} • ` : ""}{item.ref}</span>
                    Texto literal do dispositivo
                  </p>
                </div>

                {/* Resposta */}
                <div className="mt-6 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">
                    <Crosshair className="h-3.5 w-3.5" aria-hidden /> Sua resposta
                  </p>
                  <span className="rounded-full bg-black/30 px-2.5 py-1 text-[12px] font-bold">
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
                        className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-[16px] border-2 px-3 text-center transition-all ${
                          st === "ok" ? "border-[#22C55E] bg-[#0F2A18]" : st === "erro" ? "border-black/40 bg-black/50" : w ? "border-white bg-white text-[#8A0000]" : "border-dashed border-white/45 bg-black/15"
                        }`}
                      >
                        {w ? (
                          <span className={`text-[16px] font-black ${st === "erro" ? "text-white/60 line-through" : st === "ok" ? "text-[#4ADE80]" : ""}`}>{w}</span>
                        ) : (
                          <>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-white/50"><Plus className="h-3 w-3" aria-hidden /></span>
                            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">Espaço {i + 1}</span>
                          </>
                        )}
                        {st === "erro" && check && <span className="text-[13px] font-black text-[#4ADE80]">{check.answers[i]}</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Banco de palavras */}
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">Banco de palavras</p>
                  {!check && <p className="text-[12px] text-white/55">Toque para encaixar →</p>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5">
                  {item.bank.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => place(w)}
                      disabled={!!check || used.has(w) || filled >= item.blanks}
                      className={`min-h-12 rounded-full px-5 text-[16px] font-bold transition-all active:scale-95 ${
                        used.has(w) ? "border border-dashed border-white/25 bg-transparent text-white/35" : "bg-[#0B0B0B] text-white shadow-[0_6px_16px_rgba(0,0,0,0.35)] ring-1 ring-white/10 hover:ring-white/40"
                      } disabled:cursor-default`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ação */}
              <div className="relative border-t border-white/15 bg-black/20 px-4 py-5 sm:px-7">
                {check && (
                  <div className={`entrar mb-4 flex items-start gap-3 rounded-[16px] px-4 py-3 ring-1 ${check.correct ? "bg-[#0F2A18] ring-[#22C55E]/50" : "bg-black/55 ring-white/15"}`} role="status">
                    <img src={MASCOT} alt="" className="h-10 w-10 shrink-0 rounded-full bg-black object-contain p-0.5" />
                    <div>
                      <p className={`text-[15px] font-black ${check.correct ? "text-[#4ADE80]" : "text-white"}`}>
                        {check.correct ? `Na mosca! +${check.xp} XP` : hearts > 0 ? "Errou. Menos uma vida." : "Errou. Acabaram as vidas."}
                      </p>
                      <p className="text-[13.5px] text-white/75">
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
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-white text-[15px] font-black uppercase tracking-[0.1em] text-[#B10400] shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-all active:scale-[0.99] disabled:bg-black/30 disabled:text-white/40 disabled:shadow-none"
                  >
                    <Crosshair className="h-5 w-5" aria-hidden /> {pending ? "Conferindo…" : "Verificar resposta"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={next}
                    className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-black text-[15px] font-black uppercase tracking-[0.1em] text-white ring-1 ring-white/20 transition-all active:scale-[0.99]"
                  >
                    {hearts <= 0 || idx + 1 >= total ? "Ver resultado" : "Próxima questão"} <ArrowRight className="h-5 w-5" aria-hidden />
                  </button>
                )}
                <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12px] text-white/60">
                  <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> Resposta conferida no servidor • texto do catálogo APROVUM
                </p>
              </div>
            </section>
          ) : null}

          {/* Abas: explicação, banca, dica */}
          {!finished && item && (
            <div className="mt-6">
              <div className="inline-flex rounded-full bg-[#141414] p-1 ring-1 ring-white/10" role="tablist" aria-label="Explicação da questão">
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
              <div className="mt-3 rounded-[20px] bg-[#141414] px-5 py-4 text-[15px] leading-relaxed text-white/90 ring-1 ring-white/10" role="tabpanel">
                {!check ? (
                  <p className="text-white/55">Responda para liberar a explicação deste dispositivo.</p>
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
              <h2 className="flex items-center gap-2 text-[15px] font-black"><BookOpen className="h-4 w-4 text-[#FF3B30]" aria-hidden /> Próximas lições</h2>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[12px] text-white/70">{home.topics.length} {home.topics.length === 1 ? "disponível" : "disponíveis"}</span>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {disciplines.map((d) => (
                <button key={d} type="button" onClick={() => setFilter(d)} className={`shrink-0 rounded-full px-4 py-2 text-[13px] font-bold ${filter === d ? "bg-[#E10600] text-white" : "bg-[#141414] text-white/70 ring-1 ring-white/10"}`}>
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
                      className={`flex items-center gap-3 rounded-[18px] p-3 transition-transform active:scale-[0.99] ${
                        current ? "bg-gradient-to-br from-[#D90A00] to-[#7A0000] shadow-[0_12px_30px_rgba(225,6,0,0.3)]" : "bg-[#3A0808] ring-1 ring-[#E10600]/30 hover:ring-[#E10600]/70"
                      }`}
                    >
                      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] text-[22px] font-black ${current ? "bg-black/35" : "bg-[#E10600]"}`}>§</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="truncate text-[14.5px] font-black">{t.title}</span>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${done ? "bg-[#22C55E] text-black" : "bg-black/35 text-white"}`}>
                            {done ? "Dominado" : current ? "Jogando" : m ? "Em andamento" : "Novo"}
                          </span>
                        </span>
                        <span className="block text-[12.5px] text-white/70">{t.discipline}</span>
                        <span className="mt-1 flex items-center gap-2 text-[11.5px] font-semibold text-white/80">
                          <span className="flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5"><Clock className="h-3 w-3" aria-hidden /> {Math.max(1, Math.round(t.total * 0.6))} min</span>
                          <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" aria-hidden /> {m}/{t.total} dispositivos</span>
                        </span>
                      </span>
                    </Link>
                  );
                })}
            </div>
          </section>

          <Link href="/questoes" className="flex items-center gap-3 rounded-[18px] bg-[#3A0808] p-3.5 ring-1 ring-[#E10600]/30 hover:ring-[#E10600]/70">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white"><FileText className="h-4 w-4" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14px] font-black">Questões de prova</span>
              <span className="block text-[12.5px] text-white/70">Fácil, médio e difícil dos seus estudos</span>
            </span>
            <span className="rounded-full bg-[#E10600] px-3 py-1 text-[12px] font-bold text-white">Abrir</span>
          </Link>

          <section className="relative overflow-hidden rounded-[22px] bg-gradient-to-br from-[#D90A00] to-[#6E0000] p-4 shadow-[0_12px_30px_rgba(225,6,0,0.25)]" aria-label="Desafio do dia">
            <div className="flex gap-3">
              <img src={MASCOT} alt="" className="h-14 w-14 shrink-0 rounded-full bg-black object-contain p-0.5 ring-2 ring-white/30" />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[14px] font-black">Instrutor te desafia <span className="rounded-[4px] bg-black px-1.5 py-0.5 text-[9px] font-black">HOJE</span></p>
                <p className="mt-1 text-[12.5px] leading-snug text-white/80">
                  Acerte {dailyGoal} lacunas hoje.{" "}
                  {todayHits >= dailyGoal ? <strong className="text-white">Desafio cumprido!</strong> : <>Você está em {todayHits} de {dailyGoal}.</>}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/35">
                  <div className="h-full rounded-full bg-white transition-[width] duration-500" style={{ width: `${Math.min(100, (todayHits / dailyGoal) * 100)}%` }} />
                </div>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Stat({ icon, value, label, accent = false, ariaLabel }: { icon: React.ReactNode; value: number; label: string; accent?: boolean; ariaLabel?: string }) {
  return (
    <div
      className={`flex min-h-[58px] items-center justify-center gap-2 rounded-[18px] px-3 py-2 ${accent ? "bg-[#E10600] shadow-[0_10px_24px_rgba(225,6,0,0.3)]" : "bg-[#121212] ring-1 ring-white/10"}`}
      aria-label={ariaLabel}
    >
      <span className={`flex h-8 w-8 items-center justify-center rounded-full ${accent ? "bg-black/30 text-white" : "bg-[#E10600]/15 text-[#FF3B30]"}`}>{icon}</span>
      <span className="leading-none">
        <span className="block text-[18px] font-black tabular-nums">{value}</span>
        <span className={`block text-[11px] font-semibold ${accent ? "text-white/80" : "text-white/55"}`}>{label}</span>
      </span>
    </div>
  );
}

function Blank({ n, word, state, answer }: { n: number; word: string | null; state: "ok" | "erro" | null; answer?: string }) {
  const base = "mx-1 inline-flex min-w-[64px] items-center justify-center rounded-[10px] border-2 px-2 align-middle text-[15px] font-black leading-8";
  if (state === "ok") return <span className={`${base} border-[#22C55E] bg-[#0F2A18] text-[#4ADE80]`}>{word}</span>;
  if (state === "erro") return <span className={`${base} border-[#22C55E] bg-[#0F2A18] text-[#4ADE80]`} title={`Você marcou: ${word ?? "—"}`}>{answer}</span>;
  return word ? (
    <span className={`${base} border-white bg-white text-[#8A0000]`}>{word}</span>
  ) : (
    <span className={`${base} border-dashed border-[#FF6B6B] text-[#FF6B6B]`} aria-label={`Lacuna ${n + 1}`}>__</span>
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

function StreakCard({ streak, pct, remaining, onKeep }: { streak: QuizHome["streak"]; pct: number; remaining: number; onKeep: () => void }) {
  const today = streak.last7.length - 1;
  return (
    <section className="relative overflow-hidden rounded-[24px] bg-gradient-to-br from-[#D90A00] via-[#B10400] to-[#6E0000] p-5 shadow-[0_18px_44px_rgba(225,6,0,0.3)]" aria-label="Ofensiva">
      <span className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10 blur-2xl" aria-hidden />
      <div className="relative flex items-center gap-2">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-black/35"><Flame className="h-4 w-4" aria-hidden /></span>
        <p className="text-[12px] font-black uppercase tracking-[0.14em]">Ofensiva • {streak.current} {streak.current === 1 ? "dia" : "dias"}</p>
        {streak.best > 0 && <span className="ml-auto rounded-full bg-black px-2.5 py-1 text-[11px] font-bold">Recorde {streak.best}</span>}
      </div>
      <p className="relative mt-4 font-[Space_Grotesk] text-[25px] font-black uppercase leading-[0.95] tracking-[-0.01em]">
        {streak.studiedToday ? "Continue" : "Não quebre"}
        <span className="block text-black/80">{streak.studiedToday ? "assim, guerreiro" : "a sequência"}</span>
      </p>
      <p className="relative mt-2 text-[13.5px] leading-snug text-white/85">{streak.message}.</p>
      <ol className="relative mt-4 flex items-center justify-between gap-1" aria-label="Últimos 7 dias">
        {streak.last7.map((on, i) => (
          <li key={i} className={`flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-black ${i === today ? (on ? "bg-white text-[#B10400]" : "border-2 border-dashed border-white text-white") : on ? "bg-black/40 text-white" : "bg-black/15 text-white/40"}`}>
            {i === today ? (on ? streak.current : "•") : on ? <Check className="h-3.5 w-3.5" aria-label="estudou" /> : <X className="h-3 w-3" aria-label="não estudou" />}
          </li>
        ))}
      </ol>
      <div className="relative mt-4 flex items-center gap-2">
        <button type="button" onClick={onKeep} className="flex min-h-12 flex-1 items-center justify-center rounded-full bg-black text-[14px] font-black">
          Manter ofensiva
        </button>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#B10400]"><Zap className="h-5 w-5" aria-hidden /></span>
      </div>
      <p className="relative mt-3 text-right text-[12px] text-white/75">{pct}% do tema dominado • {remaining} {remaining === 1 ? "dispositivo restante" : "dispositivos restantes"}</p>
    </section>
  );
}

function RoundEnd({ hearts, hits, total, answered, roundXp, pending, onAgain }: { hearts: number; hits: number; total: number; answered: number; roundXp: number; pending: boolean; onAgain: () => void }) {
  const lost = hearts <= 0;
  return (
    <section className="entrar relative mt-4 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#D90A00] via-[#B10400] to-[#6E0000] px-6 py-8 text-center shadow-[0_24px_60px_rgba(225,6,0,0.28)]" aria-label="Resultado da rodada" data-testid="quiz-fim">
      <img src={MASCOT} alt="" className="mx-auto h-24 w-24 rounded-full bg-black object-contain p-1 ring-4 ring-white/25" />
      <p className="mt-4 font-[Space_Grotesk] text-[28px] font-black uppercase leading-none">{lost ? "Sem vidas" : "Missão cumprida"}</p>
      <p className="mt-2 text-[15px] text-white/85">{lost ? "A banca venceu esta. Revise e volte para a próxima rodada." : "Rodada concluída. Mantenha o ritmo."}</p>
      <div className="mx-auto mt-6 grid max-w-sm grid-cols-3 gap-3">
        {[
          ["Acertos", `${hits}/${answered || total}`],
          ["XP ganho", `+${roundXp}`],
          ["Vidas", `${Math.max(0, hearts)}`],
        ].map(([k, v]) => (
          <div key={k} className="rounded-[16px] bg-black/35 px-2 py-3">
            <p className="text-[22px] font-black">{v}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-white/70">{k}</p>
          </div>
        ))}
      </div>
      <button type="button" onClick={onAgain} disabled={pending} className="mx-auto mt-7 flex min-h-14 w-full max-w-sm items-center justify-center gap-2 rounded-full bg-white text-[15px] font-black uppercase tracking-[0.1em] text-[#B10400] disabled:opacity-60">
        <RotateCcw className="h-5 w-5" aria-hidden /> {pending ? "Preparando…" : "Nova rodada"}
      </button>
    </section>
  );
}
