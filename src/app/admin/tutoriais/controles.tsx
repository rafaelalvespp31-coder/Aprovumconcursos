"use client";
import { useState, useTransition } from "react";

export function AlternarTutorial({ id, ativo, acao }: { id: string; ativo: boolean; acao: (i: { id: string; ativo: boolean }) => Promise<{ ok: boolean; error?: string }> }) {
  const [on, setOn] = useState(ativo);
  const [erro, setErro] = useState<string | null>(null);
  const [pend, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={on ? "Desativar tutorial" : "Ativar tutorial"}
        disabled={pend}
        data-testid={`tutorial-${id}`}
        onClick={() => start(async () => { const r = await acao({ id, ativo: !on }); if (r.ok) { setOn(!on); setErro(null); } else setErro(r.error ?? "Erro"); })}
        className={`min-h-[44px] rounded-full border px-4 text-xs font-bold ${on ? "border-black bg-black text-white" : "border-linha bg-white text-black"}`}
      >
        {on ? "ATIVO" : "DESATIVADO"}
      </button>
      {erro && <span role="alert" className="text-xs text-red-600">{erro}</span>}
    </span>
  );
}
