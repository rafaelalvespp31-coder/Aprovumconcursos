"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle, X } from "lucide-react";
import { equipeNovasAction } from "@/app/(app)/mentor/actions";

const KEY = "na:equipe-popup-vistos";
export const ABRIR_EQUIPE = "aprovum:abrir-equipe";
const lerVistos = (): string[] => { try { const v = JSON.parse(localStorage.getItem(KEY) ?? "[]"); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; } catch { return []; } };

/**
 * Pop-up principal da Equipe: assim que a Equipe responde, o card aparece em qualquer tela do app.
 * (Consulta a cada 8 s e ao voltar para a aba; é o que marca a mensagem como "Recebida".)
 */
export function EquipePopup() {
  const router = useRouter();
  const [msg, setMsg] = useState<{ id: string; body: string } | null>(null);
  const vistos = useRef<string[]>([]);

  useEffect(() => {
    let vivo = true;
    vistos.current = lerVistos();
    const buscar = () => {
      if (document.visibilityState !== "visible") return;
      equipeNovasAction().then((lista) => {
        if (!vivo) return;
        // Chat aberto na tela: a resposta já aparece lá, sem pop-up.
        if (document.querySelector('[data-testid="equipe-chat"]')) return;
        const nova = lista.find((m) => !vistos.current.includes(m.id));
        if (nova) setMsg((atual) => atual ?? { id: nova.id, body: nova.body });
      }).catch(() => undefined);
    };
    buscar();
    const t = setInterval(buscar, 8000);
    document.addEventListener("visibilitychange", buscar);
    return () => { vivo = false; clearInterval(t); document.removeEventListener("visibilitychange", buscar); };
  }, []);

  if (!msg) return null;
  const dispensar = () => {
    vistos.current = [...vistos.current, msg.id].slice(-50);
    try { localStorage.setItem(KEY, JSON.stringify(vistos.current)); } catch { /* ok */ }
    setMsg(null);
  };
  const responder = () => {
    dispensar();
    // O Mentor flutuante abre o chat; se não houver Mentor na tela, vai para a página do Mentor.
    const ev = new CustomEvent(ABRIR_EQUIPE, { cancelable: true });
    if (window.dispatchEvent(ev)) router.push("/mentor#equipe");
  };
  const W = { color: "#fff", WebkitTextFillColor: "#fff" } as const;
  return (
    <div role="alertdialog" aria-live="assertive" aria-label="Mensagem da Equipe APROVUM" data-testid="equipe-popup"
      className="fixed inset-x-3 top-3 z-[80] mx-auto max-w-md rounded-2xl border-2 border-[#E10600] bg-[#0b0b0d] p-4 shadow-[0_18px_40px_-8px_rgba(225,6,0,.6)]">
      <button type="button" onClick={dispensar} aria-label="Fechar" className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-white/10" style={W}><X className="h-4 w-4" aria-hidden /></button>
      <p className="flex items-center gap-2 pr-8 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#ff5a52]" style={{ WebkitTextFillColor: "#ff5a52" }}><MessageCircle className="h-4 w-4" aria-hidden /> Mensagem da Equipe APROVUM</p>
      <p className="mt-2 line-clamp-5 whitespace-pre-wrap text-[14.5px] leading-snug" style={W}>{msg.body}</p>
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={responder} className="min-h-11 flex-1 rounded-xl bg-[#E10600] px-4 text-[14px] font-extrabold" style={W} data-testid="equipe-popup-responder">Ver e responder</button>
        <button type="button" onClick={dispensar} className="min-h-11 rounded-xl border border-white/25 px-4 text-[13px] font-bold" style={W}>Depois</button>
      </div>
    </div>
  );
}
