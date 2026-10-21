/**
 * Abertura do Modo Jogo (referência "Conquiste sua evolução").
 * - Arte dos operadores caveira como camada de imagem, com fogo animado nos olhos e brasas
 *   flutuando; todo o resto (títulos, progresso, placa da marca, atalhos) é HTML real.
 * - Desktop: arte à direita ocupando a faixa; textos à esquerda; progresso e placa da marca
 *   lado a lado; cinco atalhos em linha.
 * - Celular: arte no topo (centrada no operador principal), textos e cartões em uma coluna.
 * O progresso vem dos dados reais do aluno (dispositivos dominados e ofensiva).
 */

import Link from "next/link";
import { BrainCircuit, ChartNoAxesCombined, ChevronRight, Crosshair, FileText, Flame, Gamepad2 } from "lucide-react";
import { BannerGate } from "@/components/banner-gate";

/** Recorte da arte (public/images/jogo-hero-arte.webp), em px. */
const W = 1664;
const H = 680;

/** Olhos no recorte (px) e tamanho da chama (px de largura). */
const EYES = [
  { x: 810, y: 346, w: 86, d: 0 },
  { x: 921, y: 324, w: 94, d: 0.35 },
  { x: 493, y: 381, w: 58, d: 0.7 },
  { x: 561, y: 369, w: 62, d: 0.15 },
] as const;

export function JogoHero({
  mastered,
  total,
  streak,
  last7,
  onPlay,
}: {
  /** Dispositivos dominados no Modo Jogo (todos os temas). */
  mastered: number;
  total: number;
  /** Dias seguidos de estudo e os últimos 7 dias (o último é hoje). */
  streak: number;
  last7: boolean[];
  onPlay: () => void;
}) {
  const pct = total ? Math.round((mastered / total) * 100) : 0;
  const recent = last7.slice(-5);
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  return (
    <section className="jh" aria-labelledby="jh-titulo">
      <BannerGate className="jh-palco" testId="jogo-banner-marca" assets={["/images/aprovum-login-logo.png"]}>
        <FireFilter />
        {/* Arte (posições dos olhos em % do recorte: acompanham qualquer tamanho) */}
        <div className="jh-arte" aria-hidden>
          <img
            src="/images/jogo-hero-arte.webp"
            srcSet="/images/jogo-hero-arte-sm.webp 1000w, /images/jogo-hero-arte.webp 1664w"
            sizes="(min-width: 1024px) 1600px, 1000px"
            width={W}
            height={H}
            alt=""
            fetchPriority="high"
            decoding="async"
            data-banner-main
          />
          <div className="pointer-events-none absolute inset-0">
            {EYES.map((e, i) => (
              <FireEye key={i} left={(e.x / W) * 100} top={(e.y / H) * 100} width={(e.w / W) * 100} delay={e.d} />
            ))}
          </div>
        </div>
        <div className="jh-sombra" aria-hidden />
        <Embers />

        <div className="jh-conteudo">
          <div className="jh-texto">
            <p className="jh-kicker">
              Modo Jogo <span aria-hidden>{"///"}</span>
            </p>
            <h2 id="jh-titulo" className="jh-titulo">
              Conquiste <span className="block text-[#FF1E12]">sua evolução</span>
            </h2>
            <p className="jh-desc">Transforme seus estudos em uma missão. Complete a lei, acumule pontos e evolua no seu objetivo.</p>
          </div>

          <div className="jh-linha">
            {/* Progresso real do aluno */}
            <div className="jh-progresso" data-testid="jogo-progresso">
              <div className="jh-progresso-geral">
                <div className="jh-anel" role="img" aria-label={`${pct}% dos dispositivos dominados`}>
                  <svg viewBox="0 0 120 120" aria-hidden>
                    <circle cx="60" cy="60" r="50" className="jh-anel-trilho" />
                    <circle cx="60" cy="60" r="50" className="jh-anel-valor" pathLength={100} strokeDasharray={`${pct} 100`} />
                  </svg>
                  <span>{pct}%</span>
                </div>
                <div className="min-w-0">
                  <p className="jh-rotulo">Seu progresso geral</p>
                  <p className="jh-numero">
                    {fmt(mastered)} <span>/ {fmt(total)}</span>
                  </p>
                  <p className="jh-legenda">dispositivos dominados</p>
                </div>
              </div>
              <div className="jh-foco">
                <Flame className="jh-foco-icone" aria-hidden />
                <div>
                  <p className="jh-foco-rotulo">Foco</p>
                  <p className="jh-foco-valor">
                    {streak} {streak === 1 ? "dia" : "dias"}
                  </p>
                  <span className="jh-foco-barras" role="img" aria-label={`Estudou em ${recent.filter(Boolean).length} dos últimos ${recent.length} dias`}>
                    {recent.map((on, i) => (
                      <span key={i} data-on={on ? "1" : "0"} />
                    ))}
                  </span>
                </div>
              </div>
            </div>

            {/* Placa da marca */}
            <div className="jh-placa">
              <div className="jh-placa-miolo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/images/aprovum-login-logo.png" alt="APROVUM — Sua preparação. Seu próximo cargo." width={523} height={107} />
              </div>
            </div>
          </div>
        </div>
      </BannerGate>

      {/* Atalhos */}
      <ul className="jh-atalhos" aria-label="Recursos do APROVUM">
        {FEATURES.map((f) => (
          <li key={f.title}>
            {f.href ? (
              <Link href={f.href} className="jh-atalho">
                <Feature {...f} />
              </Link>
            ) : (
              <button type="button" onClick={onPlay} className="jh-atalho">
                <Feature {...f} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const FEATURES = [
  { icon: BrainCircuit, title: "Aulas inteligentes", text: "Conteúdo direto ao ponto, com fontes verificadas.", href: "/trilhas" },
  { icon: Gamepad2, title: "Gamificação", text: "Estude, evolua, conquiste.", href: null },
  { icon: Crosshair, title: "Todos os concursos", text: "Das carreiras policiais aos demais órgãos.", href: "/nova-trilha" },
  { icon: FileText, title: "Questões de prova", text: "Cadernos por matéria, concurso e banca, com gabarito comentado.", href: "/questoes" },
  { icon: ChartNoAxesCombined, title: "Seu progresso", text: "Acompanhe sua evolução em tempo real.", href: "/desempenho" },
] as const;

function Feature({ icon: Icon, title, text }: { icon: React.ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <>
      <Icon className="jh-atalho-icone" aria-hidden />
      <span className="jh-atalho-texto">
        <span className="jh-atalho-titulo">{title}</span>
        <span className="jh-atalho-desc">{text}</span>
      </span>
      <ChevronRight className="jh-atalho-seta" aria-hidden />
    </>
  );
}

/** Gerador determinístico (mesmo resultado no servidor e no navegador). */
function rand(seed: number) {
  let t = seed;
  return () => {
    t = (t * 1664525 + 1013904223) % 4294967296;
    return t / 4294967296;
  };
}

/**
 * Partículas leves subindo devagar com balanço lateral: brasas acesas (laranja, com brilho)
 * e cinzas (cinza, apagadas). Densidade menor no celular.
 */
function Embers() {
  const r = rand(42);
  const parts = Array.from({ length: 52 }, (_, i) => {
    const ash = r() < 0.3;
    // Algumas brasas grandes e desfocadas, como se estivessem mais perto da câmera.
    const bokeh = !ash && r() < 0.14;
    return {
      i,
      ash,
      bokeh,
      left: r() * 100,
      size: bokeh ? 9 + r() * 7 : ash ? 2 + r() * 3 : 2.5 + r() * 3.5,
      dur: bokeh ? 14 + r() * 8 : 8 + r() * 10,
      delay: -r() * 20,
      sway: (r() - 0.5) * 90,
      rise: 55 + r() * 45,
      glow: bokeh ? 0.35 + r() * 0.25 : 0.6 + r() * 0.4,
      mobile: i % 2 === 0,
    };
  });
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ containerType: "size" }} aria-hidden>
      {parts.map((p) => (
        <span
          key={p.i}
          className={`cinza ${p.ash ? "cinza-apagada" : "cinza-brasa"} ${p.bokeh ? "cinza-perto" : ""} ${p.mobile ? "" : "hidden sm:block"}`}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            ["--dur" as string]: `${p.dur}s`,
            ["--delay" as string]: `${p.delay}s`,
            ["--sway" as string]: `${p.sway}px`,
            ["--rise" as string]: `${p.rise + 50}cqh`,
            ["--glow" as string]: p.glow,
          }}
        />
      ))}
    </div>
  );
}

function FireEye({ left, top, width, delay }: { left: number; top: number; width: number; delay: number }) {
  return (
    <div
      className="fogo-olho absolute"
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, aspectRatio: "1 / 1.5", transform: "translate(-50%, -84%)", ["--d" as string]: `${delay}s` }}
    >
      {/* Brilho que pulsa ao redor do olho */}
      <span className="fogo-brilho absolute left-1/2 top-[78%] h-[55%] w-[110%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      {/* Chamas com distorção de turbulência */}
      <svg viewBox="0 0 100 150" className="absolute inset-0 h-full w-full overflow-visible" style={{ filter: "url(#fogo-turbulencia)" }}>
        <defs>
          <radialGradient id={`fg-ext-${left.toFixed(1)}`} cx="50%" cy="78%" r="60%">
            <stop offset="0%" stopColor="#FFE08A" stopOpacity="0.9" />
            <stop offset="24%" stopColor="#FF9A1F" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#FF3D00" stopOpacity="0.75" />
            <stop offset="80%" stopColor="#B00000" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#7A0000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="fogo-chama" style={{ mixBlendMode: "screen" }}>
          <path d="M50 148 C18 140 14 110 28 86 C34 74 30 60 40 44 C42 62 52 66 54 52 C58 36 52 22 60 6 C66 30 80 44 78 70 C88 64 88 54 86 46 C96 66 94 96 84 118 C78 134 66 146 50 148 Z" fill={`url(#fg-ext-${left.toFixed(1)})`} />
        </g>
        <g className="fogo-nucleo" style={{ mixBlendMode: "screen" }}>
          <ellipse cx="50" cy="124" rx="11" ry="15" fill="#FFD27A" opacity="0.45" />
        </g>
      </svg>
      {/* Brasas subindo */}
      {[0, 1, 2, 3, 4].map((k) => (
        <span key={k} className="fogo-brasa absolute rounded-full" style={{ left: `${30 + k * 10}%`, bottom: "22%", ["--k" as string]: k }} />
      ))}
    </div>
  );
}

/** Filtro de turbulência animado (uma vez por página): faz as chamas "lamberem" para cima. */
function FireFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <filter id="fogo-turbulencia" x="-30%" y="-30%" width="160%" height="160%">
        <feTurbulence type="fractalNoise" baseFrequency="0.035 0.09" numOctaves="2" seed="7" result="ruido">
          <animate attributeName="baseFrequency" dur="2.6s" values="0.035 0.09;0.045 0.12;0.035 0.09" repeatCount="indefinite" />
          <animate attributeName="seed" dur="0.9s" values="7;12;19;7" calcMode="discrete" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="ruido" scale="22" xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation="0.8" />
      </filter>
    </svg>
  );
}
