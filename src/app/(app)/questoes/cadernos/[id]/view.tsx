"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Bookmark,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CirclePlus,
  CircleX,
  Crosshair,
  BarChart3,
  Flag,
  FolderOpen,
  Grid3x3,
  Landmark,
  Lightbulb,
  NotebookPen,
  Pause,
  Play,
  RotateCcw,
  Scale,
  Strikethrough,
  Timer,
  X,
} from "lucide-react";
import type { Notebook, NotebookQuestion } from "@/server/services/notebooks";
import type { AnswerFeedback } from "@/server/services/study";
import { AnswerExplanation } from "@/components/answer-explanation";
import { GabaritoPainel } from "@/components/gabarito-painel";
import { QuestionStatsPanel } from "@/components/question-stats";
import { spotlight, spotlightToque } from "@/components/spotlight";
import type { QuestionStats } from "@/domain/notebooks/question-stats";
import { QuestionComments } from "@/components/question-comments";
import { callAction } from "@/components/safe-action";
import { useStored } from "@/components/use-stored";
import { splitEnunciado } from "@/domain/notebooks/enunciado";
import { canConfirm, classifyTap, initialChoice, selectOption, strikeKeeping, toggleStrike, type ChoiceState } from "@/domain/notebooks/elimination";
import { answerNotebookAction, favoriteQuestionAction, fullStatementAction, notebookPositionAction, openErrorNotebookAction, questionStatsAction, reportQuestionAction, saveErrorNotebookAction, saveNoteAction, type Result } from "../../actions";
import { ErrorNotebookModal } from "@/components/notebooks/error-notebook-modal";
import type { ErrorNotebookData, ErrorNotebookEdit } from "@/domain/notebooks/error-notebook";

type AnswerInput = { optionId?: string; answerTrue?: boolean; attemptKey: string; seconds?: number };
type Answer = (input: { notebookId: string; questionId: string } & AnswerInput) => Promise<Result<AnswerFeedback>>;
type Done = Record<string, { choice: string; fb: AnswerFeedback }>;

export interface NotebookViewActions {
  answer: Answer;
  favorite: (questionId: string, on: boolean) => Promise<Result<boolean>>;
  saveFull: (id: string, on: boolean) => Promise<Result<null>>;
  saveNote: (questionId: string, body: string) => Promise<Result<null>>;
  report: (questionId: string, details: string) => Promise<Result<null>>;
  /** Estatísticas da questão (só depois de responder). */
  stats: (questionId: string) => Promise<Result<QuestionStats>>;
  /** Guarda a questão em que o aluno está (para continuar dela ao voltar). */
  position: (notebookId: string, questionId: string) => Promise<Result<null>>;
  /** Caderno de erros (janela editável). */
  errorsOpen: (notebookId: string) => Promise<Result<ErrorNotebookData>>;
  errorsSave: (notebookId: string, edits: ErrorNotebookEdit[]) => Promise<Result<{ savedAt: string }>>;
}

const serverActions: NotebookViewActions = {
  answer: answerNotebookAction,
  favorite: favoriteQuestionAction,
  saveFull: fullStatementAction,
  saveNote: saveNoteAction,
  report: reportQuestionAction,
  stats: questionStatsAction,
  position: notebookPositionAction,
  errorsOpen: openErrorNotebookAction,
  errorsSave: saveErrorNotebookAction,
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
  start = 0,
  actions: given,
}: {
  notebook: Notebook;
  questions: NotebookQuestion[];
  base: string;
  /** Questão onde o caderno continua (a última em que o aluno estava). */
  start?: number;
  /** A galeria troca as ações do servidor por versões em memória. */
  actions?: Partial<NotebookViewActions>;
}) {
  const actions = { ...serverActions, ...given };
  const [favs, setFavs] = useState(() => new Set(questions.filter((q) => q.favorite).map((q) => q.id)));
  const [notes, setNotes] = useState<Record<string, string>>(() => Object.fromEntries(questions.map((q) => [q.id, q.note])));
  const [notice, setNotice] = useState<string | null>(null);
  const [errorsOpen, setErrorsOpen] = useState(false);
  const [errorsApi] = useState(() => ({ open: actions.errorsOpen, save: actions.errorsSave }));
  const total = questions.length;
  // Continua de onde parou; as respostas já gravadas neste caderno voltam com gabarito e comentário.
  const [i, setI] = useState(() => Math.min(Math.max(0, start), Math.max(0, total - 1)));
  const [done, setDone] = useState<Done>(() => Object.fromEntries(questions.flatMap((q) => (q.saved ? [[q.id, q.saved] as const] : []))));

  // Guarda a posição (com uma pequena espera, para não gravar a cada clique rápido) e na saída da aba.
  const posTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedPos = useRef<string | null>(questions[i]?.id ?? null);
  const currentId = questions[i]?.id ?? null;
  // Posição também no navegador, na hora (sem espera): ao atualizar a página volta exatamente na questão em que estava,
  // mesmo que já respondida. O servidor continua guardando para outros aparelhos.
  const posKey = `aprovum:caderno-pos:${n.id}`;
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = window.localStorage.getItem(posKey);
      const at = saved ? questions.findIndex((q) => q.id === saved) : -1;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (at >= 0) setI(at);
    } catch {
      /* sem armazenamento: usa a posição do servidor */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!restored.current || !currentId) return;
    try {
      window.localStorage.setItem(posKey, currentId);
    } catch {
      /* ignora */
    }
  }, [currentId, posKey]);
  useEffect(() => {
    if (!currentId || currentId === savedPos.current) return;
    const send = () => {
      if (savedPos.current === currentId) return;
      savedPos.current = currentId;
      void actions.position(n.id, currentId).catch(() => undefined);
    };
    posTimer.current = setTimeout(send, 500);
    const onHide = () => document.visibilityState === "hidden" && send();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", send);
    return () => {
      if (posTimer.current) clearTimeout(posTimer.current);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", send);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId, n.id]);

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

  // Situação de cada questão NESTE caderno: a última resposta dada aqui (gravada no banco).
  const stateOf = (q: NotebookQuestion): "certa" | "errada" | null => {
    const d = done[q.id];
    return d ? (d.fb.correct ? "certa" : "errada") : null;
  };
  const states = questions.map(stateOf);
  const answered = states.filter(Boolean).length;
  const right = states.filter((s) => s === "certa").length;
  const wrong = states.filter((s) => s === "errada").length;
  const pct = total ? Math.round((answered / total) * 100) : 0;
  // Caderno de erros: toda questão já errada aqui (mesmo que tenha acertado depois).
  const [erredNow, setErredNow] = useState<Set<string>>(() => new Set());
  const erred = questions.filter((x) => x.wrongHere || erredNow.has(x.id) || (done[x.id] && !done[x.id]!.fb.correct)).length;

  if (total === 0) {
    return (
      <div className="flex flex-col gap-5" data-testid="caderno-view">
        <InfoCard n={n} />
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
  // O percentual do cabeçalho é a posição na lista (questão 1 de 35 = 3%).
  const posicao = Math.round(((i + 1) / total) * 100);
  return (
    <div className="@container qd-pagina mx-auto w-full max-w-[1560px]" data-testid="caderno-view">
      <h1 className="sr-only">{n.title}</h1>
      <div className="grid items-start gap-4 @[980px]:grid-cols-[minmax(0,1fr)_minmax(300px,340px)] @[980px]:gap-6">
        <div className="flex min-w-0 flex-col gap-3.5">
          <InfoCard n={n} q={q} />
          <ProgressoCard number={i + 1} total={total} pct={posicao} />
          {errorsOpen && <ErrorNotebookModal notebookId={n.id} title={n.title} api={errorsApi} onClose={() => setErrorsOpen(false)} />}
          {notice && (
            <p role="alert" className="rounded-[12px] border border-[#F2C4C7] bg-[#FDECED] px-3 py-2 text-[13px] font-medium text-[#B9000B]">
              {notice}
            </p>
          )}
          <QuestionPanel
            key={q.id}
            q={q}
            number={i + 1}
            total={total}
            saved={done[q.id]}
            favorite={favs.has(q.id)}
            onFavorite={(on) => void toggleFav(q.id, on)}
            note={notes[q.id] ?? ""}
            onNoteSaved={(body) => setNotes((x) => ({ ...x, [q.id]: body }))}
            actions={actions}
            onAnswer={(questionId, input) => actions.answer({ notebookId: n.id, questionId, ...input })}
            onDone={(choice, fb) => {
              setDone((d) => ({ ...d, [q.id]: { choice, fb } }));
              if (!fb.correct) setErredNow((x) => new Set(x).add(q.id));
            }}
            onRedo={() =>
              setDone((d) => {
                const x = { ...d };
                delete x[q.id];
                return x;
              })
            }
            onPrev={i > 0 ? () => setI(i - 1) : null}
            onNext={i < total - 1 ? () => setI(i + 1) : null}
            onOpenErrors={erred > 0 ? () => setErrorsOpen(true) : undefined}
            erredCount={erred}
          />
        </div>

        <aside className="qz-lateral grid min-w-0 gap-4 @[680px]:grid-cols-2 @[980px]:sticky @[980px]:top-24 @[980px]:grid-cols-1" aria-label="Painel do caderno">
          <TimerCard notebookId={n.id} pct={pct} right={right} wrong={wrong} blank={total - answered} />
          <NavCard questions={questions} states={states} current={i} onPick={setI} />
          <div className="qz-foco max-[679px]:hidden @[680px]:col-span-2 @[980px]:col-span-1" aria-hidden>
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
      <Desempenho right={right} wrong={wrong} blank={total - answered} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Topo: card escuro com os dados da questão, progresso e barra de desempenho
// ---------------------------------------------------------------------------

function InfoCard({ n, q }: { n: Notebook; q?: NotebookQuestion }) {
  const concurso = q?.examName ?? q?.board ?? null;
  const terceira = q?.cargo ? { icone: <BriefcaseBusiness aria-hidden />, rotulo: "Cargo", valor: q.cargo } : q?.topicName ? { icone: <Crosshair aria-hidden />, rotulo: "Assunto", valor: q.topicName } : null;
  const lateral: Array<{ icone: ReactNode; rotulo: string; valor: string }> = [
    q?.year ? { icone: <CalendarDays aria-hidden />, rotulo: "Ano", valor: String(q.year) } : null,
    q?.board ? { icone: <Landmark aria-hidden />, rotulo: "Banca", valor: q.board } : null,
  ].flatMap((x) => (x ? [x] : []));
  return (
    <section className="qd-info" aria-label="Dados da questão" data-testid="faixa-questao" onPointerMove={spotlight}>
      <span className="qd-info-listra" aria-hidden />
      <div className="qd-info-topo">
        <span className="qd-info-ico" aria-hidden>
          <Scale strokeWidth={2.2} />
        </span>
        <div className="min-w-0">
          <p className="qd-info-titulo" title={q?.subjectName ?? n.scope}>{q?.subjectName ?? n.scope}</p>
          {concurso && (
            <p className="qd-info-linha">
              Concurso: <b>{concurso}</b>
            </p>
          )}
        </div>
      </div>
      {terceira && (
        <p className="qd-info-cargo" title={terceira.valor}>
          {terceira.icone}
          <span className="min-w-0 truncate">
            {terceira.rotulo}: {terceira.valor}
          </span>
        </p>
      )}
      {lateral.length > 0 && (
        <dl className="qd-info-dir">
          {lateral.map((t) => (
            <div key={t.rotulo} className="qd-info-item">
              <span className="qd-info-itemico">{t.icone}</span>
              <span className="min-w-0">
                <dt>{t.rotulo}</dt>
                <dd title={t.valor}>{t.valor}</dd>
              </span>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function ProgressoCard({ number, total, pct }: { number: number; total: number; pct: number }) {
  return (
    <section className="qd-prog" aria-label="Progresso">
      <div className="min-w-0 flex-1">
        <span className="qd-prog-trilho" role="img" aria-label={`Questão ${number} de ${total}`}>
          <span style={{ width: `${pct}%` }} />
        </span>
        <p className="qd-prog-txt">Questão {number} de {total}</p>
      </div>
      <span className="qd-prog-pct">{pct}%</span>
    </section>
  );
}

/** Barra fixa do celular: acertos, erros e questões em branco do caderno. */
function Desempenho({ right, wrong, blank }: { right: number; wrong: number; blank: number }) {
  return (
    <div className="qd-desemp" role="status" aria-label="Seu desempenho" data-testid="desempenho">
      <div className="qd-desemp-aba">
        <p className="qd-desemp-titulo">
          <BarChart3 className="h-[18px] w-[18px]" aria-hidden /> Seu desempenho
        </p>
      </div>
      <p className="qd-desemp-nums">
        <span>Acertos: <b>{right}</b></span>
        <i aria-hidden />
        <span>Erros: <b>{wrong}</b></span>
        <i aria-hidden />
        <span>Em branco: <b>{blank}</b></span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Questão
// ---------------------------------------------------------------------------

function QuestionPanel({
  q,
  number,
  total,
  saved,
  favorite,
  onFavorite,
  note,
  onNoteSaved,
  actions,
  onAnswer,
  onDone,
  onRedo,
  onPrev,
  onNext,
  onOpenErrors,
  erredCount,
}: {
  q: NotebookQuestion;
  number: number;
  total: number;
  saved?: { choice: string; fb: AnswerFeedback };
  favorite: boolean;
  onFavorite: (on: boolean) => void;
  note: string;
  onNoteSaved: (body: string) => void;
  actions: NotebookViewActions;
  onAnswer: (questionId: string, input: AnswerInput) => Promise<Result<AnswerFeedback>>;
  onDone: (choice: string, fb: AnswerFeedback) => void;
  onRedo: () => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
  onOpenErrors?: () => void;
  erredCount: number;
}) {
  const ce = q.type === "certo_errado";
  const options = ce ? [{ id: "true", label: "C", text: "Certo" }, { id: "false", label: "E", text: "Errado" }] : q.options;

  // Escolha e alternativas riscadas: só na tela (nada é gravado até confirmar).
  const [cs, setCs] = useState<ChoiceState>(() => initialChoice(saved?.choice ?? null));
  const choice = cs.selected;
  const setChoice = (id: string) => setCs((x) => selectOption(x, id));
  const strike = (id: string) => setCs((x) => toggleStrike(x, id));
  // Toque simples escolhe NA HORA (sem esperar para ver se vem um segundo); toque/clique duplo risca ou restaura
  // e devolve a escolha que o aluno tinha antes do duplo.
  const lastTap = useRef<{ id: string; at: number; antes: string | null } | null>(null);
  const onTap = (id: string, keyboard: boolean, now: number) => {
    const prev = lastTap.current;
    const kind = classifyTap(prev, id, now, keyboard);
    if (kind === "strike" && prev) {
      lastTap.current = null;
      return setCs((x) => strikeKeeping(x, id, prev.antes));
    }
    lastTap.current = { id, at: now, antes: cs.selected === id ? (prev?.antes ?? null) : cs.selected };
    setChoice(id);
  };

  const [fb, setFb] = useState<AnswerFeedback | null>(saved?.fb ?? null);
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
  // Refazer: volta a questão para sem resposta; a nova resposta é gravada como outra tentativa.
  const redo = () => {
    setFb(null);
    setCs(initialChoice(null));
    setError(null);
    attemptKey.current = crypto.randomUUID();
    startedAt.current = Date.now();
    onRedo();
  };
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
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return; // folha de leitura aberta
      const k = e.key.toLowerCase();
      if (e.key === "ArrowRight" && onNext) return onNext();
      if (e.key === "ArrowLeft" && onPrev) return onPrev();
      if (fb || pending) return;
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

  const partes = splitEnunciado({ statement: q.statement, caseContext: q.caseContext, certoErrado: ce });
  const [dicaMais, setDicaMais] = useState(false);
  const [panel, setPanel] = useState<null | "nota" | "erro" | "stats">(null);
  const correctId = fb ? (ce ? String(fb.correctAnswerTrue) : fb.options.find((o) => o.isCorrect)?.id) : null;
  // O aluno pode fechar o gabarito para ver só a questão; a escolha fica lembrada nas próximas.
  const [gabAberto, setGabAberto] = useStored<boolean>("aprovum:gabarito-aberto", true);
  const gabLabel = ce ? (fb?.correctAnswerTrue ? "CERTO" : "ERRADO") : (options.find((o) => o.id === correctId)?.label ?? "—");
  const marcouLabel = choice === null ? null : ce ? (choice === "true" ? "CERTO" : "ERRADO") : (options.find((o) => o.id === choice)?.label ?? null);
  const verExplicacao = () => {
    setGabAberto(true);
    requestAnimationFrame(() => explRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  return (
    <div className="flex min-w-0 flex-col gap-3.5">
      <article className="qd-cartao" aria-label={`Questão ${number} de ${total}`} data-codigo={q.code ?? undefined} data-respondida={fb ? "1" : "0"} data-resultado={fb ? (fb.correct ? "certa" : "errada") : undefined}>
        <header className="qd-cab">
          <span className="qd-aba">
            <AlvoSeta /> Questão {number}
          </span>
          <button type="button" onClick={() => onFavorite(!favorite)} aria-pressed={favorite} className="qd-marcar">
            <Bookmark className={`h-[17px] w-[17px] ${favorite ? "fill-[#E50914] text-[#E50914]" : ""}`} aria-hidden /> {favorite ? "Questão marcada" : "Marcar questão"}
          </button>
        </header>

        <div className="qd-enun" data-testid="bloco-enunciado">
          {partes.titulo && (
            <>
              <span className="qd-traco" aria-hidden />
              <p data-testid="enunciado" className={`qd-titulo ${partes.titulo.length > 130 ? "qd-titulo-longo" : ""}`}>{partes.titulo}</p>
            </>
          )}
          {partes.base && (
            <div className="qd-base" data-testid="texto-base">
              {partes.base.split("\n").map((par, k) => (
                <p key={k}>{par}</p>
              ))}
            </div>
          )}
        </div>

        <div className="qd-pergunta" role="note" data-testid="separador-alternativas">
          <span className="qd-lampada" aria-hidden>
            <Lightbulb className="h-[15px] w-[15px]" strokeWidth={2.4} />
          </span>
          <p>{partes.pergunta}</p>
        </div>

        <div className={`qd-alts ${ce ? "qd-alts-ce" : ""}`} role="radiogroup" aria-label="Alternativas" aria-describedby={`dica-${q.id}`} aria-busy={pending} data-corrigindo={pending ? "1" : "0"} data-testid="alternativas">
          {options.map((o, oi) => {
            const isCorrect = !!fb && correctId === o.id;
            const isWrong = !!fb && choice === o.id && !isCorrect;
            const struck = !fb && cs.struck.has(o.id);
            const selected = choice === o.id;
            const tone = fb ? (isCorrect ? "qd-alt-certa" : isWrong ? "qd-alt-errada" : "") : selected ? "qd-alt-escolhida" : "";
            return (
              <div key={o.id} className="qd-opt" style={{ "--i": oi } as React.CSSProperties} onPointerMove={spotlight} onPointerDown={spotlightToque}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-disabled={!!fb || pending || struck}
                  disabled={!!fb || pending}
                  onClick={(e) => onTap(o.id, e.detail === 0, e.timeStamp)}
                  data-riscada={struck ? "1" : "0"}
                  className={`qd-alt ${tone} ${struck ? "nq-alt-riscada qd-alt-riscada" : ""}`}
                >
                  <span className="qd-letra">{o.label}</span>
                  <span className="qd-alt-corpo">
                    <span className="qd-alt-texto">{o.text}</span>
                    {struck && <span className="qd-riscada-dica">Riscada · toque 2× para restaurar</span>}
                  </span>
                  {selected && pending && (
                    <span className="qd-sua qd-sua-corrigindo">
                      <span className="qz-giro" aria-hidden />
                    </span>
                  )}
                  {fb && isCorrect && <span className="qd-sua qd-sua-certa">Gabarito</span>}
                  {fb && isWrong && <span className="qd-sua">Sua resposta</span>}
                  <span className={`qd-radio ${selected || isCorrect ? "qd-radio-on" : ""}`} aria-hidden>
                    {fb ? (isCorrect ? <Check className="h-3.5 w-3.5" strokeWidth={3.4} /> : isWrong ? <X className="h-3.5 w-3.5" strokeWidth={3.4} /> : null) : selected && <Check className="h-3.5 w-3.5" strokeWidth={3.4} />}
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
                    className="qd-riscar"
                  >
                    {struck ? <RotateCcw className="h-3.5 w-3.5" aria-hidden /> : <Strikethrough className="h-3.5 w-3.5" aria-hidden />}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-[12px] border border-[#F2C4C7] bg-[#FDECED] px-3 py-2 text-[13px] font-medium text-[#B9000B]">
            {error}
          </p>
        )}
        {pending && !fb && <GabaritoEsqueleto />}
        {fb && (
          <div ref={explRef} className="scroll-mt-24">
            <GabaritoPainel correct={fb.correct} gabarito={gabLabel} marcou={marcouLabel} aberto={gabAberto} onToggle={setGabAberto} onNext={onNext} idBase={q.id}>
              <AnswerExplanation embutido fb={fb} options={options} certoErrado={ce} chosen={choice} questionLabel={`caderno-${number}`} />
            </GabaritoPainel>
            {gabAberto && <QuestionComments questionId={q.id} />}
          </div>
        )}
      </article>

      {!fb && (
        <div id={`dica-${q.id}`} className="qd-dica" data-aberta={dicaMais ? "1" : "0"}>
          <span className="qd-dica-ico" aria-hidden>
            <LampadaRaios />
          </span>
          <div className="min-w-0 flex-1">
            <p className="qd-dica-titulo">Dica da Aprovum</p>
            <p className="qd-dica-txt">{canConfirm(cs) ? "Toque duas vezes numa alternativa para riscá-la antes de confirmar." : "Escolha uma alternativa para confirmar. Toque duas vezes numa alternativa para riscá-la."}</p>
            {dicaMais && (
              <ul className="qd-teclas" aria-label="Atalhos de teclado">
                <li><kbd>{ce ? "C" : "A"}</kbd>–<kbd>E</kbd> escolher</li>
                <li><kbd>Enter</kbd> confirmar</li>
                <li><kbd>←</kbd> <kbd>→</kbd> navegar</li>
              </ul>
            )}
          </div>
          <button type="button" className="qd-dica-mais" aria-expanded={dicaMais} onClick={() => setDicaMais((v) => !v)}>
            {dicaMais ? "Ver menos" : "Ver mais"} <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        </div>
      )}

      <div className="qd-botoes">
        <button type="button" onClick={onPrev ?? undefined} disabled={!onPrev} className="qd-nav">
          <ChevronLeft className="h-5 w-5" aria-hidden /> Anterior
        </button>
        {!fb ? (
          <button type="button" onClick={submit} disabled={!canConfirm(cs) || pending} aria-busy={pending} className="qd-confirmar">
            <Check className="h-5 w-5" strokeWidth={3} aria-hidden /> {pending ? "Corrigindo…" : "Confirmar Resposta"}
          </button>
        ) : (
          <button type="button" onClick={redo} className="qd-confirmar qd-refazer" data-testid="refazer-questao">
            <RotateCcw className="h-[18px] w-[18px]" aria-hidden /> Refazer questão
          </button>
        )}
        <button type="button" onClick={onNext ?? undefined} disabled={!onNext} aria-label="Próxima questão" className={`qd-nav ${fb && onNext ? "qd-nav-destaque" : ""}`}>
          Próxima <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>

      <div className="qd-ferr" role="group" aria-label="Ferramentas da questão">
        <button type="button" onClick={() => setPanel(panel === "nota" ? null : "nota")} aria-expanded={panel === "nota"} className="qd-ferr-btn">
          <NotebookPen className="h-4 w-4" aria-hidden /> <span>Anotação{note ? " •" : ""}</span>
        </button>
        <button
          type="button"
          onClick={verExplicacao}
          disabled={!fb}
          title={fb ? "Ver a explicação" : "A explicação aparece depois que você confirmar a resposta"}
          className="qd-ferr-btn"
        >
          <Lightbulb className="h-4 w-4" aria-hidden /> <span>Explicação</span>
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === "stats" ? null : "stats")}
          aria-expanded={panel === "stats"}
          disabled={!fb}
          title={fb ? "Ver os gráficos de acertos, erros e respostas" : "As estatísticas aparecem depois que você confirmar a resposta"}
          className="qd-ferr-btn"
          data-testid="abrir-estatisticas"
        >
          <BarChart3 className="h-4 w-4" aria-hidden /> <span>Estatísticas</span>
        </button>
        <button type="button" onClick={() => setPanel(panel === "erro" ? null : "erro")} aria-expanded={panel === "erro"} className="qd-ferr-btn qd-ferr-erro" data-testid="abrir-reportar-erro">
          <Flag className="h-4 w-4" aria-hidden /> <span>Reportar erro</span>
        </button>
        {!fb && cs.struck.size > 0 && (
          <button type="button" onClick={() => setCs((x) => ({ ...x, struck: new Set() }))} className="qd-ferr-btn">
            <RotateCcw className="h-4 w-4" aria-hidden /> <span>Restaurar riscadas</span>
          </button>
        )}
        {onOpenErrors && (
          <button type="button" onClick={onOpenErrors} className="qd-ferr-btn" data-testid="abrir-caderno-erros" aria-haspopup="dialog" title="Abre os seus erros deste caderno, organizados e editáveis">
            <NotebookPen className="h-4 w-4" aria-hidden />
            <span className="text-left leading-tight">
              <span className="block font-bold">Abrir caderno de erros</span>
              <span className="block text-[10.5px] font-medium opacity-75">
                {erredCount} {erredCount === 1 ? "questão que você errou" : "questões que você errou"}
              </span>
            </span>
          </button>
        )}
      </div>

      {panel === "nota" && <NotePanel questionId={q.id} note={note} save={actions.saveNote} onSaved={onNoteSaved} onClose={() => setPanel(null)} />}
      {panel === "stats" && fb && <QuestionStatsPanel questionId={q.id} load={actions.stats} marcou={marcouLabel} onClose={() => setPanel(null)} />}
      {panel === "erro" && <ReportPanel questionId={q.id} report={actions.report} onClose={() => setPanel(null)} />}
    </div>
  );
}

/** Alvo com seta (aba "Questão N"). */
function AlvoSeta() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-6.2-8.55" />
      <path d="M17 12a5 5 0 1 1-3.4-4.74" />
      <path d="M12.2 11.8 20 4M16.5 3.6V7.5h3.9" />
    </svg>
  );
}

/** Lâmpada com raios (card "Dica da Aprovum"). */
function LampadaRaios() {
  return (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M24 5v4M8.5 11.5l3 3M39.5 11.5l-3 3M3.5 26h4M40.5 26h4" />
      <path d="M17 30.2c-2.4-2-4-4.9-4-8.2a11 11 0 0 1 22 0c0 3.3-1.6 6.2-4 8.2-1 .9-1.6 2-1.6 3.3V35H18.6v-1.5c0-1.3-.6-2.4-1.6-3.3Z" fill="currentColor" fillOpacity=".14" />
      <path d="M19.5 40h9M21 44h6" />
      <path d="M21.5 27.5 24 22l2.5 5.5" />
    </svg>
  );
}

/** Enquanto o servidor corrige: o espaço do gabarito já aparece reservado (a página não pula quando a resposta chega). */
function GabaritoEsqueleto() {
  return (
    <div className="qz-esqueleto" role="status" aria-live="polite" aria-label="Corrigindo a resposta">
      <span className="qz-esq-linha qz-esq-titulo" />
      <span className="qz-esq-linha" />
      <span className="qz-esq-linha qz-esq-curta" />
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
    <section className="qz-lado" aria-label="Tempo e progresso" data-testid="tempo-card" onPointerMove={spotlight}>
      <div className="flex items-center gap-4">
        <span className="qz-relogio" aria-hidden style={{ "--p": pct } as React.CSSProperties}>
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
    <section className="qz-lado" aria-labelledby="nav-questoes" onPointerMove={spotlight}>
      <h2 id="nav-questoes" className="text-[16px] font-bold text-white">
        Navegação de questões
      </h2>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-white/75" aria-label="Legenda">
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#1E9E5A]" aria-hidden /> Respondida</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-[#E50914]" aria-hidden /> Em andamento</li>
        <li className="flex items-center gap-1.5"><span className="flex h-3 w-3 items-center justify-center rounded-[3px] bg-[#B3000C]" aria-hidden><X className="h-2.5 w-2.5 text-white" strokeWidth={4} /></span> Errada</li>
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
                className={`qz-nav-num ${cur ? "qz-nav-atual" : s === "errada" ? "qz-nav-errada" : s ? "qz-nav-feita" : ""}`}
              >
                {idx + 1}
                {s === "errada" && <X className="qz-nav-x" strokeWidth={4} aria-hidden />}
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
