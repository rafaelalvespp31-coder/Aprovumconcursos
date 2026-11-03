"use client";

import { useState, useTransition } from "react";
import { Trophy } from "lucide-react";
import { AvatarStage } from "./avatar-stage";
import { AvatarRequestBox, type AvatarRequestInfo, type RequestAction } from "./avatar-request";
import { GENDERS, switchGender, type AvatarConfig, type AvatarItem, type Gender } from "@/domain/avatar/catalog";

export type AvatarSaveResult = { ok: true; config: AvatarConfig } | { ok: false; error: string };

export interface PainelAvatarProps {
  name: string | null;
  initial: AvatarConfig;
  saved: boolean;
  items: AvatarItem[];
  progress: { level: number; xp: number; levelProgress: number; xpNext?: number; rank?: { position: number | null; total: number } | null };
  save: (config: AvatarConfig) => Promise<AvatarSaveResult>;
  request: AvatarRequestInfo | null;
  requestAction: RequestAction;
  /** Só galeria/testes. */
  mannequin?: boolean;
}

const fmt = (n: number) => n.toLocaleString("pt-BR");

/** Painel: card do avatar (cenário + personagem + dados do aluno) e "Solicitar meu avatar". */
export function PainelAvatar({ name, initial, items, progress, save, request, requestAction, mannequin }: PainelAvatarProps) {
  const [config, setConfig] = useState(initial);
  const [, start] = useTransition();
  const xpNext = progress.xpNext ?? progress.xp;
  const pct = xpNext > 0 ? Math.min(100, Math.round((progress.xp / xpNext) * 100)) : 0;
  const pickGender = (g: Gender) => {
    if (g === config.gender) return;
    const next = switchGender(config, g, items);
    setConfig(next);
    start(async () => {
      const r = await save(next);
      if (r.ok) setConfig(r.config);
    });
  };

  return (
    <section className="avc avc-so-card" aria-label="Seu avatar" data-testid="painel-avatar">
      <div className="avc-palco">
        <AvatarStage config={config} items={items} interactive className="avc-palco-arte" mannequin={mannequin} />
        <div className="avc-card" data-testid="avatar-info">
          <p className="avc-card-nome">{name ?? "Aluno APROVUM"}</p>
          <p className="avc-card-nivel">
            Nível <b>{progress.level}</b>
          </p>
          <hr />
          <p className="avc-card-rot">XP Total</p>
          <p className="avc-card-val">
            <span data-testid="avatar-xp">{fmt(progress.xp)}</span> / {fmt(xpNext)}
          </p>
          <div className="avc-card-barra" role="progressbar" aria-label="XP até o próximo nível" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${pct}%` }} />
          </div>
          <hr />
          <p className="avc-card-rot">Posição no Ranking</p>
          <p className="avc-card-val avc-card-rank" data-testid="avatar-ranking">
            <Trophy aria-hidden /> {progress.rank?.position ? `#${fmt(progress.rank.position)}` : "—"}
          </p>
          <p className="avc-card-frase">“Disciplina é o caminho da vitória.”</p>
        </div>
        <div className="avc-genero" role="radiogroup" aria-label="Avatar">
          {GENDERS.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={config.gender === x.id} className={config.gender === x.id ? "is-on" : ""} onClick={() => pickGender(x.id)} data-testid={`avatar-genero-${x.id}`}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <AvatarRequestBox initial={request} action={requestAction} />
    </section>
  );
}
