"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useRef, useState, useTransition } from "react";
import { ChevronRight, CirclePlus, EllipsisVertical, FolderOpen, NotebookTabs, Pencil, Pin, PinOff, Trash2 } from "lucide-react";
import type { Notebook } from "@/server/services/notebooks";
import { brDate, byRecent, NOTEBOOK_TITLE_MAX, notebookScope } from "@/domain/notebooks/model";
import { subjectIcon } from "@/app/(app)/painel/widgets";
import { callAction } from "@/components/safe-action";
import { deleteNotebookAction, pinNotebookAction, renameNotebookAction, type Result } from "./actions";

export interface NotebookActions {
  rename: (id: string, title: string) => Promise<Result<null>>;
  pin: (id: string, pinned: boolean) => Promise<Result<null>>;
  remove: (id: string) => Promise<Result<null>>;
}

const serverActions: NotebookActions = { rename: renameNotebookAction, pin: pinNotebookAction, remove: deleteNotebookAction };

type Tab = "recentes" | "atalhos";
const RECENT_LIMIT = 5;

export function NotebooksCard({ notebooks, base, actions = serverActions, full = false }: { notebooks: Notebook[]; base: string; actions?: NotebookActions; full?: boolean }) {
  const router = useRouter();
  // Cópia local: as ações refletem na hora; o servidor revalida em seguida.
  const [items, setItems] = useState(notebooks);
  const [source, setSource] = useState(notebooks);
  if (source !== notebooks) {
    setSource(notebooks);
    setItems(notebooks);
  }
  const [tab, setTab] = useState<Tab>("recentes");
  const [error, setError] = useState<string | null>(null);

  const sorted = [...items].sort(byRecent);
  const pinned = sorted.filter((n) => n.pinned);
  const list = full ? sorted : tab === "atalhos" ? pinned : sorted.slice(0, RECENT_LIMIT);

  const run = async (fn: () => Promise<Result<null>>, optimistic: (xs: Notebook[]) => Notebook[]) => {
    const before = items;
    setItems(optimistic(items));
    setError(null);
    const r = await callAction(fn, setError);
    if (!r || !r.ok) {
      setItems(before);
      if (r && !r.ok) setError(r.error);
      return false;
    }
    router.refresh();
    return true;
  };

  return (
    <section className="pc min-w-0 p-4 sm:p-6" aria-labelledby="cadernos-titulo" data-testid="cadernos-card">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-center gap-3.5">
          <span className="cq-ico" aria-hidden>
            <NotebookTabs className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id="cadernos-titulo" className="text-[19px] font-extrabold leading-tight tracking-[-0.01em] text-[#08090B] sm:text-[21px]">
              Cadernos de Questões
            </h2>
            <p className="mt-0.5 text-[12.5px] text-[#64666D] sm:text-[13px]">Seus cadernos de questões organizados por matéria e concurso.</p>
          </div>
        </div>
        {!full && (
          <div className="flex items-center gap-1 self-end border-b border-[#ECEDF0]" role="tablist" aria-label="Exibir cadernos">
            {(
              [
                ["recentes", "Recentes"],
                ["atalhos", `Atalhos${pinned.length ? ` (${pinned.length})` : ""}`],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className="cq-aba">
                {label}
              </button>
            ))}
            <Link href={`${base}/questoes/cadernos`} className="cq-aba inline-flex items-center gap-1 text-[#3A3C42]">
              Ver todos <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-[10px] border border-[#F2C4C7] bg-[#FDECED] px-3 py-2 text-[13px] font-medium text-[#B9000B]">
          {error}
        </p>
      )}

      <div className="mt-5" role={full ? undefined : "tabpanel"}>
        {list.length ? (
          <ul className="overflow-hidden rounded-[14px] border border-[#ECEDF0] bg-white" aria-label="Cadernos">
            {list.map((n) => (
              <NotebookRow
                key={n.id}
                n={n}
                base={base}
                onRename={(title) => run(() => actions.rename(n.id, title), (xs) => xs.map((x) => (x.id === n.id ? { ...x, title } : x)))}
                onPin={() => run(() => actions.pin(n.id, !n.pinned), (xs) => xs.map((x) => (x.id === n.id ? { ...x, pinned: !n.pinned } : x)))}
                onDelete={() => run(() => actions.remove(n.id), (xs) => xs.filter((x) => x.id !== n.id))}
              />
            ))}
          </ul>
        ) : (
          <div className="rounded-[14px] border border-dashed border-[#DADBE0] bg-[#FBFBFC] px-5 py-8 text-center">
            <p className="text-[14px] font-bold text-[#08090B]">
              {tab === "atalhos" && !full && items.length ? "Nenhum caderno nos atalhos" : "Você ainda não tem cadernos"}
            </p>
            <p className="mx-auto mt-1 max-w-[42ch] text-[13px] text-[#64666D]">
              {tab === "atalhos" && !full && items.length
                ? "Abra o menu ⋮ de um caderno e escolha “Fixar nos atalhos” para deixá-lo sempre à mão."
                : "Crie um caderno escolhendo a matéria, o concurso ou a banca e treine com questões de concurso revisadas."}
            </p>
          </div>
        )}
      </div>

      <Link href={`${base}/questoes/cadernos/novo`} className="cq-criar group mt-6">
        <CirclePlus className="h-5 w-5" aria-hidden />
        <span>
          Criar novo caderno<span className="max-sm:hidden"> de questões</span>
        </span>
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </Link>
    </section>
  );
}

function NotebookRow({
  n,
  base,
  onRename,
  onPin,
  onDelete,
}: {
  n: Notebook;
  base: string;
  onRename: (title: string) => Promise<boolean>;
  onPin: () => Promise<boolean>;
  onDelete: () => Promise<boolean>;
}) {
  const icon = createElement(subjectIcon(n.subjectName ?? n.examName ?? ""), { className: "h-[22px] w-[22px]" });
  const href = `${base}/questoes/cadernos/${n.id}`;
  const [mode, setMode] = useState<"view" | "rename" | "delete">("view");
  const [draft, setDraft] = useState(n.title);
  const [pending, start] = useTransition();
  const scope = notebookScope(n);
  const meta = [
    scope,
    n.available ? `${n.available} ${n.available === 1 ? "questão" : "questões"}` : "sem questões publicadas ainda",
    brDate(n.lastOpenedAt ?? n.createdAt),
  ];

  return (
    <li className="cq-item group/item" data-testid="caderno">
      <Link href={href} className="cq-item-ico" aria-hidden tabIndex={-1}>
        {icon}
      </Link>
      <div className="min-w-0 flex-1">
        {mode === "rename" ? (
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const t = draft.trim();
              if (!t) return;
              start(async () => {
                if (await onRename(t)) setMode("view");
              });
            }}
          >
            <label className="sr-only" htmlFor={`renomear-${n.id}`}>
              Novo nome do caderno
            </label>
            <input
              id={`renomear-${n.id}`}
              autoFocus
              value={draft}
              maxLength={NOTEBOOK_TITLE_MAX}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setMode("view")}
              className="h-10 min-w-0 flex-1 rounded-[10px] border border-[#DADBE0] px-3 text-[14px] font-semibold outline-none focus:border-[#E50914] focus:ring-2 focus:ring-[#E50914]/15"
            />
            <button type="submit" disabled={pending || !draft.trim()} className="cq-mini cq-mini-forte">
              Salvar
            </button>
            <button type="button" onClick={() => setMode("view")} className="cq-mini">
              Cancelar
            </button>
          </form>
        ) : mode === "delete" ? (
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Confirmar exclusão">
            <span className="text-[13.5px] font-semibold text-[#08090B]">Excluir “{n.title}”? O histórico de respostas é mantido.</span>
            <button type="button" disabled={pending} onClick={() => start(async () => void (await onDelete()))} className="cq-mini cq-mini-forte">
              Excluir
            </button>
            <button type="button" onClick={() => setMode("view")} className="cq-mini">
              Cancelar
            </button>
          </div>
        ) : (
          <Link href={href} className="block min-w-0 focus-visible:outline-none">
            <span className="line-clamp-2 block break-words text-[14.5px] leading-snug text-[#08090B] sm:line-clamp-1 sm:text-[15px]">
              <strong className="font-bold">{n.title}</strong> <span className="font-normal text-[#3A3C42]">({brDate(n.createdAt)})</span>
              {n.pinned && <Pin className="ml-1.5 inline h-3.5 w-3.5 -translate-y-px text-[#E50914]" aria-label="Nos atalhos" />}
            </span>
            <span className="mt-1 flex min-w-0 items-start gap-2 text-[12.5px] text-[#64666D] sm:items-center">
              <span className="mt-[5px] h-2 w-2 shrink-0 rounded-full bg-[#E50914] sm:mt-0" aria-hidden />
              <span className="line-clamp-2 sm:line-clamp-1">{meta.join(" • ")}</span>
            </span>
          </Link>
        )}
      </div>
      {mode === "view" && (
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link href={href} className="cq-btn-pasta" aria-label={`Abrir o caderno ${n.title}`}>
            <FolderOpen className="h-[18px] w-[18px]" aria-hidden />
          </Link>
          <RowMenu
            title={n.title}
            pinned={n.pinned}
            onOpen={href}
            onPin={() => start(async () => void (await onPin()))}
            onRename={() => {
              setDraft(n.title);
              setMode("rename");
            }}
            onDelete={() => setMode("delete")}
          />
        </div>
      )}
    </li>
  );
}

function RowMenu({ title, pinned, onOpen, onPin, onRename, onDelete }: { title: string; pinned: boolean; onOpen: string; onPin: () => void; onRename: () => void; onDelete: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btn.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    ref.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const pick = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };
  return (
    <div className="relative" ref={ref}>
      <button ref={btn} type="button" className="cq-btn-menu" aria-haspopup="menu" aria-expanded={open} aria-label={`Mais opções do caderno ${title}`} onClick={() => setOpen((o) => !o)}>
        <EllipsisVertical className="h-[18px] w-[18px]" aria-hidden />
      </button>
      {open && (
        <div role="menu" aria-label={`Opções de ${title}`} className="cq-menu">
          <Link role="menuitem" href={onOpen} className="cq-menu-item">
            <FolderOpen className="h-4 w-4" aria-hidden /> Abrir caderno
          </Link>
          <button role="menuitem" type="button" className="cq-menu-item" onClick={pick(onPin)}>
            {pinned ? <PinOff className="h-4 w-4" aria-hidden /> : <Pin className="h-4 w-4" aria-hidden />} {pinned ? "Tirar dos atalhos" : "Fixar nos atalhos"}
          </button>
          <button role="menuitem" type="button" className="cq-menu-item" onClick={pick(onRename)}>
            <Pencil className="h-4 w-4" aria-hidden /> Renomear
          </button>
          <button role="menuitem" type="button" className="cq-menu-item text-[#B9000B]" onClick={pick(onDelete)}>
            <Trash2 className="h-4 w-4" aria-hidden /> Excluir
          </button>
        </div>
      )}
    </div>
  );
}
