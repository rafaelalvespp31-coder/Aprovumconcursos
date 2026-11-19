"use client";

import { Bell, BellOff } from "lucide-react";
import { usePush } from "@/components/push/use-push";
import { GuiaInstalar } from "@/components/push/guia-instalar";

/** Liga os avisos no celular (Web Push): chegam mesmo com o app fechado, para quem instalou o ícone na tela inicial. */
export function AvisosPush() {
  const { estado, msg, busy, ligar, desligar } = usePush();
  return (
    <div data-testid="avisos-push">
      <p className="mb-3 text-[12px] text-[#5C5C5C]">Receba no celular lembretes de revisão, concursos novos e novidades da APROVUM, mesmo com o app fechado.</p>
      {estado === "ios-instalar" && (
        <p className="mb-2 rounded-xl border border-[#E4E4E4] bg-[#F7F7F8] p-3 text-[13px]">No iPhone, os avisos só funcionam com o app instalado na Tela de Início. Siga o passo a passo abaixo.</p>
      )}
      {estado === "sem-suporte" && <p className="text-[13px] text-[#5C5C5C]">Este navegador não aceita avisos no celular.</p>}
      {estado === "bloqueado" && <p className="text-[13px] text-[#5C5C5C]">Os avisos estão bloqueados neste aparelho. Libere nas configurações do navegador/app para a APROVUM e volte aqui.</p>}
      {(estado === "desligado" || estado === "ligado") && (
        <button type="button" onClick={estado === "ligado" ? desligar : ligar} disabled={busy} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-[13px] font-bold active:scale-95 disabled:opacity-60 ${estado === "ligado" ? "border border-[#D8D8D8]" : "bg-[#0A0A0A] text-white"}`}>
          {estado === "ligado" ? <BellOff className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />}
          {busy ? "Aguarde…" : estado === "ligado" ? "Desativar avisos neste aparelho" : "Ativar avisos no celular"}
        </button>
      )}
      {estado === "ligado" && <p className="mt-2 text-[12px] font-semibold text-green-700">Avisos ativos neste aparelho.</p>}
      {msg && estado !== "ligado" && <p className="mt-2 text-[12px] text-red-700" role="alert">{msg}</p>}
      <details className="mt-3 text-[13px]">
        <summary className="cursor-pointer font-bold">Como colocar o app como ícone no celular</summary>
        <GuiaInstalar className="mt-2" />
      </details>
    </div>
  );
}
