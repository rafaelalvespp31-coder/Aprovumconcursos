"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { adminAlternarCategoriaAction, adminCategoriaAction, adminTemaAction } from "@/app/(app)/redacao/actions";

const campo = "w-full rounded-md border border-linha bg-white px-2.5 py-1.5 text-[14px]";

export function NovaCategoria() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pend, start] = useTransition();
  return (
    <form className="flex flex-wrap gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await adminCategoriaAction(nome); setMsg(r.ok ? "Categoria salva." : r.error); if (r.ok) { setNome(""); router.refresh(); } }); }}>
      <input className={`${campo} max-w-xs`} value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nova categoria de tema" aria-label="Nova categoria" />
      <button className="rounded-md bg-tinta px-3 py-1.5 text-[14px] font-semibold text-white" disabled={pend || nome.trim().length < 3}>Adicionar</button>
      {msg && <span role="status" className="self-center text-[13px]">{msg}</span>}
    </form>
  );
}

export function AlternarCategoria({ id, ativa }: { id: string; ativa: boolean }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  return (
    <button type="button" disabled={pend} className="text-[13px] font-semibold text-destaque underline" onClick={() => start(async () => { await adminAlternarCategoriaAction(id, !ativa); router.refresh(); })}>
      {ativa ? "Desativar" : "Ativar"}
    </button>
  );
}

export function NovoTema({ categorias }: { categorias: { slug: string; name: string }[] }) {
  const router = useRouter();
  const [v, setV] = useState({ title: "", categorySlug: "", context: "", command: "", genre: "dissertativo-argumentativo", board: "", linesMax: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [pend, start] = useTransition();
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV((p) => ({ ...p, [k]: e.target.value }));
  return (
    <form className="flex flex-col gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await adminTemaAction({ title: v.title, categorySlug: v.categorySlug || null, context: v.context, command: v.command, genre: v.genre, board: v.board || null, linesMax: v.linesMax ? Number(v.linesMax) : null }); setMsg(r.ok ? "Proposta cadastrada." : r.error); if (r.ok) { setV({ ...v, title: "", context: "", command: "" }); router.refresh(); } }); }}>
      <input className={campo} placeholder="Título do tema" value={v.title} onChange={set("title")} aria-label="Título" />
      <select className={campo} value={v.categorySlug} onChange={set("categorySlug")} aria-label="Categoria"><option value="">Categoria (opcional)</option>{categorias.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}</select>
      <textarea className={`${campo} min-h-[90px]`} placeholder="Contextualização e textos motivadores" value={v.context} onChange={set("context")} aria-label="Contextualização" />
      <textarea className={`${campo} min-h-[60px]`} placeholder="Comando de redação" value={v.command} onChange={set("command")} aria-label="Comando" />
      <div className="grid gap-2 sm:grid-cols-3">
        <input className={campo} placeholder="Gênero" value={v.genre} onChange={set("genre")} aria-label="Gênero" />
        <input className={campo} placeholder="Banca (opcional)" value={v.board} onChange={set("board")} aria-label="Banca" />
        <input className={campo} type="number" min={1} max={60} placeholder="Linhas (máx.)" value={v.linesMax} onChange={set("linesMax")} aria-label="Linhas" />
      </div>
      <div className="flex items-center gap-3"><button className="rounded-md bg-tinta px-3 py-1.5 text-[14px] font-semibold text-white" disabled={pend}>Cadastrar proposta</button>{msg && <span role="status" className="text-[13px]">{msg}</span>}</div>
    </form>
  );
}
