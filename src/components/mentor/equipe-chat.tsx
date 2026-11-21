"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { MessageCircle, Send } from "lucide-react";
import type { TeamMessage } from "@/server/services/team-chat";
import { equipeListAction, equipeSendAction } from "@/app/(app)/mentor/actions";

const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

/** Chat para tirar dúvida com a Equipe APROVUM. As mensagens chegam no painel da equipe (aba Alunos). */
export function EquipeChat({ tema = "escuro" }: { tema?: "claro" | "escuro" }) {
  const [msgs, setMsgs] = useState<TeamMessage[] | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fim = useRef<HTMLDivElement>(null);
  const cor = tema === "escuro" ? "#fff" : "#08090B";
  const dim = tema === "escuro" ? "rgba(255,255,255,.7)" : "#64666D";

  useEffect(() => {
    let vivo = true;
    const carregar = () => equipeListAction().then((r) => { if (!vivo) return; if (r.ok) setMsgs(r.messages); else setErro((e) => e ?? r.error); }).catch(() => undefined);
    carregar();
    const t = setInterval(() => { if (document.visibilityState === "visible") carregar(); }, 20000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  useEffect(() => { fim.current?.scrollIntoView({ block: "nearest" }); }, [msgs?.length]);

  const enviar = () => start(async () => {
    setErro(null);
    const r = await equipeSendAction(texto);
    if (!r.ok) return setErro(r.error);
    setMsgs(r.messages);
    setTexto("");
  });

  return (
    <div className="flex flex-col gap-3" data-testid="equipe-chat">
      <div className="rounded-2xl rounded-tl-sm bg-[#111] p-3.5">
        <p className="flex items-center gap-2 text-[14px] font-bold" style={{ color: "#fff", WebkitTextFillColor: "#fff" }}><MessageCircle className="h-4 w-4 text-[#ff5a52]" aria-hidden /> Fale com a nossa Equipe</p>
        <p className="mt-1 text-[12px]" style={{ color: "rgba(255,255,255,.7)", WebkitTextFillColor: "rgba(255,255,255,.7)" }}>Tire dúvidas sobre a plataforma, seu plano ou seus estudos. A Equipe APROVUM responde por aqui.</p>
      </div>

      <div className="flex max-h-[46vh] min-h-24 flex-col gap-2 overflow-y-auto pr-1" role="log" aria-live="polite" aria-label="Conversa com a Equipe APROVUM">
        {msgs === null && !erro && <p className="text-[12.5px]" style={{ color: dim, WebkitTextFillColor: dim }}>Carregando conversa…</p>}
        {msgs?.length === 0 && <p className="text-[12.5px]" style={{ color: dim, WebkitTextFillColor: dim }}>Ainda não há mensagens. Escreva a sua dúvida abaixo.</p>}
        {msgs?.map((m) => (
          <div key={m.id} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13.5px] leading-snug ${m.sender === "aluno" ? "self-end rounded-br-sm bg-[#E10600]" : "self-start rounded-bl-sm bg-[#F1F1F3]"}`}
            style={m.sender === "aluno" ? { color: "#fff", WebkitTextFillColor: "#fff" } : { color: "#08090B", WebkitTextFillColor: "#08090B" }} data-testid={m.sender === "aluno" ? "equipe-msg-aluno" : "equipe-msg-equipe"}>
            {m.sender === "equipe" && <b className="mb-0.5 block text-[11px] uppercase tracking-wide text-[#E10600]" style={{ WebkitTextFillColor: "#E10600" }}>Equipe APROVUM</b>}
            {m.body}
            <span className="mt-0.5 block text-[10.5px] opacity-65">{hora(m.createdAt)}</span>
          </div>
        ))}
        <div ref={fim} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (texto.trim() && !pending) enviar(); }} className="flex flex-col gap-2">
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} rows={3} placeholder="Escreva a sua dúvida para a Equipe…" aria-label="Mensagem para a Equipe APROVUM" data-testid="equipe-input"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && texto.trim() && !pending) { e.preventDefault(); enviar(); } }}
          className="w-full resize-none rounded-xl border border-[#D4D4D4] bg-white p-3 text-[16px] text-[#08090B] caret-[#08090B] outline-none focus:border-[#E10600]" style={{ color: "#08090B", WebkitTextFillColor: "#08090B" }} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px]" style={{ color: dim, WebkitTextFillColor: dim }}>{texto.length}/1000</span>
          <button type="submit" disabled={pending || !texto.trim()} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#E10600] px-5 text-[14px] font-extrabold disabled:opacity-50" style={{ color: "#fff", WebkitTextFillColor: "#fff" }} data-testid="equipe-enviar">
            <Send className="h-4 w-4" aria-hidden /> {pending ? "Enviando…" : "Enviar"}
          </button>
        </div>
        {erro && <p role="alert" className="text-[12.5px] font-semibold text-[#ff8a84]">{erro}</p>}
      </form>
      <span className="sr-only" style={{ color: cor }}>Conversa com a Equipe</span>
    </div>
  );
}
