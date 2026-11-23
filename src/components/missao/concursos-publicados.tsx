"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties } from "react";
import Link from "next/link";
import { Bookmark, CalendarDays, ChevronRight, Clock, FileText, Landmark, Loader2, Play, Star } from "lucide-react";
import type { ConcursoCard } from "@/domain/missao/materias";
import { chipDoConcurso, formatarVagas, quandoDoConcurso } from "@/domain/missao/concurso-card";
import { abrirConcursoAction } from "@/app/(missao)/painel/actions";
import { seguir, soltar } from "./materias-catalogo";
import "./catalogo-pagina.css";

/** Concursos catalogados: com edital publicado, um toque abre o conteúdo programático (sem anexar nada); os demais mostram a análise ou "em breve". */
export function ConcursosPublicados({ concursos, salvos, alternarSalvo }: { concursos: ConcursoCard[]; salvos: ReadonlySet<string>; alternarSalvo: (id: string) => void }) {
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

  return (
    <section id="mc-sec-concursos" className="cat-lista" data-grupo="concursos" aria-label="Concursos">
      <ul className="cat-grade">
        {concursos.map((c, i) => {
          const chip = chipDoConcurso(c);
          const arte = c.imagem ? ({ "--img": `url("${c.imagem.replace(/"/g, "%22")}")` } as CSSProperties) : undefined;
          const salvo = salvos.has(c.id);
          const rotulo = `${c.nome}${c.cargo ? `, ${c.cargo}` : ""}`;
          const interior = (carregando: boolean, cta: React.ReactNode, forte: boolean) => (
            <>
              <span className="cc-arte" style={arte} aria-hidden />
              {!c.imagem && <Landmark className="cc-marca" aria-hidden strokeWidth={1.1} />}
              <span className="cc-veu" aria-hidden />
              <span className="cc-brilho" aria-hidden />
              <span className="cc-topo">
                <span className="cc-chip" data-t={chip.tipo === "destaque" ? "destaque" : undefined}>
                  {chip.tipo === "destaque" ? <Star aria-hidden fill="currentColor" /> : chip.tipo === "relogio" ? <Clock aria-hidden /> : <i className="cc-ponto" data-c={chip.tipo === "amarelo" ? "amarelo" : undefined} aria-hidden />}
                  <span>{chip.texto}</span>
                </span>
              </span>
              <span className="cc-texto">
                <span className="cc-nome">{c.nome}</span>
                <span className="cc-orgao">{c.cargo ?? c.orgao}</span>
                <span className="cc-meta">
                  {c.vagas != null && <span><FileText aria-hidden />{formatarVagas(c.vagas)}</span>}
                  {c.vagas != null && <i aria-hidden />}
                  <span><CalendarDays aria-hidden />{quandoDoConcurso(c)}</span>
                </span>
              </span>
              <span className="cc-cta" data-v={forte ? "forte" : "vidro"}>
                <span>{carregando ? <Loader2 className="cc-gira" aria-hidden /> : null}{cta}</span>
                <ChevronRight aria-hidden />
              </span>
            </>
          );
          const botaoSalvar = (
            <button type="button" className="cc-acao" aria-pressed={salvo} aria-label={salvo ? `Remover ${c.nome} dos salvos` : `Salvar ${c.nome}`} title={salvo ? "Remover dos salvos" : "Salvar"} onClick={() => alternarSalvo(c.id)}>
              <Bookmark aria-hidden />
            </button>
          );
          return (
            <li key={c.id} style={{ "--k": i } as CSSProperties}>
              <div className="cc" data-estado={c.estado}>
                {c.estado === "pronto" && (
                  <button type="button" className="cc-corpo" disabled={!!abrindo} aria-busy={abrindo === c.id} aria-label={`${rotulo}. Estudar este concurso`} onPointerMove={seguir} onPointerLeave={soltar} onClick={() => abrir(c)}>
                    {interior(abrindo === c.id, abrindo === c.id ? "Abrindo…" : <><Play aria-hidden />Estudar agora</>, true)}
                  </button>
                )}
                {c.estado === "analise" && (
                  <Link href={`/analise-concurso/${c.id}?voltar=%2Fpainel`} className="cc-corpo" aria-label={`${rotulo}. Ver os detalhes e a análise do concurso`} onPointerMove={seguir} onPointerLeave={soltar}>
                    {interior(false, <><Play aria-hidden />Ver detalhes</>, true)}
                  </Link>
                )}
                {c.estado === "breve" && (
                  <div className="cc-corpo" role="group" aria-label={`${rotulo}. Em breve: o edital ainda está sendo preparado`}>
                    {interior(false, <><Clock aria-hidden />Edital em breve</>, false)}
                  </div>
                )}
                <span className="cc-acoes">
                  {botaoSalvar}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="cat-erro" role="status" aria-live="polite">{erro}</p>
    </section>
  );
}
