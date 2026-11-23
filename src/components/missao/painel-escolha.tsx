"use client";

import { useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { dividirPorGrupo, filtrarMaterias, type ConcursoCard, type MateriaCatalogo } from "@/domain/missao/materias";
import { ConcursosPublicados } from "./concursos-publicados";
import { MateriasCatalogo } from "./materias-catalogo";
import "./materias-catalogo.css";

const dobrar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Escolha na Central: concursos com edital pronto e as matérias do catálogo (básicas e específicas), com busca e atalhos de seção. */
export function PainelEscolha({ concursos, materias }: { concursos: ConcursoCard[]; materias: MateriaCatalogo[] }) {
  const [termo, setTermo] = useState("");
  const rolagem = useRef<HTMLDivElement>(null);
  const grupos = useMemo(() => dividirPorGrupo(materias), [materias]);
  const concursosVisiveis = useMemo(() => {
    const palavras = dobrar(termo).split(/\s+/).filter(Boolean);
    return palavras.length ? concursos.filter((c) => palavras.every((p) => dobrar(`${c.nome} ${c.orgao} ${c.cargo ?? ""} ${c.uf ?? ""}`).includes(p))) : concursos;
  }, [concursos, termo]);
  const materiasVisiveis = useMemo(() => filtrarMaterias(materias, termo), [materias, termo]);
  const nada = !!termo.trim() && !concursosVisiveis.length && !materiasVisiveis.length;

  if (!concursos.length && !materias.length) return null;

  const atalhos: Array<[string, string, number]> = [];
  if (concursos.length) atalhos.push(["concursos", "Concursos", concursos.length]);
  if (grupos.basicas.length) atalhos.push(["basicas", "Básicas", grupos.basicas.length]);
  if (grupos.especificas.length) atalhos.push(["especificas", "Específicas", grupos.especificas.length]);

  const irPara = (id: string) => {
    const raiz = rolagem.current;
    const alvo = raiz?.querySelector<HTMLElement>(`#mc-sec-${id}`);
    if (!raiz || !alvo) return;
    const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    raiz.scrollTo({ top: alvo.offsetTop - raiz.offsetTop, behavior: reduzido ? "auto" : "smooth" });
  };

  return (
    <div className="mc-painel">
      <div className="mc-ferramentas">
        <nav className="mc-atalhos" aria-label="Ir para">
          {atalhos.map(([id, rotulo, n]) => (
            <button key={id} type="button" onClick={() => irPara(id)}>{rotulo} <span>{n}</span></button>
          ))}
        </nav>
        <label className="mc-busca">
          <Search size={15} aria-hidden />
          <span className="sr-only">Buscar matéria, assunto ou concurso</span>
          <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder="Buscar matéria ou assunto" autoComplete="off" enterKeyHint="search" />
        </label>
      </div>
      <div className="mc-rolagem" ref={rolagem} data-testid="painel-rolagem">
        <ConcursosPublicados concursos={concursosVisiveis} />
        <MateriasCatalogo materias={materias} termo={termo} />
        <p className="mc-vazio" role="status" aria-live="polite">{nada ? `Nada encontrado para “${termo.trim()}”.` : ""}</p>
      </div>
    </div>
  );
}
