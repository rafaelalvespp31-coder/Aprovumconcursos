"use client";

import Link from "next/link";
import { useId, useMemo, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { searchSubtopics, type SubtopicEntry } from "@/domain/catalog/subtopic-search";
import { createTrailAction } from "@/app/(app)/nova-trilha/actions";
import { contentTypeOf } from "@/app/(app)/nova-trilha/start-dialog";

/**
 * Barra de busca dentro da aula: encontra outro subtópico do MESMO tópico do edital e vai direto
 * para ele (abre a aula se o aluno já estuda; senão, cria o estudo daquele subtópico).
 */
export function SubtopicSearch({ group, items, autoFocus = false }: { group: { title: string; code: string | null }; items: SubtopicEntry[]; autoFocus?: boolean }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(autoFocus);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [starting, setStarting] = useState<string | null>(null);
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLElement>(null);
  // Traz a busca para o alto da tela: a lista de resultados não fica escondida atrás da barra inferior.
  const reveal = () => {
    const el = box.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top < 72 || r.top > window.innerHeight * 0.35) el.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };
  const results = useMemo(() => searchSubtopics(items, q), [items, q]);
  const label = `${group.code ? `${group.code}. ` : ""}${group.title}`;

  const begin = (it: SubtopicEntry) => {
    setErr(null);
    setStarting(it.topicId);
    const fd = new FormData();
    fd.set("catalogTopicId", it.topicId);
    fd.set("content", it.title);
    fd.set("contentType", contentTypeOf(it.title));
    fd.set("board", "outra");
    fd.set("otherBoardName", "Várias bancas");
    start(async () => {
      // Em caso de sucesso a ação leva para o novo estudo.
      const r = await createTrailAction({}, fd);
      if (r?.error) setErr(r.error);
      setStarting(null);
    });
  };

  return (
    <section ref={box} className="scroll-mt-24 rounded-[14px] border border-linha bg-superficie p-3 sm:p-4" aria-labelledby={`${listId}-t`} data-testid="busca-subtopico">
      <h2 id={`${listId}-t`} className="t-small font-semibold">
        Ir para outro subtópico de <span className="text-destaque">{label}</span>{" "}
        <span className="font-normal text-tinta-fraca">({items.length})</span>
      </h2>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-tinta-fraca" aria-hidden />
        <input
          ref={input}
          autoFocus={autoFocus}
          type="text"
          enterKeyHint="search"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-label={`Buscar subtópico de ${group.title}`}
          placeholder="Digite o nome ou o número (ex.: peculato, 1.2)"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            reveal();
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          className="h-11 w-full rounded-full border border-linha-forte bg-superficie pl-9 pr-10 text-[15px] focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              input.current?.focus();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-tinta-fraca hover:bg-nevoa"
            aria-label="Limpar busca"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
      {open && (
        <ul id={listId} role="listbox" aria-label="Subtópicos" className="mt-2 max-h-80 overflow-y-auto rounded-[10px] border border-linha">
          {results.length === 0 && <li className="px-3 py-3 t-small text-tinta-suave">Nenhum subtópico com “{q}” neste tópico.</li>}
          {results.map((it) => {
            const status = it.current ? "Você está aqui" : it.done ? "Concluído" : it.pct !== null ? `${it.pct}%` : "Novo";
            const body = (
              <>
                <span className="min-w-0">
                  {it.code && <span className="mr-1.5 t-tiny font-bold tabular-nums text-tinta-fraca">{it.code}</span>}
                  <span className="font-semibold">{it.title}</span>
                </span>
                <span className={`flex-none t-tiny font-semibold ${it.done && !it.current ? "text-[#16a34a]" : it.current ? "text-destaque" : "text-tinta-fraca"}`}>
                  {it.done && !it.current ? "✓ " : ""}
                  {starting === it.topicId && pending ? "Preparando…" : status}
                </span>
              </>
            );
            const cls = "flex w-full items-center justify-between gap-3 border-b border-linha px-3 py-2.5 text-left t-small last:border-b-0 hover:bg-nevoa aria-[current=true]:bg-nevoa";
            return (
              <li key={it.topicId} role="option" aria-selected={it.current}>
                {it.current ? (
                  <span className={cls} aria-current="true">{body}</span>
                ) : it.lessonId ? (
                  <Link href={`/aula/${it.lessonId}`} className={cls} data-testid="ir-subtopico">{body}</Link>
                ) : (
                  <button type="button" className={cls} onClick={() => begin(it)} disabled={pending} data-testid="comecar-subtopico">
                    {body}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {err && <p className="mt-2 t-small text-erro" role="alert">{err}</p>}
    </section>
  );
}

/**
 * Atalho fixo no topo da aula (visível em todas as páginas: início, módulos e questões):
 * "Subtópicos de …" abre a busca logo abaixo.
 */
export function SubtopicJump({ group, items }: { group: { title: string; code: string | null }; items: SubtopicEntry[] }) {
  const [open, setOpen] = useState(false);
  const others = items.filter((i) => !i.current).length;
  return (
    <div className="mt-2" data-testid="atalho-subtopicos">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border border-linha-forte bg-superficie px-3 py-1 text-left text-[13px] leading-tight font-semibold text-tinta hover:border-destaque"
      >
        <Search className="h-4 w-4 text-destaque" aria-hidden />
        Subtópicos de {group.code ? `${group.code}. ` : ""}
        {group.title}
        <span className="rounded-full bg-nevoa px-1.5 text-[11px] text-tinta-suave">{others + 1}</span>
      </button>
      {open && (
        <div className="mt-2">
          <SubtopicSearch group={group} items={items} autoFocus />
        </div>
      )}
    </div>
  );
}
