"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { Markdown } from "./markdown";
import { parseExamples } from "./examples";

export interface TrueFalseItem {
  title: string;
  statement: string;
  truth: boolean;
  explanation: string;
}

/** "**Afirmação N.** texto\n→ CERTO|ERRADO. explicação". Itens sem CERTO/ERRADO são ignorados. */
export function parseTrueFalse(md: string): TrueFalseItem[] {
  return parseExamples(md).flatMap((c) => {
    const m = c.answer.match(/^\**\s*(certo|errado)\s*\**\s*[.:—–-]?\s*([\s\S]*)$/i);
    if (!m) return [];
    return [{ title: c.title, statement: c.situation, truth: m[1]!.toLowerCase() === "certo", explanation: m[2]!.trim() }];
  });
}

/** Pegadinhas como itens interativos de certo ou errado: o aluno julga e confere na hora. */
export function TrueFalseCards({ markdown }: { markdown: string }) {
  const items = parseTrueFalse(markdown);
  const [answers, setAnswers] = useState<Record<number, boolean>>({});
  if (!items.length) return <Markdown>{markdown}</Markdown>;
  const answered = Object.keys(answers).length;
  const hits = items.filter((it, i) => answers[i] === it.truth).length;

  return (
    <div className="not-prose my-2 flex flex-col gap-3 font-sans" data-testid="certo-errado-interativo">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-nevoa px-3 py-2 t-small">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Icon name="alerta" className="size-4 text-destaque" /> Julgue como na prova: certo ou errado?
        </span>
        {answered > 0 && (
          <span className="tabular-nums text-tinta-suave">
            {hits} de {answered} acertos
          </span>
        )}
      </div>
      {items.map((it, i) => {
        const a = answers[i];
        const done = a !== undefined;
        const ok = done && a === it.truth;
        return (
          <article
            key={i}
            className={`overflow-hidden rounded-lg border-2 transition-colors duration-300 ${!done ? "border-linha-forte" : ok ? "border-acerto/60 bg-acerto-fundo/50" : "border-erro/50 bg-erro-fundo/50"}`}
            data-resultado={done ? (ok ? "acerto" : "erro") : undefined}
          >
            <div className="px-4 pb-4 pt-3">
              <p className="mb-1 t-tiny font-bold uppercase tracking-wide text-tinta-fraca">{it.title || `Afirmação ${i + 1}`}</p>
              <div className="leitura !max-w-none !text-[1rem]">
                <Markdown>{it.statement}</Markdown>
              </div>
              {!done ? (
                <div className="mt-2 flex gap-2">
                  <button type="button" onClick={() => setAnswers((s) => ({ ...s, [i]: true }))} className="min-h-11 flex-1 rounded-full border-2 border-acerto/50 font-semibold text-acerto active:scale-95">
                    Certo
                  </button>
                  <button type="button" onClick={() => setAnswers((s) => ({ ...s, [i]: false }))} className="min-h-11 flex-1 rounded-full border-2 border-erro/50 font-semibold text-erro active:scale-95">
                    Errado
                  </button>
                </div>
              ) : (
                <div className="entrar mt-3 rounded-md border-l-4 bg-superficie px-4 py-3" style={{ borderColor: ok ? "var(--color-acerto)" : "var(--color-erro)" }} role="status">
                  <p className={`mb-1 inline-flex items-center gap-1 t-small font-bold ${ok ? "text-acerto" : "text-erro"}`}>
                    <Icon name={ok ? "check" : "x"} className="size-4" /> {ok ? "Você acertou" : "Não foi dessa vez"} — o item está {it.truth ? "CERTO" : "ERRADO"}
                  </p>
                  <div className="leitura !max-w-none !text-[1rem]">
                    <Markdown>{it.explanation}</Markdown>
                  </div>
                  <button type="button" onClick={() => setAnswers((s) => { const n = { ...s }; delete n[i]; return n; })} className="mt-1 t-tiny font-semibold text-tinta-suave underline">
                    Tentar de novo
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
