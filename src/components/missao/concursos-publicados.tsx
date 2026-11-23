"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type CSSProperties } from "react";
import { ArrowUpRight, Landmark, Loader2 } from "lucide-react";
import type { ConcursoCard } from "@/domain/missao/materias";
import { abrirConcursoAction } from "@/app/(missao)/painel/actions";
import { estilo, seguir, soltar } from "./materias-catalogo";
import "./materias-catalogo.css";

/** Concursos cujo edital a equipe publicou: um toque e o aluno vê o conteúdo programático (sem anexar nada). */
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

  return (
    <section id="mc-sec-concursos" className="mc-grupo" aria-labelledby="mc-h-concursos">
      <header className="mc-grupo-cab">
        <h2 id="mc-h-concursos">Concursos</h2>
        <p>{concursos.length === 1 ? "1 concurso" : `${concursos.length} concursos`} com edital pronto</p>
      </header>
      <ul className="mc-grade">
        {concursos.map((c, i) => (
          <li key={c.id} style={{ ...estilo(i + 2), "--k": i } as CSSProperties}>
            <button
              type="button"
              className="mc-quadrado mc-concurso"
              style={c.imagem ? ({ "--img": `url("${c.imagem.replace(/"/g, "%22")}")` } as CSSProperties) : undefined}
              data-imagem={c.imagem ? "1" : undefined}
              disabled={!!abrindo}
              aria-busy={abrindo === c.id}
              aria-label={`${c.nome}${c.cargo ? `, ${c.cargo}` : ""}. Estudar este concurso`}
              onPointerMove={seguir}
              onPointerLeave={soltar}
              onClick={() => abrir(c)}
            >
              <Landmark className="mc-marca" aria-hidden strokeWidth={1.3} />
              <span className="mc-topo">
                <span className="mc-icone">{abrindo === c.id ? <Loader2 className="mc-gira" aria-hidden /> : <Landmark aria-hidden strokeWidth={2.2} />}</span>
                {c.uf && <span className="mc-chip">{c.uf}</span>}
              </span>
              <span className="mc-nome">{c.nome}</span>
              <span className="mc-sub">{c.cargo ?? c.orgao}</span>
              <span className="mc-abrir">{abrindo === c.id ? "Abrindo…" : <>Estudar <ArrowUpRight size={14} aria-hidden /></>}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mc-erro" role="status" aria-live="polite">{erro}</p>
    </section>
  );
}
