"use client";

import Link from "next/link";
import { createElement, useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CirclePlus, FolderOpen } from "lucide-react";
import type { Notebook, NotebookQuestion } from "@/server/services/notebooks";
import type { AnswerFeedback } from "@/server/services/study";
import { AnswerExplanation } from "@/components/answer-explanation";
import { callAction } from "@/components/safe-action";
import { subjectIcon } from "@/app/(app)/painel/widgets";
import { brDate } from "@/domain/notebooks/model";
import { answerNotebookAction, type Result } from "../../actions";

type Answer = (input: { notebookId: string; questionId: string; optionId?: string; answerTrue?: boolean; seconds?: number }) => Promise<Result<AnswerFeedback>>;
type Done = Record<string, { choice: string; fb: AnswerFeedback }>;

const TYPE_LABEL = { multipla_escolha: "Múltipla escolha", certo_errado: "Certo ou errado" } as const;
const ORIGIN_LABEL: Record<string, string> = { prova_anterior: "Questão de prova", autoral_humana: "Questão autoral (APROVUM)", ia_assistida: "Questão autoral (APROVUM)" };

export function NotebookView({ notebook: n, questions, base, answer = answerNotebookAction }: { notebook: Notebook; questions: NotebookQuestion[]; base: string; answer?: Answer }) {
  const icon = createElement(subjectIcon(n.subjectName ?? n.examName ?? ""), { className: "h-[22px] w-[22px]" });
  const [i, setI] = useState(0);
  const [done, setDone] = useState<Done>({});
  const total = questions.length;
  const answeredNow = Object.keys(done).length;
  const correctNow = Object.values(done).filter((d) => d.fb.correct).length;
  const answered = n.answered + answeredNow;
  const correct = n.correct + correctNow;
  const chips = [
    n.subjectName ?? "Todas as matérias",
    n.examName,
    n.boardName ? `Banca ${n.boardName}` : null,
    n.questionType ? TYPE_LABEL[n.questionType] : null,
  ].filter(Boolean) as string[];

  return (
    <div className="flex flex-col gap-5" data-testid="caderno-view">
      <header className="pc p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <span className="cq-item-ico" aria-hidden>
            {icon}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-[19px] text-[#08090B] sm:text-[22px]">
              <strong className="font-extrabold">{n.title}</strong> <span className="font-normal text-[#3A3C42]">({brDate(n.createdAt)})</span>
            </h1>
            <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Filtros do caderno">
              {chips.map((c) => (
                <li key={c} className="rounded-full border border-[#E6E7EB] bg-[#F7F8FA] px-2.5 py-0.5 text-[11.5px] font-semibold text-[#3A3C42]">
                  {c}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <dl className="mt-5 grid grid-cols-3 gap-2 sm:max-w-[520px]">
          <Stat label="Questões" value={String(total)} />
          <Stat label="Respondidas" value={String(answered)} />
          <Stat label="Acertos" value={answered ? `${Math.round((correct / answered) * 100)}%` : "—"} />
        </dl>
      </header>

      {total === 0 ? (
        <section className="pc px-5 py-10 text-center">
          <FolderOpen className="mx-auto h-9 w-9 text-[#E50914]" aria-hidden />
          <h2 className="mt-3 text-[16px] font-extrabold text-[#08090B]">Ainda não há questões publicadas para este caderno</h2>
          <p className="mx-auto mt-1 max-w-[48ch] text-[13.5px] text-[#64666D]">
            As questões de concurso entram no banco depois de revisadas. Assim que houver questões com estes filtros, elas aparecem aqui automaticamente.
          </p>
          <Link href={`${base}/questoes/cadernos/novo`} className="cq-criar mx-auto mt-6 max-w-[360px]">
            <CirclePlus className="h-5 w-5" aria-hidden /> Criar outro caderno
          </Link>
        </section>
      ) : (
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_248px] lg:gap-6">
          <QuestionPanel
            key={questions[i]!.id}
            q={questions[i]!}
            number={i + 1}
            total={total}
            saved={done[questions[i]!.id]}
            onAnswer={(questionId, input) => answer({ notebookId: n.id, questionId, ...input })}
            onDone={(choice, fb) => setDone((d) => ({ ...d, [questions[i]!.id]: { choice, fb } }))}
            onPrev={i > 0 ? () => setI(i - 1) : null}
            onNext={i < total - 1 ? () => setI(i + 1) : null}
          />
          <aside className="mt-5 lg:mt-0">
            <div className="pc p-4 lg:sticky lg:top-4">
              <p className="text-[13px] font-bold text-[#08090B]">
                Nesta sessão: {answeredNow} {answeredNow === 1 ? "respondida" : "respondidas"}, {correctNow} {correctNow === 1 ? "certa" : "certas"}
              </p>
              <ol className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5" aria-label="Lista de questões do caderno">
                {questions.map((q, k) => {
                  const s = done[q.id] ? { correct: done[q.id]!.fb.correct } : q.last;
                  const tone = !s ? "border-[#DADBE0] text-[#3A3C42]" : s.correct ? "border-[#1E9E5A] bg-[#E9F7EF] text-[#137A43]" : "border-[#E50914] bg-[#FDECED] text-[#B9000B]";
                  return (
                    <li key={q.id}>
                      <button
                        type="button"
                        onClick={() => setI(k)}
                        aria-current={k === i ? "true" : undefined}
                        aria-label={`Questão ${k + 1}${s ? (s.correct ? ", acertada" : ", errada") : ", não respondida"}`}
                        className={`flex size-10 items-center justify-center rounded-[10px] border text-[13px] font-bold tabular-nums aria-[current=true]:ring-2 aria-[current=true]:ring-[#08090B] ${tone}`}
                      >
                        {k + 1}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[12px] border border-[#EEEFF2] bg-[#FBFBFC] px-3 py-2.5 text-center">
      <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[#64666D]">{label}</dt>
      <dd className="mt-0.5 text-[18px] font-extrabold tabular-nums text-[#08090B]">{value}</dd>
    </div>
  );
}

function QuestionPanel({
  q,
  number,
  total,
  saved,
  onAnswer,
  onDone,
  onPrev,
  onNext,
}: {
  q: NotebookQuestion;
  number: number;
  total: number;
  saved?: { choice: string; fb: AnswerFeedback };
  onAnswer: (questionId: string, input: { optionId?: string; answerTrue?: boolean; seconds?: number }) => Promise<Result<AnswerFeedback>>;
  onDone: (choice: string, fb: AnswerFeedback) => void;
  onPrev: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const ce = q.type === "certo_errado";
  const options = ce ? [{ id: "true", label: "C", text: "Certo" }, { id: "false", label: "E", text: "Errado" }] : q.options;
  const [choice, setChoice] = useState<string | null>(saved?.choice ?? null);
  const [fb, setFb] = useState<AnswerFeedback | null>(saved?.fb ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const startedAt = useRef(0);
  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const submit = () => {
    if (!choice || fb) return;
    start(async () => {
      const seconds = Math.min(3600, Math.round((Date.now() - startedAt.current) / 1000));
      const r = await callAction(() => onAnswer(q.id, { seconds, ...(ce ? { answerTrue: choice === "true" } : { optionId: choice }) }), setError);
      if (!r) return;
      if (!r.ok) return setError(r.error);
      setError(null);
      setFb(r.data);
      onDone(choice, r.data);
    });
  };

  // Atalhos: A–E / 1–5 escolhem, C/E em certo-errado, Enter responde, ←/→ navegam.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input[type=text], textarea, select, [contenteditable=true]")) return;
      const k = e.key.toLowerCase();
      if (e.key === "ArrowRight" && onNext) return onNext();
      if (e.key === "ArrowLeft" && onPrev) return onPrev();
      if (fb) return;
      if (k === "enter" && choice) {
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

  const correctId = fb ? (ce ? String(fb.correctAnswerTrue) : fb.options.find((o) => o.isCorrect)?.id) : null;
  const source = [q.board, q.year, q.examName].filter(Boolean).join(" · ");

  return (
    <div className="min-w-0">
      <article className={`pc p-4 sm:p-6 ${fb ? (fb.correct ? "ring-1 ring-[#1E9E5A]/50" : "ring-1 ring-[#E50914]/40") : ""}`} aria-label={`Questão ${number} de ${total}`} data-respondida={fb ? "1" : "0"}>
        <header className="flex flex-wrap items-center gap-2 text-[12px] text-[#64666D]">
          <span className="text-[13px] font-extrabold text-[#08090B]">
            Questão {number} de {total}
          </span>
          {q.code && <span className="rounded-md bg-[#F2F3F5] px-1.5 py-0.5 font-mono text-[11px]">{q.code}</span>}
          <span className="rounded-md border border-[#E6E7EB] px-1.5 py-0.5 font-semibold">{TYPE_LABEL[q.type]}</span>
          {q.subjectName && <span className="truncate">{q.subjectName}</span>}
        </header>
        <p className="mt-1 text-[11.5px] text-[#8A8C93]">
          {ORIGIN_LABEL[q.origin] ?? "Questão do banco APROVUM"}
          {source ? ` — ${source}` : ""}
        </p>
        {q.caseContext && <p className="mt-4 whitespace-pre-line rounded-[10px] bg-[#F7F8FA] p-3 text-[14px] leading-relaxed text-[#3A3C42]">{q.caseContext}</p>}
        <p className="mt-4 whitespace-pre-line font-serif text-[1.06rem] leading-relaxed text-[#08090B]">{q.statement}</p>

        <fieldset className="mt-4" disabled={!!fb || pending}>
          <legend className="sr-only">Alternativas</legend>
          <div className={ce ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
            {options.map((o) => {
              const isCorrect = !!fb && correctId === o.id;
              const isWrong = !!fb && choice === o.id && !isCorrect;
              return (
                <label
                  key={o.id}
                  className={`flex min-h-12 cursor-pointer gap-3 rounded-[12px] border px-3 py-2.5 text-[14.5px] transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#E50914] ${
                    isCorrect
                      ? "border-[#1E9E5A] bg-[#E9F7EF] font-semibold text-[#137A43]"
                      : isWrong
                        ? "border-[#E50914] bg-[#FDECED]"
                        : "border-[#DADBE0] hover:border-[#E50914]/60 has-[:checked]:border-[#08090B] has-[:checked]:bg-[#F7F8FA]"
                  }`}
                >
                  <input type="radio" name={`q-${q.id}`} value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="sr-only" />
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full border text-[12.5px] font-bold ${choice === o.id ? "border-[#08090B] bg-[#08090B] text-white" : "border-[#C9CACF]"}`}>
                    {o.label}
                  </span>
                  <span className="pt-0.5">{o.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-3 rounded-[10px] border border-[#F2C4C7] bg-[#FDECED] px-3 py-2 text-[13px] font-medium text-[#B9000B]">
            {error}
          </p>
        )}

        {!fb ? (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button type="button" onClick={submit} disabled={!choice || pending} className="pc-botao disabled:cursor-not-allowed disabled:opacity-50">
              {pending ? "Corrigindo…" : "Responder"}
            </button>
            <span className="hidden text-[12px] text-[#8A8C93] sm:inline">Atalhos: {ce ? "C/E" : "A–E"} para escolher, Enter para responder</span>
          </div>
        ) : (
          <p className={`mt-4 text-[14px] font-extrabold ${fb.correct ? "text-[#137A43]" : "text-[#B9000B]"}`} role="status">
            {fb.correct ? "Resposta correta" : "Resposta incorreta"}
          </p>
        )}
        {fb && <AnswerExplanation fb={fb} options={options} certoErrado={ce} chosen={choice} questionLabel={`caderno-${number}`} />}
      </article>

      <div className="mt-4 flex items-center justify-between gap-3">
        <button type="button" onClick={onPrev ?? undefined} disabled={!onPrev} className="cq-mini h-11 gap-2 px-4 disabled:opacity-40">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Anterior
        </button>
        <button type="button" onClick={onNext ?? undefined} disabled={!onNext} className="cq-mini h-11 gap-2 px-4 disabled:opacity-40">
          Próxima <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
