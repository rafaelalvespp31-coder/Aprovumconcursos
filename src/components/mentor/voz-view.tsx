"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { Mic, PhoneOff, Timer } from "lucide-react";
import { formatClock } from "@/domain/mentor/voice";
import { VozOrbe, type Bands } from "./voz-orbe";
import type { Conexao } from "./skull-orb-fx";

export type Fase = "carregando" | "plano" | "indisponivel" | "esgotado" | "pronto" | "conectando" | "ao-vivo" | "encerrada" | "erro";

const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};
/** Orbe de 280px no computador e 200px no celular. */
const orbSize = () => (window.innerWidth < 640 ? 200 : 280);

/** Tela da aba Voz (só apresentação): o estado e o áudio vêm de `MentorVoz`. */
export function VozView({
  fase,
  left,
  limit,
  unlimited = false,
  speaking,
  msg,
  level,
  base = "",
  onStart,
  onStop,
}: {
  fase: Fase;
  left: number;
  limit: number;
  unlimited?: boolean;
  speaking: boolean;
  msg: string | null;
  level: () => Bands;
  base?: string;
  onStart: () => void;
  onStop: () => void;
}) {
  const size = useSyncExternalStore(subscribeResize, orbSize, () => 280);
  const live = fase === "ao-vivo";
  const used = Math.max(0, limit - left);
  const conn: Conexao = fase === "ao-vivo" ? "live" : fase === "conectando" ? "connecting" : fase === "erro" ? "error" : "off";
  const pct = Math.round(Math.min(100, (used / limit) * 100));
  const showTime = fase === "pronto" || fase === "conectando" || live || fase === "encerrada" || fase === "erro" || fase === "esgotado";

  const title =
    fase === "conectando"
      ? "Conectando…"
      : live
        ? speaking
          ? "Mentor falando…"
          : "Pode falar, estou ouvindo"
        : fase === "plano"
          ? "Mentor por voz"
          : fase === "indisponivel"
            ? "Mentor por voz indisponível"
            : fase === "esgotado"
              ? "Seus 3 minutos acabaram"
              : "Fale com o Mentor";
  const sub =
    fase === "carregando"
      ? "Carregando…"
      : live
        ? "Pergunte sobre qualquer matéria do seu concurso. Se quiser, interrompa o Mentor falando."
        : fase === "plano"
          ? "Tire dúvidas falando, em tempo real, com o Mentor. Disponível nos planos pagos: 3 minutos por dia."
          : fase === "indisponivel"
            ? "Este recurso ainda não está ativo. Tente mais tarde."
            : fase === "esgotado"
              ? (msg ?? "Eles voltam amanhã. Enquanto isso, use a aba Conversar para tirar dúvidas por texto.")
              : "Só dúvidas de estudo. Sua conversa é por voz e dura até 3 minutos por dia.";

  return (
    <div className="voz" data-testid="mentor-voz" data-fase={fase}>
      <div className="voz-hero" style={{ paddingTop: Math.round(size * 0.92) }}>
        <VozOrbe level={level} dim={fase === "plano" || fase === "indisponivel" || fase === "carregando"} size={size} conn={conn} />
        <h3 className="voz-titulo" aria-live="polite">
          {title}
        </h3>
        <p className="voz-texto">{sub}</p>
      </div>

      {showTime && unlimited && (
        <div className="voz-tempo" data-testid="voz-tempo">
          <p className="voz-restam" role="status">
            <Timer className="h-[18px] w-[18px]" aria-hidden /> Sem limite de tempo (admin)
          </p>
        </div>
      )}
      {showTime && !unlimited && (
        <div className="voz-tempo" data-testid="voz-tempo">
          <p className="voz-restam" data-aviso={live && left <= 20 ? "1" : undefined} role="timer" aria-label="Tempo de voz que resta hoje">
            <Timer className="h-[18px] w-[18px]" aria-hidden /> {formatClock(left)} restantes hoje
          </p>
          <div className="voz-uso">
            <span>Tempo diário usado</span>
            <span>
              <b>{formatClock(used)}</b> de {formatClock(limit)}
            </span>
          </div>
          <div className="voz-barra" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label="Tempo diário usado">
            <span style={{ width: `${pct}%` }} />
            <em>{pct}%</em>
          </div>
        </div>
      )}

      {fase === "plano" && (
        <Link href={`${base}/plano`} className="voz-cta" data-testid="voz-ver-planos">
          Ver planos
        </Link>
      )}
      {(fase === "pronto" || fase === "encerrada" || fase === "erro" || fase === "conectando") && (
        <button type="button" onClick={onStart} disabled={fase === "conectando"} className="voz-cta" data-testid="voz-iniciar">
          <Mic className="h-5 w-5" aria-hidden /> {fase === "conectando" ? "Conectando…" : "Falar com o Mentor"}
        </button>
      )}
      {live && (
        <button type="button" onClick={onStop} className="voz-cta is-fim" data-testid="voz-encerrar">
          <PhoneOff className="h-5 w-5" aria-hidden /> Encerrar conversa
        </button>
      )}
      {msg && fase !== "esgotado" && (
        <p role="alert" className="voz-erro">
          {msg}
        </p>
      )}
      {fase !== "carregando" && fase !== "indisponivel" && <p className="voz-rodape">Limite diário reinicia às 00:00 BRT.</p>}
    </div>
  );
}
