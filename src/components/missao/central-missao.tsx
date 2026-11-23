"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Settings } from "lucide-react";
import type { ConcursoCard, MateriaCatalogo } from "@/domain/missao/materias";
import type { Bands, Conexao } from "@/components/mentor/skull-orb-fx";
import { ConcursosPublicados } from "./concursos-publicados";
import { FalarComMentor } from "./falar-mentor";
import { MateriasCatalogo } from "./materias-catalogo";
import { MentorOrbita } from "./mentor-orbita";
import "./central-missao.css";

export interface CentralMissaoProps {
  primeiroNome: string | null;
  email: string | null;
  objetivo: string | null;
  /** Matérias catalogadas na plataforma (aulas publicadas). */
  materias: MateriaCatalogo[];
  /** Concursos com edital publicado pela equipe. */
  concursos: ConcursoCard[];
}

/** Home pós-login: o Mentor no centro da tela e as matérias catalogadas na plataforma . */
export function CentralMissao({ primeiroNome, email, objetivo, materias, concursos }: CentralMissaoProps) {
  const [falando, setFalando] = useState(false);
  const [conn, setConn] = useState<Conexao>("live");
  const nivel = useRef<(() => Bands) | null>(null);

  const nome = primeiroNome ?? (email ? email.split("@")[0]! : "Aluno");

  return (
    <main className="cm">
      <div className="cm-fundo" aria-hidden />
      <header className="cm-topo">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial, versão para fundo escuro */}
        <img className="cm-logo" src="/images/aprovum-login-logo.png" alt="Aprovum" width={523} height={107} />
        <Link href="/perfil" className="cm-perfil" aria-label={`Perfil de ${nome}: abrir configurações`}>
          <span className="cm-avatar" aria-hidden>{nome.slice(0, 1).toUpperCase()}</span>
          <span className="cm-nome">{nome}</span>
          <Settings size={15} aria-hidden className="cm-engrenagem" />
        </Link>
      </header>

      <section className="cm-palco">
        <MentorOrbita energia={0} voz={0} conn={conn} fonte={nivel} />
        <FalarComMentor ativo={falando} onAtivo={setFalando} onNivel={(fn) => { nivel.current = fn; }} onConn={setConn} />
      </section>

      <section className="cm-corpo">
        <p className="cm-kicker cm-e1">MENTOR APROVUM</p>
        <h1 className="cm-titulo cm-e2">QUAL É O SEU PRÓXIMO OBJETIVO?</h1>
        <p className="cm-sub cm-e3"><span>Escolha o seu concurso ou uma matéria para começar a estudar.</span></p>

        <div className="cm-form cm-e4">
          {concursos.length > 0 && <p className="mc-rotulo">Concursos</p>}
          <ConcursosPublicados concursos={concursos} />
          {materias.length > 0 && <p className="mc-rotulo">Matérias</p>}
          <MateriasCatalogo materias={materias} />
        </div>

        <p className="cm-estado" role="status" aria-live="polite">
          {objetivo && `Objetivo atual: ${objetivo}`}
        </p>

        <Link href="/trilhas" className="cm-painel">Ir para os estudos</Link>
      </section>
    </main>
  );
}
