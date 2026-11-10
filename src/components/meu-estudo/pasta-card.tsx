"use client";

import { memo } from "react";
import { ChevronRight, EllipsisVertical, Play } from "lucide-react";
import { COR, Marca, glifoDa, PastaIcone, plural, type EstudoFolder } from "./base";

export type AcaoPasta = "abrir" | "renomear" | "aparencia" | "organizar" | "excluir";

interface Props {
  pasta: EstudoFolder;
  aulas: number;
  pct: number;
  indice: number;
  menuAberto: boolean;
  /** Recebeu aula concluída desde a última visita: pulso de conquista. */
  ganhou: boolean;
  /** Nome de view-transition só no card que está abrindo/fechando (continuidade com o cabeçalho da pasta). */
  emTransicao: boolean;
  onMenu: (id: string | null) => void;
  onAcao: (acao: AcaoPasta, pasta: EstudoFolder) => void;
}

export const PastaCard = memo(function PastaCard({ pasta: f, aulas, pct, indice, menuAberto, ganhou, emTransicao, onMenu, onAcao }: Props) {
  const c = COR(f.color);
  const G = glifoDa(f.name, f.icon);
  return (
    <article
      className={`me-card${ganhou ? " me-card-ganhou" : ""}`}
      id={`pasta-${f.id}`}
      data-rev
      style={{ "--c": c.main, "--cd": c.dark, "--tint": c.tint, "--i": Math.min(indice, 7), viewTransitionName: emTransicao ? "me-pasta-vt" : undefined } as React.CSSProperties}
      aria-label={`Pasta ${f.name}`}
      data-testid="card-pasta"
    >
      <Marca Glifo={G} />
      <button type="button" className="me-card-area" onClick={() => onAcao("abrir", f)} aria-label={`Abrir a pasta ${f.name}`} />
      <PastaIcone cor={f.color} Glifo={G} className="me-card-pasta" />
      <div className="me-card-info">
        <h3>{f.name}</h3>
        <p><Play size={12} fill="currentColor" aria-hidden /> {plural(aulas, "aula", "aulas")} <i aria-hidden>•</i> {pct}% concluído</p>
        <span className="me-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% concluído`}><i style={{ width: `${pct}%` }} /></span>
        <button type="button" className="me-ver" onClick={() => onAcao("abrir", f)}>Ver aulas <ChevronRight size={16} aria-hidden /></button>
      </div>
      <div className="me-menu" data-me-menu>
        <button type="button" className="me-mais" aria-label={`Ações da pasta ${f.name}`} aria-haspopup="menu" aria-expanded={menuAberto} onClick={() => onMenu(menuAberto ? null : f.id)}>
          <EllipsisVertical size={20} aria-hidden />
        </button>
        {menuAberto && (
          <div className="me-menu-lista" role="menu">
            <button role="menuitem" type="button" onClick={() => onAcao("renomear", f)}>Renomear pasta</button>
            <button role="menuitem" type="button" onClick={() => onAcao("aparencia", f)}>Alterar cor e ícone</button>
            <button role="menuitem" type="button" onClick={() => onAcao("organizar", f)}>Organizar aulas</button>
            <button role="menuitem" type="button" className="me-perigo" onClick={() => onAcao("excluir", f)}>Excluir pasta</button>
          </div>
        )}
      </div>
    </article>
  );
});
