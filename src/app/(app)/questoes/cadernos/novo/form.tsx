"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import {
  ArrowLeft,
  Bookmark,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Crosshair,
  FileText,
  Filter,
  Folder,
  GraduationCap,
  Landmark,
  MapPin,
  Search,
  Signal,
  Star,
  Trash2,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";
import type { NotebookInput, NotebookLookups } from "@/server/services/notebooks";
import {
  countMatches,
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  EMPTY_FILTERS,
  FAVORITES,
  FAVORITES_LABEL,
  type NotebookFilters,
  type Scope,
} from "@/domain/notebooks/filters";
import { callAction } from "@/components/safe-action";
import { createNotebookAction, type Result } from "../../actions";

type Panel = null | "banca" | "orgao" | "ano" | "favoritas" | "dificuldade";
type ListKey = "subjects" | "topics" | "boards" | "exams" | "years" | "difficulty";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const SCOPE_TABS: Array<{ id: Scope; label: string; icon: LucideIcon }> = [
  { id: "todas", label: "Todas as questões", icon: Crosshair },
  { id: "minhas", label: "Minhas questões", icon: Star },
  { id: "favoritas", label: "Questões favoritas", icon: Bookmark },
];

/**
 * "Criar novo caderno": filtros por matéria/assunto, banca, órgão e cargo, ano, favoritas e
 * dificuldade, com a contagem real de questões publicadas. "Buscar questões" salva os
 * filtros como um caderno e abre as questões.
 */
export function NewNotebookForm({
  lookups,
  base,
  create = createNotebookAction,
}: {
  lookups: NotebookLookups;
  base: string;
  /** A galeria troca a ação do servidor por uma versão em memória. */
  create?: (input: NotebookInput) => Promise<Result<string>>;
}) {
  const router = useRouter();
  const [f, setF] = useState<NotebookFilters>(EMPTY_FILTERS);
  const [fullStatement, setFullStatement] = useState(true);
  const [panel, setPanel] = useState<Panel>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const ctx = useMemo(
    () => ({ answered: new Set(lookups.answered), favorites: new Set(lookups.favorites), topicParent: new Map(lookups.topicParent) }),
    [lookups.answered, lookups.favorites, lookups.topicParent],
  );
  const found = useMemo(() => countMatches(lookups.index, f, ctx), [lookups.index, f, ctx]);

  const names = useMemo(() => {
    const subject = new Map(lookups.subjects.map((s) => [s.id, s.name]));
    const topic = new Map(lookups.subjects.flatMap((s) => s.topics.map((t) => [t.id, t.name] as const)));
    const board = new Map(lookups.boards.map((b) => [b.slug, b.name]));
    const exam = new Map(lookups.exams.map((e) => [e.id, examText(e)]));
    return { subject, topic, board, exam };
  }, [lookups]);

  const toggle = <K extends ListKey>(key: K, value: NotebookFilters[K][number]) =>
    setF((x) => {
      const list = x[key] as Array<typeof value>;
      return { ...x, [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] };
    });
  const clearKey = (key: ListKey) => setF((x) => ({ ...x, [key]: [] }));

  const chips: Array<{ key: string; label: string; icon: LucideIcon; remove: () => void }> = [
    ...f.subjects.map((id) => ({ key: `s${id}`, label: names.subject.get(id) ?? "Matéria", icon: Folder, remove: () => toggle("subjects", id) })),
    ...f.topics.map((id) => ({ key: `t${id}`, label: names.topic.get(id) ?? "Assunto", icon: Folder, remove: () => toggle("topics", id) })),
    ...f.boards.map((b) => ({ key: `b${b}`, label: names.board.get(b) ?? b.toUpperCase(), icon: Landmark, remove: () => toggle("boards", b) })),
    ...f.exams.map((id) => ({ key: `e${id}`, label: names.exam.get(id) ?? "Concurso", icon: BriefcaseBusiness, remove: () => toggle("exams", id) })),
    ...f.years.map((y) => ({ key: `y${y}`, label: String(y), icon: CalendarDays, remove: () => toggle("years", y) })),
    ...f.difficulty.map((d) => ({ key: `d${d}`, label: DIFFICULTY_LABEL[d], icon: Signal, remove: () => toggle("difficulty", d) })),
    ...(f.favorites !== "todas" ? [{ key: "fav", label: FAVORITES_LABEL[f.favorites], icon: Star, remove: () => setF((x) => ({ ...x, favorites: "todas" as const })) }] : []),
  ];

  const submit = () => {
    setError(null);
    start(async () => {
      const r = await callAction(() => create({ filters: f, showFullStatement: fullStatement }), setError);
      if (!r) return;
      if (!r.ok) return setError(r.error);
      router.push(`${base}/questoes/cadernos/${r.data}`);
    });
  };

  const summary = (list: string[], all: string) => (list.length ? (list.length <= 2 ? list.join(", ") : `${list.length} selecionados`) : all);

  return (
    <div className="flex flex-col gap-5" data-testid="novo-caderno">
      {/* Abas: todas, minhas (já respondidas) e favoritas */}
      <div className="pc nq-abas" role="tablist" aria-label="Quais questões">
        {SCOPE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={f.scope === t.id}
            onClick={() => setF((x) => ({ ...x, scope: t.id }))}
            className="nq-aba"
          >
            <t.icon className="h-5 w-5 shrink-0" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3 lg:gap-5">
        {/* Matéria e assunto */}
        <SubjectsColumn lookups={lookups} f={f} toggle={toggle} />

        {/* Filtros de questões */}
        <section className="pc nq-col min-w-0 p-4 sm:p-5" aria-labelledby="nq-filtros">
          {panel === null || panel === "dificuldade" ? (
            <>
              <ColumnTitle id="nq-filtros" icon={Filter}>
                Filtros de questões
              </ColumnTitle>
              <ul className="mt-4 flex flex-col gap-2">
                <FilterRow icon={Landmark} label="Banca" value={summary(f.boards.map((b) => names.board.get(b) ?? b), "Todas as bancas")} onOpen={() => setPanel("banca")} />
                <FilterRow icon={BriefcaseBusiness} label="Órgão e cargo" value={summary(f.exams.map((e) => names.exam.get(e) ?? ""), "Todos os órgãos e cargos")} onOpen={() => setPanel("orgao")} />
                <FilterRow icon={CalendarDays} label="Ano" value={summary(f.years.map(String), "Todos os anos")} onOpen={() => setPanel("ano")} />
                <FilterRow icon={UsersRound} label="Área (carreira)" value="Em breve" disabled />
                <FilterRow icon={GraduationCap} label="Escolaridade" value="Em breve" disabled />
                <FilterRow icon={GraduationCap} label="Formação" value="Em breve" disabled />
                <FilterRow icon={MapPin} label="Região" value="Em breve" disabled />
                <FilterRow icon={Star} label="Favoritas" value={FAVORITES_LABEL[f.favorites]} onOpen={() => setPanel("favoritas")} />
                <li>
                  <label className="nq-filtro cursor-pointer">
                    <FileText className="h-[22px] w-[22px] shrink-0 text-[#3A3C42]" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-[#08090B]">Enunciados</span>
                      <span className="block text-[12px] text-[#64666D]">{fullStatement ? "Mostrar o enunciado completo" : "Mostrar o enunciado resumido"}</span>
                    </span>
                    <input type="checkbox" role="switch" checked={fullStatement} onChange={(e) => setFullStatement(e.target.checked)} className="nq-switch" aria-label="Mostrar o enunciado completo" />
                  </label>
                </li>
              </ul>
            </>
          ) : panel === "banca" ? (
            <OptionsPanel
              title="Banca"
              onBack={() => setPanel(null)}
              onClear={() => clearKey("boards")}
              options={lookups.boards.map((b) => ({ value: b.slug, label: b.name, count: lookups.index.filter((q) => q.board === b.slug).length }))}
              selected={f.boards}
              onToggle={(v) => toggle("boards", v)}
            />
          ) : panel === "orgao" ? (
            <OptionsPanel
              title="Órgão e cargo"
              onBack={() => setPanel(null)}
              onClear={() => clearKey("exams")}
              options={lookups.exams.map((e) => ({ value: e.id, label: e.name, hint: [e.organ, e.role, e.year].filter(Boolean).join(" · "), count: lookups.index.filter((q) => q.exam === e.id).length }))}
              selected={f.exams}
              onToggle={(v) => toggle("exams", v)}
              empty="Nenhum concurso cadastrado ainda."
            />
          ) : panel === "ano" ? (
            <OptionsPanel
              title="Ano"
              onBack={() => setPanel(null)}
              onClear={() => clearKey("years")}
              options={lookups.years.map((y) => ({ value: String(y), label: String(y), count: lookups.index.filter((q) => q.year === y).length }))}
              selected={f.years.map(String)}
              onToggle={(v) => toggle("years", Number(v))}
              empty="Ainda não há questões publicadas com ano informado."
              noSearch
            />
          ) : (
            <OptionsPanel
              title="Favoritas"
              onBack={() => setPanel(null)}
              options={FAVORITES.map((v) => ({ value: v, label: FAVORITES_LABEL[v] }))}
              selected={[f.favorites]}
              onToggle={(v) => setF((x) => ({ ...x, favorites: v as NotebookFilters["favorites"] }))}
              single
              noSearch
            />
          )}
        </section>

        {/* Filtro ativo */}
        <section className="pc nq-col min-w-0 p-4 sm:p-5" aria-labelledby="nq-ativo">
          <div className="flex items-center justify-between gap-3">
            <ColumnTitle id="nq-ativo" icon={Filter}>
              Filtro ativo
            </ColumnTitle>
            <button
              type="button"
              onClick={() => setF((x) => ({ ...EMPTY_FILTERS, scope: x.scope }))}
              disabled={!chips.length}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[13.5px] font-bold text-[#E50914] disabled:opacity-40"
            >
              Limpar <Trash2 className="h-[18px] w-[18px]" aria-hidden />
            </button>
          </div>
          <ul className="mt-4 flex min-h-[56px] flex-wrap content-start gap-2 rounded-[12px] bg-[#F5F6F8] p-2.5" aria-label="Filtros escolhidos">
            {chips.length ? (
              chips.map((c) => (
                <li key={c.key}>
                  <button type="button" onClick={c.remove} className="nq-chip" aria-label={`Remover filtro ${c.label}`}>
                    <c.icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{c.label}</span>
                    <X className="h-4 w-4 shrink-0" aria-hidden />
                  </button>
                </li>
              ))
            ) : (
              <li className="self-center px-1.5 text-[12.5px] text-[#8A8C93]">Nenhum filtro: valem todas as questões publicadas.</li>
            )}
          </ul>

          <div className="nq-vazio relative flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
            <Crosshair className="h-14 w-14 text-[#E50914]" strokeWidth={2.2} aria-hidden />
            {chips.length ? (
              <p className="mt-3 max-w-[26ch] text-[16px] leading-snug text-[#3A3C42]">
                <strong className="text-[#08090B]">{plural(found, "questão", "questões")}</strong> com estes filtros. Toque em “Buscar questões” para criar o caderno.
              </p>
            ) : (
              <p className="mt-3 max-w-[24ch] text-[16px] leading-snug text-[#3A3C42]">Selecione os filtros<span className="max-lg:hidden"> ao lado</span> para visualizar as questões.</p>
            )}
          </div>

          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-stretch rounded-[12px] border border-[#ECEDF0] bg-white">
            <p className="flex min-w-0 items-center gap-2.5 px-3.5 py-3 text-[13.5px] text-[#3A3C42]" aria-live="polite" data-testid="contagem-filtro">
              <span className="text-[#E50914]" aria-hidden>
                <FileText className="h-5 w-5" />
              </span>
              <span>
                <strong className="text-[#08090B]">{found}</strong> {found === 1 ? "questão encontrada" : "questões encontradas"}
              </span>
            </p>
            <button
              type="button"
              onClick={() => setPanel(panel === "dificuldade" ? null : "dificuldade")}
              aria-expanded={panel === "dificuldade"}
              className="flex items-center gap-2.5 border-l border-[#ECEDF0] px-3.5 py-2 text-left"
            >
              <Signal className="h-5 w-5 text-[#E50914]" aria-hidden />
              <span>
                <span className="block text-[13px] font-semibold text-[#08090B]">Dificuldade</span>
                <span className="block text-[12px] text-[#64666D]">{f.difficulty.length ? f.difficulty.map((d) => DIFFICULTY_LABEL[d]).join(", ") : "Todas"}</span>
              </span>
              <ChevronDown className={`h-4 w-4 transition-transform ${panel === "dificuldade" ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {panel === "dificuldade" && (
              <div className="absolute bottom-[calc(100%+8px)] right-0 z-20 w-[230px] rounded-[12px] border border-[#E6E7EB] bg-white p-2 shadow-[0_18px_40px_-16px_rgba(8,9,11,0.35)]" role="group" aria-label="Dificuldade">
                {DIFFICULTIES.map((d) => (
                  <label key={d} className="nq-opcao">
                    <input type="checkbox" checked={f.difficulty.includes(d)} onChange={() => toggle("difficulty", d)} className="sr-only" />
                    <Box on={f.difficulty.includes(d)} />
                    {DIFFICULTY_LABEL[d]}
                  </label>
                ))}
                <p className="px-2 pb-1 pt-2 text-[11px] text-[#8A8C93]">Nenhuma marcada = todas.</p>
              </div>
            )}
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-[10px] border border-[#F2C4C7] bg-[#FDECED] px-3 py-2 text-[13px] font-medium text-[#B9000B]">
              {error}
            </p>
          )}

          <button type="button" onClick={submit} disabled={pending} className="cq-criar cq-criar-normal mt-3 disabled:opacity-60">
            <Search className="h-5 w-5" aria-hidden /> {pending ? "Criando o caderno…" : "Buscar questões"}
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </section>
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E7EB] pt-4 text-[11px] font-medium uppercase tracking-[0.18em] text-[#8A8C93]">
        <span className="flex items-center gap-3">
          <span className="estudos-barras text-[14px]" aria-hidden>
            {"//"}
          </span>
          APROVUM • Questões • Foco • Resultado
        </span>
        <span>Disciplina é o que te leva mais longe.</span>
      </footer>
    </div>
  );
}

function examText(e: { name: string; organ: string | null; role: string | null; year: number | null }) {
  return [e.name, e.role, e.year].filter(Boolean).join(" · ");
}

function ColumnTitle({ id, icon: Icon, children }: { id: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <h2 id={id} className="flex items-center gap-2.5 text-[16px] font-extrabold tracking-[-0.01em] text-[#08090B]">
      <Icon className="h-6 w-6 text-[#E50914]" aria-hidden />
      {children}
    </h2>
  );
}

function Box({ on, round }: { on: boolean; round?: boolean }) {
  return (
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center border ${round ? "rounded-full" : "rounded-[5px]"} ${on ? "border-[#E50914] bg-[#E50914] text-white" : "border-[#C9CACF] bg-white"}`}
      aria-hidden
    >
      {on && <Check className="h-3 w-3" strokeWidth={3} />}
    </span>
  );
}

function FilterRow({ icon: Icon, label, value, onOpen, disabled }: { icon: LucideIcon; label: string; value: string; onOpen?: () => void; disabled?: boolean }) {
  return (
    <li>
      <button type="button" onClick={onOpen} disabled={disabled} className="nq-filtro" aria-label={`${label}: ${value}`}>
        <Icon className="h-[22px] w-[22px] shrink-0 text-[#3A3C42]" aria-hidden />
        <span className="min-w-0 flex-1 text-left">
          <span className="block text-[14px] font-semibold text-[#08090B]">{label}</span>
          <span className={`block truncate text-[12px] ${value === "Em breve" ? "font-semibold text-[#B0B2B8]" : "text-[#64666D]"}`}>{value}</span>
        </span>
        {!disabled && <ChevronRight className="h-[18px] w-[18px] shrink-0 text-[#3A3C42]" aria-hidden />}
      </button>
    </li>
  );
}

function OptionsPanel({
  title,
  options,
  selected,
  onToggle,
  onBack,
  onClear,
  single,
  noSearch,
  empty = "Nada para escolher ainda.",
}: {
  title: string;
  options: Array<{ value: string; label: string; hint?: string; count?: number }>;
  selected: string[];
  onToggle: (v: string) => void;
  onBack: () => void;
  onClear?: () => void;
  single?: boolean;
  noSearch?: boolean;
  empty?: string;
}) {
  const [q, setQ] = useState("");
  const shown = options.filter((o) => !q || norm(`${o.label} ${o.hint ?? ""}`).includes(norm(q)));
  return (
    <div className="flex min-h-0 flex-col" role="group" aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-md py-1 pr-2 text-[16px] font-extrabold text-[#08090B]">
          <ArrowLeft className="h-5 w-5 text-[#E50914]" aria-hidden /> {title}
        </button>
        {onClear && selected.length > 0 && (
          <button type="button" onClick={onClear} className="text-[13px] font-bold text-[#E50914]">
            Limpar
          </button>
        )}
      </div>
      {!noSearch && options.length > 6 && (
        <label className="nq-busca mt-4">
          <Search className="h-[18px] w-[18px] text-[#64666D]" aria-hidden />
          <span className="sr-only">Buscar em {title}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Buscar ${title.toLowerCase()}…`} className="min-w-0 flex-1 bg-transparent outline-none" />
        </label>
      )}
      <div className="mt-3 max-h-[470px] overflow-y-auto pr-1">
        {shown.length ? (
          shown.map((o) => {
            const on = selected.includes(o.value);
            return (
              <label key={o.value} className="nq-opcao">
                <input type={single ? "radio" : "checkbox"} name={single ? `nq-${title}` : undefined} checked={on} onChange={() => onToggle(o.value)} className="sr-only" />
                <Box on={on} round={single} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{o.label}</span>
                  {o.hint && <span className="block truncate text-[11.5px] font-normal text-[#8A8C93]">{o.hint}</span>}
                </span>
                {o.count !== undefined && <span className="text-[11.5px] font-semibold tabular-nums text-[#8A8C93]">{o.count}</span>}
              </label>
            );
          })
        ) : (
          <p className="px-2 py-6 text-center text-[13px] text-[#8A8C93]">{q ? "Nada encontrado." : empty}</p>
        )}
      </div>
    </div>
  );
}

function SubjectsColumn({
  lookups,
  f,
  toggle,
}: {
  lookups: NotebookLookups;
  f: NotebookFilters;
  toggle: (key: "subjects" | "topics", value: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const selectedCount = f.subjects.length + f.topics.length;
  const query = norm(q);
  const subjects = lookups.subjects
    .map((s) => ({ ...s, topicsShown: query ? s.topics.filter((t) => norm(t.name).includes(query)) : s.topics }))
    .filter((s) => !query || norm(s.name).includes(query) || s.topicsShown.length);
  const countIn = (s: (typeof subjects)[number]) => (f.subjects.includes(s.id) ? 1 : 0) + s.topics.filter((t) => f.topics.includes(t.id)).length;

  return (
    <section className="pc nq-col min-w-0 p-4 sm:p-5" aria-labelledby="nq-materias">
      <div className="flex items-center justify-between gap-3">
        <ColumnTitle id="nq-materias" icon={Folder}>
          Matéria e assunto
        </ColumnTitle>
        {selectedCount > 0 && (
          <span className="shrink-0 rounded-full border border-[#E50914] px-2.5 py-0.5 text-[12px] font-bold text-[#E50914]">
            {selectedCount} {selectedCount === 1 ? "selecionada" : "selecionadas"}
          </span>
        )}
      </div>
      <label className="nq-busca mt-4">
        <Search className="h-[18px] w-[18px] text-[#64666D]" aria-hidden />
        <span className="sr-only">Buscar matéria ou assunto</span>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar matéria ou assunto…" className="min-w-0 flex-1 bg-transparent outline-none" />
      </label>
      <ul className="mt-3 flex max-h-[520px] flex-col gap-1 overflow-y-auto pr-1" aria-label="Matérias">
        {subjects.length ? (
          subjects.map((s) => {
            const on = f.subjects.includes(s.id);
            const n = countIn(s);
            const expanded = open === s.id || (!!query && s.topicsShown.length > 0 && !norm(s.name).includes(query));
            return (
              <li key={s.id}>
                <div className={`nq-materia ${on ? "nq-materia-on" : ""}`}>
                  <button type="button" onClick={() => toggle("subjects", s.id)} aria-pressed={on} className="flex min-w-0 flex-1 items-center gap-3 py-2 pl-3 text-left">
                    <Folder className={`h-5 w-5 shrink-0 ${on ? "fill-white text-white" : "fill-[#3A3C42] text-[#3A3C42]"}`} aria-hidden />
                    <span className="truncate">{s.name}</span>
                  </button>
                  {n > 0 && <span className={`rounded-full px-2 text-[11.5px] font-bold ${on ? "bg-white text-[#E50914]" : "bg-[#E50914] text-white"}`}>{n}</span>}
                  <button
                    type="button"
                    onClick={() => setOpen(open === s.id ? null : s.id)}
                    aria-expanded={expanded}
                    aria-label={`${expanded ? "Fechar" : "Ver"} assuntos de ${s.name}`}
                    className="flex h-10 w-10 shrink-0 items-center justify-center"
                  >
                    <ChevronRight className={`h-[18px] w-[18px] transition-transform ${expanded ? "rotate-90" : ""}`} aria-hidden />
                  </button>
                </div>
                {expanded && (
                  <ul className="mb-1 ml-5 mt-1 border-l border-[#ECEDF0] pl-2" aria-label={`Assuntos de ${s.name}`}>
                    {s.topicsShown.length ? (
                      s.topicsShown.map((t) => (
                        <li key={t.id}>
                          <label className="nq-opcao" style={{ paddingLeft: 8 + t.depth * 14 }}>
                            <input type="checkbox" checked={f.topics.includes(t.id)} onChange={() => toggle("topics", t.id)} className="sr-only" />
                            <Box on={f.topics.includes(t.id)} />
                            <span className="truncate">{t.name}</span>
                          </label>
                        </li>
                      ))
                    ) : (
                      <li className="px-2 py-2 text-[12.5px] text-[#8A8C93]">Nenhum assunto cadastrado. Marque a matéria inteira.</li>
                    )}
                  </ul>
                )}
              </li>
            );
          })
        ) : (
          <li className="px-2 py-6 text-center text-[13px] text-[#8A8C93]">Nada encontrado.</li>
        )}
      </ul>
    </section>
  );
}
