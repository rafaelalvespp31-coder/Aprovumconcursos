"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  BookOpenCheck,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileQuestion,
  LayoutGrid,
  ListChecks,
  PlayCircle,
  Search,
  Sparkles,
  Target,
  Zap,
  BrainCircuit,
  CheckCircle2,
  ListFilter,
} from "lucide-react";
import type { ThemeCard } from "@/domain/studies/home";
import { DisciplineIcon, Ring } from "./parts";

const norm = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type Filter = "todos" | "andamento" | "novos" | "concluidos";
const FILTERS: Array<{ key: Filter; label: string; Icon: typeof LayoutGrid }> =
  [
    { key: "todos", label: "Todos", Icon: LayoutGrid },
    { key: "andamento", label: "Em andamento", Icon: PlayCircle },
    { key: "novos", label: "Não iniciados", Icon: ListChecks },
    { key: "concluidos", label: "Concluídos", Icon: CheckCircle2 },
  ];
const matches = (t: ThemeCard, f: Filter) =>
  f === "todos" ||
  (f === "andamento"
    ? !!t.study && !t.study.done
    : f === "novos"
      ? !t.study
      : !!t.study?.done);

/**
 * "Escolha seu novo estudo": matérias do catálogo em cards (passo 1) e os temas da matéria
 * (passo 2) com busca, filtro por andamento e o progresso real do aluno em cada tema.
 * Começar abre o novo estudo já com o tema escolhido; continuar abre o estudo existente.
 */
export function StudyPicker({
  themes,
  base = "",
}: {
  themes: ThemeCard[];
  base?: string;
}) {
  const subjects = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of themes) m.set(t.discipline, (m.get(t.discipline) ?? 0) + 1);
    return [...m.entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"),
    );
  }, [themes]);
  const [subject, setSubject] = useState<string | null>(() => {
    // Abre na matéria do tema mais estudado; sem estudos, na matéria com mais temas.
    const best = [...themes]
      .filter((t) => t.study)
      .sort(
        (a, b) =>
          b.study!.answered - a.study!.answered ||
          (b.study!.lastStudiedAt ?? "").localeCompare(
            a.study!.lastStudiedAt ?? "",
          ),
      )[0];
    return best?.discipline ?? subjects[0]?.[0] ?? null;
  });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const track = useRef<HTMLDivElement>(null);

  const inSubject = useMemo(
    () => themes.filter((t) => subject === null || t.discipline === subject),
    [themes, subject],
  );
  const visible = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return inSubject.filter(
      (t) =>
        matches(t, filter) &&
        words.every((w) => norm(`${t.title} ${t.discipline}`).includes(w)),
    );
  }, [inSubject, filter, q]);
  // Destaque "Mais estudado": o tema com mais questões respondidas na seleção atual.
  const top = useMemo(
    () =>
      [...visible]
        .filter((t) => t.study && t.study.answered > 0)
        .sort((a, b) => b.study!.answered - a.study!.answered)[0] ?? null,
    [visible],
  );
  const ordered = top ? [top, ...visible.filter((t) => t !== top)] : visible;
  const scroll = (dir: number) =>
    track.current?.scrollBy({
      left: dir * (track.current.clientWidth * 0.8),
      behavior: "smooth",
    });

  if (!themes.length) return null;

  return (
    <section
      className="overflow-hidden rounded-[24px] border border-[#E5E8ED] bg-white shadow-[0_18px_40px_rgba(8,8,8,0.08)]"
      aria-labelledby="novo-estudo-titulo"
      data-testid="escolha-estudo"
    >
      {/* Abertura */}
      <div className="relative overflow-hidden bg-[#080808] px-5 pb-7 pt-6 text-white sm:px-8 sm:pb-9 sm:pt-8">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-[70%] bg-cover bg-[position:70%_20%] opacity-60 sm:w-[55%]"
          style={{
            backgroundImage:
              "linear-gradient(90deg,#080808 0%,rgba(8,8,8,0.35) 45%,rgba(8,8,8,0.1)), url(/images/aprovum-login-hero-mobile.webp)",
          }}
          aria-hidden
        />
        <span
          className="pointer-events-none absolute -bottom-8 right-[-10%] h-24 w-[70%] -rotate-[8deg] bg-[#F01820] opacity-90 blur-[2px] [clip-path:polygon(0_45%,100%_0,100%_55%,0_100%)]"
          aria-hidden
        />
        <div className="relative max-w-[560px]">
          <p className="font-[Space_Grotesk] text-[18px] font-black uppercase tracking-[0.02em] text-[#F01820] sm:text-[22px]">
            Escolha seu
          </p>
          <h2
            id="novo-estudo-titulo"
            className="font-[Space_Grotesk] text-[44px] font-black leading-[0.95] tracking-[-0.03em] sm:text-[60px]"
          >
            Novo estudo
          </h2>
          <p className="mt-3 max-w-[420px] text-[15px] leading-snug text-white/85">
            Selecione a matéria e o tema que deseja estudar. O Aprovum cuida do
            resto.
          </p>
          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-[12.5px] leading-tight text-white/85">
            <li className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[#F01820]" aria-hidden /> Aulas
              dinâmicas
              <br />e objetivas
            </li>
            <li className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-[#F01820]" aria-hidden />{" "}
              Conteúdo atualizado
              <br />
              até 2026
            </li>
            <li className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#F01820]" aria-hidden /> Foco no
              que
              <br />
              mais cai
            </li>
          </ul>
        </div>
        <p
          className="relative mt-5 hidden -rotate-[8deg] text-right font-[Space_Grotesk] text-[22px] font-black uppercase italic leading-tight sm:block"
          aria-hidden
        >
          Disciplina
          <br />é o que te leva
          <br />
          até a <span className="text-[#F01820]">aprovação.</span>
        </p>
      </div>

      <div className="px-4 pb-6 pt-6 sm:px-7">
        {/* Passo 1 — matéria */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <StepTitle
            n={1}
            title="Selecione a matéria"
            text="Escolha a disciplina que deseja estudar."
          />
          <span className="rounded-full border border-[#E5E8ED] px-3 py-1 text-[13px] text-[#15171B]">
            {subjects.length} {subjects.length === 1 ? "matéria" : "matérias"}
          </span>
        </div>
        <div className="relative mt-4">
          <div
            ref={track}
            className="flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:none]"
            role="tablist"
            aria-label="Matérias"
          >
            {subjects.map(([d, n]) => {
              const on = d === subject;
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setSubject(d)}
                  className={`relative flex h-[132px] w-[150px] shrink-0 snap-start flex-col items-center justify-center gap-2 rounded-[16px] bg-[radial-gradient(circle_at_50%_0%,#2a2c31,#0b0b0c_70%)] px-3 text-center text-white transition-all sm:w-[176px] ${
                    on
                      ? "ring-2 ring-[#F01820] shadow-[0_10px_26px_rgba(240,24,32,0.35)]"
                      : "ring-1 ring-black/5 hover:ring-[#F01820]/50"
                  }`}
                >
                  <span
                    className={`flex h-12 w-12 items-center justify-center rounded-full ${on ? "bg-[#F01820]/15 text-[#F01820] ring-1 ring-[#F01820]/60" : "text-white"}`}
                  >
                    <DisciplineIcon discipline={d} className="h-7 w-7" />
                  </span>
                  <span className="text-[14.5px] font-bold leading-tight">
                    {d}
                  </span>
                  <span className="text-[12px] text-white/65">
                    {n} {n === 1 ? "tema" : "temas"}
                  </span>
                </button>
              );
            })}
          </div>
          {subjects.length > 2 && (
            <>
              <button
                type="button"
                onClick={() => scroll(-1)}
                className="absolute -left-2 top-[52px] hidden h-9 w-9 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/10 sm:flex"
                aria-label="Matérias anteriores"
              >
                <ChevronLeft className="h-5 w-5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                className="absolute -right-2 top-[52px] hidden h-9 w-9 items-center justify-center rounded-full bg-white shadow ring-1 ring-black/10 sm:flex"
                aria-label="Próximas matérias"
              >
                <ChevronRight className="h-5 w-5" aria-hidden />
              </button>
            </>
          )}
        </div>

        {/* Passo 2 — tema */}
        <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
          <StepTitle
            n={2}
            title="Escolha o tema"
            text="Selecione o conteúdo específico que deseja estudar."
          />
          <button
            type="button"
            onClick={() => {
              setSubject(null);
              setFilter("todos");
            }}
            className="flex items-center gap-2 rounded-full border border-[#E5E8ED] px-4 py-2 text-[13px] font-semibold text-[#15171B] hover:border-[#15171B]/40"
          >
            <ListFilter className="h-4 w-4" aria-hidden /> Ver todos os temas
          </button>
        </div>

        <div className="relative mt-4">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#646B75]"
            aria-hidden
          />
          <label htmlFor="busca-tema" className="sr-only">
            Buscar tema
          </label>
          <input
            id="busca-tema"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tema…"
            className="h-12 w-full rounded-[14px] border border-[#E5E8ED] bg-[#F8F9FB] pl-11 pr-4 text-[15px] outline-none focus:border-[#F01820]/60 focus:bg-white"
          />
        </div>

        <div
          className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]"
          role="group"
          aria-label="Filtrar temas"
        >
          {FILTERS.map(({ key, label, Icon }) => {
            const n = inSubject.filter((t) => matches(t, key)).length;
            const on = filter === key;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(key)}
                className={`flex shrink-0 items-center gap-2 rounded-[12px] px-4 py-2.5 text-[13.5px] font-semibold ${on ? "bg-[#F01820] text-white shadow-[0_8px_18px_rgba(240,24,32,0.3)]" : "border border-[#E5E8ED] bg-white text-[#15171B]"}`}
              >
                <Icon className="h-4 w-4" aria-hidden /> {label} ({n})
              </button>
            );
          })}
        </div>

        {/* Temas */}
        <ul className="mt-4 flex flex-col gap-3">
          {ordered.length === 0 && (
            <li className="rounded-[16px] border border-dashed border-[#E5E8ED] px-4 py-6 text-center text-[14px] text-[#646B75]">
              Nenhum tema encontrado com esse filtro.
            </li>
          )}
          {ordered.map((t) => (
            <li key={t.id}>
              <ThemeRow theme={t} highlight={t === top} base={base} />
            </li>
          ))}
        </ul>

        {/* Atalho para o novo estudo completo */}
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-[18px] bg-[#080808] px-4 py-4 text-white sm:px-5">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[12px] bg-[#F01820]"
            aria-hidden
          >
            <Target className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1 basis-[200px]">
            <p className="text-[15px] font-bold">Não sabe por onde começar?</p>
            <p className="text-[13px] text-white/75">
              Monte um estudo com o tema, a banca e a pasta que você quiser.
            </p>
          </div>
          <Link
            href={`${base}/nova-trilha`}
            className="flex items-center gap-2 rounded-full bg-[#F01820] px-5 py-3 text-[14px] font-bold text-white shadow-[0_8px_20px_rgba(240,24,32,0.35)] max-sm:w-full max-sm:justify-center"
          >
            <Sparkles className="h-4 w-4" aria-hidden /> Novo estudo{" "}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}

function StepTitle({
  n,
  title,
  text,
}: {
  n: number;
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F01820] text-[17px] font-black text-white shadow-[0_6px_16px_rgba(240,24,32,0.35)]">
        {n}
      </span>
      <div>
        <h3 className="text-[19px] font-bold leading-tight text-[#080808]">
          {title}
        </h3>
        <p className="text-[13.5px] text-[#646B75]">{text}</p>
      </div>
    </div>
  );
}

function ThemeRow({
  theme: t,
  highlight,
  base,
}: {
  theme: ThemeCard;
  highlight: boolean;
  base: string;
}) {
  const s = t.study;
  const href = s
    ? `${base}/trilhas/${s.trailId}`
    : `${base}/nova-trilha?materia=${encodeURIComponent(t.discipline)}&conteudo=${encodeURIComponent(t.title)}`;
  const status = !s ? "Não iniciado" : s.done ? "Concluído" : "Em andamento";
  const action = !s
    ? "Começar estudo"
    : s.done
      ? "Revisar estudo"
      : "Continuar estudando";
  const short = !s ? "Começar" : s.done ? "Revisar" : "Continuar";
  const value = s?.pct ?? 0;
  return (
    <div
      className={`relative flex flex-wrap items-center gap-3 rounded-[18px] px-3 py-3 sm:flex-nowrap sm:gap-4 sm:px-4 ${
        highlight
          ? "bg-[#0B0B0C] text-white ring-2 ring-[#F01820] shadow-[0_14px_32px_rgba(240,24,32,0.25)]"
          : "border border-[#E5E8ED] bg-white text-[#080808]"
      }`}
      data-testid="tema-catalogo"
    >
      {highlight && (
        <span className="absolute right-0 top-0 rounded-bl-[12px] rounded-tr-[16px] bg-[#F01820] px-3 py-1 text-[11.5px] font-bold text-white">
          Mais estudado
        </span>
      )}
      <span
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] ${highlight ? "bg-[#F01820] text-white" : "bg-[#0B0B0C] text-white"}`}
        aria-hidden
      >
        <DisciplineIcon discipline={t.discipline} className="h-7 w-7" />
      </span>
      <div className="min-w-0 flex-1 basis-[180px]">
        <p
          className={`text-[16px] font-bold leading-tight ${highlight ? "pr-24" : ""}`}
        >
          {t.title}
        </p>
        <p
          className={`text-[13px] ${highlight ? "text-white/70" : "text-[#646B75]"}`}
        >
          {t.discipline}
        </p>
        <p
          className={`mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] ${highlight ? "text-white/80" : "text-[#646B75]"}`}
        >
          {t.minutes > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {t.minutes} min
            </span>
          )}
          <span className="flex items-center gap-1">
            <FileQuestion className="h-3.5 w-3.5" aria-hidden /> {t.questions}{" "}
            questões
          </span>
          {s && s.lessonsTotal > 0 && (
            <span className="flex items-center gap-1">
              <BookOpenCheck className="h-3.5 w-3.5" aria-hidden />{" "}
              {s.lessonsDone}/{s.lessonsTotal}{" "}
              {s.lessonsTotal === 1 ? "aula" : "aulas"}
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-3 max-sm:w-full max-sm:justify-between">
        <span className="flex items-center gap-2.5">
          <Ring
            value={value}
            size={52}
            stroke={11}
            dark={highlight}
            label={`${value}% concluído`}
          />
          <span
            className={`text-[12.5px] leading-tight sm:w-[92px] ${highlight ? "text-white/85" : "text-[#646B75]"}`}
          >
            {status}
          </span>
        </span>
        <Link
          href={href}
          aria-label={`${action}: ${t.title}`}
          className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-[13.5px] font-bold ${
            highlight
              ? "bg-[#F01820] text-white shadow-[0_8px_18px_rgba(240,24,32,0.35)]"
              : "border border-[#E5E8ED] bg-white text-[#080808] hover:border-[#080808]/40"
          }`}
        >
          <span className="sm:hidden">{short}</span>
          <span className="hidden sm:inline">{action}</span>{" "}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
