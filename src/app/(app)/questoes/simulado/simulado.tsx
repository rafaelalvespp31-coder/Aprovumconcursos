"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuestionCard, type AnswerOutcome } from "@/components/question-card";
import { Icon } from "@/components/icons";
import { Button, Notice, Tag } from "@/components/ui";
import { Stopwatch } from "@/components/interactive";
import type { BankQuestion } from "@/server/queries";
import { QuestionGrid } from "../practice";

type Phase = "setup" | "running" | "done";

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

const CONF = ["", "Chutei", "Em dúvida", "Tenho certeza"];

export function Simulado({ pool }: { pool: BankQuestion[] }) {
  const sizes = [5, 10, 20, 40].filter((n) => n < pool.length);
  const [size, setSize] = useState(Math.min(10, pool.length));
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [i, setI] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, AnswerOutcome>>({});
  const [confirmEnd, setConfirmEnd] = useState(false);
  const seconds = useRef(0);
  const [elapsed, setElapsed] = useState(0);

  const begin = () => {
    setQuestions(shuffle(pool).slice(0, size));
    setOutcomes({});
    setI(0);
    seconds.current = 0;
    setPhase("running");
  };
  const finish = () => {
    setElapsed(seconds.current);
    setPhase("done");
    window.scrollTo({ top: 0 });
  };

  const answered = Object.keys(outcomes).length;

  if (phase === "setup") {
    return (
      <section className="max-w-xl rounded-lg border border-linha bg-superficie p-5">
        <h2 className="t-h2">Quantas questões?</h2>
        <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Quantidade de questões">
          {[...sizes, pool.length].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={size === n}
              onClick={() => setSize(n)}
              className="min-h-11 rounded-md border border-linha-forte px-4 font-semibold aria-checked:border-azul aria-checked:bg-nevoa aria-checked:text-azul-escuro"
            >
              {n === pool.length ? `Todas (${n})` : n}
            </button>
          ))}
        </div>
        <ul className="mt-4 flex flex-col gap-1 t-small text-tinta-suave">
          <li>O cronômetro começa ao iniciar.</li>
          <li>Você pode navegar e mudar de questão antes de confirmar cada resposta.</li>
          <li>As respostas entram no seu histórico como simulado.</li>
        </ul>
        <Button className="mt-5" onClick={begin}>
          <Icon name="play" className="size-4" /> Iniciar simulado
        </Button>
      </section>
    );
  }

  if (phase === "running") {
    const q = questions[i]!;
    const done = outcomes[q.id];
    return (
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-8">
        <div className="min-w-0">
          <div className="sticky top-0 z-10 -mx-4 mb-3 flex items-center gap-3 border-b border-linha bg-papel/95 px-4 py-2 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
            <span className="font-semibold">Questão {i + 1} de {questions.length}</span>
            <span className="inline-flex items-center gap-1.5 t-small text-tinta-suave">
              <Icon name="relogio" className="size-4" />
              <Stopwatch
                running
                onTick={(s) => {
                  seconds.current = s;
                }}
              />
            </span>
            <span className="ml-auto t-small text-tinta-suave">{answered}/{questions.length} respondidas</span>
          </div>

          {done ? (
            <div className="rounded-lg border border-linha bg-superficie p-5">
              <p className="t-small text-tinta-suave">Questão {i + 1}</p>
              <p className="mt-2 font-serif leading-relaxed">{q.statement}</p>
              <p className="mt-3 inline-flex items-center gap-1.5 t-small font-semibold text-tinta-suave" role="status">
                <Icon name="check" className="size-4" /> Resposta registrada. O gabarito aparece ao final.
              </p>
            </div>
          ) : (
            <QuestionCard
              key={q.id}
              q={q}
              number={i + 1}
              context="simulado"
              examMode
              active
              initialMarked={q.marked}
              onAnswered={(o) => {
                setOutcomes((s) => ({ ...s, [o.questionId]: o }));
                if (i < questions.length - 1) setTimeout(() => setI(i + 1), 600);
              }}
            />
          )}

          <div className="mt-4 flex items-center justify-between gap-3">
            <Button variant="secundario" onClick={() => setI(Math.max(0, i - 1))} disabled={i === 0}>
              <Icon name="setaEsquerda" className="size-4" /> Anterior
            </Button>
            <Button variant="secundario" onClick={() => setI(Math.min(questions.length - 1, i + 1))} disabled={i === questions.length - 1}>
              Próxima <Icon name="setaDireita" className="size-4" />
            </Button>
          </div>

          <div className="mt-6 rounded-lg border border-linha bg-superficie p-4">
            {confirmEnd && answered < questions.length ? (
              <div className="flex flex-col gap-3">
                <Notice tone="alerta">Faltam {questions.length - answered} questão(ões) sem resposta. Elas contam como não respondidas no resultado.</Notice>
                <div className="flex gap-2">
                  <Button onClick={finish}>Finalizar mesmo assim</Button>
                  <Button variant="secundario" onClick={() => setConfirmEnd(false)}>Continuar respondendo</Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => (answered < questions.length ? setConfirmEnd(true) : finish())}>
                <Icon name="bandeira" className="size-4" /> Finalizar simulado
              </Button>
            )}
          </div>
        </div>
        <aside className="mt-8 lg:mt-0">
          <div className="lg:sticky lg:top-6">
            <p className="mb-2 t-small font-semibold">Navegação</p>
            <QuestionGrid
              questions={questions.map((x) => ({ id: x.id, marked: x.marked, history: [] }))}
              current={i}
              session={Object.fromEntries(Object.keys(outcomes).map((k) => [k, { correct: true }]))}
              onPick={setI}
            />
            <p className="mt-2 t-tiny text-tinta-fraca">Questões em verde já têm resposta registrada (o acerto só aparece no final).</p>
          </div>
        </aside>
      </div>
    );
  }

  return <SimuladoResult questions={questions} outcomes={outcomes} seconds={elapsed} onRestart={() => setPhase("setup")} />;
}

function SimuladoResult({
  questions,
  outcomes,
  seconds,
  onRestart,
}: {
  questions: BankQuestion[];
  outcomes: Record<string, AnswerOutcome>;
  seconds: number;
  onRestart: () => void;
}) {
  const correct = questions.filter((q) => outcomes[q.id]?.correct).length;
  const wrong = questions.filter((q) => outcomes[q.id] && !outcomes[q.id]!.correct);
  const blank = questions.filter((q) => !outcomes[q.id]).length;
  const pct = Math.round((correct / questions.length) * 100);

  const byTopic = useMemo(() => {
    const m = new Map<string, { topic: string; lessonId: string; total: number; wrong: number }>();
    for (const q of questions) {
      const k = q.topic ?? q.lessonTitle;
      const e = m.get(k) ?? { topic: k, lessonId: q.lessonId, total: 0, wrong: 0 };
      e.total++;
      if (!outcomes[q.id]?.correct) e.wrong++;
      m.set(k, e);
    }
    return [...m.values()].filter((e) => e.wrong > 0).sort((a, b) => b.wrong - a.wrong);
  }, [questions, outcomes]);

  const overconfident = wrong.filter((q) => outcomes[q.id]!.confidence === 3).length;
  const mm = Math.floor(seconds / 60);
  // Leva o foco ao resultado (teclado e leitor de tela chegam direto ao que mudou).
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-linha bg-superficie p-5">
        <h2 ref={heading} tabIndex={-1} className="t-small font-normal text-tinta-suave outline-none">Resultado</h2>
        <p className="mt-1 t-display tabular-nums">{pct}%</p>
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 t-small">
          <div><dt className="inline text-tinta-suave">Acertos: </dt><dd className="inline font-semibold text-dominado">{correct}</dd></div>
          <div><dt className="inline text-tinta-suave">Erros: </dt><dd className="inline font-semibold text-erro">{wrong.length}</dd></div>
          <div><dt className="inline text-tinta-suave">Em branco: </dt><dd className="inline font-semibold">{blank}</dd></div>
          <div><dt className="inline text-tinta-suave">Tempo: </dt><dd className="inline font-semibold tabular-nums">{mm} min {seconds % 60} s</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={onRestart}>Novo simulado</Button>
          <Link href="/questoes?situacao=erradas" className="inline-flex min-h-11 items-center rounded-md border border-linha-forte px-4 font-semibold hover:border-azul hover:text-azul">
            Refazer as que errei
          </Link>
        </div>
      </section>

      {(byTopic.length > 0 || overconfident > 0) && (
        <section>
          <h2 className="t-h2">Análise dos erros</h2>
          {overconfident > 0 && (
            <div className="mt-3"><Notice tone="alerta">Em {overconfident} questão(ões) você marcou certeza e errou. Esses são os pontos mais urgentes para revisar.</Notice></div>
          )}
          <ul className="mt-3 divide-y divide-linha rounded-lg border border-linha bg-superficie">
            {byTopic.map((t) => (
              <li key={t.topic} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{t.topic}</p>
                  <p className="t-small text-tinta-suave">{t.wrong} de {t.total} sem acerto</p>
                </div>
                <Link href={`/aula/${t.lessonId}`} className="t-small font-semibold text-azul">Rever a aula</Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="t-h2">Gabarito comentado</h2>
        <ol className="mt-3 flex flex-col gap-4">
          {questions.map((q, n) => {
            const o = outcomes[q.id];
            const fb = o?.feedback;
            return (
              <li key={q.id} className="rounded-lg border border-linha bg-superficie p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2 t-tiny">
                  <span className="font-semibold">Questão {n + 1}</span>
                  {!o ? <Tag>Em branco</Tag> : o.correct ? <Tag tone="verde">Acertou</Tag> : <Tag tone="vermelho">Errou</Tag>}
                  {o?.confidence && <Tag>Confiança: {CONF[o.confidence]}</Tag>}
                  {q.topic && <span className="text-tinta-fraca">{q.topic}</span>}
                </div>
                <p className="mt-2 font-serif leading-relaxed">{q.statement}</p>
                {fb ? (
                  <>
                    <ul className="mt-3 flex flex-col gap-1.5 t-small">
                      {(q.type === "certo_errado"
                        ? [{ id: "c", label: "Gabarito", isCorrect: true, explanation: fb.correctAnswerTrue ? "Certo" : "Errado" }]
                        : fb.options
                      ).map((op) => (
                        <li key={op.id} className={op.isCorrect ? "font-semibold text-dominado" : "text-tinta-suave"}>
                          {op.label}) {q.options.find((x) => x.id === op.id)?.text ?? ""} {op.explanation && <span className="block font-normal">{op.explanation}</span>}
                        </li>
                      ))}
                    </ul>
                    <p className="mt-3 whitespace-pre-line t-small">{fb.justification}</p>
                  </>
                ) : (
                  <p className="mt-2 t-small text-tinta-suave">
                    Sem resposta. <Link href="/questoes?situacao=nao_respondidas" className="font-semibold text-azul">Responder no modo prática</Link>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
