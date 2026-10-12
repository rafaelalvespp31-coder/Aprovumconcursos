"use client";

import { useActionState } from "react";
import { Button, Notice } from "@/components/ui";
import { Icon } from "@/components/icons";
import type { StudyPdfItem } from "@/server/queries";
import { createPdfAction, type PdfState } from "./actions";

/**
 * PDF individual do conteúdo: liberado quando todas as unidades passaram nos três
 * níveis. Cada geração cria uma nova versão; as anteriores continuam disponíveis.
 */
export function PdfPanel({ trailId, ready, unitsDone, unitsTotal, pdfs }: { trailId: string; ready: boolean; unitsDone: number; unitsTotal: number; pdfs: StudyPdfItem[] }) {
  const [state, action, pending] = useActionState<PdfState, FormData>(createPdfAction.bind(null, trailId), {});
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
      {state.created && <div className="mt-3"><Notice tone="sucesso">PDF versão {state.created} gerado. Ele está na lista abaixo.</Notice></div>}
      {pdfs.length > 0 && (
        <ul className="mt-4 divide-y divide-linha rounded-md border border-linha">
          {pdfs.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 t-small">
              <span>
                <span className="font-semibold">Versão {p.pdf_version}</span>
                <span className="text-tinta-fraca"> · {new Date(p.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })} · {p.questions} questão(ões)</span>
              </span>
              <a href={`/api/pdf/${p.id}`} className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-destaque underline underline-offset-2" download>
                <Icon name="download" className="size-4" /> Baixar
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
