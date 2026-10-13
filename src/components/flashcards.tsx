"use client";

import { useRef, useState } from "react";
import { Icon } from "./icons";
import { Markdown } from "./markdown";
import { parseExamples } from "./examples";

export interface Flashcard {
  front: string;
  back: string;
}

/** "**Pergunta?** complemento\n→ resposta" (um cartão por bloco). */
export function parseFlashcards(md: string): Flashcard[] {
  return parseExamples(md)
    .filter((c) => c.answer)
    .map((c) => ({ front: [c.title, c.situation].filter(Boolean).join(" ").trim(), back: c.answer }));
}

/** Flashcards com virada 3D: toque para ver o verso, marque se sabia, siga para o próximo. */
export function Flashcards({ markdown }: { markdown: string }) {
  const cards = parseFlashcards(markdown);
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState<Record<number, boolean>>({});
  const startX = useRef<number | null>(null);
  if (!cards.length) return <Markdown>{markdown}</Markdown>;
  const done = Object.keys(known).length;
  const right = Object.values(known).filter(Boolean).length;
  const go = (d: number) => {
    setFlipped(false);
    setI((v) => (v + d + cards.length) % cards.length);
  };
  const mark = (ok: boolean) => {
    setKnown((k) => ({ ...k, [i]: ok }));
    setTimeout(() => go(1), 180);
  };
  const c = cards[i]!;

  return (
    <div className="not-prose my-2 font-sans" data-testid="flashcards">
      <div className="mb-3 flex items-center justify-between gap-2 t-small">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Icon name="raio" className="size-4 text-destaque" /> Cartão {i + 1} de {cards.length}
        </span>
        <span className="tabular-nums text-tinta-suave">
          {done ? `${right} de ${done} você já sabia` : "Toque no cartão para virar"}
        </span>
      </div>

      <div
        className="[perspective:1200px]"
        onPointerDown={(e) => (startX.current = e.clientX)}
        onPointerUp={(e) => {
          if (startX.current === null) return;
          const dx = e.clientX - startX.current;
          startX.current = null;
          if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        }}
      >
        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          aria-label={flipped ? "Mostrar a pergunta" : "Mostrar a resposta"}
          aria-pressed={flipped}
          className="relative block min-h-[220px] w-full touch-pan-y text-left transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
        >
          <span className="absolute inset-0 flex flex-col justify-between rounded-2xl border-2 border-linha-forte bg-superficie p-5 shadow-[0_10px_30px_rgba(0,0,0,0.08)] [backface-visibility:hidden]">
            <span className="t-tiny font-bold uppercase tracking-wide text-destaque">Pergunta</span>
            <span className="leitura !max-w-none !text-[1.08rem] font-semibold">
              <Markdown>{c.front}</Markdown>
            </span>
            <span className="inline-flex items-center gap-1 t-tiny text-tinta-fraca">
              <Icon name="setaDireita" className="size-3.5" /> Toque para ver a resposta
            </span>
          </span>
          <span className="absolute inset-0 flex flex-col justify-between rounded-2xl border-2 border-acerto/60 bg-acerto-fundo p-5 shadow-[0_10px_30px_rgba(21,128,61,0.15)] [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="t-tiny font-bold uppercase tracking-wide text-acerto">Resposta</span>
            <span className="leitura !max-w-none !text-[1.02rem]">
              <Markdown>{c.back}</Markdown>
            </span>
            <span className="t-tiny text-tinta-fraca">Toque para voltar à pergunta</span>
          </span>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <button type="button" onClick={() => go(-1)} className="inline-flex size-11 items-center justify-center rounded-full border border-linha-forte active:scale-95 sm:w-auto sm:gap-1 sm:px-4 sm:t-small sm:font-semibold" aria-label="Cartão anterior">
          <Icon name="chevronLeft" className="size-4" /> <span className="hidden sm:inline">Anterior</span>
        </button>
        {flipped ? (
          <div className="flex justify-center gap-2">
            <button type="button" onClick={() => mark(false)} className="min-h-11 flex-1 rounded-full border border-erro/40 bg-erro-fundo px-3 t-small font-semibold text-erro active:scale-95 sm:flex-none sm:px-4">
              Revisar
            </button>
            <button type="button" onClick={() => mark(true)} className="min-h-11 flex-1 rounded-full bg-acerto px-3 t-small font-semibold text-white active:scale-95 sm:flex-none sm:px-4">
              Eu sabia ✓
            </button>
          </div>
        ) : (
          <button type="button" onClick={() => setFlipped(true)} className="min-h-11 rounded-full bg-azul px-5 t-small font-semibold text-white shadow-sm active:scale-95">
            Virar cartão
          </button>
        )}
        <button type="button" onClick={() => go(1)} className="inline-flex size-11 items-center justify-center rounded-full border border-linha-forte active:scale-95 sm:w-auto sm:gap-1 sm:px-4 sm:t-small sm:font-semibold" aria-label="Próximo cartão">
          <span className="hidden sm:inline">Próximo</span> <Icon name="chevronRight" className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex justify-center gap-1.5" aria-hidden>
        {cards.map((_, k) => (
          <span
            key={k}
            className={`h-1.5 rounded-full transition-all duration-300 ${k === i ? "w-6 bg-azul" : known[k] === true ? "w-1.5 bg-acerto" : known[k] === false ? "w-1.5 bg-erro" : "w-1.5 bg-linha-forte"}`}
          />
        ))}
      </div>
    </div>
  );
}
