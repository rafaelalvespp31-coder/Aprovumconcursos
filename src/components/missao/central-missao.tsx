"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { ArrowLeft, Bell, BookOpen, ChartNoAxesColumnIncreasing, ChevronDown, ChevronRight, ClipboardCheck, Clock3, Gamepad2, House, Loader2, PenLine, PlayCircle, Settings, Target, Trophy } from "lucide-react";
import type { ConcursoCard, MateriaCatalogo } from "@/domain/missao/materias";
import type { Bands } from "@/components/mentor/skull-orb-fx";
import { FalarComMentor, type FaseMentor } from "./falar-mentor";
import { useNavegarPorVoz } from "./navegar-por-voz";
import { PainelEscolha } from "./painel-escolha";
import { IntroMentor } from "./intro-mentor";
import "./central-missao.css";
import "./catalogo-pagina.css";

/** Números reais do aluno mostrados no topo da home (null = não foi possível ler agora). */
export interface IndicadoresHome {
  horas: number;
  questoes: number;
  /** Acertos / respondidas, em %. null enquanto não respondeu nenhuma questão. */
  aproveitamento: number | null;
  /** Aulas concluídas / aulas das trilhas, em %. */
  concluido: number;
}

export interface CentralMissaoProps {
  primeiroNome: string | null;
  email: string | null;
  objetivo: string | null;
  /** Matérias catalogadas na plataforma (aulas publicadas). */
  materias: MateriaCatalogo[];
  /** Concursos com edital publicado pela equipe. */
  concursos: ConcursoCard[];
  /** Mostra a abertura (retrato + "Começar a estudar") antes da Central. O servidor liga na primeira visita da sessão. */
  intro?: boolean;
  /** Plano do aluno (mantido por compatibilidade; o menu da home é próprio). */
  plano?: "gratuito" | "pago" | "vitalicio";
  indicadores?: IndicadoresHome | null;
}

type Folha = "concursos" | "materias";

const FOLHAS: Record<Folha, { titulo: string; kicker: string; sub: string }> = {
  concursos: { titulo: "Concursos", kicker: "Escolha o seu concurso", sub: "Conquiste seu cargo público com a preparação certa." },
  materias: { titulo: "Matérias", kicker: "Escolha a matéria", sub: "Organize seus estudos e domine cada conteúdo da sua preparação." },
};

const fmt = (n: number) => n.toLocaleString("pt-BR");

type Icone = ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
interface CardDef { id: string; titulo: string; texto: string; icone: Icone; arte: string; folha?: Folha; href?: string }
const CARDS: CardDef[] = [
  { id: "concursos", titulo: "CONCURSOS", texto: "Editais, cargos, oportunidades e objetivos.", icone: Target, arte: "concursos", folha: "concursos" },
  { id: "materias", titulo: "MATÉRIAS", texto: "Conteúdo organizado por disciplinas.", icone: BookOpen, arte: "materias", folha: "materias" },
  { id: "redacao", titulo: "LABORATÓRIO DE REDAÇÃO", texto: "Escrita, correção técnica e evolução.", icone: PenLine, arte: "redacao", href: "/redacao" },
  { id: "aulas", titulo: "MINHAS AULAS", texto: "Aulas, revisões e videoaulas.", icone: PlayCircle, arte: "aulas", href: "/trilhas" },
  { id: "jogo", titulo: "MODO JOGO", texto: "Aprendizado gamificado e desafios.", icone: Gamepad2, arte: "jogo", href: "/quiz" },
  { id: "questoes", titulo: "QUESTÕES E SIMULADOS", texto: "Treinamento, provas e avaliação.", icone: ClipboardCheck, arte: "questoes", href: "/questoes" },
];

/** Home pós-login (celular): saudação com os números reais, Mentor por voz, seis caminhos e menu técnico inferior. */
export function CentralMissao({ primeiroNome, email, materias, concursos, intro: introInicial = false, indicadores = null }: CentralMissaoProps) {
  // abertura: "ativa" (cobre a Central), "revelando" (a Central entra por baixo do clarão), "fim"
  const [intro, setIntro] = useState<"ativa" | "revelando" | "fim">(introInicial ? "ativa" : "fim");
  const [falando, setFalando] = useState(false);
  const [fase, setFase] = useState<FaseMentor>("repouso");
  const [folha, setFolha] = useState<Folha | null>(null);
  const [toque, setToque] = useState<string | null>(null);
  const nivel = useRef<(() => Bands) | null>(null);
  const gatilho = useRef<HTMLElement | null>(null);
  const fechar = useRef<HTMLButtonElement>(null);
  const temporizador = useRef<ReturnType<typeof setTimeout>>(undefined);

  const nome = primeiroNome ?? (email ? email.split("@")[0]! : null);
  const aoFase = useCallback((f: FaseMentor) => setFase(f), []);

  const abrir = (qual: Folha, el: HTMLElement) => {
    gatilho.current = el;
    setToque(qual);
    clearTimeout(temporizador.current);
    // dá tempo da elevação do card antes da folha cobrir a tela
    temporizador.current = setTimeout(() => { setFolha(qual); setToque(null); }, 220);
  };
  useEffect(() => () => clearTimeout(temporizador.current), []);

  // o Mentor abre menus e páginas pelo que o aluno pede falando
  const abrirMenuPorVoz = useCallback((qual: Folha) => { clearTimeout(temporizador.current); setToque(null); setFolha(qual); }, []);
  const fecharMenuPorVoz = useCallback(() => setFolha(null), []);
  const [abrindo, setAbrindo] = useState<string | null>(null);
  const navegar = useNavegarPorVoz({ concursos, abrirMenu: abrirMenuPorVoz, fecharMenu: fecharMenuPorVoz, aoAbrir: setAbrindo });

  const voltar = useCallback(() => {
    setFolha(null);
    requestAnimationFrame(() => gatilho.current?.focus());
  }, []);

  useEffect(() => {
    if (!folha) return;
    fechar.current?.focus();
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") voltar(); };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [folha, voltar]);

  const pct = Math.max(0, Math.min(100, indicadores?.concluido ?? 0));
  const contagem = (id: string) =>
    id === "concursos" && concursos.length ? `${concursos.length} ${concursos.length === 1 ? "concurso" : "concursos"}` : id === "materias" && materias.length ? `${materias.length} ${materias.length === 1 ? "matéria" : "matérias"}` : null;

  return (
    <main className="hm" data-fase={fase} data-folha={folha ?? undefined} data-intro={intro} data-menu={intro === "fim" ? "1" : undefined}>
      <div className="hm-rolagem">
        <div className="hm-col">
          <section className="hm-heroi" aria-label="Início">
            {/* eslint-disable-next-line @next/next/no-img-element -- arte do Mentor com a esfera; WebP já otimizado em public/home */}
            <img className="hm-heroi-arte" src="/home/ref-hero.webp" alt="" width={553} height={598} fetchPriority="high" decoding="async" />
            {/* esfera viva sobre a esfera da arte: pulsa em repouso e reage à conversa */}
            <span className="hm-esfera" aria-hidden><i /><i /></span>

            <header className="hm-topo">
              {/* eslint-disable-next-line @next/next/no-img-element -- logo oficial, versão para fundo claro */}
              <img className="hm-logo" src="/images/aprovum-logo-escura.png" alt="Aprovum" width={523} height={107} />
              <div className="hm-conta">
                <Link href="/perfil" className="hm-sino" aria-label="Avisos e notificações"><Bell aria-hidden /></Link>
                <Link href="/perfil" className="hm-perfil" aria-label={`Perfil${nome ? ` de ${nome}` : ""}`}>
                  <span className="hm-perfil-foto" aria-hidden>{(nome ?? "A").slice(0, 1).toUpperCase()}</span>
                  <ChevronDown className="hm-perfil-seta" aria-hidden />
                </Link>
              </div>
            </header>

            <div className="hm-saudacao">
              <h1 className="hm-ola">Olá,<br />{nome ? nome : "Guerreiro"}!</h1>
              <p className="hm-frase">Disciplina hoje te<br /><span>aproxima</span> da aprovação.</p>
            </div>

            <div className="hm-metricas">
              <div className="hm-anel" role="img" aria-label={`${pct}% concluído`}>
                <svg viewBox="0 0 100 100" aria-hidden>
                  <circle className="trilho" cx="50" cy="50" r="43" pathLength="100" />
                  <circle className="prog" cx="50" cy="50" r="43" pathLength="100" style={{ ["--p" as string]: pct }} />
                </svg>
                <div className="hm-anel-txt"><b>{pct}%</b><span>Concluído <i aria-hidden>↑</i></span></div>
              </div>
              <ul className="hm-numeros">
                <li><Clock3 aria-hidden /><div><b>{indicadores ? `${fmt(indicadores.horas)}h` : "—"}</b><span>Estudadas</span></div></li>
                <li><ClipboardCheck aria-hidden /><div><b>{indicadores ? fmt(indicadores.questoes) : "—"}</b><span>Questões</span></div></li>
                <li><Trophy aria-hidden /><div><b>{indicadores?.aproveitamento != null ? `${indicadores.aproveitamento}%` : "—"}</b><span>Aproveitamento</span></div></li>
              </ul>
            </div>

            <div className="hm-voz">
              <FalarComMentor navegacao={navegar} ativo={falando} onAtivo={setFalando} onNivel={(fn) => { nivel.current = fn; }} onConn={() => {}} onFase={aoFase} />
            </div>
          </section>

          <nav className="hm-cards" aria-label="Escolha por onde começar">
            {CARDS.map((c, i) => {
              const Ic = c.icone;
              const chip = contagem(c.id);
              const corpo = (
                <>
                  <span className="hm-card-borda" aria-hidden />
                  <span className="hm-card-face">
                    {/* eslint-disable-next-line @next/next/no-img-element -- arte do card, WebP em public/home */}
                    <img className="hm-card-arte" src={`/home/ref-card-${c.arte}.webp`} alt="" width={200} height={232} loading={i < 2 ? "eager" : "lazy"} decoding="async" />
                    <Ic className="hm-card-ico" aria-hidden />
                    {chip && <span className="hm-card-chip">{chip}</span>}
                    <span className="hm-card-texto">
                      <span className="hm-card-titulo">{c.titulo}</span>
                      <span className="hm-card-desc">{c.texto}</span>
                    </span>
                    <span className="hm-card-seta" aria-hidden><ChevronRight /></span>
                  </span>
                </>
              );
              const estilo = { ["--k" as string]: i };
              return c.folha ? (
                <button key={c.id} type="button" className="hm-card" data-card={c.id} data-toca={toque === c.id ? "" : undefined} style={estilo} onClick={(e) => abrir(c.folha!, e.currentTarget)}>{corpo}</button>
              ) : (
                <Link key={c.id} href={c.href!} className="hm-card" data-card={c.id} style={estilo}>{corpo}</Link>
              );
            })}
          </nav>
        </div>
      </div>

      {intro === "fim" && (
        <nav className="hm-menu" aria-label="Menu principal">
          {/* eslint-disable-next-line @next/next/no-img-element -- cenário decorativo do menu */}
          <img className="hm-menu-cenario" src="/home/ref-cenario.webp" alt="" width={853} height={135} decoding="async" />
          <div className="hm-menu-corpo">
            <Link href="/painel" className="hm-menu-item" aria-current="page"><House aria-hidden /><span>Início</span></Link>
            <Link href="/desempenho" className="hm-menu-item"><ChartNoAxesColumnIncreasing aria-hidden /><span>Desempenho</span></Link>
            <Link href="/painel" className="hm-menu-nucleo" aria-label="Central APROVUM">
              {/* eslint-disable-next-line @next/next/no-img-element -- núcleo do menu */}
              <img src="/home/ref-nucleo.webp" alt="" width={150} height={150} decoding="async" />
            </Link>
            <Link href="/perfil#perfil-conquistas" className="hm-menu-item"><Trophy aria-hidden /><span>Conquistas</span></Link>
            <Link href="/perfil" className="hm-menu-item"><Settings aria-hidden /><span>Configurações</span></Link>
          </div>
        </nav>
      )}

      {folha && (
        <div className="hm-folha" role="dialog" aria-modal="true" aria-label={FOLHAS[folha].titulo}>
          <div className="hm-folha-rolagem">
            <div className="hm-folha-conteudo">
              <header className="cat-cab" data-pagina={folha}>
                <button ref={fechar} type="button" className="cat-voltar" onClick={voltar} aria-label="Voltar para a tela inicial">
                  <ArrowLeft aria-hidden />
                </button>
                <div className="cat-titulos">
                  <p className="cat-kicker">{FOLHAS[folha].kicker}</p>
                  <h1 className="cat-titulo">{FOLHAS[folha].titulo}</h1>
                </div>
                <p className="cat-sub">{FOLHAS[folha].sub}</p>
                {folha === "concursos" && (
                  // eslint-disable-next-line @next/next/no-img-element -- arte do troféu (WebP em public/home/catalogo)
                  <img className="cat-cab-trofeu" src="/home/catalogo/trofeu.webp" alt="" width={404} height={336} decoding="async" />
                )}
              </header>
              <PainelEscolha concursos={concursos} materias={materias} somente={folha} />
            </div>
          </div>
        </div>
      )}
      {abrindo && (
        <div className="hm-abrindo" role="status" aria-live="polite"><Loader2 size={18} className="hm-gira" aria-hidden />{abrindo}</div>
      )}
      {intro !== "fim" && <IntroMentor aoRevelar={() => setIntro("revelando")} aoFim={() => setIntro("fim")} />}
    </main>
  );
}
