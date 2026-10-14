"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { QuestionCard, type AnswerOutcome } from "@/components/question-card";
import { AnswerExplanation } from "@/components/answer-explanation";
import { Icon } from "@/components/icons";
import { Button, Notice, Tag } from "@/components/ui";
import { Kbd, Stopwatch } from "@/components/interactive";
import { useStudyApi } from "@/components/study-api";
import type { BankQuestion } from "@/server/queries";
import type { AnswerFeedback } from "@/server/services/study";

type SessionState = Record<string, { correct: boolean }>;

export function QuestionGrid({
  questions,
  current,
  session,
  onPick,
}: {
  questions: Array<Pick<BankQuestion, "id" | "history" | "marked">>;
  current: number;
  session: SessionState;
  onPick: (i: number) => void;
}) {
  return (
    <ol className="grid grid-cols-[repeat(auto-fill,minmax(2.5rem,1fr))] gap-1.5" aria-label="Lista de questões">
      {questions.map((q, i) => {
        const s = session[q.id];
        const last = s ?? (q.history[0] ? { correct: q.history[0].correct } : null);
        const tone = !last ? "border-linha-forte text-tinta-suave" : last.correct ? "border-dominado bg-dominado-fundo text-dominado" : "border-erro bg-erro-fundo text-erro";
        return (
          <li key={q.id}>
            <button
              type="button"
              onClick={() => onPick(i)}
              aria-current={i === current ? "true" : undefined}
              aria-label={`Questão ${i + 1}${last ? (last.correct ? ", acertada" : ", errada") : ", não respondida"}${q.marked ? ", marcada para depois" : ""}`}
              className={`relative flex size-10 items-center justify-center rounded-md border t-small font-semibold tabular-nums aria-[current=true]:ring-2 aria-[current=true]:ring-azul ${tone}`}
            >
              {i + 1}
              {q.marked && <span className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-azul" aria-hidden />}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function Practice({ questions }: { questions: BankQuestion[] }) {
  const api = useStudyApi();
  const [i, setI] = useState(0);
  const [session, setSession] = useState<SessionState>({});
  const [timer, setTimer] = useState(false);
  const [review, setReview] = useState<AnswerFeedback | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const q = questions[i]!;
  const total = questions.length;
  const go = (n: number) => {
    setI(Math.max(0, Math.min(total - 1, n)));
    setReview(null);
    setReviewError(null);
  };

  // Navegação: J/K ou setas ←/→ (fora de campos de texto).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "j") go(i + 1);
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "k") go(i - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const answeredNow = Object.keys(session).length;
  const correctNow = Object.values(session).filter((s) => s.correct).length;
  const last = q.history[0];

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-8">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center gap-3 t-small text-tinta-suave">
          <span className="font-semibold text-tinta">
            {i + 1} de {total}
          </span>
          <span>{q.trailTitle} › {q.moduleTitle}</span>
          <span className="ml-auto inline-flex items-center gap-2">
            <button type="button" onClick={() => setTimer((t) => !t)} aria-pressed={timer} className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 font-semibold hover:bg-nevoa aria-pressed:text-destaque">
              <Icon name="relogio" className="size-4" /> {timer ? <Stopwatch running /> : "Cronômetro"}
            </button>
          </span>
        </div>

        {last && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md bg-papel px-3 py-2 t-small">
            <Icon name="historico" className="size-4 text-tinta-fraca" />
            <span>
              Você já respondeu {q.history.length} vez(es). Última: <strong className={last.correct ? "text-dominado" : "text-erro"}>{last.correct ? "acertou" : "errou"}</strong> em{" "}
              {new Date(last.at).toLocaleDateString("pt-BR")}.
            </span>
            <button
              type="button"
              disabled={pending}
              className="ml-auto font-semibold text-destaque"
              onClick={() =>
                start(async () => {
                  const r = await api.reviewAnsweredQuestion(q.id);
                  if (r.ok) setReview(r.data);
                  else setReviewError(r.error);
                })
              }
            >
              Rever explicação
            </button>
          </div>
        )}
        {reviewError && <div className="mb-3"><Notice tone="erro">{reviewError}</Notice></div>}
        {review && (
          <div className="mb-3">
            <AnswerExplanation
              fb={review}
              certoErrado={q.type === "certo_errado"}
              options={q.options}
              chosen={null}
              questionLabel={`rev-${q.id}`}
            />
          </div>
        )}

        <QuestionCard
          key={q.id}
          q={q}
          number={i + 1}
          context="fixacao"
          active
          initialMarked={q.marked}
          onAnswered={(o: AnswerOutcome) => setSession((s) => ({ ...s, [o.questionId]: { correct: o.correct } }))}
        />

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="secundario" onClick={() => go(i - 1)} disabled={i === 0}>
            <Icon name="setaEsquerda" className="size-4" /> Anterior
          </Button>
          <span className="hidden t-tiny text-tinta-fraca sm:inline">
            <Kbd>K</Kbd> <Kbd>J</Kbd> navegam entre questões
          </span>
          <Button variant="secundario" onClick={() => go(i + 1)} disabled={i === total - 1}>
            Próxima <Icon name="setaDireita" className="size-4" />
          </Button>
        </div>
        <p className="mt-3 t-small">
          <Link href={`/aula/${q.lessonId}`} className="font-semibold text-destaque underline-offset-2 hover:underline">Estudar a aula desta questão: {q.lessonTitle}</Link>
        </p>
      </div>

      <aside className="mt-8 lg:mt-0">
        <div className="lg:sticky lg:top-6">
          <p className="mb-2 t-small font-semibold">Nesta sessão: {answeredNow} respondida(s), {correctNow} certa(s)</p>
          <QuestionGrid questions={questions} current={i} session={session} onPick={go} />
          <div className="mt-3 flex flex-wrap gap-2 t-tiny text-tinta-suave">
            <Tag tone="verde">Acertou</Tag>
            <Tag tone="vermelho">Errou</Tag>
            <Tag>Não respondida</Tag>
            <span className="inline-flex items-center gap-1"><span className="size-2 rounded-full bg-azul" /> Para depois</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
