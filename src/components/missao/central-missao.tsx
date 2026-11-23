"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Settings } from "lucide-react";
import type { Sugestao } from "@/domain/missao/sugestoes";
import type { MateriaCatalogo } from "@/domain/missao/materias";
import type { Bands, Conexao } from "@/components/mentor/skull-orb-fx";
import { AnexarEdital } from "./anexar-edital";
import { FalarComMentor } from "./falar-mentor";
import { MateriasCatalogo } from "./materias-catalogo";
import { MentorOrbita } from "./mentor-orbita";
import "./central-missao.css";

type Fase = "ocioso" | "ok";

export interface CentralMissaoProps {
  primeiroNome: string | null;
  email: string | null;
  objetivo: string | null;
  /** Editais que o aluno já anexou (lidos e prontos para virar plano). */
  editais: Sugestao[];
  /** Matérias catalogadas na plataforma (aulas publicadas). */
  materias: MateriaCatalogo[];
}

/** Home pós-login: o Mentor no centro da tela e as matérias catalogadas na plataforma e, abaixo, o convite "Anexar edital". */
export function CentralMissao({ primeiroNome, email, objetivo, editais, materias }: CentralMissaoProps) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("ocioso");
  const [falando, setFalando] = useState(false);
  const [anexando, setAnexando] = useState(false);
  const [conn, setConn] = useState<Conexao>("live");
  const nivel = useRef<(() => Bands) | null>(null);
  const ocupado = fase === "ok";

  const encerrarVoz = useCallback(() => {
    setFalando(false);
    nivel.current = null;
  }, []);

  /** O edital foi lido: abre a página do conteúdo programático completo (o plano é montado a partir dela). */
  const abrirConteudo = useCallback(
    (editalId: string) => {
      if (ocupado) return;
      encerrarVoz();
      setFase("ok");
      router.push(`/conteudo-programatico/${editalId}`);
    },
    [ocupado, router, encerrarVoz],
  );

  const energia = fase === "ok" ? 1 : 0;
  const nome = primeiroNome ?? (email ? email.split("@")[0]! : "Aluno");

  return (
    <main className="cm" data-fase={fase}>
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
        <MentorOrbita energia={energia} voz={0} conn={conn} fonte={nivel} />
        <FalarComMentor ativo={falando} onAtivo={setFalando} onNivel={(fn) => { nivel.current = fn; }} onConn={setConn} />
      </section>

      <section className="cm-corpo">
        <p className="cm-kicker cm-e1">MENTOR APROVUM</p>
        <h1 className="cm-titulo cm-e2">QUAL É O SEU PRÓXIMO OBJETIVO?</h1>
        <p className="cm-sub cm-e3"><span>Escolha uma matéria para estudar</span> <span>ou anexe o edital e o Mentor monta a sua preparação.</span></p>

        <div className="cm-form cm-e4">
          <MateriasCatalogo materias={materias} desabilitado={ocupado} />
          {!anexando && (
            <button type="button" className="cm-outro" onClick={() => setAnexando(true)} disabled={ocupado}>Anexar edital</button>
          )}
          {anexando && (
            <>
              <AnexarEdital onLido={abrirConteudo} onIniciar={encerrarVoz} desabilitado={ocupado} />
              {editais.length > 0 && (
                <div className="ae-chips" role="group" aria-label="Editais que você já anexou">
                  <span className="ae-chips-rotulo">Já anexados:</span>
                  {editais.slice(0, 4).map((e) => (
                    <button key={e.id} type="button" className="ae-chip" disabled={ocupado} title={e.nome} onClick={() => abrirConteudo(e.editalId ?? e.id)}>
                      {e.nome}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <p className="cm-estado" role="status" aria-live="polite">
          {fase === "ok" && "Abrindo o conteúdo programático…"}
          {fase === "ocioso" && objetivo && `Objetivo atual: ${objetivo}`}
        </p>

        <Link href="/trilhas" className="cm-painel">Ir para os estudos</Link>
      </section>
    </main>
  );
}
