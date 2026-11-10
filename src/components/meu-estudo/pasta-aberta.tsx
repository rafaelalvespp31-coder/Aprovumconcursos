"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Check, ChevronRight, FileText, FolderInput, ListChecks, Play, SlidersHorizontal } from "lucide-react";
import { isStudied, StudyAvatar, TrailRow } from "@/app/(app)/trilhas/folder-board";
import { moveTrailAction, type FolderResult } from "@/app/(app)/trilhas/folder-actions";
import { COR, Marca, dataCurta, glifoDa, PastaIcone, plural, type EstudoFolder, type EstudoTrail } from "./base";

interface Props {
  /** null = área "Sem pasta". */
  pasta: EstudoFolder | null;
  aulas: EstudoTrail[];
  folders: EstudoFolder[];
  pending: boolean;
  modoInicial?: Modo;
  act: (fn: () => Promise<FolderResult>, after?: () => void) => void;
  onVoltar: () => void;
}
type Modo = "ver" | "organizar" | "selecionar";

/** Visão interna da pasta: resumo, lista de aulas e os modos de organização (mesmas ações de sempre). */
export function PastaAberta({ pasta, aulas, folders, pending, modoInicial = "ver", act, onVoltar }: Props) {
  const [modo, setModo] = useState<Modo>(modoInicial);
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [destino, setDestino] = useState("");
  const cor = pasta?.color ?? "cinza";
  const c = COR(cor);
  const G = pasta ? glifoDa(pasta.name, pasta.icon) : FileText;
  const feitas = aulas.reduce((s, t) => s + t.progress.done, 0);
  const total = aulas.reduce((s, t) => s + t.progress.total, 0);
  const pct = total ? Math.round((feitas / total) * 100) : 0;
  const proxima = aulas.find((t) => !isStudied(t));
  const ultimo = aulas.reduce<string | null>((m, t) => (t.lastStudiedAt && (!m || t.lastStudiedAt > m) ? t.lastStudiedAt : m), null);
  const destinos = folders.filter((f) => f.id !== pasta?.id);
  const marcar = (id: string) =>
    setMarcadas((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const moverMarcadas = () => {
    const ids = [...marcadas];
    const alvo = destino === "__fora" ? null : destino;
    act(
      async () => {
        for (const id of ids) {
          const r = await moveTrailAction(id, alvo);
          if (!r.ok) return r;
        }
        return { ok: true };
      },
      () => {
        setMarcadas(new Set());
        setDestino("");
        setModo("ver");
      },
    );
  };
  const trocar = (m: Modo) => {
    setModo(modo === m ? "ver" : m);
    setMarcadas(new Set());
  };

  return (
    <section className="me-aberta" style={{ "--c": c.main, "--cd": c.dark, "--tint": c.tint } as React.CSSProperties} aria-label={pasta ? `Pasta ${pasta.name}` : "Aulas sem pasta"} data-testid="pasta-aberta">
      <button type="button" className="me-voltar" onClick={onVoltar}><ArrowLeft size={18} aria-hidden /> Todas as pastas</button>
      <header className="me-aberta-topo" style={{ viewTransitionName: "me-pasta-vt" } as React.CSSProperties}>
        <Marca Glifo={G} />
        <PastaIcone cor={cor} Glifo={G} className="me-aberta-pasta" />
        <div className="me-aberta-info">
          <h2>{pasta ? pasta.name : "Sem pasta"}</h2>
          <p>
            <Play size={12} fill="currentColor" aria-hidden /> {plural(aulas.length, "aula", "aulas")} <i aria-hidden>•</i> {pct}% concluído
            {ultimo && <><i aria-hidden>•</i> último estudo em {dataCurta(ultimo)}</>}
          </p>
          <span className="me-barra" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% concluído`}><i style={{ width: `${pct}%` }} /></span>
        </div>
        {proxima && <Link href={`/trilhas/${proxima.id}`} className="me-nova me-aberta-continuar"><Play size={16} fill="currentColor" aria-hidden /> Continuar estudando</Link>}
      </header>

      {aulas.length > 0 && (
        <div className="me-aberta-modos" role="group" aria-label="Opções de organização">
          <button type="button" className="me-modo" aria-pressed={modo === "organizar"} onClick={() => trocar("organizar")}><SlidersHorizontal size={16} aria-hidden /> Organizar</button>
          <button type="button" className="me-modo" aria-pressed={modo === "selecionar"} onClick={() => trocar("selecionar")}><ListChecks size={16} aria-hidden /> Selecionar várias</button>
        </div>
      )}

      {aulas.length === 0 ? (
        <p className="me-aviso me-aberta-vazia">
          {pasta ? "Nenhuma aula aqui ainda. Abra “Sem pasta” e mova as aulas para cá, ou use “Mover para…” em qualquer aula." : "Tudo organizado: nenhuma aula fora de uma pasta."}
        </p>
      ) : modo === "organizar" ? (
        <ol className="me-lista" data-testid="lista-aulas">
          {aulas.map((t, i) => (
            <TrailRow key={t.id} trail={t} folders={folders} pending={pending} act={act} order={pasta ? { i, total: aulas.length } : undefined} />
          ))}
        </ol>
      ) : (
        <ol className="me-aulas" data-testid="lista-aulas">
          {aulas.map((t, i) => {
            const feito = isStudied(t);
            const conteudo = (
              <>
                <StudyAvatar trail={t} />
                <span className="me-aula-txt">
                  <b>{t.title}</b>
                  <small>
                    {t.bancaLabel} <i aria-hidden>•</i> {t.lastStudiedAt ? `último estudo em ${dataCurta(t.lastStudiedAt)}` : "ainda não estudada"}
                    {t.progress.total > 0 && <> <i aria-hidden>•</i> {t.progress.done}/{t.progress.total} aulas</>}
                  </small>
                </span>
                <span className={`me-status${feito ? " me-status-ok" : ""}`}>{feito ? "Concluída" : t.status.label}</span>
              </>
            );
            return (
              <li key={t.id} style={{ "--i": Math.min(i, 10) } as React.CSSProperties} data-estudado={feito ? "sim" : undefined}>
                {modo === "selecionar" ? (
                  <label className="me-aula">
                    <input type="checkbox" checked={marcadas.has(t.id)} onChange={() => marcar(t.id)} />
                    <span className="me-caixa" aria-hidden><Check size={14} strokeWidth={3.5} /></span>
                    {conteudo}
                  </label>
                ) : (
                  <Link href={`/trilhas/${t.id}`} className="me-aula">
                    {conteudo}
                    <ChevronRight size={18} className="me-aula-seta" aria-hidden />
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {modo === "selecionar" && aulas.length > 0 && (
        <div className="me-lote" data-testid="mover-lote">
          <span>{plural(marcadas.size, "selecionada", "selecionadas")}</span>
          <button type="button" className="me-lote-todas" onClick={() => setMarcadas(marcadas.size === aulas.length ? new Set() : new Set(aulas.map((t) => t.id)))}>
            {marcadas.size === aulas.length ? "Limpar" : "Todas"}
          </button>
          <select value={destino} onChange={(e) => setDestino(e.target.value)} aria-label="Mover para">
            <option value="">Mover para…</option>
            {destinos.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            {pasta && <option value="__fora">Tirar da pasta</option>}
          </select>
          <button type="button" className="me-nova me-nova-sm" disabled={pending || !marcadas.size || !destino} onClick={moverMarcadas}>
            <FolderInput size={16} aria-hidden /> {pending ? "Movendo…" : "Mover"}
          </button>
        </div>
      )}
    </section>
  );
}
