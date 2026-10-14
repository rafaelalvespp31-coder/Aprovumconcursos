"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useStudyApi } from "./study-api";
import type { AnswerFeedback } from "@/server/services/study";
import { AnswerExplanation } from "./answer-explanation";
import { QuestionComments } from "./question-comments";
import { Icon } from "./icons";
import { Button, Notice, Tag } from "./ui";

export interface QuestionData {
  id: string;
  type: "multipla_escolha" | "certo_errado" | "situacional" | "discursiva";
  statement: string;
  difficulty: number;
  essential: boolean;
  board_style: string | null;
  depends_on_external_source: boolean;
  options: Array<{ id: string; label: string; text: string }>;
  topic?: string | null;
}

export interface AnswerOutcome {
  questionId: string;
  correct: boolean;
  confidence: number | null;
  feedback: AnswerFeedback;
}

const LEVEL = ["", "Compreensão", "Aplicação", "Interpretação", "Avançada", "Integradora"];
const CONFIDENCE = [
  { v: 1, label: "Chutei" },
  { v: 2, label: "Em dúvida" },
  { v: 3, label: "Tenho certeza" },
];

export function QuestionCard({
  q,
  number,
  context,
  examMode = false,
  reveal = false,
  initialMarked = false,
  active = false,
  compact = false,
  onAnswered,
}: {
  q: QuestionData;
  number: number;
  context: "fixacao" | "revisao" | "simulado";
  /** Simulado: registra a resposta sem mostrar gabarito até `reveal`. */
  examMode?: boolean;
  reveal?: boolean;
  initialMarked?: boolean;
  /** Recebe atalhos de teclado quando ativa. */
  active?: boolean;
  compact?: boolean;
  onAnswered?: (o: AnswerOutcome) => void;
}) {
  const api = useStudyApi();
  const [choice, setChoice] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [fb, setFb] = useState<AnswerFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [marked, setMarked] = useState(initialMarked);
  const [markPending, setMarkPending] = useState(false);
  const [pending, start] = useTransition();
  const startedAt = useRef<number>(0);
  const ce = q.type === "certo_errado";
  const options = ce ? [{ id: "true", label: "C", text: "Certo" }, { id: "false", label: "E", text: "Errado" }] : q.options;
  const showFeedback = !!fb && (!examMode || reveal);

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const submit = () => {
    if (!choice || fb) return;
    start(async () => {
      const r = await api.answerQuestion({
        questionId: q.id,
        context,
        confidence: confidence ?? undefined,
        seconds: Math.round((Date.now() - startedAt.current) / 1000),
        ...(ce ? { answerTrue: choice === "true" } : { optionId: choice }),
      });
      if (!r.ok) return setError(r.error);
      setError(null);
      setFb(r.data);
      onAnswered?.({ questionId: q.id, correct: r.data.correct, confidence, feedback: r.data });
    });
  };

  // Atalhos: A–E / 1–5 selecionam, C/E em certo-errado, Enter responde.
  useEffect(() => {
    if (!active || fb) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input[type=text], textarea, [contenteditable=true]")) return;
      const k = e.key.toLowerCase();
      if (k === "enter" && choice) {
        e.preventDefault();
        submit();
        return;
      }
      if (ce && (k === "c" || k === "e")) return setChoice(k === "c" ? "true" : "false");
      const idx = /^[1-5]$/.test(k) ? Number(k) - 1 : /^[a-e]$/.test(k) && !ce ? k.charCodeAt(0) - 97 : -1;
      const opt = options[idx];
      if (opt) setChoice(opt.id);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const toggleMark = async () => {
    setMarkPending(true);
    const next = !marked;
    const r = await api.toggleQuestionMark(q.id, next);
    setMarkPending(false);
    if (r.ok) setMarked(next);
    else setError(r.error);
  };

  const correctId = fb ? (ce ? String(fb.correctAnswerTrue) : fb.options.find((o) => o.isCorrect)?.id) : null;
  const overconfident = showFeedback && !fb!.correct && confidence === 3;
  const lucky = showFeedback && fb!.correct && confidence === 1;

  return (
    <div>
    <article
      className={`rounded-lg border transition-colors duration-300 ${compact ? "p-4" : "p-4 sm:p-6"} ${
        showFeedback && fb!.correct
          ? "border-acerto bg-acerto-fundo ring-1 ring-acerto/40"
          : showFeedback && !fb!.correct
            ? "border-erro/60 bg-superficie"
            : active
              ? "border-azul/50 bg-superficie"
              : "border-linha bg-superficie"
      }`}
      data-resultado={showFeedback ? (fb!.correct ? "acerto" : "erro") : undefined}
      aria-label={`Questão ${number}`}
    >
      <header className="flex flex-wrap items-center gap-2 t-tiny text-tinta-fraca">
        <span className="font-semibold text-tinta">Questão {number}</span>
        <Tag>{LEVEL[q.difficulty] ?? `Nível ${q.difficulty}`}</Tag>
        {q.essential && <Tag tone="azul">Conceito essencial</Tag>}
        {q.topic && <span className="truncate">{q.topic}</span>}
        <button
          type="button"
          onClick={toggleMark}
          disabled={markPending}
          aria-pressed={marked}
          className="ml-auto inline-flex min-h-9 items-center gap-1 rounded-md px-2 font-semibold text-tinta-suave hover:bg-nevoa aria-pressed:text-destaque"
        >
          <Icon name="bookmark" className={`size-4 ${marked ? "fill-azul/20" : ""}`} />
          {marked ? "Para resolver depois" : "Resolver depois"}
        </button>
      </header>
      <p className="mt-1 t-tiny text-tinta-fraca">
        Questão original para treino{q.board_style ? `, no estilo ${q.board_style}` : ""}. Não é questão oficial de prova.
      </p>

      <p className="mt-4 whitespace-pre-line font-serif text-[1.06rem] leading-relaxed">{q.statement}</p>

      <fieldset className="mt-4" disabled={!!fb || pending}>
        <legend className="sr-only">Alternativas</legend>
        <div className={ce ? "grid grid-cols-2 gap-2" : "flex flex-col gap-2"}>
          {options.map((o) => {
            const isCorrect = showFeedback && correctId === o.id;
            const isWrongPick = showFeedback && choice === o.id && !isCorrect;
            return (
              <label
                key={o.id}
                className={`flex min-h-12 cursor-pointer gap-3 rounded-md border px-3 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-azul ${
                  isCorrect
                    ? "border-acerto bg-white text-acerto font-semibold"
                    : isWrongPick
                      ? "border-erro bg-erro-fundo"
                      : "border-linha-forte hover:border-azul/60 has-[:checked]:border-azul has-[:checked]:bg-nevoa"
                }`}
              >
                <input type="radio" name={`q-${q.id}`} value={o.id} checked={choice === o.id} onChange={() => setChoice(o.id)} className="sr-only" />
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border t-small font-bold ${
                    isCorrect ? "border-acerto bg-acerto text-white" : choice === o.id ? "border-azul bg-azul text-white" : "border-linha-forte text-tinta-suave"
                  }`}
                  aria-hidden
                >
                  {isCorrect ? <Icon name="check" className="size-4" /> : isWrongPick ? <Icon name="x" className="size-4" /> : o.label}
                </span>
                <span className="flex-1 pt-0.5">
                  <span className="sr-only">{o.label}) </span>
                  {o.text}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {!fb && (
        <div className="mt-4">
          <p className="t-tiny text-tinta-fraca" id={`conf-${q.id}`}>Opcional: quão seguro você está?</p>
          <div className="mt-1.5 flex flex-wrap gap-2" role="radiogroup" aria-labelledby={`conf-${q.id}`}>
            {CONFIDENCE.map((c) => (
              <button
                key={c.v}
                type="button"
                role="radio"
                aria-checked={confidence === c.v}
                onClick={() => setConfidence(confidence === c.v ? null : c.v)}
                className="min-h-9 rounded-full border border-linha-forte px-3 t-small font-semibold text-tinta-suave aria-checked:border-azul aria-checked:bg-nevoa aria-checked:text-destaque"
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <div className="mt-3"><Notice tone="erro">{error}</Notice></div>}

      {!fb ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={submit} disabled={!choice || pending}>{pending ? "Registrando…" : examMode ? "Confirmar resposta" : "Responder"}</Button>
          {active && <span className="hidden t-tiny text-tinta-fraca sm:inline">Atalhos: {ce ? "C ou E" : "A–E"} para escolher, Enter para responder</span>}
        </div>
      ) : !showFeedback ? (
        <p className="mt-4 inline-flex items-center gap-1.5 t-small font-semibold text-tinta-suave" role="status">
          <Icon name="check" className="size-4" /> Resposta registrada. O gabarito aparece ao final do simulado.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {fb!.correct ? (
            <div role="status" className="entrar rounded-md border border-acerto/40 bg-white px-4 py-3 t-small">
              <p className="inline-flex items-center gap-1.5 font-semibold text-acerto">
                <Icon name="check" className="size-4" /> Resposta correta
              </p>
              <p className="mt-1 text-tinta-suave">Veja abaixo por que esta é a resposta certa e por que as outras não são.</p>
              {q.depends_on_external_source && <p className="mt-2 t-tiny text-tinta-suave">Depende de fonte normativa: confira a redação vigente.</p>}
              {fb!.attempts && fb!.attempts > 1 && <p className="mt-2 t-tiny text-tinta-suave">Esta foi sua tentativa nº {fb!.attempts} nesta questão.</p>}
            </div>
          ) : (
            <Notice tone="erro" title="Resposta incorreta">
              <p>Veja abaixo por que a sua resposta está errada e qual é a correta.</p>
              {q.depends_on_external_source && <p className="mt-2 t-tiny">Depende de fonte normativa: confira a redação vigente.</p>}
              {fb!.attempts && fb!.attempts > 1 && <p className="mt-2 t-tiny">Esta foi sua tentativa nº {fb!.attempts} nesta questão.</p>}
            </Notice>
          )}
          {overconfident && (
            <Notice tone="alerta">Você marcou certeza e errou. Esse é o tipo de erro que mais custa na prova — vale revisar este ponto.</Notice>
          )}
          {lucky && <Notice tone="info">Acertou no chute: o acerto conta, mas este ponto ainda merece revisão.</Notice>}
        </div>
      )}
    </article>
    {showFeedback && <AnswerExplanation fb={fb!} options={options} certoErrado={ce} chosen={choice} questionLabel={`${q.id}`} />}
    {showFeedback && <QuestionComments questionId={q.id} />}
    </div>
  );
}
