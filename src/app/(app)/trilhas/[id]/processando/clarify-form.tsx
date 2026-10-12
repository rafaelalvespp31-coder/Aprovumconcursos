"use client";

import { useActionState, useState } from "react";
import { Button, Notice, inputClass } from "@/components/ui";
import { answerClarificationAction, type ClarifyState } from "../actions";

/** Pergunta de esclarecimento do escopo: opções sugeridas pela IA ou resposta livre. */
export function ClarifyForm({ trailId, question, options }: { trailId: string; question: string; options: string[] }) {
  const [state, action, pending] = useActionState<ClarifyState, FormData>(answerClarificationAction.bind(null, trailId), {});
  const [choice, setChoice] = useState("");
  const [detail, setDetail] = useState("");
  return (
    <form action={action} className="flex flex-col gap-4 rounded-lg border border-linha bg-superficie p-5">
      <div>
        <p className="t-tiny font-semibold uppercase tracking-wide text-destaque">Precisamos de um esclarecimento</p>
        <h2 className="mt-1 t-h2">{question}</h2>
        <p className="mt-1 t-small text-tinta-suave">Seu pedido admite mais de uma interpretação. Com a resposta, o escopo é delimitado e o estudo continua de onde parou.</p>
      </div>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="sr-only">Opções</legend>
        {options.map((o) => (
          <label key={o} className="flex cursor-pointer items-center gap-3 rounded-md border border-linha-forte bg-superficie p-3 has-[:checked]:border-azul has-[:checked]:bg-nevoa has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-azul">
            <input type="radio" name="choice" value={o} checked={choice === o} onChange={() => setChoice(o)} className="size-4 accent-azul" />
            <span className="font-semibold">{o}</span>
          </label>
        ))}
      </fieldset>
      <div>
        <label htmlFor="detail" className="t-small font-semibold">Ou explique com suas palavras (opcional)</label>
        <textarea id="detail" name="detail" value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={600} rows={3} className={`${inputClass} mt-1.5 py-2`} placeholder="Ex.: quero só os arts. 301 a 310 do CPP" />
      </div>
      {state.error && <Notice tone="erro">{state.error}</Notice>}
      <Button type="submit" disabled={pending || (!choice && !detail.trim())} className="self-start">
        {pending ? "Enviando…" : "Continuar com esta resposta"}
      </Button>
    </form>
  );
}
