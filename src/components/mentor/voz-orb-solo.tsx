"use client";

import { SILENCE, VozOrbe, type Bands } from "./voz-orbe";
import type { Conexao } from "./skull-orb-fx";
import type { Fase } from "./voz-view";

const AVISO: Partial<Record<Fase, string>> = {
  plano: "Mentor por voz: planos pagos",
  esgotado: "Seus 3 minutos de hoje acabaram",
  indisponivel: "Voz indisponível agora",
};

const rotulo = (fase: Fase, speaking: boolean) =>
  fase === "ao-vivo" ? (speaking ? "Mentor falando" : "Mentor ouvindo") : fase === "conectando" ? "Conectando…" : "Mentor";

/**
 * O Mentor na barra de estudo: a própria orbe animada (sem cartão ao redor), com a etiqueta "Mentor"
 * para o aluno saber quem é. Ativa, reage à voz; tocar encerra. Parada, tocar inicia a conversa.
 */
export function VozOrbSolo({
  fase, speaking = false, msg, level, onStart, onClose, size = 96,
}: {
  size?: number;
  fase: Fase;
  speaking?: boolean;
  msg: string | null;
  level: () => Bands;
  onStart: () => void;
  onClose: () => void;
}) {
  const conn: Conexao = fase === "ao-vivo" ? "live" : fase === "conectando" ? "connecting" : fase === "erro" ? "error" : "off";
  const aviso = fase === "erro" && msg ? msg : msg && fase === "pronto" ? msg : AVISO[fase];
  const parado = fase === "erro" || fase === "encerrada" || fase === "pronto";
  return (
    <div className="vz-solo" data-testid="mentor-orb-solo" data-fase={fase} style={{ width: size }}>
      <button type="button" className="vz-solo-orb" style={{ width: size, height: size }} onClick={parado ? onStart : onClose} aria-label={fase === "ao-vivo" ? "Encerrar a conversa com o Mentor" : parado ? "Falar com o Mentor" : "Fechar o Mentor"}>
        <VozOrbe level={level} dim={fase === "plano" || fase === "indisponivel" || fase === "esgotado"} size={size} conn={conn} />
      </button>
      <span className="vz-solo-rotulo" aria-live="polite">{rotulo(fase, speaking)}</span>
      {aviso && <p className="vz-solo-aviso" role="status">{aviso}</p>}
    </div>
  );
}

/** Orbe parada (antes de tocar): mesma aparência, sem áudio. */
export function VozOrbRepouso({ onStart, size = 96 }: { onStart: () => void; size?: number }) {
  return (
    <div className="vz-solo" data-testid="mentor-orb-repouso" style={{ width: size }}>
      <button type="button" className="vz-solo-orb" style={{ width: size, height: size }} onClick={onStart} aria-label="Falar com o Mentor por voz" data-testid="st-mentor">
        <VozOrbe level={() => SILENCE} size={size} conn="live" />
      </button>
      <span className="vz-solo-rotulo">Mentor</span>
    </div>
  );
}
