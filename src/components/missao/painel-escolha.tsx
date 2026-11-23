"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { dividirPorGrupo, filtrarMaterias, type ConcursoCard, type GrupoMateria, type MateriaCatalogo } from "@/domain/missao/materias";
import { ConcursosPublicados } from "./concursos-publicados";
import { MateriasCatalogo } from "./materias-catalogo";
import "./materias-catalogo.css";

const dobrar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Aba = "tudo" | "concursos" | GrupoMateria;

/** Escolha na Central: concursos com edital pronto e as matérias do catálogo (básicas e específicas), com busca e atalhos de seção. */
export function PainelEscolha({ concursos, materias }: { concursos: ConcursoCard[]; materias: MateriaCatalogo[] }) {
  const [termo, setTermo] = useState("");
  const [aba, setAba] = useState<Aba>("tudo");
  const rolagem = useRef<HTMLDivElement>(null);
  const grupos = useMemo(() => dividirPorGrupo(materias), [materias]);
  const concursosVisiveis = useMemo(() => {
    const palavras = dobrar(termo).split(/\s+/).filter(Boolean);
    return palavras.length ? concursos.filter((c) => palavras.every((p) => dobrar(`${c.nome} ${c.orgao} ${c.cargo ?? ""} ${c.uf ?? ""}`).includes(p))) : concursos;
  }, [concursos, termo]);
  const materiasVisiveis = useMemo(() => filtrarMaterias(materias, termo), [materias, termo]);
  const nada = !!termo.trim() && !concursosVisiveis.length && !materiasVisiveis.length;

  if (!concursos.length && !materias.length) return null;

  const abas: Array<[Aba, string, number]> = [["tudo", "Tudo", concursos.length + materias.length]];
  if (concursos.length) abas.push(["concursos", "Concursos", concursos.length]);
  if (grupos.basicas.length) abas.push(["basicas", "Básicas", grupos.basicas.length]);
  if (grupos.especificas.length) abas.push(["especificas", "Específicas", grupos.especificas.length]);
  // Buscando, a busca vale para tudo (a aba não esconde resultado).
  const vista: Aba = termo.trim() ? "tudo" : aba;
  const trocar = (a: Aba) => {
    setAba(a);
    rolagem.current?.scrollTo({ top: 0 });
  };

  return (
    <div className="mc-painel">
      <div className="mc-ferramentas">
        <div className="mc-abas" role="group" aria-label="Mostrar">
          {abas.map(([id, rotulo, n]) => (
            <button key={id} type="button" aria-pressed={vista === id} onClick={() => trocar(id)}>{rotulo} <span>{n}</span></button>
          ))}
        </div>
        <label className="mc-busca">
          <Search size={15} aria-hidden />
          <span className="sr-only">Buscar matéria, assunto ou concurso</span>
          <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar matéria ou assunto" autoComplete="off" enterKeyHint="search" />
        </label>
      </div>
      <div className="mc-rolagem" ref={rolagem} data-testid="painel-rolagem">
        {(vista === "tudo" || vista === "concursos") && <ConcursosPublicados concursos={concursosVisiveis} />}
        {vista !== "concursos" && <MateriasCatalogo materias={materias} termo={termo} grupos={vista === "basicas" || vista === "especificas" ? [vista] : undefined} />}
        <p className="mc-vazio" role="status" aria-live="polite">{nada ? `Nada encontrado para “${termo.trim()}”.` : ""}</p>
      </div>
    </div>
  );
}
