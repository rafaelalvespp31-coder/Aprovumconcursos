"use client";

import { useActionState, useMemo, useState } from "react";
import { Button, Notice, inputClass } from "@/components/ui";
import { CONTENT_EXAMPLES, CONTENT_LIMITS, CONTENT_TYPE_OPTIONS, EXAM_BOARDS, trailRequestSchema, type ExamBoardSlug } from "@/domain/trail-input";
import type { ContentType } from "@/domain/content/types";
import { createTrailAction, type CreateTrailState } from "./actions";

const PLACEHOLDER =
  "Ex.: Prisão em flagrante · Art. 5º da Constituição Federal · Arts. 121 a 129 do Código Penal · ou cole o texto da lei, o capítulo ou a matéria que você quer estudar agora.";

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

/** Adivinha o tipo pelo texto (o aluno pode trocar). */
function guessType(text: string): ContentType {
  if (/\b(arts?\.?|artigos?|§|inciso|lei\s+n?º?|c[óo]digo|constitui[çc][ãa]o|\bCF\b|\bCP\b|\bCPP\b)/i.test(text)) return "artigo_lei";
  return "tema_livre";
}

export function NewTrailForm({ initialContent = "" }: { initialContent?: string }) {
  const [state, action, pending] = useActionState<CreateTrailState, FormData>(createTrailAction, {});
  const [board, setBoard] = useState<ExamBoardSlug | null>(null);
  const [other, setOther] = useState("");
  const [content, setContent] = useState(initialContent);
  const [type, setType] = useState<ContentType>(() => guessType(initialContent));
  const [typeTouched, setTypeTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [touched, setTouched] = useState(false);

  const validation = useMemo(
    () => trailRequestSchema.safeParse({ board: board ?? undefined, otherBoardName: other, contentType: type, content, title }),
    [board, other, type, content, title],
  );
  const issues = validation.success ? {} : Object.fromEntries(validation.error.issues.map((i) => [String(i.path[0]), i.message]));
  const len = content.length;
  const onContent = (v: string) => {
    setContent(v);
    if (!typeTouched) setType(guessType(v));
  };

  return (
    <form
      action={action}
      onSubmit={(e) => {
        setTouched(true);
        if (!validation.success) e.preventDefault();
      }}
      noValidate
    >
      <Step n={1} title="O que você quer estudar agora?" done={!issues.content && content.trim().length > 0}>
        <p className="mb-3 t-small text-tinta-suave">
          Informe um tema, uma matéria, um artigo ou um capítulo. Não precisa do edital: a plataforma identifica o assunto, delimita o escopo e monta a aula e as avaliações só disso.
        </p>
        <label htmlFor="content" className="sr-only">Conteúdo a estudar</label>
        <textarea
          id="content"
          name="content"
          value={content}
          onChange={(e) => onContent(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          spellCheck={false}
          className={`${inputClass} min-h-40 resize-y py-3 font-serif leading-relaxed`}
          aria-invalid={touched && !!issues.content}
          aria-describedby="content-info"
        />
        <div id="content-info" className="mt-2 flex flex-wrap justify-between gap-2 t-tiny text-tinta-fraca">
          <span>Pedido curto ou texto completo: os dois funcionam. Se colar a lei, a numeração e a hierarquia são preservadas.</span>
          <span className={len > CONTENT_LIMITS.maxChars ? "font-semibold text-erro" : ""}>
            {len.toLocaleString("pt-BR")} / {CONTENT_LIMITS.maxChars.toLocaleString("pt-BR")}
          </span>
        </div>
        {touched && issues.content && <p className="mt-2 t-tiny text-erro" role="alert">{issues.content}</p>}
        <div className="mt-3 flex flex-wrap gap-2" aria-label="Exemplos">
          {CONTENT_EXAMPLES.map((ex) => (
            <button
              key={ex.text}
              type="button"
              onClick={() => {
                setContent(ex.text);
                setType(ex.type);
                setTypeTouched(false);
              }}
              className="rounded-full border border-linha-forte bg-superficie px-3 py-1.5 t-tiny font-semibold text-tinta-suave hover:border-azul hover:text-destaque"
            >
              {ex.text}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label htmlFor="title" className="t-small font-semibold">Título (opcional)</label>
          <input
            id="title"
            name="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            className={`${inputClass} mt-1.5`}
            placeholder="Para organizar seus estudos. Ex.: Direito Penal — crimes contra a vida"
          />
          {touched && issues.title && <p className="mt-2 t-tiny text-erro" role="alert">{issues.title}</p>}
        </div>
      </Step>

      <Step n={2} title="Tipo de conteúdo" done={!!content.trim()}>
        <div role="radiogroup" aria-label="Tipo de conteúdo" className="grid gap-2 sm:grid-cols-2">
          {CONTENT_TYPE_OPTIONS.map((o) => (
            <label
              key={o.value}
              className="flex cursor-pointer gap-3 rounded-md border border-linha-forte bg-superficie p-3 has-[:checked]:border-azul has-[:checked]:bg-nevoa has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-azul"
            >
              <input
                type="radio"
                name="contentType"
                value={o.value}
                checked={type === o.value}
                onChange={() => {
                  setType(o.value);
                  setTypeTouched(true);
                }}
                className="mt-1 size-4 accent-azul"
              />
              <span>
                <span className="block font-semibold">{o.label}</span>
                <span className="block t-small text-tinta-suave">{o.description}</span>
              </span>
            </label>
          ))}
        </div>
        <p className="mt-2 t-tiny text-tinta-fraca">Sugerido pelo que você escreveu; troque se quiser. Importação de PDF chega numa próxima versão.</p>
      </Step>

      <Step n={3} title="Banca de referência" done={!!board}>
        <p className="mb-3 t-small text-tinta-suave">A banca orienta o estilo das questões e dos exemplos.</p>
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

      <div className="flex flex-col gap-3 border-l-2 border-transparent pl-5">
        {state.error && <Notice tone="erro">{state.error}</Notice>}
        <Button type="submit" disabled={pending || !board} className="self-start">
          {pending ? "Registrando…" : "Começar este estudo"}
        </Button>
        {!board && <p className="t-tiny text-tinta-fraca">Selecione a banca para continuar.</p>}
      </div>
    </form>
  );
}
