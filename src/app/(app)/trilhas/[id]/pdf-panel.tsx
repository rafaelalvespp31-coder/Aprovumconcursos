"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Notice } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { StudyPdfItem } from "@/server/queries";
import { createPdfAction, deletePdfAction, type PdfState } from "./actions";

/**
 * PDF individual do conteúdo: liberado quando todas as unidades passaram nos três
 * níveis. Cada geração cria uma nova versão; as anteriores continuam disponíveis até o
 * aluno excluí-las (com confirmação).
 */
export function PdfPanel({ trailId, ready, unitsDone, unitsTotal, pdfs }: { trailId: string; ready: boolean; unitsDone: number; unitsTotal: number; pdfs: StudyPdfItem[] }) {
  const [state, action, pending] = useActionState<PdfState, FormData>(createPdfAction.bind(null, trailId), {});
  const router = useRouter();
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleted, setDeleted] = useState<{ version: number } | null>(null);
  const [delError, setDelError] = useState<string | null>(null);
  const [removing, startRemoving] = useTransition();
  const remove = (id: string, version: number) =>
    startRemoving(async () => {
      const r = await deletePdfAction(trailId, id);
      setConfirming(null);
      if (!r.ok) return setDelError(r.error ?? "Não foi possível excluir.");
      setDelError(null);
      setDeleted({ version });
      router.refresh();
    });
  return (
    <section id="pdf" className="scroll-mt-6 rounded-lg border border-linha bg-superficie p-5" aria-labelledby="pdf-titulo">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="pdf-titulo" className="t-h3">PDF deste conteúdo</h2>
          <p className="mt-1 t-small text-tinta-suave">
            Teoria completa no escopo estudado, dispositivos e fontes, exemplos e pegadinhas, as questões que você respondeu com gabarito e comentários, seus erros e os pontos de revisão.
          </p>
        </div>
        <form action={action}>
          <Button type="submit" disabled={!ready || pending}>
            <Icon name="download" className="size-4" /> {pending ? "Gerando…" : pdfs.length ? "Gerar nova versão" : "Gerar PDF"}
          </Button>
        </form>
      </div>
      {!ready && (
        <p className="mt-3 t-small text-tinta-suave">
          Liberado após a aprovação nos três níveis (fácil, médio e difícil) de todas as unidades: {unitsDone} de {unitsTotal} concluída(s).
        </p>
      )}
      {state.error && <div className="mt-3"><Notice tone="erro">{state.error}</Notice></div>}
      {state.created && !deleted && <div className="mt-3"><Notice tone="sucesso">PDF versão {state.created} gerado. Ele está na lista abaixo.</Notice></div>}
      {deleted && <div className="mt-3"><Notice tone="sucesso">PDF versão {deleted.version} excluído.</Notice></div>}
      {delError && <div className="mt-3"><Notice tone="erro">{delError}</Notice></div>}
      {pdfs.length > 0 && (
        <ul className="mt-4 divide-y divide-linha rounded-md border border-linha">
          {pdfs.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 t-small">
              <span>
                <span className="font-semibold">Versão {p.pdf_version}</span>
                <span className="text-tinta-fraca"> · {new Date(p.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {p.questions} questão(ões)</span>
              </span>
              {confirming === p.id ? (
                <span className="flex flex-wrap items-center gap-2" role="group" aria-label={`Confirmar exclusão da versão ${p.pdf_version}`}>
                  <span className="font-semibold text-erro">Excluir esta versão?</span>
                  <button type="button" disabled={removing} onClick={() => remove(p.id, p.pdf_version)} className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-erro px-4 font-semibold text-white disabled:opacity-60">
                    {removing ? "Excluindo…" : "Sim, excluir"}
                  </button>
                  <button type="button" disabled={removing} onClick={() => setConfirming(null)} className="inline-flex min-h-10 items-center rounded-full border border-linha-forte px-4 font-semibold">
                    Cancelar
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-4">
                  <a href={`/api/pdf/${p.id}`} className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-destaque underline underline-offset-2" download>
                    <Icon name="download" className="size-4" /> Baixar
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirming(p.id);
                      setDeleted(null);
                    }}
                    className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-tinta-suave hover:text-erro"
                    aria-label={`Excluir a versão ${p.pdf_version} do PDF`}
                  >
                    <Icon name="lixeira" className="size-4" /> Excluir
                  </button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
