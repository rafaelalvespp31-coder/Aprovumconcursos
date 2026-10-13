"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { Button, Notice, Tag, inputClass } from "@/components/ui";
import { deleteTrailAction } from "./[id]/actions";
import { createFolderAction, deleteFolderAction, moveTrailAction, renameFolderAction, renameTrailAction, reorderTrailAction, type FolderResult } from "./folder-actions";

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

const COLORS: Record<string, string> = {
  vermelho: "#e10600",
  preto: "#0a0a0a",
  cinza: "#a3a3a3",
  verde: "#15803d",
  azul: "#2563eb",
  amarelo: "#ca8a04",
};

export function FolderBoard({ folders, trails }: { folders: BoardFolder[]; trails: BoardTrail[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState("vermelho");

  const act = (fn: () => Promise<FolderResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      if (!r.ok) return setError(r.error ?? "Erro.");
      setError(null);
      after?.();
      router.refresh();
    });

  const loose = trails.filter((t) => !t.folderId || !folders.some((f) => f.id === t.folderId));

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {!creating ? (
          <Button variant="secundario" onClick={() => setCreating(true)}>
            <Icon name="mais" className="size-4" /> Nova pasta
          </Button>
        ) : (
          <form
            className="entrar flex w-full flex-col gap-3 rounded-lg border border-linha-forte bg-superficie p-4"
            onSubmit={(e) => {
              e.preventDefault();
              act(() => createFolderAction(name, color), () => {
                setName("");
                setCreating(false);
              });
            }}
          >
            <label htmlFor="nova-pasta" className="t-small font-semibold">Nome da pasta (ex.: a matéria)</label>
            <input id="nova-pasta" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoFocus className={inputClass} placeholder="Direito Penal" />
            <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Cor da pasta">
              {Object.entries(COLORS).map(([k, hex]) => (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={color === k}
                  aria-label={k}
                  onClick={() => setColor(k)}
                  className="size-8 rounded-full border-2 border-white ring-2 ring-transparent transition-transform active:scale-90 aria-checked:ring-tinta"
                  style={{ background: hex }}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={pending || !name.trim()}>{pending ? "Criando…" : "Criar pasta"}</Button>
              <Button type="button" variant="discreto" onClick={() => setCreating(false)}>Cancelar</Button>
            </div>
          </form>
        )}
      </div>

      {error && <Notice tone="erro">{error}</Notice>}

      {folders.map((f) => (
        <FolderCard
          key={f.id}
          folder={f}
          folders={folders}
          trails={trails.filter((t) => t.folderId === f.id)}
          pending={pending}
          act={act}
        />
      ))}

      {(loose.length > 0 || folders.length === 0) && (
        <section className="rounded-lg border border-dashed border-linha-forte bg-superficie" aria-label="Estudos sem pasta">
          <div className="flex items-center gap-2 px-4 py-3">
            <Icon name="trilhas" className="size-5 text-tinta-fraca" />
            <h2 className="t-h3 flex-1">Sem pasta</h2>
            <span className="t-tiny text-tinta-fraca">{loose.length}</span>
          </div>
          {loose.length === 0 ? (
            <p className="border-t border-linha px-4 py-3 t-small text-tinta-suave">Crie uma pasta para cada matéria e organize seus estudos nela.</p>
          ) : (
            <ul className="divide-y divide-linha border-t border-linha">
              {loose.map((t) => (
                <TrailRow key={t.id} trail={t} folders={folders} pending={pending} act={act} />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function FolderCard({
  folder,
  folders,
  trails,
  pending,
  act,
}: {
  folder: BoardFolder;
  folders: BoardFolder[];
  trails: BoardTrail[];
  pending: boolean;
  act: (fn: () => Promise<FolderResult>, after?: () => void) => void;
}) {
  const [open, setOpen] = useState(true);
  const [menu, setMenu] = useState<null | "renomear" | "excluir">(null);
  const [name, setName] = useState(folder.name);
  return (
    <section className="overflow-hidden rounded-lg border border-linha bg-superficie" style={{ borderLeft: `5px solid ${COLORS[folder.color] ?? COLORS.vermelho}` }} aria-label={`Pasta ${folder.name}`}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="flex min-h-10 flex-1 items-center gap-2 text-left">
          <Icon name="chevronRight" className={`size-4 shrink-0 transition-transform ${open ? "rotate-90" : ""}`} />
          <span className="t-h3">{folder.name}</span>
          <span className="t-tiny text-tinta-fraca">
            {trails.filter(isStudied).length}/{trails.length} {trails.length === 1 ? "estudo concluído" : "estudos concluídos"}
          </span>
        </button>
        <button type="button" onClick={() => setMenu(menu === "renomear" ? null : "renomear")} className="rounded-md p-2 text-tinta-suave hover:bg-nevoa" aria-label="Renomear pasta">
          <Icon name="nota" className="size-4" />
        </button>
        <button type="button" onClick={() => setMenu(menu === "excluir" ? null : "excluir")} className="rounded-md p-2 text-tinta-suave hover:bg-nevoa hover:text-erro" aria-label="Excluir pasta">
          <Icon name="lixeira" className="size-4" />
        </button>
      </div>

      {menu === "renomear" && (
        <form
          className="entrar flex gap-2 border-t border-linha px-4 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => renameFolderAction(folder.id, name), () => setMenu(null));
          }}
        >
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} className={inputClass} aria-label="Novo nome" autoFocus />
          <Button type="submit" disabled={pending || !name.trim()}>Salvar</Button>
        </form>
      )}
      {menu === "excluir" && (
        <div className="entrar flex flex-wrap items-center gap-3 border-t border-linha bg-erro-fundo px-4 py-3 t-small">
          <span className="flex-1">Excluir a pasta “{folder.name}”? Os estudos não são apagados: voltam para “Sem pasta”.</span>
          <Button variant="perigo" disabled={pending} onClick={() => act(() => deleteFolderAction(folder.id), () => setMenu(null))}>Excluir pasta</Button>
          <Button variant="discreto" onClick={() => setMenu(null)}>Cancelar</Button>
        </div>
      )}

      {open && (
        trails.length === 0 ? (
          <p className="border-t border-linha px-4 py-3 t-small text-tinta-suave">Pasta vazia. Use “Mover para” num estudo para colocá-lo aqui.</p>
        ) : (
          <ol className="divide-y divide-linha border-t border-linha">
            {trails.map((t, i) => (
              <TrailRow key={t.id} trail={t} folders={folders} pending={pending} act={act} order={{ i, total: trails.length }} />
            ))}
          </ol>
        )
      )}
    </section>
  );
}

function TrailRow({
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
