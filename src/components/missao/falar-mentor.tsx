"use client";

import { useState } from "react";
import { Loader2, Mic, PhoneOff } from "lucide-react";
import { MentorVoz, type EstadoVoz } from "@/components/mentor/mentor-voz";
import type { Bands, Conexao } from "@/components/mentor/skull-orb-fx";

const AVISO: Partial<Record<EstadoVoz["fase"], string>> = {
  plano: "Mentor por voz: planos pagos",
  esgotado: "Seus 3 minutos de hoje acabaram",
  indisponivel: "Voz indisponível agora",
};

/**
 * Botão "Falar com o Mentor". Ao tocar, abre a conversa por voz de sempre (sem tela própria): a energia real do áudio
 * vai para o fogo do Mentor por `onNivel`, e `onConn` diz em que fase a conversa está. Tocar de novo encerra.
 */
export function FalarComMentor({ ativo, onAtivo, onNivel, onConn }: { ativo: boolean; onAtivo: (v: boolean) => void; onNivel: (fn: (() => Bands) | null) => void; onConn: (c: Conexao) => void }) {
  const [e, setE] = useState<EstadoVoz | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const fase = ativo ? e?.fase ?? "carregando" : "pronto";
  const aoVivo = fase === "ao-vivo";
  const conectando = ativo && (fase === "carregando" || fase === "conectando");

  const estado = (x: EstadoVoz) => {
    setE(x);
    onConn(x.fase === "ao-vivo" ? "live" : x.fase === "conectando" ? "connecting" : x.fase === "erro" ? "error" : "live");
    // plano gratuito, saldo esgotado ou falha: a sessão não abre, então o botão volta a ficar livre
    if (x.fase === "plano" || x.fase === "esgotado" || x.fase === "indisponivel" || x.fase === "erro" || x.fase === "encerrada") {
      setAviso(x.msg ?? AVISO[x.fase] ?? null);
      onNivel(null);
      queueMicrotask(() => onAtivo(false));
    }
  };

  return (
    <div className="cm-falar-caixa">
      {ativo && (
        <MentorVoz
          semTela
          autoStart
          boasVindas
          onEstado={estado}
          onLevel={onNivel}
        />
      )}
      <button
        type="button"
        className="cm-falar"
        data-estado={aoVivo ? "ao-vivo" : conectando ? "conectando" : "parado"}
        aria-pressed={aoVivo}
        disabled={conectando}
        onClick={() => {
          if (ativo) {
            onNivel(null);
            onConn("live");
            onAtivo(false);
          } else {
            setE(null);
            setAviso(null);
            onAtivo(true);
          }
        }}
      >
        {conectando ? <Loader2 size={17} className="cm-gira" aria-hidden /> : aoVivo ? <PhoneOff size={17} aria-hidden /> : <Mic size={17} aria-hidden />}
        <span>{conectando ? "Conectando…" : aoVivo ? "Encerrar conversa" : "Falar com o Mentor"}</span>
      </button>
      <p className="cm-falar-info" role="status" aria-live="polite">
        {aoVivo ? (e?.speaking ? "Mentor falando" : "Mentor ouvindo") : ativo ? null : aviso}
      </p>
    </div>
  );
}
