"use client";

import { useCallback, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Bookmark, ClipboardList, Medal, Scale, Search, Shield, Star } from "lucide-react";
import { ROTULO_CATEGORIA, dividirPorGrupo, filtrarMaterias, type CategoriaConcurso, type ConcursoCard, type GrupoMateria, type MateriaCatalogo } from "@/domain/missao/materias";
import { ConcursosPublicados } from "./concursos-publicados";
import { MateriasCatalogo } from "./materias-catalogo";
import "./materias-catalogo.css";
import "./catalogo-pagina.css";

const dobrar = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

type Aba = "tudo" | "concursos" | "salvos" | CategoriaConcurso | GrupoMateria;

const CHAVE_SALVOS = "aprovum:concursos-salvos";

/** Concursos salvos pelo aluno neste aparelho (localStorage; não vai para o servidor). */
const ouvintes = new Set<() => void>();
const lerSalvos = (): string => { try { return localStorage.getItem(CHAVE_SALVOS) ?? "[]"; } catch { return "[]"; } };
const assinar = (fn: () => void) => {
  ouvintes.add(fn);
  window.addEventListener("storage", fn);
  return () => { ouvintes.delete(fn); window.removeEventListener("storage", fn); };
};
function useSalvos() {
  const bruto = useSyncExternalStore(assinar, lerSalvos, () => "[]");
  const salvos = useMemo<ReadonlySet<string>>(() => {
    try { return new Set((JSON.parse(bruto) as unknown[]).filter((x): x is string => typeof x === "string")); } catch { return new Set<string>(); }
  }, [bruto]);
  const alternar = useCallback((id: string) => {
    let atual: string[] = [];
    try { atual = (JSON.parse(lerSalvos()) as unknown[]).filter((x): x is string => typeof x === "string"); } catch { /* recomeça vazio */ }
    const novo = atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id];
    try { localStorage.setItem(CHAVE_SALVOS, JSON.stringify(novo)); } catch { /* sem armazenamento */ }
    ouvintes.forEach((fn) => fn());
  }, []);
  return { salvos, alternar };
}

const ICONE_CATEGORIA: Record<CategoriaConcurso, ReactNode> = {
  policia: <Shield aria-hidden />,
  militar: <Medal aria-hidden />,
  juridico: <Scale aria-hidden />,
  administrativo: <ClipboardList aria-hidden />,
};
const ORDEM_CATEGORIAS: CategoriaConcurso[] = ["policia", "militar", "administrativo", "juridico"];

/** Escolha na Central: concursos catalogados e as matérias do catálogo, com busca e filtros em chips. */
export function PainelEscolha({ concursos, materias, somente }: { concursos: ConcursoCard[]; materias: MateriaCatalogo[]; /** Mostra só os concursos ou só as matérias (a Central abre cada um por um card). */ somente?: "concursos" | "materias" }) {
  const [termo, setTermo] = useState("");
  const [aba, setAba] = useState<Aba>("tudo");
  const { salvos, alternar } = useSalvos();
  const grupos = useMemo(() => dividirPorGrupo(materias), [materias]);
  const verConcursos = somente ? somente === "concursos" : true;
  const verMaterias = somente ? somente === "materias" : true;

  const concursosVisiveis = useMemo(() => {
    const palavras = dobrar(termo).split(/\s+/).filter(Boolean);
    return concursos.filter((c) => {
      if (aba === "salvos" && !salvos.has(c.id)) return false;
      if ((aba === "policia" || aba === "militar" || aba === "juridico" || aba === "administrativo") && c.categoria !== aba) return false;
      return palavras.every((p) => dobrar(`${c.nome} ${c.orgao} ${c.cargo ?? ""} ${c.uf ?? ""} ${c.banca ?? ""}`).includes(p));
    });
  }, [concursos, termo, aba, salvos]);
  const materiasVisiveis = useMemo(() => filtrarMaterias(materias, termo), [materias, termo]);
  const nada = !!termo.trim() && (!verConcursos || !concursosVisiveis.length) && (!verMaterias || !materiasVisiveis.length);

  if (!concursos.length && !materias.length) return null;

  const categorias = ORDEM_CATEGORIAS.filter((k) => concursos.some((c) => c.categoria === k));
  const chips: Array<[Aba, string, ReactNode]> = [];
  if (somente === "concursos") {
    chips.push(["tudo", "Todos", <Star key="t" aria-hidden fill="currentColor" />]);
    for (const k of categorias) chips.push([k, ROTULO_CATEGORIA[k], ICONE_CATEGORIA[k]]);
    if (salvos.size) chips.push(["salvos", "Salvos", <Bookmark key="s" aria-hidden />]);
  } else if (somente === "materias") {
    chips.push(["tudo", "Todas", <Star key="t" aria-hidden fill="currentColor" />]);
    if (grupos.basicas.length) chips.push(["basicas", "Básicas", null]);
    if (grupos.especificas.length) chips.push(["especificas", "Específicas", null]);
  } else {
    chips.push(["tudo", "Tudo", <Star key="t" aria-hidden fill="currentColor" />]);
    if (concursos.length) chips.push(["concursos", "Concursos", null]);
    if (grupos.basicas.length) chips.push(["basicas", "Básicas", null]);
    if (grupos.especificas.length) chips.push(["especificas", "Específicas", null]);
  }
  // Buscando, a busca vale para tudo; um filtro de categoria de concurso não vale nas matérias.
  const vista: Aba = termo.trim() && (aba === "concursos" || aba === "basicas" || aba === "especificas") ? "tudo" : aba;
  const gruposVisiveis: GrupoMateria[] | undefined = vista === "basicas" || vista === "especificas" ? [vista] : undefined;
  const mostrarConcursos = verConcursos && vista !== "basicas" && vista !== "especificas";
  const mostrarMaterias = verMaterias && vista !== "concursos" && vista !== "salvos" && !categorias.includes(vista as CategoriaConcurso);

  return (
    <div className="mc-painel cat-painel">
      <div className="cat-ferramentas">
        <label className="cat-busca">
          <Search aria-hidden />
          <span className="sr-only">Buscar matéria, assunto ou concurso</span>
          <input type="search" value={termo} onChange={(e) => setTermo(e.target.value)} placeholder={somente === "concursos" ? "Buscar concurso, órgão ou cargo…" : "Buscar matéria ou assunto…"} autoComplete="off" enterKeyHint="search" />
        </label>
        {chips.length > 1 && (
          <div className="cat-chips" role="group" aria-label="Filtrar">
            {chips.map(([id, rotulo, icone]) => (
              <button key={id} type="button" className="cat-chip" aria-pressed={vista === id} onClick={() => setAba(id)}>{icone}{rotulo}</button>
            ))}
          </div>
        )}
      </div>
      <div data-testid="painel-rolagem">
        {mostrarConcursos && <ConcursosPublicados concursos={concursosVisiveis} salvos={salvos} alternarSalvo={alternar} />}
        {mostrarMaterias && <MateriasCatalogo materias={materias} termo={termo} grupos={gruposVisiveis} />}
        <p className="cat-vazio" role="status" aria-live="polite">{nada || (verConcursos && !verMaterias && !concursosVisiveis.length && !termo.trim() && aba === "salvos") ? (termo.trim() ? `Nada encontrado para “${termo.trim()}”.` : "Você ainda não salvou nenhum concurso.") : ""}</p>
      </div>
    </div>
  );
}
