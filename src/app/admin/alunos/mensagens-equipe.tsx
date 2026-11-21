"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Recibo } from "@/components/mentor/recibo";
import type { TeamThread } from "@/server/services/team-chat";
import type { StudentActionResult } from "./actions";

export interface AlunoChat { id: string; name: string | null; email: string | null; ghost?: boolean }
type Acao = (id: string, text: string) => Promise<StudentActionResult>;
type Linha = { userId: string; name: string | null; email: string | null; ghost: boolean; thread: TeamThread | null };

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const POR_PAGINA = 25;

function Conversa({ l, reply, markRead, seen }: { l: Linha; reply: Acao; markRead: (id: string) => Promise<StudentActionResult>; seen: (id: string) => Promise<StudentActionResult> }) {
  const t = l.thread;
  const [aberto, setAberto] = useState(false);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const unread = t?.unread ?? 0;
  const naoLidas = !!t?.messages.some((m) => m.sender === "aluno" && !m.readAt);
  // Abrir a conversa = "Lido" para o aluno.
  const alternar = () => { const v = !aberto; setAberto(v); if (v && naoLidas) void seen(l.userId); };
  const enviar = () => start(async () => {
    setMsg(null);
    const r = await reply(l.userId, texto);
    if (r.ok) setTexto(""); else setMsg(r.error);
  });
  return (
    <li className={`rounded-lg border ${unread ? "border-[#E10600]/60" : "border-linha"} bg-superficie`} data-testid="equipe-conversa">
      <button type="button" onClick={alternar} aria-expanded={aberto} className="flex w-full items-center justify-between gap-2 p-3 text-left">
        <span className="min-w-0">
          <strong className="block truncate t-small">{l.name ?? l.email ?? "Aluno"}{l.ghost ? " (fantasma)" : ""}</strong>
          <span className="block truncate t-tiny text-tinta-fraca">{l.email ?? ""}{t ? ` · última mensagem ${quando(t.lastAt)}` : ""}</span>
        </span>
        {unread > 0 ? <span className="shrink-0 rounded-full bg-[#E10600] px-2 py-0.5 t-tiny font-bold text-white">{unread} {unread === 1 ? "nova" : "novas"}</span>
          : t ? <span className="shrink-0 t-tiny text-tinta-fraca">respondida</span>
          : <span className="shrink-0 rounded-full border border-linha px-2 py-0.5 t-tiny font-semibold text-tinta-suave">Enviar mensagem</span>}
      </button>
      {aberto && (
        <div className="border-t border-linha p-3">
          {t && t.messages.length > 0 ? (
            <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
              {t.messages.map((m) => (
                <li key={m.id} className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 t-small ${m.sender === "aluno" ? "self-start bg-[#F1F1F3] text-[#08090B]" : "self-end bg-[#08090B] text-white"}`}>
                  {m.attachmentUrl && (
                    <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mb-1 block" aria-label="Abrir a imagem em tamanho cheio">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.attachmentUrl} alt="Imagem enviada pelo aluno" loading="lazy" className="max-h-64 w-full rounded-lg object-contain" />
                    </a>
                  )}
                  {m.body}
                  <span className="mt-0.5 flex items-center gap-2 t-tiny opacity-70">{m.sender === "aluno" ? "Aluno" : "Equipe"} · {quando(m.createdAt)}{m.sender === "equipe" && <Recibo deliveredAt={m.deliveredAt} readAt={m.readAt} escuro />}</span>
                </li>
              ))}
            </ul>
          ) : <p className="t-small text-tinta-fraca">Nenhuma mensagem ainda. Escreva abaixo para iniciar a conversa: o aluno vê um pop-up no app e recebe um aviso no celular, se tiver ativado.</p>}
          <form onSubmit={(e) => { e.preventDefault(); if (texto.trim() && !pending) enviar(); }} className="mt-3 flex flex-col gap-2">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} rows={3} placeholder={t ? "Escreva a resposta para o aluno…" : "Escreva a primeira mensagem para o aluno…"} aria-label="Mensagem para o aluno" className="w-full rounded-lg border border-linha bg-white p-2 t-small" style={{ color: "#08090B", WebkitTextFillColor: "#08090B" }} />
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={pending || !texto.trim()} className="min-h-9 rounded-lg bg-[#E10600] px-4 t-small font-bold text-white disabled:opacity-50">{pending ? "Enviando…" : t ? "Responder" : "Enviar mensagem"}</button>
              {unread > 0 && <button type="button" disabled={pending} onClick={() => start(async () => void (await markRead(l.userId)))} className="min-h-9 rounded-lg border border-linha px-3 t-tiny font-semibold disabled:opacity-60">Marcar como atendida</button>}
              {msg && <span role="alert" className="t-tiny font-semibold text-[#b3261e]">{msg}</span>}
            </div>
          </form>
        </div>
      )}
    </li>
  );
}

/** Chat da Equipe: TODOS os alunos cadastrados, com as conversas existentes em destaque; a Equipe pode iniciar conversa com qualquer um. */
export function MensagensEquipe({ threads, students, reply, markRead, seen }: { threads: TeamThread[]; students: AlunoChat[]; reply: Acao; markRead: (id: string) => Promise<StudentActionResult>; seen: (id: string) => Promise<StudentActionResult> }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "conversas" | "novas">("todos");
  const [pagina, setPagina] = useState(1);
  // Mensagens novas e recibos ("Recebido"/"Lido") aparecem sem recarregar a página.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 10000);
    return () => clearInterval(t);
  }, [router]);

  const linhas = useMemo<Linha[]>(() => {
    const por = new Map(threads.map((t) => [t.userId, t]));
    const base: Linha[] = students.map((s) => ({ userId: s.id, name: s.name, email: s.email, ghost: !!s.ghost, thread: por.get(s.id) ?? null }));
    const conhecidos = new Set(students.map((s) => s.id));
    for (const t of threads) if (!conhecidos.has(t.userId)) base.push({ userId: t.userId, name: t.name, email: t.email, ghost: false, thread: t });
    return base.sort((a, b) => (b.thread?.unread ? 1 : 0) - (a.thread?.unread ? 1 : 0) || (b.thread ? 1 : 0) - (a.thread ? 1 : 0) || (b.thread?.lastAt ?? "").localeCompare(a.thread?.lastAt ?? "") || (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? "", "pt-BR"));
  }, [threads, students]);

  const novas = threads.reduce((s, t) => s + t.unread, 0);
  const q = norm(busca.trim());
  const filtradas = linhas.filter((l) => (filtro === "todos" || (filtro === "conversas" && l.thread) || (filtro === "novas" && (l.thread?.unread ?? 0) > 0)) && (!q || norm(`${l.name ?? ""} ${l.email ?? ""}`).includes(q)));
  const visiveis = filtradas.slice(0, pagina * POR_PAGINA);
  const chip = (id: typeof filtro, rotulo: string) => (
    <button type="button" onClick={() => { setFiltro(id); setPagina(1); }} aria-pressed={filtro === id} className={`min-h-8 rounded-full border px-3 t-tiny font-semibold ${filtro === id ? "border-[#E10600] bg-[#E10600] text-white" : "border-linha bg-superficie"}`}>{rotulo}</button>
  );
  return (
    <section id="mensagens" className="mt-4 scroll-mt-20 rounded-lg border border-[#E10600]/40 bg-superficie p-3" data-testid="mensagens-equipe">
      <h2 className="t-small font-bold">Chat com os alunos {novas > 0 ? `(${novas} ${novas === 1 ? "nova" : "novas"})` : ""}</h2>
      <p className="t-tiny text-tinta-suave">Todos os alunos cadastrados aparecem aqui. Abra um aluno para responder a dúvida dele ou iniciar uma conversa: ele vê um pop-up no app e recebe um aviso no celular, se tiver ativado.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Buscar aluno por nome ou e-mail…" aria-label="Buscar aluno" className="min-h-9 min-w-0 flex-1 basis-56 rounded-lg border border-linha bg-white px-3 t-small" style={{ color: "#08090B", WebkitTextFillColor: "#08090B" }} data-testid="equipe-busca" />
        {chip("todos", `Todos (${linhas.length})`)}
        {chip("conversas", `Com conversa (${linhas.filter((l) => l.thread).length})`)}
        {chip("novas", `Mensagem nova (${linhas.filter((l) => (l.thread?.unread ?? 0) > 0).length})`)}
      </div>
      {filtradas.length === 0 ? <p className="mt-2 t-small text-tinta-fraca">Nenhum aluno encontrado.</p> : (
        <ul className="mt-2 flex flex-col gap-2">{visiveis.map((l) => <Conversa key={l.userId} l={l} reply={reply} markRead={markRead} seen={seen} />)}</ul>
      )}
      {visiveis.length < filtradas.length && (
        <button type="button" onClick={() => setPagina((p) => p + 1)} className="mt-2 min-h-9 rounded-lg border border-linha px-4 t-small font-semibold">Mostrar mais ({filtradas.length - visiveis.length})</button>
      )}
    </section>
  );
}
