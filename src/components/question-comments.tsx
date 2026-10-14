"use client";

import { useEffect, useId, useState, useTransition } from "react";
import type { QuestionComment } from "@/app/(app)/study-actions";
import { useStudyApi } from "./study-api";
import { Icon } from "./icons";
import { Button, Notice } from "./ui";

const MAX = 1000;

function ago(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "agora";
  if (s < 3600) return `há ${Math.floor(s / 60)} min`;
  if (s < 86400) return `há ${Math.floor(s / 3600)} h`;
  if (s < 86400 * 30) return `há ${Math.floor(s / 86400)} d`;
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Comentários dos alunos sobre a questão. Ficam registrados e aparecem para todos os
 * alunos que responderam a mesma questão. Só abre depois da resposta (evita spoiler).
 */
export function QuestionComments({ questionId }: { questionId: string }) {
  const api = useStudyApi();
  const formId = useId();
  const [list, setList] = useState<QuestionComment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    api.listComments(questionId).then((r) => {
      if (!alive) return;
      if (r.ok) setList(r.data);
      else setError(r.error);
    });
    return () => {
      alive = false;
    };
  }, [api, questionId]);

  const send = () =>
    start(async () => {
      const r = await api.addComment(questionId, body);
      if (!r.ok) return setError(r.error);
      setError(null);
      setBody("");
      setList(r.data);
    });

  const act = async (id: string, kind: "apagar" | "denunciar") => {
    setBusy(id);
    const r = kind === "apagar" ? await api.deleteComment(questionId, id) : await api.reportComment(questionId, id);
    setBusy(null);
    if (r.ok) setList(r.data);
    else setError(r.error);
  };

  const n = list?.length ?? 0;
  const shown = open ? (list ?? []) : (list ?? []).slice(-3);

  return (
    <section aria-labelledby={`${formId}-t`} className="mt-3 rounded-lg border border-linha bg-superficie p-4 sm:p-5" data-testid="comentarios-questao">
      <div className="flex flex-wrap items-center gap-2">
        <h4 id={`${formId}-t`} className="mr-auto inline-flex items-center gap-1.5 font-semibold">
          <Icon name="duvida" className="size-4 text-destaque" /> Comentários dos alunos
          <span className="rounded-full bg-nevoa px-2 py-0.5 t-tiny font-bold text-tinta-suave">{list ? n : "…"}</span>
        </h4>
        {n > 3 && (
          <button type="button" onClick={() => setOpen(!open)} className="t-small font-semibold text-destaque">
            {open ? "Mostrar só os recentes" : `Ver todos os ${n}`}
          </button>
        )}
      </div>
      <p className="mt-1 t-tiny text-tinta-fraca">Visíveis para todos os alunos que responderam esta questão. Seja respeitoso e não compartilhe dados pessoais.</p>

      {list && n === 0 && <p className="mt-3 t-small text-tinta-suave">Ninguém comentou ainda. Deixe uma dica, um macete ou uma dúvida sobre esta questão.</p>}

      {shown.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {shown.map((c) => (
            <li key={c.id} className={`flex gap-3 rounded-md p-3 ${c.isMine ? "bg-nevoa ring-1 ring-azul/25" : "bg-nevoa/60"}`}>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] t-small font-bold text-white" aria-hidden>
                {c.author.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-baseline gap-x-2 t-tiny text-tinta-fraca">
                  <span className="t-small font-semibold text-tinta">{c.author}{c.isMine && " (você)"}</span>
                  <time dateTime={c.createdAt}>{ago(c.createdAt)}</time>
                </p>
                <p className="mt-1 whitespace-pre-line break-words t-small text-tinta">{c.body}</p>
                <div className="mt-1.5 flex gap-3 t-tiny">
                  {c.isMine ? (
                    <button type="button" disabled={busy === c.id} onClick={() => act(c.id, "apagar")} className="font-semibold text-tinta-suave hover:text-erro">
                      {busy === c.id ? "Apagando…" : "Apagar"}
                    </button>
                  ) : c.reported ? (
                    <span className="text-tinta-fraca">Denunciado</span>
                  ) : (
                    <button type="button" disabled={busy === c.id} onClick={() => act(c.id, "denunciar")} className="font-semibold text-tinta-suave hover:text-erro">
                      Denunciar
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {error && <div className="mt-3"><Notice tone="erro">{error}</Notice></div>}

      <form
        className="mt-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (body.trim().length >= 2) send();
        }}
      >
        <label htmlFor={`${formId}-c`} className="t-small font-semibold">Seu comentário</label>
        <textarea
          id={`${formId}-c`}
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX))}
          rows={3}
          maxLength={MAX}
          placeholder="Ex.: macete para lembrar, onde isso caiu, dúvida sobre a explicação…"
          className="mt-1.5 block w-full resize-y rounded-md border border-linha-forte bg-white px-3 py-2 t-small focus:border-azul focus:outline-none"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="t-tiny text-tinta-fraca">{body.length}/{MAX}</span>
          <Button type="submit" disabled={pending || body.trim().length < 2 || !!error?.startsWith("Responda")}>
            {pending ? "Publicando…" : "Publicar comentário"}
          </Button>
        </div>
      </form>
    </section>
  );
}
