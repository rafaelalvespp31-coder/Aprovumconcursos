"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  ChartColumn,
  CircleAlert,
  CircleHelp,
  Clock,
  Clock3,
  Flame,
  GraduationCap,
  Library,
  Play,
  Star,
  Trophy,
  X,
  Zap,
} from "lucide-react";
import { PastelCard, rgbOf } from "@/components/pastel/card";
import { usePastelToast } from "@/components/pastel/shell";
import { useStored } from "@/components/use-stored";
import type { UnitState } from "@/domain/progress/state-machine";
import { STAGE_LABELS, goalHint, type Stage, type TrailCard } from "./model";

export interface DashboardData {
  name: string | null;
  goals: { dailyQuestions: number | null; weeklyLessons: number | null };
  today: { answered: number; correct: number };
  weekLessonsCompleted: number;
  days: Array<{ day: string; correct: number; wrong: number }>;
  accuracy14d: number | null;
  answered14d: number;
  continueLesson: {
    id: string;
    title: string;
    objective: string;
    state: UnitState;
    stage: Stage;
    trailId: string;
    trailTitle: string;
    moduleTitle: string | null;
    position: number | null;
    totalLessons: number | null;
    trailProgress: number;
    estimatedMinutes: number;
  } | null;
  questions: { total: number; unanswered: number; marked: number; unansweredByLevel: { facil: number; medio: number; dificil: number } };
  reviews: { count: number; top: { lessonId: string; title: string; overdueDays: number } | null };
  trails: TrailCard[];
  pendingTrails: Array<{ id: string; title: string; status: string }>;
  /** Prefixo de rotas (a galeria usa /dev/galeria). */
  basePath?: string;
}

const WEEKDAY = ["D", "S", "T", "Q", "Q", "S", "S"];
const WEEKDAY_LONG = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();
const gradientText = (c1: string, c2: string) => ({
  background: `linear-gradient(90deg, ${c1}, ${c2})`,
  WebkitBackgroundClip: "text" as const,
  backgroundClip: "text" as const,
  color: "transparent",
});

/** Anima um valor de 0 até `target` (instantâneo para quem pediu menos movimento). */
function useCountUp(target: number, delay: number) {
  const [v, setV] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    if (reduced) {
      raf = requestAnimationFrame(() => setV(target));
      return () => cancelAnimationFrame(raf);
    }
    const t = setTimeout(() => {
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / 700);
        setV(target * (1 - (1 - p) ** 3));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [target, delay]);
  return v;
}

export function DashboardView(d: DashboardData) {
  const base = d.basePath ?? "";
  const toast = usePastelToast();
  const [modal, setModal] = useState<TrailCard | null>(null);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; text: string } | null>(null);
  const [barsIn, setBarsIn] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBarsIn(true), 400);
    return () => clearTimeout(t);
  }, []);

  const c = d.continueLesson;
  const qGoal = d.goals.dailyQuestions;
  const lGoal = d.goals.weeklyLessons;
  const rings = [
    {
      label: "Questões hoje",
      done: d.today.answered,
      total: qGoal,
      color1: "#7C6BFF",
      color2: "#5B8DEF",
      text: "#6A5AE0",
      bg: "#F5F3FF",
      emoji: "🎯",
      sub: goalHint(d.today.answered, qGoal, "questões"),
      href: qGoal ? `${base}/questoes` : `${base}/perfil#metas`,
    },
    {
      label: "Aulas semana",
      done: d.weekLessonsCompleted,
      total: lGoal,
      color1: "#FF8E6B",
      color2: "#FFB86B",
      text: "#C2410C",
      bg: "#FFF2E6",
      emoji: "📚",
      sub: goalHint(d.weekLessonsCompleted, lGoal, "aulas"),
      href: lGoal ? `${base}/trilhas` : `${base}/perfil#metas`,
    },
  ];
  const maxDay = Math.max(1, ...d.days.map((x) => x.correct + x.wrong));
  const qPct = d.questions.total ? Math.round((d.questions.unanswered / d.questions.total) * 100) : 0;
  const activeTrails = d.trails.length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_0.85fr]">
        {/* Tema atual */}
        {c ? (
          <PastelCard delay={0} glowColor="124,107,255" className="!p-0 group/hero" href={`${base}/aula/${c.id}`} label={`Continuar estudando: ${c.title}`} testId="hero">
            <div className="relative overflow-hidden">
              <div className="absolute inset-0" aria-hidden>
                <div className="absolute -top-24 -right-20 h-[360px] w-[360px] animate-[meshMove_10s_ease-in-out_infinite] rounded-full bg-gradient-to-br from-[#E9E6FF] to-[#DDE3FF]/60 blur-[30px]" />
                <div className="absolute -bottom-28 -left-20 h-[420px] w-[420px] animate-[meshMove_12s_ease-in-out_infinite_1s] rounded-full bg-gradient-to-br from-[#FFF0E6] to-[#FFE2D0]/60 blur-[32px]" />
                <div className="absolute top-1/2 left-1/2 h-[320px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-[40px] bg-gradient-to-br from-[#F5F3FF]/80 via-white/60 to-[#EEF2FF]/60 blur-[10px]" />
              </div>
              <div className="relative flex gap-5 p-6 sm:p-7 lg:p-8">
                <div className="hidden h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] border border-white bg-gradient-to-br from-white to-[#F5F3FF] shadow-[0_8px_24px_rgba(124,107,255,0.12),inset_0_1px_0_white] transition-all duration-700 group-hover/hero:rotate-[-8deg] group-hover/hero:scale-110 sm:flex" aria-hidden>
                  <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[14px] bg-gradient-to-br from-[#7C6BFF] to-[#5B8DEF] shadow-[0_6px_16px_rgba(124,107,255,0.35)]">
                    <BookOpen className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="relative inline-flex items-center gap-2 rounded-full border border-[#EDE9FF] bg-white py-1 pl-1 pr-3 shadow-[0_2px_10px_rgba(124,107,255,0.08)]">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5F3FF]" aria-hidden>
                        <span className="h-2 w-2 animate-[pulse-soft_1.4s_ease-in-out_infinite] rounded-full bg-[#7C6BFF]" />
                      </div>
                      <span className="text-[11px] font-bold uppercase tracking-wide text-[#6A5AE0]">Em andamento</span>
                    </div>
                    <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-[#1E1B4B] px-2.5 py-1 text-[11px] font-medium text-white">
                      <Library className="h-3 w-3 shrink-0" aria-hidden /> <span className="truncate">{c.trailTitle}</span>
                    </span>
                    {c.position && c.totalLessons ? (
                      <span className="hidden items-center gap-1 text-[11px] text-[#6F6D92] sm:inline-flex">
                        <span className="h-1 w-1 rounded-full bg-[#9A98B8]" aria-hidden /> Tema {c.position} de {c.totalLessons}
                      </span>
                    ) : null}
                  </div>
                  <h2 className="mt-3.5 font-[Space_Grotesk] text-[19px] font-[700] leading-[1.2] tracking-[-0.01em] sm:text-[20px] lg:text-[22px]">
                    {c.moduleTitle ? `${c.moduleTitle} / ${c.title}` : c.title}
                  </h2>
                  <p className="mt-2.5 line-clamp-2 max-w-[56ch] text-[13.5px] leading-[1.6] text-[#6B6A8A]">{c.objective}</p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <span className="group/btn inline-flex h-11 items-center gap-2.5 rounded-[14px] bg-[#1E1B4B] pl-5 pr-4 text-[13px] font-semibold text-white shadow-[0_8px_20px_rgba(30,27,75,0.20)] transition-all group-hover/hero:bg-black">
                      Continuar
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition-colors group-hover/hero:bg-white group-hover/hero:text-[#1E1B4B]">
                        <ArrowRight className="h-4 w-4 transition-transform group-hover/hero:translate-x-0.5" aria-hidden />
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 text-[12px] text-[#6F6D92]">
                      <Clock className="h-3.5 w-3.5" aria-hidden /> ~{c.estimatedMinutes} min (estimativa)
                    </span>
                  </div>
                </div>
                <div className="hidden shrink-0 flex-col items-center justify-center gap-3 lg:flex">
                  <div className="flex h-[92px] w-[92px] rotate-3 items-center justify-center rounded-[24px] border border-[#F3F0FF] bg-white text-[34px] shadow-[0_8px_24px_rgba(124,107,255,0.10)] transition-transform duration-700 group-hover/hero:rotate-0" aria-hidden>
                    {c.stage === "ensino" ? "📚" : c.stage === "fixacao" ? "✍️" : "🧠"}
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-[#EDE9FF] bg-[#F5F3FF] px-2.5 py-1 text-[10px] font-bold uppercase text-[#6A5AE0]" data-testid="hero-stage">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#7C6BFF]" aria-hidden /> Etapa: {STAGE_LABELS[c.stage]}
                  </div>
                </div>
              </div>
              <div className="relative h-[6px] overflow-hidden bg-[#F5F3FF]" role="progressbar" aria-label="Temas aprovados na trilha" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.trailProgress}>
                <div className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-gradient-to-r from-[#7C6BFF] via-[#8B7FFF] to-[#5B8DEF]" style={{ width: `${Math.max(c.trailProgress, 2)}%` }}>
                  <div className="absolute inset-0 animate-[shimmer_1.8s_linear_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
                </div>
              </div>
            </div>
          </PastelCard>
        ) : (
          <PastelCard delay={0} glowColor="124,107,255" href={activeTrails ? `${base}/trilhas` : `${base}/nova-trilha`} label={activeTrails ? "Escolher um tema nas trilhas" : "Criar a primeira trilha"} testId="hero">
            <div className="flex gap-5 p-7 lg:p-8">
              <div className="flex h-[48px] w-[48px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#7C6BFF] to-[#5B8DEF] shadow-[0_6px_16px_rgba(124,107,255,0.35)]" aria-hidden>
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="font-[Space_Grotesk] text-[20px] font-[700] lg:text-[22px]">{activeTrails ? "Escolha o próximo tema" : "Comece sua primeira trilha"}</h2>
                <p className="mt-2 max-w-[56ch] text-[13.5px] leading-[1.6] text-[#6B6A8A]">
                  {activeTrails
                    ? "Abra uma trilha e comece pelo primeiro tema liberado. Cada tema passa por todas as formas de ensino e depois pelas questões de fixação."
                    : "Cole o edital, a lei ou o material que você quer estudar. A trilha é montada tema a tema, cobrindo todo o conteúdo."}
                </p>
                <span className="mt-5 inline-flex h-11 items-center gap-2.5 rounded-[14px] bg-[#1E1B4B] pl-5 pr-4 text-[13px] font-semibold text-white">
                  {activeTrails ? "Ver trilhas" : "Nova trilha"} <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </div>
          </PastelCard>
        )}

        {/* Metas */}
        <div className="grid grid-cols-2 gap-4">
          {rings.map((s, i) => (
            <Ring key={s.label} s={s} index={i} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Revisões */}
        <PastelCard delay={160} glowColor="255,142,107" className="relative overflow-hidden border-[#FFE9E0] p-6" href={d.reviews.top ? `${base}/aula/${d.reviews.top.lessonId}?revisao=1#questoes` : `${base}/revisoes`} label={`Revisões pendentes: ${d.reviews.count}`} testId="card-revisoes">
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-[#FF8E6B]/10 blur-[18px]" aria-hidden />
          {d.reviews.count > 0 && <div className="absolute inset-0 rounded-[32px] border border-[#FF8E6B]/30 opacity-60" style={{ animation: "borderPulse 2.2s ease-in-out infinite" }} aria-hidden />}
          <div className="relative flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#FF8E6B] to-[#FFB86B] shadow-[0_8px_20px_rgba(255,142,107,0.35)] ${d.reviews.count ? "animate-[pulse-soft_2s_ease-in-out_infinite]" : ""}`} aria-hidden>
                <Clock3 className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-[Space_Grotesk] text-[13.5px] font-bold tracking-tight">Revisões pendentes</div>
                <div className="text-[11.5px] text-[#6F6D92]">mantém o cérebro fresquinho</div>
              </div>
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#FFE0CC] bg-[#FFF2E6] text-[12px] font-bold text-[#C2410C]" data-testid="reviews-count">{d.reviews.count}</div>
          </div>
          <div className="relative mt-5 flex gap-3 rounded-[18px] border border-[#FFE9E0] bg-[#FFF8F5] p-3.5 shadow-[inset_0_1px_0_white]">
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] border border-[#FFE9E0] bg-white text-[18px] ${d.reviews.top ? "animate-[shake_2.5s_ease-in-out_infinite]" : ""}`} aria-hidden>
              {d.reviews.top ? "📄" : "✅"}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{d.reviews.top ? d.reviews.top.title : "Nenhuma revisão para hoje"}</div>
              {d.reviews.top ? (
                <div className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-[#FF8E6B] px-2.5 py-1 text-[10px] font-bold text-[#1E1B4B] shadow-[0_4px_12px_rgba(255,142,107,0.35)]">
                  <CircleAlert className="h-3 w-3" aria-hidden />
                  {d.reviews.top.overdueDays > 0 ? `Atrasada há ${d.reviews.top.overdueDays} dia${d.reviews.top.overdueDays > 1 ? "s" : ""}` : "Para hoje"}
                </div>
              ) : (
                <div className="mt-1 text-[11px] text-[#6F6D92]">As revisões aparecem aqui quando chegam no prazo.</div>
              )}
            </div>
          </div>
          <span className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-[#1E1B4B] text-[13px] font-semibold text-white shadow-[0_6px_16px_rgba(30,27,75,0.18)] transition group-hover:bg-black">
            {d.reviews.top ? "Revisar agora" : "Ver revisões"} <Zap className="h-3.5 w-3.5" aria-hidden />
          </span>
        </PastelCard>

        {/* Questões a resolver */}
        <PastelCard delay={240} glowColor="124,107,255" className="p-6" href={`${base}/questoes?situacao=nao_respondidas`} label={`Questões a resolver: ${d.questions.unanswered} de ${d.questions.total}`} testId="card-questoes">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#7C6BFF] to-[#5B8DEF] shadow-[0_8px_20px_rgba(124,107,255,0.32)]" aria-hidden>
                <CircleHelp className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-[Space_Grotesk] text-[13.5px] font-bold">Questões a resolver</div>
                <div className="text-[11.5px] text-[#6F6D92]">pratique leve, sem pressão</div>
              </div>
            </div>
            <div className="rounded-full border border-[#EDE9FF] bg-[#F5F3FF] px-2.5 py-1 text-[11px] font-bold text-[#6A5AE0]">
              {d.questions.unanswered} / {d.questions.total}
            </div>
          </div>
          <div className="mt-6">
            <div className="h-2.5 overflow-hidden rounded-full bg-[#F5F3FF] p-1">
              <div className="relative h-full overflow-hidden rounded-full bg-gradient-to-r from-[#7C6BFF] to-[#5B8DEF]" style={{ width: `${qPct}%` }}>
                <div className="absolute inset-0 animate-[shimmer_2s_linear_infinite] bg-white/40" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[12px]">
              <span className="text-[#6B6A8A]">{d.questions.unanswered} de {d.questions.total} sem resposta</span>
              <span className="rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-2.5 py-1 text-[11px] font-medium text-[#B45309]">{d.questions.marked} para depois</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2">
            {[
              { k: "Fácil", v: d.questions.unansweredByLevel.facil, c: "bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]" },
              { k: "Médio", v: d.questions.unansweredByLevel.medio, c: "bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]" },
              { k: "Difícil", v: d.questions.unansweredByLevel.dificil, c: "bg-[#FFF1F2] text-[#BE123C] border-[#FECDD3]" },
            ].map((s) => (
              <div key={s.k} className={`rounded-[12px] border px-2.5 py-2 text-center ${s.c}`}>
                <div className="text-[11px] font-semibold">{s.k}</div>
                <div className="text-[14px] font-bold">{s.v}</div>
              </div>
            ))}
          </div>
        </PastelCard>

        {/* Últimos 14 dias */}
        <PastelCard delay={320} glowColor="30,27,75" className="p-6" noTilt testId="card-14dias">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[#1E1B4B] shadow-[0_6px_16px_rgba(30,27,75,0.22)]" aria-hidden>
                <ChartColumn className="h-5 w-5 text-white" />
              </div>
              <div>
                <div className="font-[Space_Grotesk] text-[13.5px] font-bold">Últimos 14 dias</div>
                <div className="text-[11.5px] text-[#6F6D92]">{d.answered14d ? "sua constância, dia a dia" : "responda questões para ver sua evolução"}</div>
              </div>
            </div>
            <Link href={`${base}/desempenho`} className="text-[12px] font-semibold text-[#6A5AE0] hover:text-[#5B8DEF]">Detalhes</Link>
          </div>
          <div className="mt-4 flex items-baseline gap-2.5">
            <span className="font-[Space_Grotesk] text-[30px] font-[800] leading-none tracking-tight">{d.answered14d}</span>
            <span className="text-[12px] text-[#6B6A8A]">respostas</span>
            {d.accuracy14d !== null && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#A7F3D0] bg-[#ECFDF5] px-2.5 py-1 text-[11px] font-bold text-[#047857]">
                <Flame className="h-3 w-3" aria-hidden /> {Math.round(d.accuracy14d * 100)}% acerto
              </span>
            )}
          </div>
          <div className="mt-5 flex h-[72px] items-end gap-[5px]" role="list" aria-label="Respostas por dia nos últimos 14 dias">
            {d.days.map((s, i) => {
              const total = s.correct + s.wrong;
              const h = total ? 18 + (total / maxDay) * 42 : 6;
              const acc = total ? (s.correct / total) * 100 : 0;
              const wd = weekdayOf(s.day);
              const text = total ? `${WEEKDAY_LONG[wd]} ${s.day.slice(8, 10)}/${s.day.slice(5, 7)}: ${s.correct}/${total} • ${Math.round(acc)}% acerto` : `${WEEKDAY_LONG[wd]} ${s.day.slice(8, 10)}/${s.day.slice(5, 7)}: sem respostas`;
              const isToday = i === d.days.length - 1;
              const show = (el: HTMLElement) => {
                const r = el.getBoundingClientRect();
                setTooltip({ x: r.left + r.width / 2, y: r.top - 8, text });
              };
              return (
                <div key={s.day} role="listitem" className="group/bar relative flex flex-1 flex-col items-center gap-1.5">
                  <div className="relative flex w-full justify-center" style={{ height: "60px" }}>
                    <div
                      tabIndex={0}
                      aria-label={text}
                      className={`absolute bottom-0 w-full max-w-[22px] cursor-pointer overflow-hidden rounded-full transition-all duration-300 hover:scale-y-110 hover:brightness-110 ${total ? "bg-gradient-to-t from-[#7C6BFF] to-[#A5B4FC] shadow-[0_3px_10px_rgba(124,107,255,0.28)]" : "bg-[#EDE9FF]"}`}
                      style={{
                        height: barsIn ? `${h}px` : "6px",
                        transitionDelay: `${i * 35}ms`,
                        animation: barsIn ? "springIn 0.6s cubic-bezier(0.34,1.56,0.64,1) both" : undefined,
                        animationDelay: `${i * 45}ms`,
                        transformOrigin: "bottom",
                      }}
                      onMouseEnter={(e) => show(e.currentTarget)}
                      onFocus={(e) => show(e.currentTarget)}
                      onMouseLeave={() => setTooltip(null)}
                      onBlur={() => setTooltip(null)}
                    >
                      {total > 0 && s.wrong > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 rounded-full bg-[#FF8E6B]/70" style={{ height: `${100 - acc}%`, minHeight: "5px" }} />
                      )}
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium ${isToday ? "font-bold text-[#6A5AE0]" : "text-[#6F6D92] group-hover/bar:text-[#1E1B4B]"}`} aria-hidden>
                    {WEEKDAY[wd]}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex gap-3 text-[10.5px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-gradient-to-r from-[#7C6BFF] to-[#A5B4FC]" aria-hidden /> acertos
            </span>
            <span className="flex items-center gap-1.5 text-[#6F6D92]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FF8E6B]/60" aria-hidden /> erros
            </span>
          </div>
        </PastelCard>
      </div>

      {/* Trilhas */}
      <div>
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex flex-wrap items-center gap-2.5 font-[Space_Grotesk] text-[18px] font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-[#1E1B4B] text-white shadow-[0_4px_12px_rgba(30,27,75,0.20)]" aria-hidden>
              <GraduationCap className="h-4.5 w-4.5" />
            </span>
            Suas trilhas
            <span className="ml-1 rounded-full border border-[#F0F0FF] bg-white px-2.5 py-0.5 font-[Inter,system-ui,sans-serif] text-[11px] font-semibold text-[#6B6A8A] shadow-sm">
              {activeTrails} {activeTrails === 1 ? "ativa" : "ativas"}
              {d.trails.slice(0, 2).map((t) => ` • ${t.passedLessons}/${t.totalLessons}`).join("")}
            </span>
          </h2>
          <Link href={`${base}/trilhas`} className="group flex items-center gap-1 text-[13px] font-semibold text-[#6A5AE0] hover:text-[#5B8DEF]">
            Ver tudo <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
        {d.pendingTrails.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {d.pendingTrails.map((t) => (
              <Link key={t.id} href={`${base}/trilhas/${t.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#FDE68A] bg-[#FFFBEB] px-3 py-1.5 text-[12px] font-medium text-[#B45309]">
                {t.title} — {t.status === "review" ? "revise o plano" : t.status === "failed" ? "falhou: tente de novo" : "em preparação"}
              </Link>
            ))}
          </div>
        )}
        {d.trails.length ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {d.trails.slice(0, 2).map((t, i) => (
              <TrailTile key={t.id} t={t} delay={400 + i * 80} onOpen={() => setModal(t)} />
            ))}
          </div>
        ) : (
          <PastelCard href={`${base}/nova-trilha`} className="flex min-h-[160px] flex-col items-center justify-center border-2 border-dashed !bg-transparent p-8 !shadow-none" label="Criar nova trilha">
            <div className="font-bold">Nenhuma trilha ativa</div>
            <div className="mt-1 text-[12px] text-[#6F6D92]">Crie uma trilha a partir do seu edital ou material.</div>
          </PastelCard>
        )}
      </div>

      <FocusTip onToast={toast} />

      {tooltip && (
        <div className="pointer-events-none fixed z-[70] -translate-x-1/2 -translate-y-full rounded-[12px] bg-[#1E1B4B] px-3 py-2 text-[11px] font-medium text-white shadow-[0_12px_32px_rgba(0,0,0,0.22)]" style={{ left: tooltip.x, top: tooltip.y }} role="tooltip">
          {tooltip.text}
          <div className="absolute left-1/2 top-full -mt-1 h-2 w-2 -translate-x-1/2 rotate-45 bg-[#1E1B4B]" />
        </div>
      )}

      <TrailModal t={modal} base={base} onClose={() => setModal(null)} />
    </div>
  );
}

function Ring({ s, index }: { s: { label: string; done: number; total: number | null; color1: string; color2: string; text: string; bg: string; emoji: string; sub: string; href: string }; index: number }) {
  const pct = s.total ? Math.min(100, Math.round((s.done / s.total) * 100)) : 0;
  const v = useCountUp(pct, 500 + index * 200);
  return (
    <PastelCard delay={80 + index * 80} glowColor={rgbOf(s.color1)} className="flex flex-col items-center p-4 text-center sm:p-5" href={s.href} label={`${s.label}: ${s.done}${s.total ? ` de ${s.total}` : ""}`} testId={`ring-${index}`}>
      <div className="flex flex-col items-center">
        <div className="relative h-[92px] w-[92px] sm:h-[106px] sm:w-[106px]">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke={s.bg} strokeWidth="10" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={`url(#ring-g${index})`} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${(v / 100) * 264} 264`} style={{ filter: "drop-shadow(0 2px 8px rgba(0,0,0,0.08))" }} />
            <defs>
              <linearGradient id={`ring-g${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={s.color1} />
                <stop offset="100%" stopColor={s.color2} />
              </linearGradient>
            </defs>
          </svg>
          <div className="glass absolute inset-[12px] flex flex-col items-center justify-center rounded-full border border-white bg-white/70 shadow-[inset_0_1px_0_white]">
            <span className="text-[14px] sm:text-[16px]" aria-hidden>{s.emoji}</span>
            <span className="text-[19px] font-[800] leading-none tracking-tight sm:text-[22px]" style={gradientText(s.color1, s.color2)}>
              {s.total ? `${Math.round(v)}%` : "—"}
            </span>
          </div>
        </div>
        <div className="mt-4">
          <div className="font-[Space_Grotesk] text-[13px] font-semibold">{s.label}</div>
          <div className="mt-1 text-[22px] font-[800] leading-none">
            <span style={gradientText(s.color1, s.color2)}>{s.done}</span>
            <span className="text-[14px] font-medium text-[#6F6D92]">/{s.total ?? "?"}</span>
          </div>
          <div className="mt-2.5 inline-flex rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: s.bg, color: s.text }}>
            {s.sub}
          </div>
        </div>
      </div>
    </PastelCard>
  );
}

function TrailTile({ t, delay, onOpen }: { t: TrailCard; delay: number; onOpen: () => void }) {
  const filled = Math.round((t.progress / 100) * 18);
  return (
    <PastelCard delay={delay} glowColor={rgbOf(t.color)} className="!p-0 overflow-hidden" onActivate={onOpen} label={`Abrir trilha ${t.title}`} testId="trail-tile">
      <div className="relative h-[96px] overflow-hidden p-4" style={{ background: `linear-gradient(135deg, ${t.color}14, ${t.color2}14, #FFF7ED)` }}>
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: `radial-gradient(circle at 2px 2px, ${t.color} 1px, transparent 0)`, backgroundSize: "16px 16px" }} aria-hidden />
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/70 blur-[14px]" aria-hidden />
        <div className="relative flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-[#F0F0FF] bg-white text-[22px] shadow-[0_4px_12px_rgba(0,0,0,0.06)] transition-transform duration-500 group-hover:rotate-[-8deg]" aria-hidden>
              {t.icon}
            </div>
            <div className="min-w-0">
              <div className="truncate font-[Space_Grotesk] text-[14.5px] font-bold leading-tight">{t.title}</div>
              <div className="text-[11px] text-[#6F6D92]">
                {t.modules.length} {t.modules.length === 1 ? "matéria" : "matérias"} • {t.totalLessons} temas
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {t.progress >= 85 && t.progress < 100 && (
              <div className="flex items-center gap-1 rounded-full bg-[#1E1B4B] px-2.5 py-1 text-[10px] font-bold text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)]">
                <Trophy className="h-3 w-3 text-[#FBBF24]" aria-hidden /> Quase lá!
              </div>
            )}
            {t.progress === 100 && (
              <div className="flex items-center gap-1 rounded-full bg-[#1E1B4B] px-2.5 py-1 text-[10px] font-bold text-white">
                <Trophy className="h-3 w-3 text-[#FBBF24]" aria-hidden /> Concluída
              </div>
            )}
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#F0F0FF] bg-white shadow" aria-hidden>
              <Star className="h-3.5 w-3.5 fill-[#FBBF24] text-[#FBBF24]" />
            </div>
          </div>
        </div>
        <div className="absolute bottom-3 left-4 right-4 flex gap-1.5" role="img" aria-label={`${t.progress}% dos temas aprovados`}>
          {Array.from({ length: 18 }, (_, k) => (
            <div
              key={k}
              className="h-1.5 flex-1 rounded-full transition-all duration-700"
              style={{
                background: k < filled ? `linear-gradient(90deg, ${t.color}, ${t.color2})` : "#EDE9FF",
                opacity: k < filled ? 1 - k * 0.03 : 0.5,
                boxShadow: k < filled ? `0 0 8px ${t.color}66` : undefined,
              }}
            />
          ))}
        </div>
      </div>
      <div className="space-y-3.5 p-5">
        {t.modules.slice(0, 3).map((m) => {
          const pct = m.total ? Math.round((m.passed / m.total) * 100) : 0;
          const done = pct === 100;
          return (
            <div key={m.id} className="group/item">
              <div className="mb-1.5 flex items-center justify-between gap-3 text-[12px]">
                <span className="truncate font-medium">{m.title}</span>
                <span className={`shrink-0 font-bold ${done ? "text-[#047857]" : "text-[#6B6A8A]"}`}>
                  {m.passed}/{m.total} {done && "✓"}
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-[#F5F3FF] p-0.5">
                <div
                  className="relative h-full overflow-hidden rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: done ? "linear-gradient(90deg, #6EE7B7, #34D399)" : `linear-gradient(90deg, ${t.color}, ${t.color2})`, boxShadow: `0 0 12px ${t.color}55` }}
                >
                  <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-1000 group-hover/item:translate-x-full" />
                </div>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-1" aria-hidden>
                  {Array.from({ length: 6 }, (_, z) => (
                    <div key={z} className={`h-1 w-1 rounded-full transition-all ${z * 16 < pct ? "bg-white shadow-[0_0_6px_white]" : "bg-[#EDE9FF]"}`} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
        {t.modules.length > 3 && <div className="text-[11px] text-[#6F6D92]">+ {t.modules.length - 3} matéria(s)</div>}
      </div>
      <div className="flex items-center justify-between px-5 pb-4">
        <div className="flex -space-x-1.5" aria-hidden>
          {["🧠", "📘", "✨"].map((e) => (
            <div key={e} className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-white text-[11px] shadow">{e}</div>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-[11.5px] font-medium text-[#6F6D92] transition-colors group-hover:text-[#6A5AE0]">
          Ver matérias
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#F5F3FF] transition-colors group-hover:bg-[#7C6BFF] group-hover:text-white">
            <ArrowRight className="h-3 w-3" aria-hidden />
          </span>
        </span>
      </div>
    </PastelCard>
  );
}

function TrailModal({ t, base, onClose }: { t: TrailCard | null; base: string; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (t && !el.open) el.showModal();
    if (!t && el.open) el.close();
  }, [t]);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={t ? `Trilha ${t.title}` : "Trilha"}
      className="m-auto w-[calc(100%-2rem)] max-w-[560px] overflow-hidden rounded-[28px] border border-white bg-white/90 p-0 text-[#1E1B4B] shadow-[0_24px_72px_rgba(30,27,75,0.20)] backdrop:bg-[#1E1B4B]/30 backdrop:backdrop-blur-[16px]"
    >
      {t && (
        <div className="font-[Inter,system-ui,sans-serif]">
          <div className="relative h-[120px] p-6" style={{ background: `linear-gradient(135deg, ${t.color}18, ${t.color2}18)` }}>
            <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow transition hover:bg-[#F5F3FF]">
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex items-center gap-4 pr-10">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border border-white bg-white text-[28px] shadow" aria-hidden>{t.icon}</div>
              <div className="min-w-0">
                <div className="truncate font-[Space_Grotesk] text-[18px] font-bold">{t.title}</div>
                <div className="text-[12px] text-[#6B6A8A]">
                  Progresso {t.progress}% • {t.passedLessons}/{t.totalLessons} temas aprovados
                </div>
              </div>
            </div>
          </div>
          <div className="max-h-[60dvh] space-y-4 overflow-y-auto p-6">
            {t.modules.map((m) => (
              <div key={m.id} className="rounded-[16px] border border-[#F0F0FF] bg-[#F8F7FF] p-4">
                <div className="mb-2 flex justify-between gap-3 text-[13px] font-semibold">
                  <span>{m.title}</span>
                  <span className="shrink-0">
                    {m.passed}/{m.total} • {m.total ? Math.round((m.passed / m.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full" style={{ width: `${m.total ? (m.passed / m.total) * 100 : 0}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color2})` }} />
                </div>
                <div className="mt-3 flex gap-2">
                  {m.nextLessonId ? (
                    <Link href={`${base}/aula/${m.nextLessonId}`} className="flex h-9 items-center gap-1.5 rounded-[12px] bg-[#1E1B4B] px-4 text-[12px] font-semibold text-white">
                      <Play className="h-3.5 w-3.5" aria-hidden /> Continuar
                    </Link>
                  ) : (
                    <span className="flex h-9 items-center rounded-[12px] bg-[#ECFDF5] px-4 text-[12px] font-semibold text-[#047857]">Matéria fechada ✓</span>
                  )}
                  <Link href={`${base}/trilhas/${t.id}#modulo-${m.id}`} className="flex h-9 items-center rounded-[12px] border border-[#F0F0FF] bg-white px-3 text-[12px]">
                    Ver aulas
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// Dica de leveza + modo foco (25 min de estudo, 5 min de pausa) com cronômetro real
// ---------------------------------------------------------------------------
type Focus = { mode: "idle" } | { mode: "foco" | "pausa"; endsAt: number; pausedLeft: number | null };
const FOCUS_MIN = 25;
const BREAK_MIN = 5;
const FOCUS_KEY = "na:modo-foco";

function FocusTip({ onToast }: { onToast: (m: string) => void }) {
  const [f, save] = useStored<Focus>(FOCUS_KEY, { mode: "idle" });
  const [now, setNow] = useState(() => Date.now());

  // Um tique por segundo; a troca foco → pausa → fim acontece no próprio tique.
  useEffect(() => {
    if (f.mode === "idle" || f.pausedLeft !== null) return;
    const tick = () => {
      const t = Date.now();
      setNow(t);
      if (t < f.endsAt) return;
      if (f.mode === "foco") {
        onToast("Foco concluído! Pausa de 5 min ☕");
        save({ mode: "pausa", endsAt: t + BREAK_MIN * 60_000, pausedLeft: null });
      } else {
        onToast("Pausa encerrada. Bora para o próximo bloco 🍃");
        save(null);
      }
    };
    const id = setInterval(tick, 1000);
    const first = setTimeout(tick, 0);
    return () => {
      clearInterval(id);
      clearTimeout(first);
    };
  }, [f, onToast, save]);

  const left = f.mode === "idle" ? 0 : f.pausedLeft ?? Math.max(0, f.endsAt - now);
  const mm = String(Math.floor(left / 60_000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60_000) / 1000)).padStart(2, "0");

  return (
    <PastelCard delay={560} noTilt className="!rounded-[20px] !border-[#2E2A6A] bg-gradient-to-r from-[#1E1B4B] to-[#2E2A6A] p-0 text-white" testId="foco">
      <div className="flex flex-col items-start justify-between gap-3 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-white/10 bg-white/10 backdrop-blur" aria-hidden>
            {f.mode === "idle" ? "💡" : f.mode === "foco" ? "🎧" : "☕"}
          </div>
          <div>
            <div className="text-[13.5px] font-semibold">{f.mode === "idle" ? "Dica de leveza" : f.mode === "foco" ? "Modo foco" : "Pausa"}</div>
            <div className="text-[12px] text-white/70" aria-live="polite">
              {f.mode === "idle" ? (
                "Estude 25 min e faça 5 min de pausa. Um tema por vez rende mais."
              ) : (
                <>
                  <span className="font-mono text-[14px] font-bold text-white" data-testid="foco-tempo">{mm}:{ss}</span>
                  {f.pausedLeft !== null ? " • pausado" : f.mode === "foco" ? " restantes de foco" : " restantes de pausa"}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {f.mode === "idle" ? (
            <button type="button" onClick={() => { save({ mode: "foco", endsAt: Date.now() + FOCUS_MIN * 60_000, pausedLeft: null }); setNow(Date.now()); onToast("Modo foco ativado 🍃"); }} className="h-10 rounded-[12px] bg-white px-4 text-[12px] font-bold text-[#1E1B4B] shadow transition hover:bg-[#F5F3FF]">
              Ativar foco
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  f.pausedLeft !== null
                    ? (save({ ...f, endsAt: Date.now() + f.pausedLeft, pausedLeft: null }), setNow(Date.now()))
                    : save({ ...f, pausedLeft: Math.max(0, f.endsAt - Date.now()) })
                }
                className="h-10 rounded-[12px] bg-white px-4 text-[12px] font-bold text-[#1E1B4B] shadow transition hover:bg-[#F5F3FF]"
              >
                {f.pausedLeft !== null ? "Retomar" : "Pausar"}
              </button>
              <button type="button" onClick={() => { save(null); onToast("Modo foco encerrado"); }} className="h-10 rounded-[12px] border border-white/20 px-4 text-[12px] font-bold text-white transition hover:bg-white/10">
                Encerrar
              </button>
            </>
          )}
        </div>
      </div>
    </PastelCard>
  );
}
