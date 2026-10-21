"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  BookOpen,
  BrainCircuit,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePlus,
  CircleX,
  ClipboardList,
  Crosshair,
  EllipsisVertical,
  Flag,
  FolderOpen,
  Grid3x3,
  Lightbulb,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Star,
  Strikethrough,
  Timer,
  Type,
} from "lucide-react";
import type { Notebook, NotebookQuestion } from "@/server/services/notebooks";
import type { AnswerFeedback } from "@/server/services/study";
import { AnswerExplanation } from "@/components/answer-explanation";
import { callAction } from "@/components/safe-action";
import { useStored } from "@/components/use-stored";
import { canConfirm, classifyTap, DOUBLE_TAP_MS, initialChoice, selectOption, toggleStrike, type ChoiceState } from "@/domain/notebooks/elimination";
import { answerNotebookAction, favoriteQuestionAction, fullStatementAction, reportQuestionAction, saveNoteAction, type Result } from "../../actions";

type AnswerInput = { optionId?: string; answerTrue?: boolean; attemptKey: string; seconds?: number };
type Answer = (input: { notebookId: string; questionId: string } & AnswerInput) => Promise<Result<AnswerFeedback>>;
type Done = Record<string, { choice: string; fb: AnswerFeedback }>;

export interface NotebookViewActions {
  answer: Answer;
  favorite: (questionId: string, on: boolean) => Promise<Result<boolean>>;
  saveFull: (id: string, on: boolean) => Promise<Result<null>>;
  saveNote: (questionId: string, body: string) => Promise<Result<null>>;
  report: (questionId: string, details: string) => Promise<Result<null>>;
}

const serverActions: NotebookViewActions = {
  answer: answerNotebookAction,
  favorite: favoriteQuestionAction,
  saveFull: fullStatementAction,
  saveNote: saveNoteAction,
  report: reportQuestionAction,
};

const PAGE = 60;
const pad = (n: number) => String(n).padStart(2, "0");
const clock = (s: number) => `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;

/**
 * Resolver um caderno (layout "Questões" do APROVUM): faixa com banca, matéria, assunto, ano e
 * cargo da questão atual; alternativas com seleção, risco e confirmação; tempo de estudo,
 * progresso e navegação ao lado.
 */
export function NotebookView({
  notebook: n,
  questions,
  base,
  actions: given,
}: {
  notebook: Notebook;
  questions: NotebookQuestion[];
  base: string;
  /** A galeria troca as ações do servidor por versões em memória. */
  actions?: Partial<NotebookViewActions>;
}) {
  const actions = { ...serverActions, ...given };
  const [full, setFull] = useState(n.showFullStatement);
  const [favs, setFavs] = useState(() => new Set(questions.filter((q) => q.favorite).map((q) => q.id)));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(questions.map((q) => [q.id, q.note])));
  const [notice, setNotice] = useState<string | null>(null);
  const [i, setI] = useState(0);
  const [done, setDone] = useState<Done>({});
  const total = questions.length;

  const toggleFull = async (on: boolean) => {
    setFull(on);
    const r = await callAction(() => actions.saveFull(n.id, on), setNotice);
    if (r && !r.ok) {
      setFull(!on);
      setNotice(r.error);
    }
  };
  const setFav = (qid: string, on: boolean) =>
    setFavs((x) => {
      const y = new Set(x);
      if (on) y.add(qid);
      else y.delete(qid);
      return y;
    });
  const toggleFav = async (qid: string, on: boolean) => {
    setFav(qid, on);
    const r = await callAction(() => actions.favorite(qid, on), setNotice);
    if (!r || !r.ok) {
      setFav(qid, !on);
      if (r && !r.ok) setNotice(r.error);
    }
  };

  // Situação de cada questão: resposta desta sessão, senão a última já gravada.
  const stateOf = (q: NotebookQuestion): "certa" | "errada" | null => {
    const d = done[q.id];
    if (d) return d.fb.correct ? "certa" : "errada";
    return q.last ? (q.last.correct ? "certa" : "errada") : null;
  };
  const states = questions.map(stateOf);
  const answered = states.filter(Boolean).length;
  const right = states.filter((s) => s === "certa").length;
  const wrong = states.filter((s) => s === "errada").length;
  const pct = total ? Math.round((answered / total) * 100) : 0;

  if (total === 0) {
    return (
      <div className="flex flex-col gap-5" data-testid="caderno-view">
        <Top n={n} total={0} />
        <section className="rounded-[16px] border border-white/10 bg-[#111214] px-5 py-10 text-center text-white">
          <FolderOpen className="mx-auto h-9 w-9 text-[#FF2A2A]" aria-hidden />
          <h2 className="mt-3 text-[16px] font-extrabold">Ainda não há questões publicadas para este caderno</h2>
          <p className="mx-auto mt-1 max-w-[48ch] text-[13.5px] text-white/65">
            As questões de concurso entram no banco depois de revisadas. Assim que houver questões com estes filtros, elas aparecem aqui automaticamente.
          </p>
          <Link href={`${base}/questoes/cadernos/novo`} className="cq-criar mx-auto mt-6 max-w-[360px]">
            <CirclePlus className="h-5 w-5" aria-hidden /> Criar outro caderno
          </Link>
        </section>
      </div>
    );
  }

  const q = questions[i]!;
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]" data-testid="caderno-view">
      <div className="flex min-w-0 flex-col gap-4">
        <Top n={n} total={total} q={q} />
        {notice && (
          <p role="alert" className="rounded-[10px] border border-[#E50914]/50 bg-[#2A0A0C] px-3 py-2 text-[13px] font-medium text-[#FFB3B8]">
            {notice}
          </p>
        )}
        <QuestionPanel
          key={q.id}
          q={q}
          number={i + 1}
          total={total}
          pct={pct}
          saved={done[q.id]}
          full={full}
          onToggleFull={(on) => void toggleFull(on)}
          favorite={favs.has(q.id)}
          onFavorite={(on) => void toggleFav(q.id, on)}
          note={notes[q.id] ?? ""}
          onNoteSaved={(body) => setNotes((x) => ({ ...x, [q.id]: body }))}
          actions={actions}
          onAnswer={(questionId, input) => actions.answer({ notebookId: n.id, questionId, ...input })}
          onDone={(choice, fb) => setDone((d) => ({ ...d, [q.id]: { choice, fb } }))}
          onPrev={i > 0 ? () => setI(i - 1) : null}
          onNext={i < total - 1 ? () => setI(i + 1) : null}
        />
      </div>

      <aside className="flex min-w-0 flex-col gap-4">
        <TimerCard notebookId={n.id} pct={pct} right={right} wrong={wrong} blank={total - answered} />
        <NavCard questions={questions} states={states} current={i} onPick={setI} />
        <div className="qz-foco" aria-hidden>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/jogo-hero-arte-sm.webp" alt="" className="qz-foco-arte" />
          <div className="relative z-[1] p-5">
            <Crosshair className="h-9 w-9 text-[#FF2A2A]" />
            <p className="mt-2 text-[15px] font-extrabold uppercase tracking-[0.02em] text-white">Foco na aprovação</p>
            <p className="mt-1 max-w-[22ch] text-[13px] leading-snug text-white/75">Cada questão resolvida te aproxima do seu objetivo.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/aprovum-login-logo.png" alt="" className="mt-4 h-auto w-[160px]" />
          </div>
        </div>
      </aside>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topo: caderno, modo e faixa com os dados da questão atual
// ---------------------------------------------------------------------------

function Top({ n, total, q }: { n: Notebook; total: number; q?: NotebookQuestion }) {
  const tiles: Array<{ icon: ReactNode; label: string; value: string }> = q
    ? [
        { icon: <span className="qz-hexa"><Shield className="h-4 w-4" aria-hidden /></span>, label: "Banca", value: q.board ?? "—" },
        { icon: <BookOpen className="h-7 w-7 fill-[#E50914] text-[#E50914]" aria-hidden />, label: "Matéria", value: q.subjectName ?? "—" },
        { icon: <Crosshair className="h-7 w-7 text-[#E50914]" aria-hidden />, label: "Assunto", value: q.topicName ?? "—" },
        { icon: <CalendarDays className="h-7 w-7 text-[#E50914]" aria-hidden />, label: "Ano", value: q.year ? String(q.year) : "—" },
        { icon: <BriefcaseBusiness className="h-7 w-7 fill-[#E50914] text-[#E50914]" aria-hidden />, label: "Cargo", value: q.cargo ?? "—" },
      ]
    : [];
  return (
    <section className="qz-topo" aria-label="Caderno">
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6">
        <div className="flex min-w-0 items-center gap-4">
          <span className="qz-topo-ico" aria-hidden>
            <ClipboardList className="h-8 w-8" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate font-[Space_Grotesk] text-[26px] font-[800] leading-tight tracking-[-0.02em] text-white sm:text-[34px]">{n.title}</h1>
            <p className="mt-0.5 truncate text-[13.5px] text-white/75 sm:text-[15px]">
              {total ? `${total} ${total === 1 ? "questão" : "questões"} · ${n.scope}` : n.scope}
            </p>
          </div>
        </div>
        <div className="qz-modo">
          <BrainCircuit className="h-7 w-7 shrink-0 text-white" aria-hidden />
          <span>
            <span className="block text-[13.5px] font-bold text-white">Modo Estudo</span>
            <span className="block text-[11.5px] text-white/70">Gabarito logo após cada resposta</span>
          </span>
        </div>
      </div>
      {q && (
        <dl className="qz-faixa" data-testid="faixa-questao">
          {tiles.map((t) => (
            <div key={t.label} className="qz-faixa-item">
              <span className="shrink-0">{t.icon}</span>
              <span className="min-w-0">
                <dt className="text-[12px] text-white/65">{t.label}</dt>
                <dd className="text-[14px] font-medium leading-snug text-white">{t.value}</dd>
              </span>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Questão
// ---------------------------------------------------------------------------

function QuestionPanel({
  q,
  number,
  total,
  pct,
  saved,
  full,
  onToggleFull,
  favorite,
  onFavorite,
  note,
  onNoteSaved,
  actions,
  onAnswer,
  onDone,
  onPrev,
  onNext,
}: {
  q: NotebookQuestion;
  number: number;
  total: number;
  pct: number;
  saved?: { choice: string; fb: AnswerFeedback };
  full: boolean;
  onToggleFull: (on: boolean) => void;
  favorite: boolean;
  onFavorite: (on: boolean) => void;
  note: string;
  onNoteSaved: (body: string) => void;
  actions: NotebookViewActions;
  onAnswer: (questionId: string, input: AnswerInput) => Promise<Result<AnswerFeedback>>;
  onDone: (choice: string, fb: AnswerFeedback) => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const ce = q.type === "certo_errado";
  const options = ce ? [{ id: "true", label: "C", text: "Certo" }, { id: "false", label: "E", text: "Errado" }] : q.options;

  // Escolha e alternativas riscadas: só na tela (nada é gravado até confirmar).
  const [cs, setCs] = useState<ChoiceState>(() => initialChoice(saved?.choice ?? null));
  const choice = cs.selected;
  const setChoice = (id: string) => setCs((x) => selectOption(x, id));
  const strike = (id: string) => setCs((x) => toggleStrike(x, id));
  const lastTap = useRef<{ id: string; at: number } | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => void (tapTimer.current && clearTimeout(tapTimer.current)), []);
  // Clique simples escolhe (depois da janela do duplo); clique/toque duplo risca ou restaura.
  const onTap = (id: string, keyboard: boolean, now: number) => {
    const kind = classifyTap(lastTap.current, id, now, keyboard);
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = null;
    if (kind === "select-now") {
      lastTap.current = null;
      return setChoice(id);
    }
    if (kind === "strike") {
      lastTap.current = null;
      return strike(id);
    }
    lastTap.current = { id, at: now };
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      setChoice(id);
    }, DOUBLE_TAP_MS);
  };

  const [fb, setFb] = useState<AnswerFeedback | null>(saved?.fb ?? null);
  const [expanded, setExpanded] = useState(false);
  const clamp = !full && !expanded;
  const textRef = useRef<HTMLDivElement>(null);
  const [cut, setCut] = useState(false);
  useEffect(() => {
    const el = textRef.current;
    if (!el || !clamp) return setCut(false);
    const check = () => setCut([...el.querySelectorAll<HTMLElement>("[data-resumo]")].some((p) => p.scrollHeight > p.clientHeight + 1));
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [clamp, q.id]);

  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const startedAt = useRef(0);
  // Chave desta confirmação: reenviar (clique repetido, rede instável) não conta duas vezes.
  const attemptKey = useRef<string>("");
  useEffect(() => {
    startedAt.current = Date.now();
    attemptKey.current = crypto.randomUUID();
  }, []);

  const explRef = useRef<HTMLDivElement>(null);
  const submit = () => {
    if (fb || pending) return;
    if (!canConfirm(cs) || !choice) return setError("Escolha uma alternativa (não riscada) para confirmar a resposta.");
    start(async () => {
      const seconds = Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000));
      const key = attemptKey.current || (attemptKey.current = crypto.randomUUID());
      const r = await callAction(() => onAnswer(q.id, { seconds, attemptKey: key, ...(ce ? { answerTrue: choice === "true" } : { optionId: choice }) }), setError);
      if (!r) return;
      if (!r.ok) return setError(r.error);
      setError(null);
      setFb(r.data);
      onDone(choice, r.data);
    });
  };

  // Atalhos: A–E / 1–5 escolhem, C/E em certo-errado, Enter confirma, ←/→ navegam.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      const k = e.key.toLowerCase();
      if (e.key === "ArrowRight" && onNext) return onNext();
      if (e.key === "ArrowLeft" && onPrev) return onPrev();
      if (fb) return;
      if (k === "enter" && choice && !t.closest("button")) {
        e.preventDefault();
        return submit();
      }
      if (ce && (k === "c" || k === "e")) return setChoice(k === "c" ? "true" : "false");
      const idx = /^[1-5]$/.test(k) ? Number(k) - 1 : /^[a-e]$/.test(k) && !ce ? k.charCodeAt(0) - 97 : -1;
      const opt = options[idx];
      if (opt) setChoice(opt.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const [panel, setPanel] = useState<null | "nota" | "erro">(null);
  const correctId = fb ? (ce ? String(fb.correctAnswerTrue) : fb.options.find((o) => o.isCorrect)?.id) : null;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      {/* Linha da questão: número, progresso, favoritar e opções */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="qz-num">
          <ClipboardList className="h-4 w-4" aria-hidden /> Questão {number} de {total}
        </span>
        <div className="flex min-w-[140px] flex-1 items-center gap-3">
          <span className="qz-barra" role="img" aria-label={`${pct}% do caderno respondido`}>
            <span style={{ width: `${pct}%` }} />
          </span>
          <span className="text-[13px] font-semibold tabular-nums text-white/85">{pct}%</span>
        </div>
        <button type="button" onClick={() => onFavorite(!favorite)} aria-pressed={favorite} className="qz-fav">
          <Star className={`h-[18px] w-[18px] ${favorite ? "fill-[#E50914] text-[#E50914]" : ""}`} aria-hidden /> {favorite ? "Favorita" : "Favoritar"}
        </button>
        <QuestionMenu
          full={full}
          onToggleFull={onToggleFull}
          canRestore={!fb && cs.struck.size > 0}
          onRestore={() => setCs((x) => ({ ...x, struck: new Set() }))}
          onReport={() => setPanel("erro")}
        />
      </div>

      <article className="qz-cartao" aria-label={`Questão ${number} de ${total}`} data-respondida={fb ? "1" : "0"}>
        <p className="mb-2 text-[11.5px] text-[#8A8C93]">
          {q.code ? `${q.code} · ` : ""}
          {q.origin === "prova_anterior" ? "Questão de prova" : "Questão autoral (APROVUM)"}
          {q.examName ? ` · ${q.examName}` : ""}
        </p>
        <div ref={textRef}>
          {q.caseContext && (
            <p data-resumo className={`mb-3 whitespace-pre-line rounded-[10px] bg-[#F5F6F8] p-3 text-[14.5px] leading-relaxed text-[#3A3C42] ${clamp ? "line-clamp-3" : ""}`}>
              {q.caseContext}
            </p>
          )}
          <p data-resumo data-testid="enunciado" className={`whitespace-pre-line text-[17px] font-bold leading-snug text-[#08090B] sm:text-[19px] ${clamp ? "line-clamp-3" : ""}`}>
            {q.statement}
          </p>
        </div>
        {clamp && cut && (
          <button type="button" onClick={() => setExpanded(true)} className="mt-1 text-[13px] font-bold text-[#C8000C] underline underline-offset-2">
            Ver enunciado completo
          </button>
        )}

        <div className={`mt-5 ${ce ? "grid grid-cols-2 gap-2.5" : "flex flex-col gap-2.5"}`} role="radiogroup" aria-label="Alternativas" aria-describedby={`dica-${q.id}`} data-testid="alternativas">
          {options.map((o) => {
            const isCorrect = !!fb && correctId === o.id;
            const isWrong = !!fb && choice === o.id && !isCorrect;
            const struck = !fb && cs.struck.has(o.id);
            const selected = choice === o.id;
            const tone = fb ? (isCorrect ? "qz-alt-certa" : isWrong ? "qz-alt-errada" : "") : selected ? "qz-alt-escolhida" : "";
            return (
              <div key={o.id} className="relative">
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-disabled={!!fb || pending || struck}
                  disabled={!!fb || pending}
                  onClick={(e) => onTap(o.id, e.detail === 0, e.timeStamp)}
                  data-riscada={struck ? "1" : "0"}
                  className={`nq-alt qz-alt ${tone} ${struck ? "nq-alt-riscada" : ""}`}
                >
                  <span className="qz-letra">{o.label}</span>
                  <span className="nq-alt-texto min-w-0 flex-1 pt-1">{o.text}</span>
                  {selected && !fb && (
                    <span className="qz-sua">
                      <Check className="h-3.5 w-3.5" aria-hidden /> Sua resposta
                    </span>
                  )}
                  {fb && isCorrect && <span className="qz-sua qz-sua-certa"><Check className="h-3.5 w-3.5" aria-hidden /> Gabarito</span>}
                  {fb && isWrong && <span className="qz-sua">Sua resposta</span>}
                  <span className={`qz-radio ${selected ? "qz-radio-on" : ""}`} aria-hidden>
                    {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                </button>
                {!fb && (
                  <button
                    type="button"
                    onClick={() => strike(o.id)}
                    disabled={pending}
                    aria-pressed={struck}
                    aria-label={struck ? `Restaurar a alternativa ${o.label}` : `Riscar a alternativa ${o.label}`}
                    title={struck ? "Restaurar" : "Riscar (ou toque duas vezes na alternativa)"}
                    className="qz-riscar"
                  >
                    {struck ? <RotateCcw className="h-3.5 w-3.5" aria-hidden /> : <Strikethrough className="h-3.5 w-3.5" aria-hidden />}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-[10px] border border-[#F2C4C7] bg-[#FDECED] px-3 py-2 text-[13px] font-medium text-[#B9000B]">
            {error}
          </p>
        )}
        {fb && (
          <div ref={explRef} className="scroll-mt-24">
            <p className={`mt-4 text-[15px] font-extrabold ${fb.correct ? "text-[#137A43]" : "text-[#B9000B]"}`} role="status">
              {fb.correct ? "Resposta correta" : "Resposta incorreta"}
            </p>
            <AnswerExplanation fb={fb} options={options} certoErrado={ce} chosen={choice} questionLabel={`caderno-${number}`} />
          </div>
        )}

        {panel === "nota" && <NotePanel questionId={q.id} note={note} save={actions.saveNote} onSaved={onNoteSaved} onClose={() => setPanel(null)} />}
        {panel === "erro" && <ReportPanel questionId={q.id} report={actions.report} onClose={() => setPanel(null)} />}

        <div className="qz-rodape">
          <button type="button" onClick={() => setPanel(panel === "nota" ? null : "nota")} aria-expanded={panel === "nota"} className="qz-acao">
            <span className="qz-acao-ico"><NotebookPen className="h-[18px] w-[18px]" aria-hidden /></span>
            Anotação{note ? " •" : ""}
          </button>
          <button
            type="button"
            onClick={() => explRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            disabled={!fb}
            title={fb ? "Ver a explicação" : "A explicação aparece depois que você confirmar a resposta"}
            className="qz-acao sm:border-l sm:border-[#ECEDF0] sm:pl-5"
          >
            <Lightbulb className="h-[18px] w-[18px]" aria-hidden /> Explicação
          </button>
          <div className="ml-auto flex flex-col items-end gap-1">
            {!fb ? (
              <button type="button" onClick={submit} disabled={!canConfirm(cs) || pending} aria-busy={pending} className="qz-confirmar">
                {pending ? "Corrigindo…" : "Confirmar resposta"} <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            ) : onNext ? (
              <button type="button" onClick={onNext} className="qz-confirmar">
                Próxima questão <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            ) : (
              <span className="text-[13px] font-semibold text-[#3A3C42]">Última questão do caderno</span>
            )}
          </div>
        </div>
        {!fb && (
          <p id={`dica-${q.id}`} className="mt-2 text-right text-[11.5px] text-[#8A8C93]">
            {canConfirm(cs) ? "Toque duas vezes numa alternativa para riscá-la." : "Escolha uma alternativa para confirmar. Toque duas vezes para riscar."}
            <span className="hidden sm:inline"> Atalhos: {ce ? "C/E" : "A–E"} e Enter.</span>
          </p>
        )}
      </article>

      <div className="flex items-center justify-between gap-3">
        <button type="button" onClick={onPrev ?? undefined} disabled={!onPrev} className="qz-nav-btn">
          <ChevronLeft className="h-4 w-4" aria-hidden /> Anterior
        </button>
        <button type="button" onClick={onNext ?? undefined} disabled={!onNext} className="qz-nav-btn">
          Próxima <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function QuestionMenu({ full, onToggleFull, canRestore, onRestore, onReport }: { full: boolean; onToggleFull: (on: boolean) => void; canRestore: boolean; onRestore: () => void; onReport: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} aria-label="Mais opções da questão" className="qz-kebab">
        <EllipsisVertical className="h-5 w-5" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="cq-menu min-w-[230px]">
          <button role="menuitemcheckbox" aria-checked={full} type="button" className="cq-menu-item" onClick={pick(() => onToggleFull(!full))}>
            <Type className="h-4 w-4" aria-hidden /> {full ? "Mostrar enunciado resumido" : "Mostrar enunciado completo"}
          </button>
          <button role="menuitem" type="button" className="cq-menu-item disabled:opacity-40" disabled={!canRestore} onClick={pick(onRestore)}>
            <RotateCcw className="h-4 w-4" aria-hidden /> Restaurar alternativas riscadas
          </button>
          <button role="menuitem" type="button" className="cq-menu-item text-[#B9000B]" onClick={pick(onReport)}>
            <Flag className="h-4 w-4" aria-hidden /> Relatar erro na questão
          </button>
        </div>
      )}
    </div>
  );
}

function NotePanel({ questionId, note, save, onSaved, onClose }: { questionId: string; note: string; save: NotebookViewActions["saveNote"]; onSaved: (b: string) => void; onClose: () => void }) {
  const [text, setText] = useState(note);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-4 rounded-[12px] border border-[#ECEDF0] bg-[#FAFAFB] p-3" role="group" aria-label="Anotação">
      <label htmlFor={`nota-${questionId}`} className="text-[13px] font-bold text-[#08090B]">
        Sua anotação (só você vê)
      </label>
      <textarea
        id={`nota-${questionId}`}
        value={text}
        maxLength={2000}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="mt-1.5 w-full resize-y rounded-[10px] border border-[#DADBE0] bg-white p-2.5 text-[14px] outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/15"
        placeholder="Ex.: macete, artigo de lei, por que errei…"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          className="cq-mini cq-mini-forte"
          onClick={() =>
            start(async () => {
              const r = await callAction(() => save(questionId, text), setMsg);
              if (!r) return;
              if (!r.ok) return setMsg(r.error);
              onSaved(text.trim());
              setMsg(text.trim() ? "Anotação salva." : "Anotação apagada.");
            })
          }
        >
          {pending ? "Salvando…" : "Salvar"}
        </button>
        <button type="button" className="cq-mini" onClick={onClose}>
          Fechar
        </button>
        {msg && <span className="text-[12.5px] text-[#3A3C42]" role="status">{msg}</span>}
      </div>
    </div>
  );
}

function ReportPanel({ questionId, report, onClose }: { questionId: string; report: NotebookViewActions["report"]; onClose: () => void }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="mt-4 rounded-[12px] border border-[#F2C4C7] bg-[#FFF7F7] p-3" role="group" aria-label="Relatar erro">
      <label htmlFor={`erro-${questionId}`} className="text-[13px] font-bold text-[#08090B]">
        O que está errado nesta questão?
      </label>
      {sent ? (
        <p className="mt-1.5 text-[13px] text-[#3A3C42]" role="status">Obrigado! A equipe vai revisar a questão.</p>
      ) : (
        <textarea
          id={`erro-${questionId}`}
          value={text}
          maxLength={1000}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          className="mt-1.5 w-full resize-y rounded-[10px] border border-[#DADBE0] bg-white p-2.5 text-[14px] outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/15"
          placeholder="Ex.: gabarito diferente da banca, lei desatualizada, erro de digitação…"
        />
      )}
      <div className="mt-2 flex items-center gap-2">
        {!sent && (
          <button
            type="button"
            disabled={pending || text.trim().length < 10}
            className="cq-mini cq-mini-forte"
            onClick={() =>
              start(async () => {
                const r = await callAction(() => report(questionId, text), setMsg);
                if (!r) return;
                if (!r.ok) return setMsg(r.error);
                setSent(true);
                setMsg(null);
              })
            }
          >
            {pending ? "Enviando…" : "Enviar"}
          </button>
        )}
        <button type="button" className="cq-mini" onClick={onClose}>
          Fechar
        </button>
        {msg && <span className="text-[12.5px] text-[#B9000B]" role="alert">{msg}</span>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Coluna lateral
// ---------------------------------------------------------------------------

function TimerCard({ notebookId, pct, right, wrong, blank }: { notebookId: string; pct: number; right: number; wrong: number; blank: number }) {
  // Tempo de estudo acumulado do caderno (conveniência guardada no navegador).
  const [secs, setSecs] = useStored<number>(`na:tempo-caderno:${notebookId}`, 0);
  const [running, setRunning] = useState(true);
  const secsRef = useRef(secs);
  useEffect(() => {
    secsRef.current = secs;
  }, [secs]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      if (document.visibilityState === "visible") setSecs(secsRef.current + 1);
    }, 1000);
    return () => clearInterval(t);
  }, [running, setSecs]);
  return (
    <section className="qz-lado" aria-label="Tempo e progresso" data-testid="tempo-card">
      <div className="flex items-center gap-4">
        <span className="qz-relogio" aria-hidden>
          <Timer className="h-8 w-8" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-[Space_Grotesk] text-[30px] font-[800] tabular-nums leading-none text-white" aria-live="off" data-testid="tempo">
            {clock(secs)}
          </p>
          <p className="mt-1 text-[14px] text-white/75">Tempo de estudo</p>
        </div>
        <button type="button" onClick={() => setRunning((r) => !r)} aria-pressed={!running} aria-label={running ? "Pausar o tempo" : "Retomar o tempo"} className="qz-pausa">
          {running ? <Pause className="h-5 w-5 fill-white" aria-hidden /> : <Play className="h-5 w-5 fill-white" aria-hidden />}
        </button>
      </div>
      <div className="mt-6 flex items-end justify-between text-[14px] font-semibold text-white">
        <span>Progresso do caderno</span>
        <span className="text-[13px] tabular-nums">{pct}%</span>
      </div>
      <span className="qz-barra mt-2 block" role="img" aria-label={`${pct}% respondido`}>
        <span style={{ width: `${pct}%` }} />
      </span>
      <dl className="mt-5 grid grid-cols-3 gap-2">
        <Count icon={<CircleCheck className="h-7 w-7 fill-[#1E9E5A] text-[#0B0B0D]" aria-hidden />} label="Corretas" value={right} />
        <Count icon={<CircleX className="h-7 w-7 text-[#FF2A2A]" aria-hidden />} label="Erradas" value={wrong} />
        <Count icon={<span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-[11px] font-bold text-white/80">—</span>} label="Em branco" value={blank} />
      </dl>
    </section>
  );
}

function Count({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <span>
        <dt className="text-[12px] text-white/70">{label}</dt>
        <dd className="text-[17px] font-bold tabular-nums text-white">{value}</dd>
      </span>
    </div>
  );
}

function NavCard({ questions, states, current, onPick }: { questions: NotebookQuestion[]; states: Array<"certa" | "errada" | null>; current: number; onPick: (i: number) => void }) {
  const pages = Math.max(1, Math.ceil(questions.length / PAGE));
  const [page, setPage] = useState(Math.floor(current / PAGE));
  const [all, setAll] = useState(false);
  const start = all ? 0 : page * PAGE;
  const end = all ? questions.length : Math.min(questions.length, start + PAGE);
  return (
    <section className="qz-lado" aria-labelledby="nav-questoes">
      <h2 id="nav-questoes" className="text-[16px] font-bold text-white">
        Navegação de questões
      </h2>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/75" aria-label="Legenda">
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#1E9E5A]" aria-hidden /> Respondida</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#E50914]" aria-hidden /> Em andamento</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/30" aria-hidden /> Não respondida</li>
      </ul>
      <ol className="mt-4 grid grid-cols-8 gap-1.5 sm:grid-cols-10" aria-label="Lista de questões do caderno">
        {questions.slice(start, end).map((q, k) => {
          const idx = start + k;
          const s = states[idx];
          const cur = idx === current;
          return (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => onPick(idx)}
                aria-current={cur ? "true" : undefined}
                aria-label={`Questão ${idx + 1}${cur ? ", em andamento" : ""}${s ? (s === "certa" ? ", respondida (acertou)" : ", respondida (errou)") : ", não respondida"}`}
                className={`qz-nav-num ${cur ? "qz-nav-atual" : s ? "qz-nav-feita" : ""}`}
              >
                {idx + 1}
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 flex items-center justify-between rounded-[10px] border border-white/15 px-2 py-1.5">
        <button type="button" disabled={all || page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Página anterior" className="qz-pag">
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>
        <button type="button" onClick={() => setAll((a) => !a)} aria-pressed={all} className="inline-flex items-center gap-2 text-[12.5px] font-medium text-white" disabled={pages === 1}>
          <Grid3x3 className="h-4 w-4" aria-hidden /> {all || pages === 1 ? "Todas as questões" : "Ver todas as questões"}
        </button>
        <button type="button" disabled={all || page >= pages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Próxima página" className="qz-pag">
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </section>
  );
}
