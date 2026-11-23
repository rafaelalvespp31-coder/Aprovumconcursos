"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, ChevronRight, Settings } from "lucide-react";
import type { ConcursoCard, MateriaCatalogo } from "@/domain/missao/materias";
import type { Bands, Conexao } from "@/components/mentor/skull-orb-fx";
import { FalarComMentor, type FaseMentor } from "./falar-mentor";
import { PainelEscolha } from "./painel-escolha";
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

type Folha = "concursos" | "materias";

const FOLHAS: Record<Folha, { titulo: string; kicker: string }> = {
  concursos: { titulo: "Concursos", kicker: "Escolha o seu concurso" },
  materias: { titulo: "Matérias", kicker: "Escolha a matéria" },
};

/** Pontos que sobem da mão até a esfera (posição, atraso e duração fixos: nada de aleatório no render). */
const FAISCAS = Array.from({ length: 12 }, (_, i) => ({ x: 4 + ((i * 37) % 26), d: ((i * 0.41) % 3.2).toFixed(2), t: (2.6 + ((i * 7) % 5) * 0.35).toFixed(2) }));

/** Home pós-login: o Mentor segurando a esfera, o botão de voz e só dois caminhos, Concursos e Matérias. */
export function CentralMissao({ primeiroNome, email, objetivo, materias, concursos }: CentralMissaoProps) {
  const [falando, setFalando] = useState(false);
  const [conn, setConn] = useState<Conexao>("live");
  const [fase, setFase] = useState<FaseMentor>("repouso");
  const [folha, setFolha] = useState<Folha | null>(null);
  const [toque, setToque] = useState<Folha | null>(null);
  const nivel = useRef<(() => Bands) | null>(null);
  const gatilho = useRef<HTMLButtonElement | null>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  const nome = primeiroNome ?? (email ? email.split("@")[0]! : "Aluno");

  // a esfera volta ao repouso aos poucos: o CSS faz a transição quando o estado muda para "repouso"
  const aoFase = useCallback((f: FaseMentor) => setFase(f), []);

  const abrir = (qual: Folha, el: HTMLButtonElement) => {
    gatilho.current = el;
    setToque(qual);
    clearTimeout(temporizador.current);
    // dá tempo do contorno vermelho correr as bordas antes da folha cobrir a tela
    temporizador.current = setTimeout(() => { setFolha(qual); setToque(null); }, 340);
  };

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const voltar = useCallback(() => {
    setFolha(null);
    // devolve o foco ao card que abriu a folha
    requestAnimationFrame(() => gatilho.current?.focus());
  }, []);

  useEffect(() => {
    if (!folha) return;
    fechar.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") voltar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [folha, voltar]);

  return (
    <main className="hm" data-fase={fase} data-folha={folha ?? undefined}>
      <div className="hm-fundo" aria-hidden />
      <div className="hm-fumaca" aria-hidden />

      <header className="hm-topo">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial, versão para fundo escuro */}
        <img className="hm-logo" src="/images/aprovum-login-logo.png" alt="Aprovum" width={523} height={107} />
        <div className="hm-conta">
          <Link href="/perfil" className="hm-avatar" aria-label={`Perfil de ${nome}`}>
            <span aria-hidden>{nome.slice(0, 1).toUpperCase()}</span>
          </Link>
          <Link href="/perfil" className="hm-engrenagem" aria-label="Configurações">
            <Settings size={18} aria-hidden />
          </Link>
        </div>
      </header>

      <section className="hm-palco" aria-label="Mentor Aprovum">
        <div className="hm-cena">
          {/* eslint-disable-next-line @next/next/no-img-element -- arte fixa do Mentor; WebP já otimizado em public/home */}
          <img className="hm-arte" src="/home/mentor-caveira.webp" alt="" width={1086} height={732} fetchPriority="high" decoding="async" />
          <span className="hm-olho hm-olho-e" aria-hidden />
          <span className="hm-olho hm-olho-d" aria-hidden />
          <span className="hm-reflexo" aria-hidden />
          <div className="hm-aura" aria-hidden />
          <div className="hm-orb">
            <MentorOrbita energia={0} voz={0} conn={conn} fonte={nivel} />
          </div>
          <div className="hm-faiscas" aria-hidden>
            {FAISCAS.map((f, i) => <i key={i} style={{ "--x": `${f.x}%`, "--d": `${f.d}s`, "--t": `${f.t}s` } as CSSProperties} />)}
          </div>
        </div>
      </section>

      <div className="hm-voz">
        <FalarComMentor ativo={falando} onAtivo={setFalando} onNivel={(fn) => { nivel.current = fn; }} onConn={setConn} onFase={aoFase} />
      </div>

      <nav className="hm-cards" aria-label="Escolha por onde começar">
        <CardOcto
          id="concursos"
          titulo="CONCURSOS"
          texto="Encontre seu próximo objetivo e prepare-se para conquistar sua vaga."
          arte="/home/card-concursos.webp"
          w={350}
          h={206}
          tocado={toque === "concursos"}
          onAbrir={(el) => abrir("concursos", el)}
        />
        <CardOcto
          id="materias"
          titulo="MATÉRIAS"
          texto="Organize seus estudos e domine cada conteúdo da sua preparação."
          arte="/home/card-materias.webp"
          w={252}
          h={196}
          tocado={toque === "materias"}
          onAbrir={(el) => abrir("materias", el)}
        />
      </nav>

      <div className="hm-plataforma" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element -- plataforma decorativa, WebP em public/home */}
        <img src="/home/plataforma.webp" alt="" width={1086} height={168} loading="lazy" decoding="async" />
      </div>

      <p className="hm-rodape">
        {objetivo && <span>Objetivo atual: {objetivo}</span>}
        <Link href="/trilhas">Ir para os estudos</Link>
      </p>

      {folha && (
        <div className="hm-folha" role="dialog" aria-modal="true" aria-label={FOLHAS[folha].titulo}>
          <div className="hm-folha-topo">
            <button ref={fechar} type="button" className="hm-voltar" onClick={voltar} aria-label="Voltar para a tela inicial">
              <ArrowLeft size={18} aria-hidden />
            </button>
            <div>
              <p className="hm-folha-kicker">{FOLHAS[folha].kicker}</p>
              <h1 className="hm-folha-titulo">{FOLHAS[folha].titulo}</h1>
            </div>
          </div>
          <div className="hm-folha-corpo">
            <PainelEscolha concursos={concursos} materias={materias} somente={folha} />
          </div>
        </div>
      )}
    </main>
  );
}

function CardOcto({ id, titulo, texto, arte, w, h, tocado, onAbrir }: { id: Folha; titulo: string; texto: string; arte: string; w: number; h: number; tocado: boolean; onAbrir: (el: HTMLButtonElement) => void }) {
  return (
    <button type="button" className="hm-card" data-card={id} data-toca={tocado ? "" : undefined} onClick={(e) => onAbrir(e.currentTarget)}>
      <span className="hm-card-borda" aria-hidden />
      <span className="hm-card-face">
        {/* eslint-disable-next-line @next/next/no-img-element -- arte do card, WebP em public/home */}
        <img className="hm-card-arte" src={arte} alt="" width={w} height={h} loading="eager" decoding="async" />
        <span className="hm-card-vidro" aria-hidden />
        <span className="hm-card-texto">
          <span className="hm-card-linha">
            <span className="hm-card-titulo">{titulo}</span>
            <span className="hm-card-seta" aria-hidden><ChevronRight size={18} /></span>
          </span>
          <span className="hm-card-traco" aria-hidden />
          <span className="hm-card-desc">{texto}</span>
        </span>
      </span>
    </button>
  );
}
