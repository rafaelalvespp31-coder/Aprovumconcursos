"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Notice, Tag } from "@/components/ui";
import { completeReadingAction, evaluateQuizAction, startLessonAction, submitAnswerAction, type QuizResult } from "./actions";
import type { AnswerFeedback } from "@/server/services/study";

export function StartOnView({ lessonId }: { lessonId: string }) {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void startLessonAction(lessonId);
  }, [lessonId]);
  return null;
}

export function CompleteReading({ lessonId, done }: { lessonId: string; done: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  if (done) return <Notice tone="sucesso" title="Leitura concluída">Agora resolva as questões para demonstrar o aprendizado.</Notice>;
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="secundario"
        disabled={pending}
        onClick={() => start(async () => setMsg((await completeReadingAction(lessonId)).explanation))}
        className="self-start"
      >
        {pending ? "Registrando…" : "Concluí a leitura"}
      </Button>
      {msg && <p className="t-small text-tinta-suave">{msg}</p>}
    </div>
  );
}

export interface QuizQuestion {
  id: string;
  type: "multipla_escolha" | "certo_errado" | "situacional" | "discursiva";
  statement: string;
  difficulty: number;
  essential: boolean;
  board_style: string | null;
  depends_on_external_source: boolean;
  options: Array<{ id: string; label: string; text: string }>;
}

const LEVEL = ["", "Compreensão", "Aplicação", "Interpretação", "Avançada", "Integradora"];

function Question({ q, n, context, onAnswered }: { q: QuizQuestion; n: number; context: "fixacao" | "revisao"; onAnswered: (correct: boolean) => void }) {
  const [choice, setChoice] = useState<string | null>(null);
  const [fb, setFb] = useState<AnswerFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ce = q.type === "certo_errado";
  const options = ce
    ? [{ id: "true", label: "C", text: "Certo" }, { id: "false", label: "E", text: "Errado" }]
    : q.options;

  const submit = () =>
    start(async () => {
      if (!choice) return;
      const r = await submitAnswerAction({
        questionId: q.id,
        context,
        ...(ce ? { answerTrue: choice === "true" } : { optionId: choice }),
      });
      if (!r.ok) return setError(r.error);
      setError(null);
      setFb(r.feedback);
      onAnswered(r.feedback.correct);
    });

  const correctId = fb ? (ce ? String(fb.correctAnswerTrue) : fb.options.find((o) => o.isCorrect)?.id) : null;

  return (
    <li className="rounded-lg border border-linha bg-superficie p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2 t-tiny text-tinta-fraca">
        <span className="font-semibold text-tinta">Questão {n}</span>
        <Tag>{LEVEL[q.difficulty] ?? `Nível ${q.difficulty}`}</Tag>
        {q.essential && <Tag tone="azul">Conceito essencial</Tag>}
        <span>Original para treino{q.board_style ? `, estilo ${q.board_style}` : ""}</span>
      </div>
      <p className="mt-3 whitespace-pre-line font-serif text-[1.05rem] leading-relaxed">{q.statement}</p>
      <fieldset className="mt-4" disabled={!!fb || pending}>
        <legend className="sr-only">Alternativas</legend>
        <div className="flex flex-col gap-2">
          {options.map((o) => {
            const isCorrect = fb && correctId === o.id;
            const isWrongPick = fb && choice === o.id && !isCorrect;
            const expl = fb && !ce ? fb.options.find((x) => x.id === o.id)?.explanation : null;
            return (
              <label
                key={o.id}
                className={`flex cursor-pointer gap-3 rounded-md border px-3 py-2.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-azul ${
                  isCorrect ? "border-dominado bg-dominado-fundo" : isWrongPick ? "border-erro bg-erro-fundo" : "border-linha-forte has-[:checked]:border-azul has-[:checked]:bg-nevoa"
                }`}
              >
                <input type="radio" name={`q-${q.id}`} value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="mt-1 size-4 accent-azul" />
                <span className="flex-1">
                  <span className="mr-2 font-bold">{o.label}</span>
                  {o.text}
                  {expl && <span className="mt-1 block t-small text-tinta-suave">{expl}</span>}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {error && <div className="mt-3"><Notice tone="erro">{error}</Notice></div>}
      {!fb ? (
        <Button onClick={submit} disabled={!choice || pending} className="mt-4">{pending ? "Corrigindo…" : "Responder"}</Button>
      ) : (
        <div className="mt-4">
          <Notice tone={fb.correct ? "sucesso" : "erro"} title={fb.correct ? "Resposta correta" : "Resposta incorreta"}>
            <p className="whitespace-pre-line">{fb.justification}</p>
            {q.depends_on_external_source && <p className="mt-2 t-tiny">Esta questão depende de fonte normativa; confira a redação vigente.</p>}
          </Notice>
        </div>
      )}
    </li>
  );
}

export function Quiz({ lessonId, questions, context, nextLessonId }: { lessonId: string; questions: QuizQuestion[]; context: "fixacao" | "revisao"; nextLessonId: string | null }) {
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [pending, start] = useTransition();
  const count = Object.keys(answered).length;
  const all = count === questions.length && questions.length > 0;

  return (
    <div>
      <ol className="flex flex-col gap-4">
        {questions.map((q, i) => (
          <Question key={q.id} q={q} n={i + 1} context={context} onAnswered={(c) => setAnswered((a) => ({ ...a, [q.id]: c }))} />
        ))}
      </ol>
      <div className="mt-6 flex flex-col gap-3">
        <p className="t-small text-tinta-suave">{count} de {questions.length} respondida(s).</p>
        {!result && (
          <Button onClick={() => start(async () => setResult(await evaluateQuizAction(lessonId, context)))} disabled={!all || pending} className="self-start">
            {pending ? "Calculando…" : "Ver resultado da unidade"}
          </Button>
        )}
        {result && !result.ok && <Notice tone="erro">{result.error}</Notice>}
        {result?.ok && (
          <Notice tone={result.unlocksNext ? "sucesso" : "alerta"} title={`${Math.round((result.accuracy ?? 0) * 100)}% de acerto`}>
            <p>{result.explanation}</p>
            {!!result.recommendations?.length && (
              <ul className="mt-2 list-disc pl-5">{result.recommendations.map((r) => <li key={r}>{r}</li>)}</ul>
            )}
            {result.nextReviewAt && (
              <p className="mt-2 t-tiny">Próxima revisão sugerida: {new Date(result.nextReviewAt).toLocaleDateString("pt-BR")}.</p>
            )}
          </Notice>
        )}
        {result?.ok && result.unlocksNext && nextLessonId && (
          <Link href={`/aula/${nextLessonId}`} className="self-start font-semibold text-azul underline underline-offset-2">Ir para a próxima aula</Link>
        )}
      </div>
    </div>
  );
}
