"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import type { TopicDeleteImpact } from "@/server/services/catalog";
import type { AdminResult, ImpactResult } from "./actions";

/**
 * Excluir tema do catálogo, com confirmação mostrando o que será afetado.
 * `compact`: link discreto (lista); senão, botão (página do tema).
 */
export function DeleteTopic({
  id,
  title,
  actions,
  compact = false,
  redirectTo,
}: {
  id: string;
  title: string;
  actions: { impact: (id: string) => Promise<ImpactResult>; remove: (id: string) => Promise<AdminResult> };
  compact?: boolean;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [impact, setImpact] = useState<TopicDeleteImpact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const ask = () =>
    start(async () => {
      setError(null);
      const r = await actions.impact(id);
      if (r.ok) setImpact(r.impact);
      else setError(r.error);
    });
  const confirm = () =>
    start(async () => {
      const r = await actions.remove(id);
      if (!r.ok) return setError(r.error ?? "Não foi possível excluir.");
      setImpact(null);
      if (redirectTo) router.push(redirectTo);
      else router.refresh();
    });

  return (
    <div className={compact ? "inline-flex flex-col items-start" : "flex flex-col gap-2"}>
      {!impact &&
        (compact ? (
          <button type="button" className="t-tiny font-semibold text-erro underline-offset-2 hover:underline" onClick={ask} disabled={pending} aria-label={`Excluir ${title}`}>
            {pending ? "…" : "Excluir"}
          </button>
        ) : (
          <Button variant="perigo" onClick={ask} disabled={pending}>{pending ? "Consultando…" : "Excluir"}</Button>
        ))}
      {impact && (
        <div role="alertdialog" aria-label={`Excluir ${impact.title}`} className="mt-1 max-w-md rounded-md border border-erro/40 bg-erro-fundo p-3 t-small" data-testid="confirmar-exclusao">
          <p className="font-semibold">Excluir “{impact.title}” de vez?</p>
          <ul className="mt-1 list-disc pl-5 text-tinta-suave">
            <li>A aula e as {impact.questions} questão(ões) do banco dela somem do catálogo{impact.status === "publicado" ? " e do site" : ""}.</li>
            {impact.studies > 0 && <li>{impact.studies} estudo(s) de alunos feitos a partir dela continuam funcionando (cada um tem a própria cópia).</li>}
            {impact.quizAttempts > 0 && <li><strong>{impact.quizAttempts} partida(s) do Modo Jogo</strong> deste tema serão apagadas.</li>}
            <li>Não dá para desfazer. Para só tirar do site, use Arquivar.</li>
          </ul>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button variant="perigo" onClick={confirm} disabled={pending}>{pending ? "Excluindo…" : "Sim, excluir"}</Button>
            <Button variant="discreto" onClick={() => setImpact(null)} disabled={pending}>Cancelar</Button>
          </div>
        </div>
      )}
      {error && <p className="t-small text-erro" role="alert">{error}</p>}
    </div>
  );
}
