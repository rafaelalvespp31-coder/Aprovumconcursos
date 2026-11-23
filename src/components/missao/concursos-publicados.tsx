"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Hourglass, Landmark, Loader2, Trophy } from "lucide-react";
import type { ConcursoCard } from "@/domain/missao/materias";
import { abrirConcursoAction } from "@/app/(missao)/painel/actions";
import { estilo, seguir, soltar } from "./materias-catalogo";
import "./materias-catalogo.css";

/** Concursos catalogados: com edital publicado, um toque abre o conteúdo programático (sem anexar nada); os demais mostram a análise ou "em breve". */
export function ConcursosPublicados({ concursos }: { concursos: ConcursoCard[] }) {
  const router = useRouter();
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [, start] = useTransition();

  if (!concursos.length) return null;

  const abrir = (c: ConcursoCard) => {
    if (abrindo) return;
    setErro(null);
    setAbrindo(c.id);
    start(async () => {
      const r = await abrirConcursoAction(c.id).catch(() => ({ ok: false as const, error: "Não foi possível abrir este concurso agora." }));
      if (r.ok) router.push(r.destino);
      else {
        setErro(r.error);
        setAbrindo(null);
      }
    });
  };

  const prontos = concursos.filter((c) => c.estado === "pronto").length;
  return (
    <section id="mc-sec-concursos" className="mc-grupo" data-grupo="concursos" aria-labelledby="mc-h-concursos">
      <header className="mc-grupo-cab">
        <span className="mc-grupo-ico" aria-hidden><Trophy /></span>
        <div className="mc-grupo-txt">
          <span className="mc-grupo-kicker">Escolha o seu objetivo</span>
          <h2 id="mc-h-concursos">Concursos</h2>
          <p>{prontos ? `${prontos} ${prontos === 1 ? "pronto" : "prontos"} para estudar` : "Em breve para estudar"}</p>
        </div>
        <span className="mc-grupo-num" aria-label={concursos.length === 1 ? "1 concurso" : `${concursos.length} concursos`}>{concursos.length}</span>
      </header>
      <ul className="mc-grade">
        {concursos.map((c, i) => {
          const estiloLi = { ...estilo(i + 2), "--k": i } as CSSProperties;
          const arte = c.imagem ? ({ "--img": `url("${c.imagem.replace(/"/g, "%22")}")` } as CSSProperties) : undefined;
          const miolo = (carregando: boolean, rotuloAcao: React.ReactNode) => (
            <>
              <Landmark className="mc-marca" aria-hidden strokeWidth={1.3} />
              <span className="mc-topo">
                <span className="mc-icone">{carregando ? <Loader2 className="mc-gira" aria-hidden /> : <Landmark aria-hidden strokeWidth={2.2} />}</span>
                {c.uf && <span className="mc-chip">{c.uf}</span>}
              </span>
              <span className="mc-nome">{c.nome}</span>
              <span className="mc-sub">{c.cargo ?? c.orgao}</span>
              <span className="mc-abrir">{rotuloAcao}</span>
            </>
          );
          if (c.estado === "pronto") {
            return (
              <li key={c.id} style={estiloLi} className="mc-concurso-li">
                <button
                  type="button"
                  className="mc-quadrado mc-concurso"
                  style={arte}
                  data-imagem={c.imagem ? "1" : undefined}
                  disabled={!!abrindo}
                  aria-busy={abrindo === c.id}
                  aria-label={`${c.nome}${c.cargo ? `, ${c.cargo}` : ""}. Estudar este concurso`}
                  onPointerMove={seguir}
                  onPointerLeave={soltar}
                  onClick={() => abrir(c)}
                >
                  {miolo(abrindo === c.id, abrindo === c.id ? "Abrindo…" : <>Estudar <ArrowUpRight size={14} aria-hidden /></>)}
                </button>
                <Link href={`/analise-concurso/${c.id}?voltar=%2Fpainel`} className="mc-analise" title="Ver a análise do concurso" aria-label={`Ver a análise de ${c.nome}`}>
                  <BarChart3 size={15} aria-hidden /><span>Análise</span>
                </Link>
              </li>
            );
          }
          if (c.estado === "analise") {
            return (
              <li key={c.id} style={estiloLi}>
                <Link href={`/analise-concurso/${c.id}?voltar=%2Fpainel`} className="mc-quadrado mc-concurso" style={arte} data-imagem={c.imagem ? "1" : undefined} aria-label={`${c.nome}${c.cargo ? `, ${c.cargo}` : ""}. Ver a análise do concurso`} onPointerMove={seguir} onPointerLeave={soltar}>
                  {miolo(false, <>Ver análise <ArrowUpRight size={14} aria-hidden /></>)}
                </Link>
              </li>
            );
          }
          return (
            <li key={c.id} style={estiloLi}>
              <div className="mc-quadrado mc-concurso mc-breve" style={arte} data-imagem={c.imagem ? "1" : undefined} role="group" aria-label={`${c.nome}${c.cargo ? `, ${c.cargo}` : ""}. Em breve: o edital ainda está sendo preparado`}>
                {miolo(false, <><Hourglass size={13} aria-hidden /> Em breve</>)}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mc-erro" role="status" aria-live="polite">{erro}</p>
    </section>
  );
}
