"use client";

import { useState } from "react";
import { Icon } from "./icons";
import { Markdown } from "./markdown";
import type { PracticeCase } from "@/domain/content/practice";

/**
 * Card "Na prática": o assunto que acabou de ser ensinado aplicado a um caso concreto.
 * Fluxo: situação → pense → ver resposta → "entendi" (ou reler a explicação).
 */
export function PracticeCard({ cases, onReread }: { cases: PracticeCase[]; onReread?: () => void }) {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState<Set<number>>(new Set());
  const [got, setGot] = useState<Set<number>>(new Set());
  if (!cases.length) return null;
  const c = cases[Math.min(idx, cases.length - 1)]!;
  const revealed = open.has(idx);
  const understood = got.has(idx);
  const step = understood ? 3 : revealed ? 2 : 1;

  return (
    <section
      className="not-prose mt-6 overflow-hidden rounded-[20px] border border-linha-forte bg-superficie font-sans shadow-[0_10px_30px_rgba(0,0,0,0.06)]"
      aria-label="Na prática: exemplo do tema"
      data-testid="na-pratica"
    >
      {/* Cabeçalho */}
      <header className="relative flex items-center gap-3 overflow-hidden bg-gradient-to-r from-[#FF1E1E] to-[#8a0303] px-4 py-3 text-white sm:px-5">
        <span className="absolute -right-6 -top-8 size-24 rounded-full bg-white/10" aria-hidden />
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/30" aria-hidden>
          <Icon name="lampada" className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">Na prática</p>
          <p className="truncate text-[15px] font-semibold leading-tight">Veja este tema num caso concreto</p>
        </div>
        {cases.length > 1 && (
          <span className="shrink-0 rounded-full bg-white/15 px-2.5 py-1 text-[12px] font-semibold tabular-nums">
            {idx + 1}/{cases.length}
          </span>
        )}
      </header>

      {/* Etapas */}
      <ol className="flex items-center gap-2 border-b border-linha px-4 py-2.5 text-[12px] font-semibold sm:px-5" aria-label="Etapas do exemplo">
        {["Situação", "Resposta", "Entendi"].map((s, i) => {
          const n = i + 1;
          const done = n < step || (n === 3 && understood);
          const on = n === step && !done;
          return (
            <li key={s} className="flex items-center gap-2">
              {i > 0 && <span className={`h-px w-4 sm:w-8 ${n <= step ? "bg-azul" : "bg-linha-forte"}`} aria-hidden />}
              <span
                className={`flex size-5 items-center justify-center rounded-full text-[11px] transition-colors duration-300 ${
                  done ? "bg-acerto text-white" : on ? "bg-azul text-white" : "bg-nevoa text-tinta-fraca"
                }`}
                aria-hidden
              >
                {done ? "✓" : n}
              </span>
              <span className={on || done ? "text-tinta" : "text-tinta-fraca"}>{s}</span>
            </li>
          );
        })}
      </ol>

      <div key={idx} className="entrar px-4 pb-5 pt-4 sm:px-5">
        {/* Situação */}
        <div className="rounded-[14px] border border-linha bg-papel px-4 py-3">
          <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-tinta-fraca">
            <Icon name="livro" className="size-3.5" /> Situação
          </p>
          <div className="leitura !max-w-none !text-[1rem]">
            <Markdown>{c.situation}</Markdown>
          </div>
        </div>

        {c.question && (
          <p className="mt-4 flex items-start gap-2 text-[1rem] font-semibold leading-snug">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-nevoa text-destaque" aria-hidden>?</span>
            <span>{c.question}</span>
          </p>
        )}

        {/* Resposta */}
        {!revealed ? (
          <button
            type="button"
            onClick={() => setOpen((s) => new Set(s).add(idx))}
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-azul px-5 font-semibold text-white shadow-md transition-transform active:scale-[0.98] sm:w-auto"
          >
            <Icon name="alvo" className="size-4" /> Pensei — ver a resposta
          </button>
        ) : (
          <div className="entrar mt-4 rounded-[14px] border-l-4 border-acerto bg-acerto-fundo px-4 py-3" role="status">
            <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-acerto">
              <Icon name="balanca" className="size-3.5" /> Resposta
            </p>
            <div className="leitura !max-w-none !text-[1rem]">
              <Markdown>{c.answer}</Markdown>
            </div>
          </div>
        )}

        {revealed && (
          <div className="entrar mt-4 flex flex-wrap items-center gap-2">
            {!understood ? (
              <>
                <button
                  type="button"
                  onClick={() => setGot((s) => new Set(s).add(idx))}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-acerto px-4 font-semibold text-white transition-transform active:scale-95"
                >
                  <Icon name="check" className="size-4" /> Entendi
                </button>
                {onReread && (
                  <button
                    type="button"
                    onClick={onReread}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-linha-forte bg-superficie px-4 font-semibold text-tinta-suave transition-transform active:scale-95"
                  >
                    Reler a explicação
                  </button>
                )}
              </>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-acerto">
                <Icon name="check" className="size-4" /> Boa! Você aplicou o tema.
              </p>
            )}
            {cases.length > 1 && idx < cases.length - 1 && (
              <button
                type="button"
                onClick={() => setIdx(idx + 1)}
                className="ml-auto inline-flex min-h-11 items-center gap-1.5 rounded-full border border-azul px-4 font-semibold text-destaque transition-transform active:scale-95"
              >
                Próximo exemplo <Icon name="setaDireita" className="size-4" />
              </button>
            )}
          </div>
        )}

        {cases.length > 1 && (
          <div className="mt-4 flex justify-center gap-1.5" aria-label="Exemplos">
            {cases.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Exemplo ${i + 1}`}
                aria-current={i === idx ? "true" : undefined}
                className={`h-2 rounded-full transition-all ${i === idx ? "w-6 bg-azul" : got.has(i) ? "w-2 bg-acerto" : "w-2 bg-linha-forte"}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
