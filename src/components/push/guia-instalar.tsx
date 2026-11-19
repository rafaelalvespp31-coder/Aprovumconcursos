"use client";

import { useState } from "react";
import { isIos } from "./use-push";

/** Passo a passo para colocar o APROVUM como ícone na tela inicial (Android ou iPhone). */
export function GuiaInstalar({ className = "" }: { className?: string }) {
  const [aba, setAba] = useState<"android" | "ios">(() => (typeof navigator !== "undefined" && isIos() ? "ios" : "android"));
  return (
    <div className={className} data-testid="guia-instalar">
      <div className="flex gap-2" role="tablist" aria-label="Seu celular">
        {(["android", "ios"] as const).map((t) => (
          <button key={t} type="button" role="tab" aria-selected={aba === t} onClick={() => setAba(t)} className={`rounded-full border px-3 py-1 text-[12.5px] font-bold ${aba === t ? "border-current bg-white text-black" : "border-current/40"}`}>
            {t === "android" ? "Android" : "iPhone (iOS)"}
          </button>
        ))}
      </div>
      {aba === "android" ? (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px]">
          <li>Abra o APROVUM no <b>Chrome</b>.</li>
          <li>Toque nos <b>três pontinhos</b> (⋮) no canto de cima.</li>
          <li>Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>).</li>
          <li>Confirme. O ícone da APROVUM aparece na tela do celular.</li>
          <li>Abra pelo ícone e toque no <b>sininho</b> do Mentor para ativar os avisos.</li>
        </ol>
      ) : (
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-[13px]">
          <li>Abra o APROVUM no <b>Safari</b> (não funciona em outros navegadores do iPhone).</li>
          <li>Toque em <b>Compartilhar</b> (o quadrado com a seta para cima).</li>
          <li>Role e toque em <b>Adicionar à Tela de Início</b>, depois em <b>Adicionar</b>.</li>
          <li>Abra o app <b>pelo ícone novo</b> na tela inicial.</li>
          <li>Toque no <b>sininho</b> do Mentor e permita os avisos. (Exige iOS 16.4 ou mais novo.)</li>
        </ol>
      )}
    </div>
  );
}
