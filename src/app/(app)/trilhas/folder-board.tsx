"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Button, Tag, inputClass } from "@/components/ui";
import { deleteTrailAction } from "./[id]/actions";
import { moveTrailAction, renameTrailAction, reorderTrailAction, type FolderResult } from "./folder-actions";

export interface BoardFolder {
  id: string;
  name: string;
  color: string;
}
export interface BoardTrail {
  id: string;
  title: string;
  subtitle: string;
  status: { label: string; tone: "azul" | "verde" | "ambar" | "vermelho" | "neutro" };
  folderId: string | null;
  /** Aulas com os 3 níveis vencidos / total de aulas do estudo. */
  progress: { done: number; total: number };
}

export const isStudied = (t: Pick<BoardTrail, "progress">) => t.progress.total > 0 && t.progress.done >= t.progress.total;

/** Avatar do estudo: ✅ quando todas as aulas foram vencidas; senão, o andamento. */
export function StudyAvatar({ trail, size = "md" }: { trail: Pick<BoardTrail, "title" | "progress">; size?: "md" | "sm" }) {
  const dim = size === "sm" ? "size-7 text-sm" : "size-10 text-lg";
  if (isStudied(trail)) {
    return (
      <span
        className={`${dim} entrar flex shrink-0 items-center justify-center rounded-full bg-acerto-fundo ring-2 ring-acerto`}
        role="img"
        aria-label="Estudado"
        title="Estudado: todas as aulas concluídas"
        data-testid="avatar-estudado"
      >
        ✅
      </span>
    );
  }
  const { done, total } = trail.progress;
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <span
      className={`${dim} relative flex shrink-0 items-center justify-center rounded-full bg-nevoa font-bold text-tinta-suave`}
      style={{ background: `conic-gradient(var(--color-acerto) ${pct}%, var(--color-nevoa) 0)` }}
      role="img"
      aria-label={total ? `${done} de ${total} aulas concluídas` : "Ainda sem aulas concluídas"}
      title={total ? `${done} de ${total} aulas concluídas` : undefined}
    >
      <span className="absolute inset-[3px] flex items-center justify-center rounded-full bg-superficie t-tiny tabular-nums">
        {total ? `${pct}%` : trail.title.trim().charAt(0).toUpperCase()}
      </span>
    </span>
  );
}

export function TrailRow({
  trail: t,
  folders,
  pending,
  act,
  order,
}: {
  trail: BoardTrail;
  folders: BoardFolder[];
  pending: boolean;
  act: (fn: () => Promise<FolderResult>, after?: () => void) => void;
  order?: { i: number; total: number };
}) {
  const [confirming, setConfirming] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(t.title);
  const studied = isStudied(t);
  return (
    <li className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 ${studied ? "bg-acerto-fundo/40" : ""}`} data-estudado={studied ? "sim" : undefined}>
      {order && <span className="w-5 shrink-0 text-center t-small font-bold tabular-nums text-tinta-fraca">{order.i + 1}</span>}
      <StudyAvatar trail={t} />
      <Link href={`/trilhas/${t.id}`} className="min-w-0 flex-1 rounded-md transition-opacity active:opacity-60">
        <p className="truncate font-semibold">{t.title}</p>
        <p className="truncate t-small text-tinta-suave">{t.subtitle}</p>
      </Link>
      {studied ? <span className="inline-flex items-center gap-1 rounded-full border border-acerto/40 bg-acerto-fundo px-2 py-0.5 t-tiny font-bold text-acerto">✓ Estudado</span> : <Tag tone={t.status.tone}>{t.status.label}</Tag>}
      <div className="flex w-full items-center justify-end gap-1 sm:w-auto">
        {order && (
          <>
            <button type="button" disabled={pending || order.i === 0} onClick={() => act(() => reorderTrailAction(t.id, "up"))} className="rounded-md p-2 text-tinta-suave hover:bg-nevoa disabled:opacity-30" aria-label="Subir na ordem">
              <Icon name="chevronDown" className="size-4 rotate-180" />
            </button>
            <button type="button" disabled={pending || order.i === order.total - 1} onClick={() => act(() => reorderTrailAction(t.id, "down"))} className="rounded-md p-2 text-tinta-suave hover:bg-nevoa disabled:opacity-30" aria-label="Descer na ordem">
              <Icon name="chevronDown" className="size-4" />
            </button>
          </>
        )}
        <label className="sr-only" htmlFor={`mover-${t.id}`}>Mover para</label>
        <select
          id={`mover-${t.id}`}
          value={t.folderId ?? ""}
          disabled={pending}
          onChange={(e) => act(() => moveTrailAction(t.id, e.target.value || null))}
          className="min-h-9 max-w-44 rounded-md border border-linha-forte bg-superficie px-2 t-small"
        >
          <option value="">{t.folderId ? "Tirar da pasta" : "Mover para…"}</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setTitle(t.title);
            setRenaming(!renaming);
            setConfirming(false);
          }}
          className="rounded-md p-2 text-tinta-suave hover:bg-nevoa"
          aria-label={`Renomear estudo ${t.title}`}
        >
          <Icon name="nota" className="size-4" />
        </button>
        <button type="button" disabled={pending} onClick={() => { setConfirming(!confirming); setRenaming(false); }} className="rounded-md p-2 text-tinta-suave hover:bg-nevoa hover:text-erro" aria-label={`Excluir estudo ${t.title}`}>
          <Icon name="lixeira" className="size-4" />
        </button>
      </div>
      {renaming && (
        <form
          className="entrar flex w-full gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => renameTrailAction(t.id, title), () => setRenaming(false));
          }}
        >
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setRenaming(false)}
            maxLength={160}
            className={inputClass}
            aria-label="Novo nome do assunto"
            autoFocus
          />
          <Button type="submit" disabled={pending || !title.trim() || title.trim() === t.title}>Salvar</Button>
          <Button type="button" variant="discreto" onClick={() => setRenaming(false)}>Cancelar</Button>
        </form>
      )}
      {confirming && (
        <div className="entrar flex w-full flex-wrap items-center gap-3 rounded-md bg-erro-fundo px-3 py-3 t-small" role="alert">
          <span className="flex-1">
            Excluir “{t.title}” de vez? Aulas, questões, respostas, progresso e anotações deste estudo serão apagados e não dá para desfazer.
          </span>
          <Button variant="perigo" disabled={pending} onClick={() => act(() => deleteTrailAction(t.id), () => setConfirming(false))}>
            Excluir estudo
          </Button>
          <Button variant="discreto" onClick={() => setConfirming(false)}>Cancelar</Button>
        </div>
      )}
    </li>
  );
}
