"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Notice, inputClass } from "@/components/ui";
import { CONTENT_LIMITS, CONTENT_TYPE_OPTIONS, EXAM_BOARDS, trailRequestSchema, type ExamBoardSlug } from "@/domain/trail-input";
import type { ContentType } from "@/domain/content/types";
import { createTrailAction, type CreateTrailState } from "./actions";

const PLACEHOLDER =
  "Cole aqui o conteúdo programático, matéria, tema ou artigo que deseja dominar. Quanto mais completo o conteúdo informado, mais precisa será a organização da sua trilha.";

function Step({ n, title, done, children }: { n: number; title: string; done: boolean; children: React.ReactNode }) {
  return (
    <fieldset className="border-l-2 border-linha pl-5 data-[done=true]:border-azul" data-done={done}>
      <legend className="-ml-[2.15rem] flex items-center gap-3">
        <span
          className={`flex size-7 items-center justify-center rounded-full t-small font-bold ${done ? "bg-azul text-white" : "bg-superficie text-tinta-suave ring-1 ring-linha-forte"}`}
          aria-hidden
        >
          {n}
        </span>
        <span className="t-h2">{title}</span>
      </legend>
      <div className="mt-4 pb-8">{children}</div>
    </fieldset>
  );
}

export function NewTrailForm() {
  const [state, action, pending] = useActionState<CreateTrailState, FormData>(createTrailAction, {});
  const [board, setBoard] = useState<ExamBoardSlug | null>(null);
  const [other, setOther] = useState("");
  const [type, setType] = useState<ContentType>("edital");
  const [content, setContent] = useState("");
  const [touched, setTouched] = useState(false);

  const validation = useMemo(
    () => trailRequestSchema.safeParse({ board: board ?? undefined, otherBoardName: other, contentType: type, content }),
    [board, other, type, content],
  );
  const issues = validation.success ? {} : Object.fromEntries(validation.error.issues.map((i) => [String(i.path[0]), i.message]));
  const len = content.length;
  const lines = content ? content.split("\n").filter((l) => l.trim()).length : 0;

  return (
    <form
      action={action}
      onSubmit={(e) => {
        setTouched(true);
        if (!validation.success) e.preventDefault();
      }}
      noValidate
    >
      <Step n={1} title="Banca examinadora" done={!!board}>
        <p className="mb-3 t-small text-tinta-suave">A banca orienta o estilo das questões e dos exemplos. Você pode trocá-la antes de construir a trilha.</p>
        <div role="radiogroup" aria-label="Banca examinadora" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EXAM_BOARDS.map((b) => (
            <label
              key={b.slug}
              className="flex min-h-16 cursor-pointer flex-col justify-center rounded-md border border-linha-forte bg-superficie px-3 py-2 has-[:checked]:border-azul has-[:checked]:bg-nevoa has-[:checked]:ring-1 has-[:checked]:ring-azul has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-azul"
            >
              <input type="radio" name="board" value={b.slug} className="sr-only" checked={board === b.slug} onChange={() => setBoard(b.slug)} />
              <span className="font-bold">{b.name}</span>
              <span className="t-tiny text-tinta-fraca">{b.slug === "cebraspe" ? "Antiga CESPE" : b.slug === "outra" ? "Informar nome" : ""}</span>
            </label>
          ))}
        </div>
        {board === "outra" && (
          <div className="mt-3">
            <label htmlFor="otherBoardName" className="t-small font-semibold">Nome da banca</label>
            <input
              id="otherBoardName"
              name="otherBoardName"
              value={other}
              onChange={(e) => setOther(e.target.value)}
              maxLength={80}
              className={`${inputClass} mt-1.5`}
              placeholder="Ex.: FCC, Quadrix, Consulplan"
              aria-invalid={touched && !!issues.otherBoardName}
            />
          </div>
        )}
        {touched && (issues.board || issues.otherBoardName) && (
          <p className="mt-2 t-tiny text-erro" role="alert">{issues.board ?? issues.otherBoardName}</p>
        )}
      </Step>

      <Step n={2} title="O que você vai estudar" done={!!board}>
        <div role="radiogroup" aria-label="Tipo de conteúdo" className="grid gap-2 sm:grid-cols-2">
          {CONTENT_TYPE_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer gap-3 rounded-md border border-linha-forte bg-superficie p-3 has-[:checked]:border-azul has-[:checked]:bg-nevoa has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-azul"
            >
              <input type="radio" name="contentType" value={o.value} checked={type === o.value} onChange={() => setType(o.value)} className="mt-1 size-4 accent-azul" />
              <span>
                <span className="block font-semibold">{o.label}</span>
                <span className="block t-small text-tinta-suave">{o.description}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 t-tiny text-tinta-fraca">Importação de PDF chega numa próxima versão. Por enquanto, copie e cole o texto.</p>
      </Step>

      <Step n={3} title="Conteúdo" done={validation.success}>
        <label htmlFor="content" className="sr-only">Conteúdo a estudar</label>
        <textarea
          id="content"
          name="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={12}
          spellCheck={false}
          className={`${inputClass} min-h-72 resize-y py-3 font-serif leading-relaxed`}
          aria-invalid={touched && !!issues.content}
          aria-describedby="content-info"
        />
        <div id="content-info" className="mt-2 flex flex-wrap justify-between gap-2 t-tiny text-tinta-fraca">
          <span>{lines} linha(s) com conteúdo. A numeração e a hierarquia são preservadas.</span>
          <span className={len > CONTENT_LIMITS.maxChars ? "font-semibold text-erro" : ""}>
            {len.toLocaleString("pt-BR")} / {CONTENT_LIMITS.maxChars.toLocaleString("pt-BR")} caracteres
          </span>
        </div>
        {touched && issues.content && <p className="mt-2 t-tiny text-erro" role="alert">{issues.content}</p>}
      </Step>

      <div className="flex flex-col gap-3 border-l-2 border-transparent pl-5">
        {state.error && <Notice tone="erro">{state.error}</Notice>}
        <Button type="submit" disabled={pending || !board} className="self-start">
          {pending ? "Registrando…" : "Construir minha trilha"}
        </Button>
        {!board && <p className="t-tiny text-tinta-fraca">Selecione a banca para continuar.</p>}
      </div>
    </form>
  );
}
