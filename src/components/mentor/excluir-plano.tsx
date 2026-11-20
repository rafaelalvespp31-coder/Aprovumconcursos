"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { setMentorGoalAction } from "@/app/(app)/mentor/actions";

/** Apaga as marcações de "dia feito" deste aparelho para o plano novo começar limpo. */
function limparMarcas() {
  try {
    const k: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const n = localStorage.key(i); if (n?.startsWith("aprovum_plano_feito_")) k.push(n); }
    k.forEach((n) => localStorage.removeItem(n));
  } catch { /* sem armazenamento */ }
}

/** Excluir o plano de estudo, com confirmação em dois passos. */
export function ExcluirPlano({ onDone, tema = "claro" }: { onDone: () => void; tema?: "claro" | "escuro" }) {
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const apagar = () => {
    setErro(null);
    start(async () => {
      const r = await setMentorGoalAction("");
      if (!r.ok) return setErro(r.error);
      limparMarcas();
      setConfirmar(false);
      onDone();
    });
  };
  const cor = tema === "escuro" ? { color: "#ff8a84", WebkitTextFillColor: "#ff8a84" } : { color: "#b3261e", WebkitTextFillColor: "#b3261e" };
  if (!confirmar) {
    return (
      <button type="button" onClick={() => setConfirmar(true)} className="inline-flex min-h-9 w-fit items-center gap-1.5 text-[12px] font-semibold underline-offset-2 hover:underline" style={cor} data-testid="plano-excluir">
        <Trash2 className="h-3.5 w-3.5" aria-hidden /> Excluir plano de estudo
      </button>
    );
  }
  return (
    <div role="alertdialog" aria-label="Confirmar exclusão do plano" className="flex flex-col gap-2 rounded-xl border border-[#E10600]/50 bg-[#E10600]/10 p-3" data-testid="plano-excluir-confirma">
      <p className="text-[13px] font-semibold" style={tema === "escuro" ? { color: "#fff", WebkitTextFillColor: "#fff" } : { color: "#08090B", WebkitTextFillColor: "#08090B" }}>Excluir o seu plano de estudo? O calendário e as marcações de dias concluídos deste aparelho serão apagados.</p>
      <div className="flex gap-2">
        <button type="button" onClick={apagar} disabled={pending} className="min-h-10 rounded-lg bg-[#E10600] px-3.5 text-[13px] font-bold disabled:opacity-60" style={{ color: "#fff", WebkitTextFillColor: "#fff" }} data-testid="plano-excluir-sim">{pending ? "Excluindo…" : "Sim, excluir"}</button>
        <button type="button" onClick={() => setConfirmar(false)} disabled={pending} className="min-h-10 rounded-lg border border-[#B8B8BF] px-3.5 text-[13px] font-bold" style={tema === "escuro" ? { color: "#fff", WebkitTextFillColor: "#fff" } : { color: "#08090B", WebkitTextFillColor: "#08090B" }}>Cancelar</button>
      </div>
      {erro && <p role="alert" className="text-[12.5px] font-semibold" style={cor}>{erro}</p>}
    </div>
  );
}
