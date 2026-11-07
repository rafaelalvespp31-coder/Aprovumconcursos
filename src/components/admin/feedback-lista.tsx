"use client";

import { useRef, useState } from "react";
import { ROTULOS_NOTA } from "@/domain/feedback/feedback";

export interface ItemFeedback {
  id: string;
  rating: number;
  comment: string | null;
  lessonTitle: string;
  subject: string | null;
  studentName: string | null;
  studentEmail: string | null;
  userId: string | null;
  completedAt: string | null;
  createdAt: string;
}

const dt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });
export const Estrelas = ({ n }: { n: number }) => (
  <span aria-label={`${n} de 5 estrelas`} className="whitespace-nowrap text-[15px] tracking-tight text-destaque">{"★".repeat(n)}<span className="text-linha-forte">{"★".repeat(5 - n)}</span></span>
);

/** Lista de avaliações; ao clicar abre os detalhes completos. */
export function FeedbackLista({ itens }: { itens: ItemFeedback[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [sel, setSel] = useState<ItemFeedback | null>(null);
  if (itens.length === 0) return <p className="rounded-lg border border-linha p-4 text-[13.5px] text-tinta-suave" data-testid="feedbacks-vazio">Nenhuma avaliação encontrada.</p>;
  return (
    <>
      <ul className="flex flex-col gap-2" data-testid="feedbacks-lista">
        {itens.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => { setSel(f); ref.current?.showModal(); }} className="w-full rounded-lg border border-linha bg-white p-3 text-left hover:border-linha-forte">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold">{f.studentName ?? "Aluno sem nome"}</p>
                <Estrelas n={f.rating} />
              </div>
              <p className="mt-0.5 text-[12.5px] text-tinta-suave">{f.lessonTitle}{f.subject ? ` · ${f.subject}` : ""} · {dt(f.createdAt)}</p>
              {f.comment ? <p className="mt-1.5 line-clamp-2 text-[13.5px]">“{f.comment}”</p> : <p className="mt-1.5 text-[12.5px] text-tinta-fraca">Sem comentário</p>}
            </button>
          </li>
        ))}
      </ul>
      <dialog ref={ref} aria-label="Detalhes da avaliação" className="m-auto w-[min(94vw,520px)] rounded-2xl border border-linha bg-white p-0 shadow-xl backdrop:bg-black/50" data-testid="feedback-detalhe">
        {sel && (
          <div className="p-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-[17px] font-extrabold">Avaliação</h2>
              <button type="button" onClick={() => ref.current?.close()} className="rounded-md px-2 py-1 font-semibold hover:bg-nevoa" aria-label="Fechar">✕</button>
            </div>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13.5px]">
              <dt className="text-tinta-suave">Aluno</dt><dd className="font-semibold">{sel.studentName ?? "—"}</dd>
              <dt className="text-tinta-suave">E-mail</dt><dd className="break-all">{sel.studentEmail ?? "—"}</dd>
              <dt className="text-tinta-suave">ID</dt><dd className="break-all font-mono text-[12px]">{sel.userId ?? "conta removida"}</dd>
              <dt className="text-tinta-suave">Aula</dt><dd className="font-semibold">{sel.lessonTitle}</dd>
              <dt className="text-tinta-suave">Matéria</dt><dd>{sel.subject ?? "—"}</dd>
              <dt className="text-tinta-suave">Nota</dt><dd><Estrelas n={sel.rating} /> <b>{sel.rating}</b> · {ROTULOS_NOTA[sel.rating]}</dd>
              <dt className="text-tinta-suave">Enviada em</dt><dd>{dt(sel.createdAt)}</dd>
              {sel.completedAt && (<><dt className="text-tinta-suave">Aula concluída</dt><dd>{dt(sel.completedAt)}</dd></>)}
            </dl>
            <p className="mt-3 text-[12px] font-semibold uppercase text-tinta-suave">Comentário</p>
            <p className="mt-1 whitespace-pre-wrap rounded-lg bg-nevoa p-3 text-[14px]">{sel.comment ?? "O aluno não escreveu comentário."}</p>
          </div>
        )}
      </dialog>
    </>
  );
}
