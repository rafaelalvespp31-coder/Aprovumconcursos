"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookOpen,
  CalendarClock,
  ChartColumn,
  CircleAlert,
  CircleCheck,
  Clock,
  FileText,
  Flame,
  FolderOpen,
  Library,
  Play,
  Star,
  Target,
  X,
} from "lucide-react";
import { PastelCard, rgbOf } from "@/components/pastel/card";
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

const WEEKDAY_LONG = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const weekdayOf = (iso: string) => new Date(`${iso}T12:00:00Z`).getUTCDay();

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
  const [modal, setModal] = useState<TrailCard | null>(null);

  const c = d.continueLesson;
  const qGoal = d.goals.dailyQuestions;
  const lGoal = d.goals.weeklyLessons;
  const rings = [
    {
      label: "Questões hoje",
      done: d.today.answered,
      total: qGoal,
      color1: "#FF1E1E",
      color2: "#B30000",
      text: "#C80500",
      bg: "#FDECEC",
      icon: <Target className="h-5 w-5 text-[#E10600]" aria-hidden />,
      sub: goalHint(d.today.answered, qGoal, "questões"),
      href: qGoal ? `${base}/questoes` : `${base}/perfil#metas`,
    },
    {
      label: "Aulas semana",
      done: d.weekLessonsCompleted,
      total: lGoal,
      color1: "#0A0A0A",
      color2: "#5C5C5C",
      text: "#262626",
      bg: "#EDEDED",
      icon: <BookOpen className="h-5 w-5 text-[#262626]" aria-hidden />,
      sub: goalHint(d.weekLessonsCompleted, lGoal, "aulas"),
      href: lGoal ? `${base}/trilhas` : `${base}/perfil#metas`,
    },
  ];
  const activeTrails = d.trails.length;

  return (
    <div className="space-y-5" data-testid="painel">
      {/* Cinco cards: tema atual, metas (2), revisões e últimos 14 dias */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.95fr)_minmax(0,2fr)]">
        {c ? (
          <PastelCard delay={0} radius={18} glowColor="225,6,0" className="h-full" outerClassName="col-span-2 h-full xl:col-span-1" href={`${base}/aula/${c.id}`} label={`Continuar estudando: ${c.title}`} testId="hero">
            <div className="flex h-full flex-col p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex max-w-full items-center gap-1.5 truncate rounded-full bg-[#0A0A0A] px-2.5 py-1 text-[10.5px] font-semibold text-white">
                  <Library className="h-3 w-3 shrink-0" aria-hidden /> <span className="truncate">{c.trailTitle}</span>
                </span>
              </div>
              {c.position && c.totalLessons ? (
                <p className="mt-2 flex items-center gap-1.5 text-[11px] text-[#5C5C5C]" data-testid="hero-stage">
                  <span className="h-1 w-1 rounded-full bg-[#9A9A9A]" aria-hidden /> Unidade {c.position} de {c.totalLessons} · {STAGE_LABELS[c.stage]}
                </p>
              ) : (
                <p className="mt-2 text-[11px] text-[#5C5C5C]" data-testid="hero-stage">Etapa: {STAGE_LABELS[c.stage]}</p>
              )}
              <h2 className="mt-2 line-clamp-3 font-[Space_Grotesk] text-[16.5px] font-[700] leading-[1.25] tracking-[-0.01em] text-[#0A0A0A]">
                {c.moduleTitle ? `${c.moduleTitle} / ${c.title}` : c.title}
              </h2>
              <p className="mt-2 line-clamp-2 text-[12px] leading-[1.5] text-[#6B7280]">{c.objective}</p>
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                <span className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-[#E10600] px-5 text-[13px] font-semibold text-white shadow-[0_8px_18px_rgba(225,6,0,0.28)] transition-all group-hover:scale-[1.02] group-hover:bg-[#B80500]">
                  Continuar <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="flex items-center gap-1.5 text-[11.5px] text-[#6B7280]">
                  <Clock className="h-3.5 w-3.5" aria-hidden /> ~{c.estimatedMinutes} min (estimativa)
                </span>
              </div>
            </div>
            <div className="relative h-[4px] bg-[#F4F4F4]" role="progressbar" aria-label="Unidades aprovadas neste estudo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.trailProgress}>
              <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#FF1E1E] to-[#B30000]" style={{ width: `${Math.max(c.trailProgress, 2)}%` }} />
            </div>
          </PastelCard>
        ) : (
          <PastelCard delay={0} radius={18} glowColor="225,6,0" className="h-full" outerClassName="col-span-2 h-full xl:col-span-1" href={activeTrails ? `${base}/trilhas` : `${base}/nova-trilha`} label={activeTrails ? "Escolher um tema nos estudos" : "Começar o primeiro estudo"} testId="hero">
            <div className="flex h-full flex-col p-5">
              <h2 className="font-[Space_Grotesk] text-[17px] font-[700]">{activeTrails ? "Escolha o próximo tema" : "Comece seu primeiro estudo"}</h2>
              <p className="mt-2 text-[12px] leading-[1.5] text-[#6B7280]">
                {activeTrails
                  ? "Abra um estudo e continue pela próxima unidade liberada. Cada unidade tem aula completa e avaliação em três níveis."
                  : "Informe o tema, o artigo ou a matéria que você quer estudar agora. Não precisa do edital."}
              </p>
              <span className="mt-auto inline-flex h-10 w-fit items-center gap-2 rounded-[10px] bg-[#E10600] px-5 text-[13px] font-semibold text-white">
                {activeTrails ? "Ver estudos" : "Novo estudo"} <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </PastelCard>
        )}

        {rings.map((s, i) => (
          <Ring key={s.label} s={s} index={i} />
        ))}

        {/* Revisões pendentes */}
        <PastelCard delay={160} radius={18} glowColor="225,6,0" className="h-full p-4" outerClassName="col-span-2 h-full sm:col-span-1" href={d.reviews.top ? `${base}/aula/${d.reviews.top.lessonId}?revisao=1#questoes` : `${base}/revisoes`} label={`Revisões pendentes: ${d.reviews.count}`} testId="card-revisoes">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#FF1E1E] to-[#C80500] shadow-[0_8px_18px_rgba(225,6,0,0.32)]" aria-hidden>
                <CalendarClock className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-[Space_Grotesk] text-[13.5px] font-bold leading-tight">Revisões pendentes</div>
                <div className="text-[11px] leading-tight text-[#6B7280]">pratique leve, sem pressão</div>
              </div>
            </div>
            <div className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full border border-[#F5C2C2] bg-[#FDECEC] px-2 text-[12px] font-bold text-[#C80500]" data-testid="reviews-count">{d.reviews.count}</div>
          </div>
          <div className="mt-4 rounded-[14px] border border-[#F8D7D7] bg-[#FFF6F6] p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] border border-[#EDEDED] bg-white" aria-hidden>
                {d.reviews.top ? <FileText className="h-4 w-4 text-[#404040]" /> : <CircleCheck className="h-4 w-4 text-[#16A34A]" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12.5px] font-semibold">{d.reviews.top ? d.reviews.top.title : "Nenhuma revisão para hoje"}</div>
                <div className="text-[10.5px] text-[#6B7280]">{d.reviews.top ? "revisão do tema" : "As revisões aparecem aqui no prazo."}</div>
              </div>
            </div>
            {d.reviews.top && (
              <div className="mt-2.5 flex justify-center">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E10600] px-3 py-1.5 text-[10.5px] font-bold text-white shadow-[0_4px_12px_rgba(225,6,0,0.35)]">
                  <CircleAlert className="h-3 w-3" aria-hidden />
                  {d.reviews.top.overdueDays > 0 ? `Atrasada há ${d.reviews.top.overdueDays} dia${d.reviews.top.overdueDays > 1 ? "s" : ""}` : "Para hoje"}
                </span>
              </div>
            )}
          </div>
        </PastelCard>

        {/* Últimos 14 dias */}
        <PastelCard delay={240} radius={18} glowColor="10,10,10" className="col-span-2 h-full p-4 sm:col-span-1" noTilt testId="card-14dias">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] bg-[#0A0A0A] shadow-[0_6px_16px_rgba(0,0,0,0.22)]" aria-hidden>
                <ChartColumn className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-[Space_Grotesk] text-[13.5px] font-bold">Últimos 14 dias</div>
                <div className="text-[11px] leading-tight text-[#6B7280]">{d.answered14d ? "sua constância, dia a dia" : "responda questões para ver sua evolução"}</div>
              </div>
            </div>
            <Link href={`${base}/desempenho`} className="shrink-0 text-[12px] font-semibold text-[#C80500] hover:text-[#B30000]">Detalhes</Link>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-[Space_Grotesk] text-[26px] font-[800] leading-none tracking-tight">{d.answered14d}</span>
            <span className="text-[11.5px] text-[#6B7280]">respostas</span>
            {d.accuracy14d !== null && (
              <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-[#E5E5E5] bg-[#F7F7F7] px-2 py-0.5 text-[10.5px] font-bold text-[#0A0A0A]">
                <Flame className="h-3 w-3 text-[#E10600]" aria-hidden /> {Math.round(d.accuracy14d * 100)}% acerto
              </span>
            )}
          </div>
          <AreaChart days={d.days} />
        </PastelCard>
      </div>

      {/* Seus estudos */}
      <section aria-labelledby="painel-estudos">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 id="painel-estudos" className="flex items-center gap-2.5 font-[Space_Grotesk] text-[17px] font-bold">
            <span className="flex h-8 w-8 items-center justify-center rounded-[10px] bg-[#0A0A0A] text-white shadow-[0_4px_12px_rgba(0,0,0,0.20)]" aria-hidden>
              <FolderOpen className="h-4 w-4" />
            </span>
            Seus estudos
          </h2>
          <Link href={`${base}/trilhas`} className="group flex items-center gap-1 text-[13px] font-semibold text-[#C80500] hover:text-[#B30000]">
            Ver tudo <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
        </div>
        {d.pendingTrails.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {d.pendingTrails.map((t) => (
              <Link key={t.id} href={`${base}/trilhas/${t.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#D4D4D4] bg-[#F5F5F5] px-3 py-1.5 text-[12px] font-medium text-[#404040]">
                {t.title} — {t.status === "review" ? "revise o plano" : t.status === "failed" ? "falhou: tente de novo" : "em preparação"}
              </Link>
            ))}
          </div>
        )}
        {d.trails.length ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {d.trails.slice(0, 4).map((t, i) => (
              <TrailTile key={t.id} t={t} delay={320 + i * 60} onOpen={() => setModal(t)} />
            ))}
          </div>
        ) : (
          <PastelCard href={`${base}/nova-trilha`} radius={18} className="flex min-h-[120px] flex-col items-center justify-center border-2 border-dashed !bg-transparent p-6 !shadow-none" label="Começar novo estudo">
            <div className="font-bold">Nenhum estudo ativo</div>
            <div className="mt-1 text-[12px] text-[#5C5C5C]">Informe um tema, um artigo ou uma matéria para começar.</div>
          </PastelCard>
        )}
      </section>

      <TrailModal t={modal} base={base} onClose={() => setModal(null)} />
    </div>
  );
}

/** Gráfico de área das respostas por dia (14 dias), com pontos e rótulos de valor no toque. */
function AreaChart({ days }: { days: DashboardData["days"] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 260;
  const H = 92;
  const pad = { l: 24, r: 6, t: 8, b: 16 };
  const totals = days.map((x) => x.correct + x.wrong);
  const max = Math.max(4, ...totals);
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const x = (i: number) => pad.l + (i * (W - pad.l - pad.r)) / Math.max(1, days.length - 1);
  const y = (v: number) => pad.t + (1 - v / top) * (H - pad.t - pad.b);
  const pts = totals.map((v, i) => [x(i), y(v)] as const);
  // Curva suave (Catmull-Rom → Bézier).
  const path = pts.reduce((acc, [px, py], i) => {
    if (i === 0) return `M${px},${py}`;
    const [x0, y0] = pts[i - 2] ?? pts[i - 1]!;
    const [x1, y1] = pts[i - 1]!;
    const [x3, y3] = pts[i + 1] ?? [px, py];
    const c1x = x1 + (px - x0) / 6;
    const c1y = y1 + (py - y0) / 6;
    const c2x = px - (x3 - x1) / 6;
    const c2y = py - (y3 - y1) / 6;
    return `${acc} C${c1x},${c1y} ${c2x},${c2y} ${px},${py}`;
  }, "");
  const area = `${path} L${x(days.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`;
  const fmt = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
  const label = (i: number) => {
    const s = days[i]!;
    const t = s.correct + s.wrong;
    return `${WEEKDAY_LONG[weekdayOf(s.day)]} ${fmt(s.day)}: ${t ? `${t} respostas, ${Math.round((s.correct / t) * 100)}% acerto` : "sem respostas"}`;
  };
  return (
    <div className="relative mt-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" role="img" aria-label="Respostas por dia nos últimos 14 dias">
        <defs>
          <linearGradient id="painel-linha" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#E10600" />
            <stop offset="55%" stopColor="#B4239A" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <linearGradient id="painel-area" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#E10600" stopOpacity="0.22" />
            <stop offset="55%" stopColor="#B4239A" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="painel-sombra" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.9" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={k}>
            <line x1={pad.l} x2={W - pad.r} y1={y(k * step)} y2={y(k * step)} stroke="#EEF0F3" strokeWidth="1" />
            <text x={pad.l - 4} y={y(k * step) + 3} textAnchor="end" fontSize="7" fill="#9CA3AF">{k * step}</text>
          </g>
        ))}
        <path d={area} fill="url(#painel-area)" />
        <path d={area} fill="url(#painel-sombra)" />
        <path d={path} fill="none" stroke="url(#painel-linha)" strokeWidth="2" strokeLinecap="round" />
        {pts.map(([px, py], i) =>
          totals[i]! > 0 || hover === i ? (
            <circle key={i} cx={px} cy={py} r={hover === i ? 3.6 : 2.6} fill="#fff" stroke={i / (pts.length - 1) > 0.55 ? "#3B82F6" : "#E10600"} strokeWidth="1.6" />
          ) : null,
        )}
        {pts.map(([px], i) => (
          <rect
            key={`h${i}`}
            x={px - (W - pad.l - pad.r) / (2 * Math.max(1, days.length - 1))}
            y={0}
            width={(W - pad.l - pad.r) / Math.max(1, days.length - 1)}
            height={H}
            fill="transparent"
            tabIndex={0}
            aria-label={label(i)}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          />
        ))}
        {[0, Math.floor((days.length - 1) / 2), days.length - 1].map((i) => (
          <text key={`d${i}`} x={x(i)} y={H - 3} textAnchor={i === 0 ? "start" : i === days.length - 1 ? "end" : "middle"} fontSize="7" fill="#9CA3AF">
            {i === days.length - 1 ? "hoje" : fmt(days[i]!.day)}
          </text>
        ))}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute -top-1 left-1/2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-[10px] bg-[#1C1C1C] px-2.5 py-1.5 text-[10.5px] font-medium text-white shadow-lg" role="tooltip">
          {label(hover)}
        </div>
      )}
    </div>
  );
}

function Ring({ s, index }: { s: { label: string; done: number; total: number | null; color1: string; color2: string; text: string; bg: string; icon: ReactNode; sub: string; href: string }; index: number }) {
  const pct = s.total ? Math.min(100, Math.round((s.done / s.total) * 100)) : 0;
  const v = useCountUp(pct, 500 + index * 200);
  return (
    <PastelCard delay={80 + index * 60} radius={18} glowColor={rgbOf(s.color1)} className="h-full" outerClassName="h-full" href={s.href} label={`${s.label}: ${s.done}${s.total ? ` de ${s.total}` : ""}`} testId={`ring-${index}`}>
      <div className="flex h-full flex-col items-center justify-center p-4 text-center">
        <div className="relative h-[88px] w-[88px]">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="42" fill="none" stroke={s.bg} strokeWidth="9" />
            <circle cx="50" cy="50" r="42" fill="none" stroke={`url(#ring-g${index})`} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(v / 100) * 264} 264`} />
            <defs>
              <linearGradient id={`ring-g${index}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={s.color1} />
                <stop offset="100%" stopColor={s.color2} />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-[11px] flex flex-col items-center justify-center gap-0.5 rounded-full border border-[#EEEEEE] bg-white shadow-[inset_0_1px_0_white,0_4px_14px_rgba(0,0,0,0.06)]">
            {s.icon}
            <span className="text-[13px] font-[800] leading-none" style={{ color: s.text }}>{s.total ? `${Math.round(v)}%` : "—"}</span>
          </div>
        </div>
        <div className="mt-3 text-[12.5px] font-semibold text-[#1A1A1A]">{s.label}</div>
        <div className="mt-1 text-[20px] font-[800] leading-none">
          <span style={{ color: s.text }}>{s.done}</span>
          <span className="text-[13px] font-medium text-[#6B7280]">/{s.total ?? "?"}</span>
        </div>
        <div className="mt-2.5 inline-flex rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: s.bg, color: s.text }}>
          {s.sub}
        </div>
      </div>
    </PastelCard>
  );
}

function TrailTile({ t, delay, onOpen }: { t: TrailCard; delay: number; onOpen: () => void }) {
  const studied = t.totalLessons > 0 && t.passedLessons >= t.totalLessons;
  return (
    <PastelCard delay={delay} radius={16} glowColor={rgbOf(t.color)} className="h-full" onActivate={onOpen} label={`Abrir estudo ${t.title}`} testId="trail-tile">
      <div className="flex h-full flex-col p-4">
        <div className="flex items-start gap-3">
          {studied ? (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e9f7ee] ring-2 ring-[#15803d]" role="img" aria-label="Estudado" data-testid="avatar-estudado">
              <CircleCheck className="h-5 w-5 text-[#15803d]" />
            </div>
          ) : (
            <FolderIcon />
          )}
          <div className="min-w-0 flex-1">
            <div className="line-clamp-2 font-[Space_Grotesk] text-[13.5px] font-bold leading-snug text-[#0A0A0A]">{t.title}</div>
            <div className="mt-0.5 text-[10.5px] text-[#6B7280]">
              {t.modules.length} {t.modules.length === 1 ? "matéria" : "matérias"} · {t.totalLessons} {t.totalLessons === 1 ? "tema" : "temas"}
            </div>
          </div>
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#F5C2C2] bg-[#FFF5F5]" aria-hidden>
            <Star className="h-3.5 w-3.5 fill-[#E10600] text-[#E10600]" />
          </div>
        </div>
        <div className="mt-3 truncate text-[11.5px] text-[#4B5563]">{t.modules[0]?.title ?? "—"}</div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <div className="flex min-w-0 items-center gap-2" role="img" aria-label={`${t.progress}% dos temas aprovados`}>
            <span className="h-1.5 w-16 overflow-hidden rounded-full bg-[#EEF0F3]">
              <span className="block h-full rounded-full" style={{ width: `${Math.max(t.progress, 3)}%`, background: studied ? "#16A34A" : `linear-gradient(90deg, ${t.color}, ${t.color2})` }} />
            </span>
            <span className="text-[10.5px] font-bold text-[#4B5563]">{t.passedLessons}/{t.totalLessons}</span>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-[#6B7280] transition-colors group-hover:text-[#C80500]">
            Ver matérias
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F4F4F4] transition-colors group-hover:bg-[#E10600] group-hover:text-white">
              <ArrowRight className="h-3 w-3" aria-hidden />
            </span>
          </span>
        </div>
      </div>
    </PastelCard>
  );
}

/** Pasta azul (ícone dos cards de estudo). */
function FolderIcon() {
  return (
    <svg viewBox="0 0 40 32" className="h-9 w-10 shrink-0 drop-shadow-[0_4px_8px_rgba(37,99,235,0.25)]" aria-hidden>
      <path d="M3 5a3 3 0 0 1 3-3h9l4 4h15a3 3 0 0 1 3 3v2H3z" fill="#2F7BEA" />
      <rect x="3" y="9" width="34" height="21" rx="3" fill="#4B95F5" />
      <rect x="3" y="9" width="34" height="5" rx="2" fill="#6AAAF8" opacity="0.6" />
    </svg>
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
      aria-label={t ? `Estudo ${t.title}` : "Estudo"}
      className="m-auto w-[calc(100%-2rem)] max-w-[560px] overflow-hidden rounded-[28px] border border-[#E5E5E5] bg-white/95 p-0 text-white shadow-[0_24px_72px_rgba(0,0,0,0.20)] backdrop:bg-[#E10600]/30 backdrop:backdrop-blur-[16px]"
    >
      {t && (
        <div className="font-[Inter,system-ui,sans-serif]">
          <div className="relative h-[120px] p-6" style={{ background: `linear-gradient(135deg, ${t.color}18, ${t.color2}18)` }}>
            <button type="button" onClick={onClose} aria-label="Fechar" className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-[#F5F5F5] shadow transition hover:bg-[#F4F4F4]">
              <X className="h-4 w-4" aria-hidden />
            </button>
            <div className="flex items-center gap-4 pr-10">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] border border-[#E5E5E5] bg-[#F5F5F5] text-[28px] shadow" aria-hidden>{t.icon}</div>
              <div className="min-w-0">
                <div className="truncate font-[Space_Grotesk] text-[18px] font-bold">{t.title}</div>
                <div className="text-[12px] text-[#4D4D4D]">
                  Progresso {t.progress}% • {t.passedLessons}/{t.totalLessons} temas aprovados
                </div>
              </div>
            </div>
          </div>
          <div className="max-h-[60dvh] space-y-4 overflow-y-auto p-6">
            {t.modules.map((m) => (
              <div key={m.id} className="rounded-[16px] border border-[#E5E5E5] bg-[#F5F5F5] p-4">
                <div className="mb-2 flex justify-between gap-3 text-[13px] font-semibold">
                  <span>{m.title}</span>
                  <span className="shrink-0">
                    {m.passed}/{m.total} • {m.total ? Math.round((m.passed / m.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[#F5F5F5]">
                  <div className="h-full rounded-full" style={{ width: `${m.total ? (m.passed / m.total) * 100 : 0}%`, background: `linear-gradient(90deg, ${t.color}, ${t.color2})` }} />
                </div>
                <div className="mt-3 flex gap-2">
                  {m.nextLessonId ? (
                    <Link href={`${base}/aula/${m.nextLessonId}`} className="flex h-9 items-center gap-1.5 rounded-[12px] bg-[#E10600] px-4 text-[12px] font-semibold text-white">
                      <Play className="h-3.5 w-3.5" aria-hidden /> Continuar
                    </Link>
                  ) : (
                    <span className="flex h-9 items-center rounded-[12px] bg-[#F5F5F5] px-4 text-[12px] font-semibold text-[#0A0A0A]">Matéria fechada ✓</span>
                  )}
                  <Link href={`${base}/trilhas/${t.id}#modulo-${m.id}`} className="flex h-9 items-center rounded-[12px] border border-[#E5E5E5] bg-[#F5F5F5] px-3 text-[12px]">
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
