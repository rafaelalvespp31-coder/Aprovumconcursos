"use client";

import { VozOrbe, type Bands } from "./voz-orbe";
import type { Conexao } from "./skull-orb-fx";
import type { Fase } from "./voz-view";

const AVISO: Partial<Record<Fase, string>> = {
  plano: "Mentor por voz: planos pagos",
  esgotado: "Seus 3 minutos de hoje acabaram",
  indisponivel: "Voz indisponível agora",
  erro: "Não foi possível conectar. Toque para tentar",
};

/** Só a orbe animada (sem cartão): reage à voz; tocar nela encerra a conversa. */
export function VozOrbSolo({ fase, msg, level, onStart, onClose }: { fase: Fase; msg: string | null; level: () => Bands; onStart: () => void; onClose: () => void }) {
  const conn: Conexao = fase === "ao-vivo" ? "live" : fase === "conectando" ? "connecting" : fase === "erro" ? "error" : "off";
  const aviso = fase === "erro" && msg ? msg : AVISO[fase];
  const act = fase === "erro" || fase === "encerrada" || fase === "pronto" ? onStart : onClose;
  return (
    <div className="vz-solo" data-testid="mentor-orb-solo" data-fase={fase}>
      <button type="button" className="vz-solo-orb" onClick={act} aria-label={fase === "ao-vivo" ? "Encerrar conversa com o Mentor" : fase === "erro" || fase === "pronto" || fase === "encerrada" ? "Falar com o Mentor" : "Fechar o Mentor"}>
        <VozOrbe level={level} dim={fase === "plano" || fase === "indisponivel" || fase === "carregando" || fase === "esgotado"} size={150} conn={conn} />
      </button>
      {aviso && <p className="vz-solo-aviso" role="status">{aviso}</p>}
      <span className="sr-only" aria-live="polite">{fase === "ao-vivo" ? "Mentor ouvindo. Pode falar." : fase === "conectando" ? "Conectando ao Mentor." : ""}</span>
    </div>
  );
}
