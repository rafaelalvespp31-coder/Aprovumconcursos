"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deletePreparationAction } from "@/app/(app)/meu-concurso/actions";
import "./aprovum-ai.css";

/** Exclusão em duas etapas (sem diálogo do navegador): "Excluir" → "Confirmar exclusão" / "Cancelar". */
export function DeletePrep({ id, redirectTo, compact = false, tatico = false }: { id: string; redirectTo?: string; compact?: boolean; tatico?: boolean }) {
  const router = useRouter();
  const [ask, setAsk] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const run = () => start(async () => {
    const r = await deletePreparationAction(id);
    if (!r.ok) return setErr(r.error ?? "Falha ao excluir.");
    if (redirectTo) router.push(redirectTo);
    router.refresh();
  });

  if (tatico) {
    // Variante do card principal do edital (mesma exclusão em duas etapas, visual tático).
    if (!ask) {
      return (
        <button type="button" className="vc-btn vc-del" onClick={() => setAsk(true)} aria-label="Excluir preparação" data-testid="ai-excluir">
          <Trash2 aria-hidden /><span>Excluir<br />preparação</span>
        </button>
      );
    }
    return (
      <span className="vc-ask" role="alertdialog" aria-label="Confirmar exclusão">
        <span>Excluir esta preparação? Suas aulas e seu progresso de estudo não são apagados.</span>
        <span className="vc-ask-btns">
          <button type="button" className="vc-ask-yes" onClick={run} disabled={pending}>{pending ? "Excluindo…" : "Confirmar exclusão"}</button>
          <button type="button" className="vc-ask-no" onClick={() => { setAsk(false); setErr(null); }} disabled={pending}>Cancelar</button>
        </span>
        {err && <em role="alert">{err}</em>}
      </span>
    );
  }

  if (!ask) {
    return (
      <button type="button" className="ai-del" data-compact={compact ? 1 : undefined} onClick={() => setAsk(true)} aria-label="Excluir preparação" data-testid="ai-excluir">
        <Trash2 size={15} aria-hidden />{!compact && "Excluir preparação"}
      </button>
    );
  }
  return (
    <span className="ai-del-ask" role="alertdialog" aria-label="Confirmar exclusão">
      <span>Excluir esta preparação? Suas aulas e seu progresso de estudo não são apagados.</span>
      <span className="ai-del-btns">
        <button type="button" className="ai-del-yes" onClick={run} disabled={pending}>{pending ? "Excluindo…" : "Confirmar exclusão"}</button>
        <button type="button" className="ai-del-no" onClick={() => { setAsk(false); setErr(null); }} disabled={pending}>Cancelar</button>
      </span>
      {err && <em role="alert">{err}</em>}
    </span>
  );
}
