"use client";

/**
 * Blocos do painel (layout de referência do APROVUM). Todos recebem dados reais já
 * calculados no servidor; estados vazios convidam a começar, sem números inventados.
 */
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  ArrowRight,
  BookMarked,
  BookOpen,
  Calculator,
  ChartColumn,
  ChevronRight,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  FileText,
  Flame,
  Gamepad2,
  Gavel,
  Landmark,
  Library,
  Map as MapIcon,
  Monitor,
  NotebookPen,
  PlayCircle,
  Scale,
  Shield,
  Target,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import type { Activity, RecentLesson, SubjectProgress } from "./model";

/* ------------------------------------------------------------------ */
/* Peças comuns                                                        */
/* ------------------------------------------------------------------ */

export function CardTitle({
  icon: Icon,
  children,
  action,
}: {
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2.5 text-[15px] font-bold tracking-[-0.01em] text-[#08090B]">
        <span className="pc-ico" aria-hidden>
          <Icon className="h-[15px] w-[15px]" />
        </span>
        <span className="truncate">{children}</span>
      </h2>
      {action}
    </div>
  );
}

export function SeeAll({
  href,
  children = "Ver todas",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <Link href={href} className="pc-vertodas group">
      {children}{" "}
      <ArrowRight
        className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}

function Bar({
  pct,
  label,
  dark = false,
}: {
  pct: number;
  label: string;
  dark?: boolean;
}) {
  return (
    <span
      className={`pc-barra ${dark ? "pc-barra-escura" : ""}`}
      role="img"
      aria-label={label}
    >
      <span style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

/** Anima de 0 até o valor (instantâneo para quem pediu menos movimento). */
function useCountUp(target: number, delay = 200) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
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

function Ring({
  pct,
  size,
  stroke,
  children,
  label,
}: {
  pct: number | null;
  size: number;
  stroke: number;
  children: ReactNode;
  label: string;
}) {
  const v = useCountUp(pct ?? 0);
  const r = 50 - stroke / 2;
  const c = 2 * Math.PI * r;
  const gid = useId();
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label}
    >
      <svg
        viewBox="0 0 100 100"
        className="h-full w-full -rotate-90"
        aria-hidden
      >
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#ECEDF0"
          strokeWidth={stroke}
        />
        {pct !== null && (
          <circle
            cx="50"
            cy="50"
            r={r}
            fill="none"
            stroke={`url(#${gid})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${(v / 100) * c} ${c}`}
          />
        )}
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF2A2A" />
            <stop offset="100%" stopColor="#B9000B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/** Ícone pela matéria (pelo nome que o aluno vê no submenu). */
export function subjectIcon(name: string): LucideIcon {
  const n = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (n.includes("processual")) return Gavel;
  if (n.includes("constitucional")) return Landmark;
  if (n.includes("administrativ")) return FileText;
  if (n.includes("penal") || n.includes("criminal")) return Scale;
  if (
    n.includes("legislacao") ||
    n.includes("especial") ||
    n.includes("transito")
  )
    return Shield;
  if (n.includes("portugues") || n.includes("redacao")) return BookOpen;
  if (n.includes("informatica")) return Monitor;
  if (n.includes("matematica") || n.includes("raciocinio")) return Calculator;
  if (n.startsWith("direito")) return Scale;
  return Library;
}

/* ------------------------------------------------------------------ */
/* Seu progresso geral                                                 */
/* ------------------------------------------------------------------ */

export function ProgressCard({
  passed,
  total,
  subjectsInProgress,
  lessonsRead,
  answered,
}: {
  passed: number;
  total: number;
  subjectsInProgress: number;
  lessonsRead: number;
  answered: number;
}) {
  const pct = total ? Math.round((passed / total) * 100) : null;
  const stats = [
    {
      icon: BookOpen,
      value: subjectsInProgress,
      label:
        subjectsInProgress === 1
          ? "matéria em andamento"
          : "matérias em andamento",
    },
    {
      icon: NotebookPen,
      value: lessonsRead,
      label: lessonsRead === 1 ? "aula assistida" : "aulas assistidas",
    },
    {
      icon: ClipboardCheck,
      value: answered,
      label: answered === 1 ? "questão resolvida" : "questões resolvidas",
    },
  ];
  const statItems = <ProgressStats stats={stats} />;
  return (
    <section
      className="pc h-full p-5"
      aria-labelledby="pc-progresso"
      data-testid="progresso-geral"
    >
      <div id="pc-progresso">
        <CardTitle icon={ChartColumn}>Seu progresso geral</CardTitle>
      </div>
      <div className="mt-4 flex flex-row items-center gap-4 sm:gap-5">
        <Ring
          pct={pct}
          size={104}
          stroke={9}
          label={
            pct === null ? "Sem aulas ainda" : `${pct}% das aulas concluídas`
          }
        >
          <span className="text-[26px] font-extrabold tracking-[-0.02em] text-[#08090B]">
            {pct === null ? "—" : `${Math.round(pct)}%`}
          </span>
        </Ring>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] leading-snug text-[#3A3C42]">
            {pct === null ? (
              <>Comece um estudo para acompanhar seu progresso aqui.</>
            ) : (
              <>
                Você já concluiu
                <span className="block text-[#64666D]">
                  {pct}% das aulas dos seus estudos ({passed} de {total}).
                </span>
              </>
            )}
          </p>
          <div className="mt-3">
            <Bar pct={pct ?? 0} label={`${pct ?? 0}% concluído`} />
          </div>
          <dl className="mt-4 hidden grid-cols-3 divide-x divide-[#E6E7EB] xl:grid">
            {statItems}
          </dl>
        </div>
      </div>
      <dl className="mt-4 grid grid-cols-3 divide-x divide-[#E6E7EB] xl:hidden">
        {statItems}
      </dl>
    </section>
  );
}

function ProgressStats({
  stats,
}: {
  stats: Array<{ icon: LucideIcon; value: number; label: string }>;
}) {
  return (
    <>
      {stats.map((s) => (
        <div
          key={s.label}
          className="flex min-w-0 items-start gap-2 px-2 first:pl-0 last:pr-0 sm:px-3"
        >
          <s.icon
            className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#E50914]"
            aria-hidden
          />
          <div className="min-w-0">
            <dt className="sr-only">{s.label}</dt>
            <dd className="text-[16px] font-extrabold leading-none text-[#08090B]">
              {s.value}
            </dd>
            <dd className="mt-1 text-[10.5px] leading-tight text-[#64666D]">
              {s.label}
            </dd>
          </div>
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sua próxima aula                                                    */
/* ------------------------------------------------------------------ */

export interface NextLessonInfo {
  id: string;
  title: string;
  subject: string;
  context: string;
  objective: string;
  position: number | null;
  pct: number;
  estimatedMinutes: number;
}

export function NextLessonCard({
  lesson,
  base,
  hasStudies,
}: {
  lesson: NextLessonInfo | null;
  base: string;
  hasStudies: boolean;
}) {
  return (
    <section
      className="pc relative order-first h-full overflow-hidden p-5 lg:order-none"
      aria-labelledby="pc-proxima"
      data-testid="proxima-aula"
    >
      <div id="pc-proxima">
        <CardTitle icon={BookMarked}>Sua próxima aula</CardTitle>
      </div>
      <div className="pc-proxima-arte" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/aprovum-login-hero-mobile.webp"
          alt=""
          loading="lazy"
          decoding="async"
        />
      </div>
      <div className="relative mt-4 max-w-[62%] sm:max-w-[58%]">
        {lesson ? (
          <>
            {lesson.position && (
              <span className="pc-selo">
                Aula {String(lesson.position).padStart(2, "0")}
              </span>
            )}
            <h3 className="mt-2 line-clamp-2 text-[18px] font-extrabold leading-tight tracking-[-0.01em] text-[#08090B]">
              {lesson.title}
            </h3>
            <p className="mt-1 truncate text-[13px] text-[#64666D]">
              {lesson.subject}
              {lesson.context ? ` · ${lesson.context}` : ""}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[11.5px] text-[#64666D]">
              <Clock3 className="h-3.5 w-3.5" aria-hidden /> ~
              {lesson.estimatedMinutes} min · {lesson.pct}% feito
            </p>
            <Link
              href={`${base}/aula/${lesson.id}`}
              className="pc-botao mt-4"
              aria-label={`Continuar estudando: ${lesson.title}`}
            >
              Continuar aula <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </>
        ) : (
          <>
            <h3 className="text-[17px] font-extrabold leading-tight text-[#08090B]">
              {hasStudies
                ? "Escolha o próximo tema"
                : "Comece seu primeiro estudo"}
            </h3>
            <p className="mt-1 text-[13px] text-[#64666D]">
              {hasStudies
                ? "Abra um estudo e siga pela próxima aula liberada."
                : "Informe o tema, o artigo ou a matéria que você quer estudar."}
            </p>
            <Link
              href={hasStudies ? `${base}/trilhas` : `${base}/nova-trilha`}
              className="pc-botao mt-4"
            >
              {hasStudies ? "Ver estudos" : "Novo estudo"}{" "}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Minhas matérias                                                     */
/* ------------------------------------------------------------------ */

type Tab = "andamento" | "concluido" | "todas";

export function SubjectsCard({
  subjects,
  base,
}: {
  subjects: SubjectProgress[];
  base: string;
}) {
  const counts = {
    andamento: subjects.filter((s) => s.status !== "concluido").length,
    concluido: subjects.filter((s) => s.status === "concluido").length,
    todas: subjects.length,
  };
  const [tab, setTab] = useState<Tab>(counts.andamento ? "andamento" : "todas");
  const list = subjects.filter((s) =>
    tab === "todas"
      ? true
      : tab === "concluido"
        ? s.status === "concluido"
        : s.status !== "concluido",
  );
  const tabs: Array<{ id: Tab; label: string }> = [
    { id: "andamento", label: `Em andamento (${counts.andamento})` },
    { id: "concluido", label: `Concluídas (${counts.concluido})` },
    { id: "todas", label: `Todas (${counts.todas})` },
  ];
  return (
    <section
      className="pc flex-1 p-5"
      aria-labelledby="pc-materias"
      data-testid="minhas-materias"
    >
      <div id="pc-materias">
        <CardTitle icon={BookOpen} action={<SeeAll href={`${base}/trilhas`} />}>
          Minhas matérias
        </CardTitle>
      </div>
      <div
        className="-mx-1 mt-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]"
        role="tablist"
        aria-label="Filtrar matérias"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className="pc-aba shrink-0 whitespace-nowrap"
          >
            {t.label}
          </button>
        ))}
      </div>
      {list.length ? (
        <ul className="mt-3 divide-y divide-[#EEEFF2]" role="tabpanel">
          {list.map((s) => {
            const Icon = subjectIcon(s.name);
            return (
              <li key={s.name}>
                <Link
                  href={`${base}/trilhas/${s.studyId}`}
                  className="pc-materia group"
                  aria-label={`${s.name}: ${s.done} de ${s.total} aulas, ${s.pct}%`}
                >
                  <span className="pc-materia-ico" aria-hidden>
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-bold text-[#08090B]">
                      {s.name}
                    </span>
                    <span className="block truncate text-[11px] text-[#64666D]">
                      {s.detail}
                    </span>
                    <span className="mt-1.5 block max-w-[220px]">
                      <Bar pct={s.pct} label={`${s.pct}%`} />
                    </span>
                  </span>
                  <span className="hidden w-[92px] shrink-0 text-[11.5px] text-[#64666D] sm:block">
                    {s.done} de {s.total} aulas
                  </span>
                  <span className="w-10 shrink-0 text-right text-[12.5px] font-bold text-[#08090B]">
                    {s.pct}%
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 text-[#08090B] transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div
          className="mt-6 rounded-[12px] border border-dashed border-[#D9DBE0] p-6 text-center"
          role="tabpanel"
        >
          <p className="text-[14px] font-semibold text-[#08090B]">
            {subjects.length
              ? tab === "concluido"
                ? "Nenhuma matéria concluída ainda"
                : "Nenhuma matéria em andamento"
              : "Você ainda não tem matérias"}
          </p>
          <p className="mt-1 text-[12.5px] text-[#64666D]">
            {subjects.length
              ? "Conclua os três níveis de todas as aulas de uma matéria para vê-la aqui."
              : "Crie um estudo: o tema entra na matéria correspondente."}
          </p>
          {!subjects.length && (
            <Link href={`${base}/nova-trilha`} className="pc-botao mt-4">
              Novo estudo <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Atividades recentes                                                 */
/* ------------------------------------------------------------------ */

const ACTIVITY_ICON: Record<Activity["kind"], LucideIcon> = {
  questoes: ClipboardCheck,
  aula: PlayCircle,
  leitura: NotebookPen,
};

export function ActivitiesCard({
  items,
  base,
}: {
  items: Activity[];
  base: string;
}) {
  return (
    <section
      className="pc p-5"
      aria-labelledby="pc-atividades"
      data-testid="atividades-recentes"
    >
      <div id="pc-atividades">
        <CardTitle
          icon={Clock3}
          action={<SeeAll href={`${base}/desempenho`} />}
        >
          Atividades recentes
        </CardTitle>
      </div>
      {items.length ? (
        <ul className="mt-3 divide-y divide-[#EEEFF2]">
          {items.map((a) => {
            const Icon = ACTIVITY_ICON[a.kind];
            return (
              <li key={`${a.kind}-${a.at}-${a.href}`}>
                <Link
                  href={a.href}
                  className="flex items-center gap-3 rounded-[10px] py-2.5 transition-colors hover:bg-[#F7F8FA]"
                >
                  <span className="pc-ativ-ico" aria-hidden>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="line-clamp-2 text-[12.5px] leading-snug text-[#08090B]">
                      {a.title}
                    </span>
                    <span className="block text-[11px] text-[#64666D]">
                      {a.detail}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-[12.5px] leading-relaxed text-[#64666D]">
          Suas aulas acessadas e as questões que você responder aparecem aqui.
        </p>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Modo Jogo (no lugar do carrossel de divulgação da referência)       */
/* ------------------------------------------------------------------ */

export function GamePromo({ base }: { base: string }) {
  return (
    <Link
      href={`${base}/quiz`}
      className="pc-jogo group"
      data-testid="promo-jogo"
      aria-label="Modo Jogo: complete a lei. Jogar agora"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/jogo-hero-arte-sm.webp"
        alt=""
        className="pc-jogo-arte"
        loading="lazy"
        decoding="async"
      />
      <span className="pc-jogo-veu" aria-hidden />
      <span className="relative flex h-full flex-col justify-center gap-1 p-5">
        <span className="flex items-center gap-2 text-[12px] font-extrabold uppercase tracking-[0.08em] text-[#FF2A2A]">
          <Target className="h-5 w-5" aria-hidden /> Modo Jogo
        </span>
        <span className="text-[17px] font-extrabold uppercase leading-tight text-white">
          Complete a lei.
          <span className="block">Treine a letra da lei.</span>
        </span>
        <span className="pc-botao mt-2 h-9 w-fit px-4 text-[12px] uppercase tracking-[0.02em]">
          Jogar agora{" "}
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Seu desempenho                                                      */
/* ------------------------------------------------------------------ */

export function PerformanceCard({
  accuracy,
  accuracy14d,
  completion,
  streak,
  base,
}: {
  accuracy: number | null;
  accuracy14d: number | null;
  completion: number | null;
  streak: number;
  base: string;
}) {
  const items = [
    { label: "Aproveitamento", sub: "todas as respostas", pct: accuracy },
    { label: "Acertos", sub: "últimos 14 dias", pct: accuracy14d },
    {
      label: "Conclusão de aulas",
      sub: "três níveis aprovados",
      pct: completion,
    },
  ];
  return (
    <section
      className="pc p-5 md:col-span-2 xl:col-span-1"
      aria-labelledby="pc-desempenho"
      data-testid="seu-desempenho"
    >
      <div id="pc-desempenho">
        <CardTitle
          icon={ChartColumn}
          action={<SeeAll href={`${base}/desempenho`}>Ver detalhes</SeeAll>}
        >
          Seu desempenho
        </CardTitle>
      </div>
      <ul className="mt-4 grid grid-cols-4 gap-2">
        {items.map((i) => (
          <li key={i.label} className="pc-mini">
            <Ring
              pct={i.pct}
              size={46}
              stroke={10}
              label={`${i.label}: ${i.pct === null ? "sem dados" : `${i.pct}%`}`}
            >
              <span className="text-[11px] font-extrabold text-[#08090B]">
                {i.pct === null ? "—" : `${i.pct}%`}
              </span>
            </Ring>
            <span className="mt-1.5 text-[10.5px] font-semibold leading-tight text-[#08090B]">
              {i.label}
            </span>
            <span className="text-[9.5px] leading-tight text-[#64666D]">
              {i.sub}
            </span>
          </li>
        ))}
        <li className="pc-mini">
          <span
            className="flex h-[46px] items-center justify-center"
            aria-hidden
          >
            <Flame className="h-7 w-7 text-[#E50914]" />
          </span>
          <span className="mt-1.5 text-[10.5px] font-semibold leading-tight text-[#08090B]">
            Sequência
          </span>
          <span
            className="text-[12px] font-extrabold leading-tight text-[#08090B]"
            data-testid="sequencia"
          >
            {streak} {streak === 1 ? "dia" : "dias"}
          </span>
        </li>
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Continue estudando (faixa escura)                                   */
/* ------------------------------------------------------------------ */

export function ContinueBand({
  lessons,
  base,
}: {
  lessons: RecentLesson[];
  base: string;
}) {
  if (!lessons.length) return null;
  return (
    <section
      className="pc-faixa"
      aria-labelledby="pc-continue"
      data-testid="continue-estudando"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Target className="h-9 w-9 shrink-0 text-[#E50914]" aria-hidden />
          <div>
            <h2
              id="pc-continue"
              className="text-[17px] font-extrabold text-white"
            >
              Continue estudando
            </h2>
            <p className="text-[12px] text-white/60">Aulas em andamento</p>
          </div>
        </div>
        <Link
          href={`${base}/trilhas`}
          className="group flex items-center gap-1.5 border-b border-[#E50914] pb-0.5 text-[12px] font-semibold text-white"
        >
          Ver todas as matérias{" "}
          <ArrowRight
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {lessons.map((l) => {
          const Icon = subjectIcon(l.subject);
          return (
            <li key={l.lessonId} className="pc-faixa-card">
              <div className="flex items-start gap-3">
                <span className="pc-faixa-ico" aria-hidden>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12.5px] font-bold text-white">
                    {l.subject}
                  </p>
                  <p className="line-clamp-2 text-[12px] leading-snug text-white/80">
                    {l.title}
                  </p>
                  <p className="mt-0.5 text-[11px] text-white/55">
                    {l.position
                      ? `Aula ${String(l.position).padStart(2, "0")} · `
                      : ""}
                    {l.pct}%
                  </p>
                </div>
              </div>
              <div className="mt-auto flex items-center gap-3 pt-3">
                <span className="min-w-0 flex-1">
                  <Bar pct={l.pct} label={`${l.pct}% da aula`} dark />
                </span>
                <Link
                  href={`${base}/aula/${l.lessonId}`}
                  className="pc-botao h-9 shrink-0 px-4 text-[12px]"
                  aria-label={`Continuar a aula ${l.title}`}
                >
                  Continuar <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Acesso rápido                                                       */
/* ------------------------------------------------------------------ */

export interface QuickItem {
  id: string;
  href: string;
  label: string;
  desc: string;
  state?: string | null;
}

const QUICK_ICON: Record<string, LucideIcon> = {
  estudos: MapIcon,
  jogo: Gamepad2,
  questoes: CircleHelp,
  revisoes: Clock3,
  evolucao: ChartColumn,
  perfil: UserRound,
};

export function QuickAccess({ items }: { items: QuickItem[] }) {
  return (
    <section aria-labelledby="pc-atalhos" data-testid="acesso-rapido">
      <h2 id="pc-atalhos" className="mb-3 text-[15px] font-bold text-[#08090B]">
        Acesso rápido
      </h2>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {items.map((i) => {
          const Icon = QUICK_ICON[i.id] ?? Library;
          return (
            <li key={i.id}>
              <Link
                href={i.href}
                className="pc pc-link pc-atalho group"
                data-testid={`atalho-${i.id}`}
              >
                <span className="pc-ico" aria-hidden>
                  <Icon className="h-[15px] w-[15px]" />
                </span>
                <span className="mt-3 block text-[14px] font-bold text-[#08090B]">
                  {i.label}
                </span>
                <span className="block text-[11.5px] leading-snug text-[#64666D]">
                  {i.desc}
                </span>
                {i.state && <span className="pc-atalho-estado">{i.state}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Rodapé                                                              */
/* ------------------------------------------------------------------ */

export function PainelFooter() {
  const links = [
    { href: "/#inicio", label: "Início" },
    { href: "/#como-funciona", label: "Como funciona" },
    { href: "/#recursos", label: "Recursos" },
  ];
  return (
    <footer
      className="mt-2 flex flex-col items-center gap-4 border-t border-[#E6E7EB] pt-5 sm:flex-row sm:justify-between"
      data-testid="painel-rodape"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/aprovum-logo-escura.png"
        width={523}
        height={107}
        alt="APROVUM — Sua preparação. Seu próximo cargo."
        className="h-9 w-auto"
        loading="lazy"
        decoding="async"
      />
      <nav
        aria-label="Links do APROVUM"
        className="flex flex-wrap justify-center gap-x-6 gap-y-2"
      >
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="text-[12.5px] font-medium text-[#3A3C42] hover:text-[#E50914]"
          >
            {l.label}
          </Link>
        ))}
      </nav>
      <p className="text-[11px] text-[#64666D]">
        © {new Date().getFullYear()} APROVUM. Todos os direitos reservados.
      </p>
    </footer>
  );
}
