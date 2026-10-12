"use client";

import { useState, useTransition } from "react";
import { flagOutdatedAction } from "./actions";
import { DNotice, dButton, dInput, dLabel } from "./ui";

export function LegalUpdateForm() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "erro"; text: string } | null>(null);
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_140px]"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          const r = await flagOutdatedAction(String(f.get("norm") ?? ""), String(f.get("article") ?? ""), String(f.get("details") ?? ""));
          setMsg(r.ok ? { tone: "ok", text: `${r.data} questão(ões) sinalizada(s) para revisão.` } : { tone: "erro", text: r.error ?? "Erro." });
        });
      }}
    >
      <div>
        <label className={dLabel} htmlFor="lu-norm">Norma (número)</label>
        <input id="lu-norm" name="norm" required className={dInput} placeholder="DL 2.848/1940" />
      </div>
      <div>
        <label className={dLabel} htmlFor="lu-art">Artigo (opcional)</label>
        <input id="lu-art" name="article" className={dInput} placeholder="121" />
      </div>
      <div className="sm:col-span-2">
        <label className={dLabel} htmlFor="lu-det">O que mudou</label>
        <input id="lu-det" name="details" required minLength={10} className={dInput} placeholder="Ex.: Lei nº … alterou a pena do § 2º" />
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className={dButton("secundario")} disabled={pending}>{pending ? "Sinalizando…" : "Sinalizar questões afetadas"}</button>
        {msg && <DNotice tone={msg.tone}>{msg.text}</DNotice>}
      </div>
    </form>
  );
}
