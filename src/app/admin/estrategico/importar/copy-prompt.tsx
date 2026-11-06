"use client";

import { useState } from "react";

export function CopyPromptButton({ prompt }: { prompt: string }) {
  const [state, setState] = useState<"idle" | "ok" | "erro">("idle");
  const [open, setOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setState("ok");
    } catch {
      setState("erro");
      setOpen(true);
    }
    setTimeout(() => setState("idle"), 2500);
  };

  return (
    <div className="rounded-xl border border-linha bg-superficie p-4">
      <p className="t-small font-semibold">1. Gere a análise no ChatGPT</p>
      <p className="mt-1 t-small text-tinta-suave">Copie o comando, cole no ChatGPT, troque o que está entre [colchetes] e cole a resposta abaixo.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={copy} className="rounded-full bg-destaque px-4 py-2 t-small font-semibold text-white">
          {state === "ok" ? "Comando copiado ✓" : "Copiar comando para o ChatGPT"}
        </button>
        <button type="button" onClick={() => setOpen((o) => !o)} className="rounded-full border border-linha px-4 py-2 t-small font-semibold">
          {open ? "Esconder o comando" : "Ver o comando"}
        </button>
      </div>
      {state === "erro" && <p role="alert" className="mt-2 t-small text-[#C81018]">Não consegui copiar automaticamente. Selecione o texto abaixo e copie.</p>}
      {open && <textarea readOnly value={prompt} rows={12} onFocus={(e) => e.currentTarget.select()} className="mt-3 w-full rounded-xl border border-linha bg-white p-3 font-mono text-[12px]" aria-label="Comando para o ChatGPT" />}
    </div>
  );
}
