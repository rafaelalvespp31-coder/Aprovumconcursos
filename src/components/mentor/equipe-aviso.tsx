"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { equipeNaoLidasAction } from "@/app/(app)/mentor/actions";

const KEY = "na:equipe-aviso:";

/** A cada login, convida o aluno a falar com a Equipe (e avisa se há resposta nova). */
export function EquipeAviso({ loginId }: { loginId: string }) {
  const [aberto, setAberto] = useState(false);
  const [respostas, setRespostas] = useState(0);

  useEffect(() => {
    let vivo = true;
    try { if (localStorage.getItem(KEY + "ultimo") === loginId) return; } catch { /* segue */ }
    const t = setTimeout(() => {
      equipeNaoLidasAction().then((n) => { if (vivo) { setRespostas(n); setAberto(true); } }).catch(() => { if (vivo) setAberto(true); });
    }, 1800);
    return () => { vivo = false; clearTimeout(t); };
  }, [loginId]);

  if (!aberto) return null;
  const fechar = () => {
    try { localStorage.setItem(KEY + "ultimo", loginId); } catch { /* ok */ }
    setAberto(false);
  };
  const W = { color: "#fff", WebkitTextFillColor: "#fff" } as const;
  return (
    <div role="dialog" aria-label="Fale com a nossa Equipe" data-testid="equipe-aviso"
      className="fixed inset-x-3 top-3 z-[70] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[#E10600]/60 bg-[#0b0b0d] p-3.5 shadow-2xl">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#E10600]" style={W}><MessageCircle className="h-5 w-5" aria-hidden /></span>
      <span className="min-w-0 flex-1">
        <b className="block text-[15px] font-extrabold" style={W}>Fale com a nossa Equipe</b>
        <span className="block text-[12.5px]" style={{ color: "rgba(255,255,255,.75)", WebkitTextFillColor: "rgba(255,255,255,.75)" }}>
          {respostas > 0 ? `A Equipe respondeu você (${respostas} ${respostas === 1 ? "mensagem nova" : "mensagens novas"}).` : "Tem dúvida? Mande a sua pergunta, a gente responde."}
        </span>
      </span>
      <Link href="/mentor#equipe" onClick={fechar} className="shrink-0 rounded-xl bg-[#E10600] px-3.5 py-2.5 text-[13px] font-extrabold" style={W}>{respostas > 0 ? "Ver" : "Falar"}</Link>
      <button type="button" onClick={fechar} aria-label="Fechar aviso" className="absolute -right-1 -top-1 grid size-7 place-items-center rounded-full bg-white/15" style={W}><X className="h-3.5 w-3.5" aria-hidden /></button>
    </div>
  );
}
