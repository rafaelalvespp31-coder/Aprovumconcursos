"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useStudyApi } from "@/components/study-api";
import type { AnswerFeedback } from "@/server/services/study";
import type { AnswerOutcome, QuestionData, SavedAnswer } from "@/components/question-card";
import { QuestionComments } from "@/components/question-comments";
import { Icon } from "@/components/icons";

const LEVEL_LABEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" } as const;
const TYPE_LABEL: Record<string, string> = { multipla_escolha: "Múltipla escolha", certo_errado: "Certo ou errado", situacional: "Situacional", discursiva: "Discursiva" };

/**
 * Questão no visual do PDF: "QUESTÃO 01 · FÁCIL · CERTO OU ERRADO", trecho do conteúdo em
 * itálico, alternativas com o comentário de cada uma, quadro "Gabarito × Sua resposta" e o
 * COMENTÁRIO. A correção é a mesma de sempre (no servidor); o gabarito só aparece depois.
 */
export function ApostilaQuestion({
  q,
  number,
  level,
  context,
  saved,
  initialMarked = false,
  onAnswered,
}: {
  q: QuestionData;
  number: number;
  level?: keyof typeof LEVEL_LABEL;
  context: "fixacao" | "revisao";
  saved?: SavedAnswer;
  initialMarked?: boolean;
  onAnswered?: (o: AnswerOutcome) => void;
}) {
  const api = useStudyApi();
  const [choice, setChoice] = useState<string | null>(saved?.choice ?? null);
  const [fb, setFb] = useState<AnswerFeedback | null>(saved?.feedback ?? null);
  const [error, setError] = useState<string | null>(null);
  const [marked, setMarked] = useState(initialMarked);
  const [pending, start] = useTransition();
  const startedAt = useRef(0);
  const ce = q.type === "certo_errado";
  const options = ce ? [{ id: "true", label: "C", text: "Certo" }, { id: "false", label: "E", text: "Errado" }] : q.options;

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  const submit = () => {
    if (!choice || fb) return;
    start(async () => {
      const r = await api.answerQuestion({
        questionId: q.id,
        context,
        seconds: Math.round((Date.now() - startedAt.current) / 1000),
        ...(ce ? { answerTrue: choice === "true" } : { optionId: choice }),
      });
      if (!r.ok) return setError(r.error);
      setError(null);
      setFb(r.data);
      onAnswered?.({ questionId: q.id, choice, correct: r.data.correct, confidence: null, feedback: r.data });
    });
  };

  const toggleMark = async () => {
    const next = !marked;
    const r = await api.toggleQuestionMark(q.id, next);
    if (r.ok) setMarked(next);
    else setError(r.error);
  };

  const correctId = fb ? (ce ? String(fb.correctAnswerTrue) : fb.options.find((o) => o.isCorrect)?.id ?? null) : null;
  const explanationOf = (id: string) => fb?.options.find((o) => o.id === id)?.explanation;
  const ceLabel = (v: string | null) => (v === "true" ? "CERTO" : v === "false" ? "ERRADO" : "—");
  const n = String(number).padStart(2, "0");

  return (
    <div>
      <article className="ap-q" data-questao="" data-respondida={fb ? "1" : "0"} data-resultado={fb ? (fb.correct ? "acerto" : "erro") : undefined} tabIndex={-1} aria-label={`Questão ${number}`}>
        <header className="ap-q-topo">
          <span className="ap-q-num">QUESTÃO {n}</span>
          {level && <span className="ap-chip">{LEVEL_LABEL[level].toUpperCase()}</span>}
          <span className="ap-chip">{(TYPE_LABEL[q.type] ?? q.type).toUpperCase()}</span>
          {q.essential && <span className="ap-chip ap-chip-vermelho">ESSENCIAL</span>}
          {fb && <span className={`ap-q-res ${fb.correct ? "" : "ap-q-res-erro"}`}>{fb.correct ? "ACERTOU" : "ERROU"}</span>}
        </header>
        {q.topic && <p className="ap-q-trecho">{q.topic}</p>}
        <p className="ap-q-enunciado">{q.statement}</p>

        {ce && fb ? (
          <div className="ap-tabela ap-q-gabarito">
            <table>
              <thead>
                <tr>
                  <th>Gabarito</th>
                  <th>Sua resposta</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{ceLabel(correctId)}</td>
                  <td className={fb.correct ? "" : "ap-q-errada"}>{ceLabel(choice)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          <fieldset className="ap-q-alts" disabled={!!fb || pending}>
            <legend className="sr-only">Alternativas</legend>
            <div className={ce ? "ap-q-ce" : "ap-q-lista"}>
              {options.map((o) => {
                const isCorrect = !!fb && correctId === o.id;
                const isMine = choice === o.id;
                const expl = fb && !ce ? explanationOf(o.id) : null;
                return (
                  <label key={o.id} className="ap-q-alt" data-correta={isCorrect ? "1" : undefined} data-marcada={isMine ? "1" : undefined} data-errada={fb && isMine && !isCorrect ? "1" : undefined}>
                    <input type="radio" name={`q-${q.id}`} value={o.id} checked={isMine} onChange={() => setChoice(o.id)} className="sr-only" />
                    <span className="ap-q-letra" aria-hidden>{o.label}</span>
                    <span className="ap-q-alt-txt">
                      <span className="sr-only">{o.label}) </span>
                      <span className={isCorrect ? "font-bold" : undefined}>
                        {o.text}
                        {fb && (isCorrect || isMine) && <strong className="ap-q-marca"> {[isCorrect && "CORRETA", isMine && "SUA RESPOSTA"].filter(Boolean).join(" · ")}</strong>}
                      </span>
                      {expl && <span className="ap-q-expl">{expl}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {error && <p className="ap-q-erro" role="alert">{error}</p>}

        {fb ? (
          <>
            <div className="ap-comentario" data-testid="gabarito-comentado">
              <p className="ap-kicker">Comentário</p>
              <p>{fb.justification}</p>
            </div>
            <div className="ap-q-rodape">
              <span>{fb.attempts ? `Tentativas: ${fb.attempts}` : "Resposta registrada"}</span>
              <button
                type="button"
                className="ap-link"
                onClick={() => {
                  setFb(null);
                  setChoice(null);
                  startedAt.current = Date.now();
                }}
              >
                <Icon name="historico" className="size-3.5" /> Refazer questão
              </button>
            </div>
          </>
        ) : (
          <div className="ap-q-acoes">
            <button type="button" className="ap-btn ap-btn-preto" onClick={submit} disabled={!choice || pending}>
              {pending ? "Registrando…" : "Responder"}
            </button>
            <button type="button" className="ap-link" aria-pressed={marked} onClick={toggleMark}>
              <Icon name="bookmark" className="size-4" /> {marked ? "Para resolver depois" : "Resolver depois"}
            </button>
          </div>
        )}
      </article>
      {fb && <QuestionComments questionId={q.id} />}
    </div>
  );
}
