"use client";

import { useState, useTransition } from "react";
import type { TeamThread } from "@/server/services/team-chat";
import type { StudentActionResult } from "./actions";

const quando = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

function Conversa({ t, reply, markRead }: { t: TeamThread; reply: (id: string, text: string) => Promise<StudentActionResult>; markRead: (id: string) => Promise<StudentActionResult> }) {
  const [aberto, setAberto] = useState(t.unread > 0);
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const enviar = () => start(async () => {
    setMsg(null);
    const r = await reply(t.userId, texto);
    if (r.ok) setTexto(""); else setMsg(r.error);
  });
  return (
    <li className={`rounded-lg border ${t.unread ? "border-[#E10600]/60" : "border-linha"} bg-superficie`} data-testid="equipe-conversa">
      <button type="button" onClick={() => setAberto(!aberto)} aria-expanded={aberto} className="flex w-full items-center justify-between gap-2 p-3 text-left">
        <span className="min-w-0">
          <strong className="block truncate t-small">{t.name ?? t.email ?? "Aluno"}</strong>
          <span className="block truncate t-tiny text-tinta-fraca">{t.email ?? ""} · última mensagem {quando(t.lastAt)}</span>
        </span>
        {t.unread > 0 ? <span className="shrink-0 rounded-full bg-[#E10600] px-2 py-0.5 t-tiny font-bold text-white">{t.unread} {t.unread === 1 ? "nova" : "novas"}</span> : <span className="shrink-0 t-tiny text-tinta-fraca">respondida</span>}
      </button>
      {aberto && (
        <div className="border-t border-linha p-3">
          <ul className="flex max-h-72 flex-col gap-2 overflow-y-auto">
            {t.messages.map((m) => (
              <li key={m.id} className={`max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 t-small ${m.sender === "aluno" ? "self-start bg-[#F1F1F3] text-[#08090B]" : "self-end bg-[#08090B] text-white"}`}>
                {m.body}
                <span className="mt-0.5 block t-tiny opacity-60">{m.sender === "aluno" ? "Aluno" : "Equipe"} · {quando(m.createdAt)}</span>
              </li>
            ))}
          </ul>
          <form onSubmit={(e) => { e.preventDefault(); if (texto.trim() && !pending) enviar(); }} className="mt-3 flex flex-col gap-2">
            <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} rows={3} placeholder="Escreva a resposta para o aluno…" aria-label="Resposta para o aluno" className="w-full rounded-lg border border-linha bg-white p-2 t-small" style={{ color: "#08090B", WebkitTextFillColor: "#08090B" }} />
            <div className="flex flex-wrap items-center gap-2">
              <button type="submit" disabled={pending || !texto.trim()} className="min-h-9 rounded-lg bg-[#E10600] px-4 t-small font-bold text-white disabled:opacity-50">{pending ? "Enviando…" : "Responder"}</button>
              {t.unread > 0 && <button type="button" disabled={pending} onClick={() => start(async () => void (await markRead(t.userId)))} className="min-h-9 rounded-lg border border-linha px-3 t-tiny font-semibold disabled:opacity-60">Marcar como atendida</button>}
              {msg && <span role="alert" className="t-tiny font-semibold text-[#b3261e]">{msg}</span>}
            </div>
          </form>
        </div>
      )}
    </li>
  );
}

/** Dúvidas que os alunos mandaram pelo Mentor ("Fale com a nossa Equipe"). */
export function MensagensEquipe({ threads, reply, markRead }: { threads: TeamThread[]; reply: (id: string, text: string) => Promise<StudentActionResult>; markRead: (id: string) => Promise<StudentActionResult> }) {
  const novas = threads.reduce((s, t) => s + t.unread, 0);
  return (
    <section id="mensagens" className="mt-4 scroll-mt-20 rounded-lg border border-[#E10600]/40 bg-superficie p-3" data-testid="mensagens-equipe">
      <h2 className="t-small font-bold">Mensagens dos alunos {novas > 0 ? `(${novas} ${novas === 1 ? "nova" : "novas"})` : ""}</h2>
      <p className="t-tiny text-tinta-suave">Dúvidas enviadas pelo chat &ldquo;Fale com a nossa Equipe&rdquo; no Mentor. A resposta aparece na conversa do aluno e ele recebe um aviso no celular, se tiver ativado.</p>
      {threads.length === 0 ? <p className="mt-2 t-small text-tinta-fraca">Nenhuma mensagem ainda.</p> : <ul className="mt-2 flex flex-col gap-2">{threads.map((t) => <Conversa key={t.userId} t={t} reply={reply} markRead={markRead} />)}</ul>}
    </section>
  );
}
