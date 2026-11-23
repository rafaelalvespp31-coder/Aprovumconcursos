"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { Settings } from "lucide-react";
import type { Sugestao } from "@/domain/missao/sugestoes";
import type { Bands, Conexao } from "@/components/mentor/skull-orb-fx";
import { AnexarEdital } from "./anexar-edital";
import { FalarComMentor } from "./falar-mentor";
import { MentorOrbita } from "./mentor-orbita";
import "./central-missao.css";

type Fase = "ocioso" | "salvando" | "ok" | "erro";
type Escolha = { ok: true; destino: string } | { ok: false; error: string };

export interface CentralMissaoProps {
  primeiroNome: string | null;
  email: string | null;
  objetivo: string | null;
  /** Editais que o aluno já anexou (lidos e prontos para virar plano). */
  editais: Sugestao[];
  escolher: (nome: string, editalId?: string) => Promise<Escolha>;
}

/** Home pós-login: o Mentor no centro da tela e o convite "Anexar edital": o plano segue o conteúdo programático dele. */
export function CentralMissao({ primeiroNome, email, objetivo, editais, escolher }: CentralMissaoProps) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>("ocioso");
  const [erro, setErro] = useState<string | null>(null);
  const [confirmado, setConfirmado] = useState<string | null>(null);
  const [saindo, setSaindo] = useState(false);
  const [falando, setFalando] = useState(false);
  const [conn, setConn] = useState<Conexao>("live");
  const nivel = useRef<(() => Bands) | null>(null);
  const ocupado = fase === "salvando" || fase === "ok";

  const encerrarVoz = useCallback(() => {
    setFalando(false);
    nivel.current = null;
  }, []);

  /** Salva o edital como objetivo (o plano nasce dele) e segue para o plano. Devolve a mensagem de erro, se houver. */
  const confirmar = useCallback(
    async (nome: string, editalId: string): Promise<string | null> => {
      if (ocupado) return null;
      setErro(null);
      setFase("salvando");
      encerrarVoz();
      const r = await escolher(nome, editalId).catch((): Escolha => ({ ok: false, error: "Sem conexão. Tente de novo." }));
      if (!r.ok) {
        setFase("erro");
        setErro(r.error);
        return r.error;
      }
      setFase("ok");
      setConfirmado(nome);
      router.prefetch(r.destino);
      const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setTimeout(() => setSaindo(true), reduzido ? 0 : 700);
      setTimeout(() => router.push(r.destino), reduzido ? 150 : 1350);
      return null;
    },
    [escolher, ocupado, router, encerrarVoz],
  );

  const energia = fase === "ok" || fase === "salvando" ? 1 : 0;
  const nome = primeiroNome ?? (email ? email.split("@")[0]! : "Aluno");

  return (
    <main className="cm" data-fase={fase} data-saindo={saindo || undefined}>
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
        <p className="cm-sub cm-e3"><span>Anexe o edital do concurso.</span> <span>O Mentor lê o conteúdo programático e monta a sua preparação.</span></p>

        <div className="cm-form cm-e4">
          <AnexarEdital onConcluido={confirmar} onIniciar={encerrarVoz} desabilitado={ocupado} />
          {editais.length > 0 && (
            <div className="ae-chips" role="group" aria-label="Editais que você já anexou">
              <span className="ae-chips-rotulo">Já anexados:</span>
              {editais.slice(0, 4).map((e) => (
                <button key={e.id} type="button" className="ae-chip" disabled={ocupado} title={e.nome} onClick={() => void confirmar(e.nome, e.editalId ?? e.id)}>
                  {e.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        <p className="cm-estado" role="status" aria-live="polite" data-tipo={fase === "erro" ? "erro" : undefined}>
          {fase === "erro" && erro}
          {fase === "salvando" && "Preparando sua missão…"}
          {fase === "ok" && confirmado && `Edital confirmado: ${confirmado}`}
          {fase === "ocioso" && objetivo && `Objetivo atual: ${objetivo}`}
        </p>

        <Link href="/trilhas" className="cm-painel">Ir para os estudos</Link>
      </section>
    </main>
  );
}
