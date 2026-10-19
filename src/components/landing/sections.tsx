import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ArrowRight, BookOpenText, BrainCircuit, ChevronRight, ClipboardCheck, Crosshair, FileDown, FileText, Layers3, Lightbulb, ListChecks, Play, Scale, ShieldCheck, Target, Zap } from "lucide-react";
import { CoverageRuler, RulerLegend, type RulerState } from "@/components/coverage-ruler";
import type { ExtractedNode } from "@/domain/content/extract";

/** Hero: título com "Precisa aprender melhor." em pincel, texto, botões e o operador caveira. */
export function LandingHero({ primaryHref, primaryLabel }: { primaryHref: string; primaryLabel: string }) {
  return (
    <section id="inicio" className="lp-hero scroll-mt-24">
      <div className="lp-hero-texto">
        <p className="lp-kicker">Concursos públicos</p>
        <h1 className="lp-titulo">
          <span>Você não precisa estudar mais.</span> <span className="lp-pincel">Precisa aprender melhor.</span>
        </h1>
        <p className="lp-hero-desc">
          Um tema, um artigo de lei, um capítulo ou uma matéria — sem precisar do edital. O APROVUM delimita o escopo, ensina em blocos curtos, avalia em três níveis (fácil, médio e
          difícil) e, ao final, entrega o PDF só daquele conteúdo.
        </p>
        <div className="lp-hero-botoes">
          <Link href={primaryHref} className="lp-btn lp-btn-vermelho lp-btn-grande">
            {primaryLabel} <ChevronRight className="size-5" aria-hidden />
          </Link>
          <a href="#como-funciona" className="lp-btn lp-btn-contorno lp-btn-grande">
            <span className="lp-play" aria-hidden>
              <Play className="size-3 fill-current" />
            </span>
            Como funciona
          </a>
        </div>
        <p className="lp-hero-apoio">
          <Target className="size-4 text-[#F20D18]" aria-hidden /> Sua preparação. Seu próximo cargo.
        </p>
      </div>
      <div className="lp-hero-arte" aria-hidden>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/landing-hero.webp"
          srcSet="/images/landing-hero-sm.webp 604w, /images/landing-hero.webp 1208w"
          sizes="(min-width: 1024px) 620px, 100vw"
          alt=""
          width={1208}
          height={980}
          fetchPriority="high"
        />
      </div>
    </section>
  );
}

/** Indicadores: só números reais (catálogo) e características verdadeiras do método. */
export function LandingStats({ stats }: { stats: { lessons: number; questions: number } | null }) {
  const fmt = (n: number) => n.toLocaleString("pt-BR");
  const items: Array<{ icon: LucideIcon; big: string; small: string }> = [
    { icon: Crosshair, big: stats ? fmt(stats.lessons) : "Catálogo", small: stats ? "aulas prontas no catálogo" : "de aulas prontas e revisadas" },
    { icon: ListChecks, big: stats ? fmt(stats.questions) : "Questões", small: stats ? "questões revisadas no banco" : "revisadas, com gabarito comentado" },
    { icon: Zap, big: "IA", small: "com fontes verificadas" },
    { icon: ShieldCheck, big: "3 níveis", small: "fácil, médio e difícil (90% em cada)" },
  ];
  return (
    <section className="lp-stats" aria-label="O APROVUM em números">
      {items.map(({ icon: Icon, big, small }) => (
        <div key={small} className="lp-stat">
          <Icon className="lp-stat-icone" aria-hidden />
          <div>
            <p className="lp-stat-big">{big}</p>
            <p className="lp-stat-small">{small}</p>
          </div>
        </div>
      ))}
    </section>
  );
}

const STEPS: Array<{ icon: LucideIcon; title: string; text: string }> = [
  { icon: FileText, title: "Cole o conteúdo", text: "Cole o tema, matéria ou artigo de lei que você quer estudar — ou escolha uma aula pronta." },
  { icon: BrainCircuit, title: "IA organiza", text: "A IA transforma o conteúdo em uma aula visual e objetiva, só dentro do escopo pedido." },
  { icon: ClipboardCheck, title: "Estude e evolua", text: "Responda às questões em 3 níveis de dificuldade e acompanhe seu progresso." },
  { icon: FileDown, title: "Baixe o PDF", text: "Aprovado nos três níveis (90% em cada), receba o PDF completo do conteúdo." },
];

/** Como funciona: chamada à esquerda e os quatro passos do método. */
export function LandingHowItWorks() {
  return (
    <section id="como-funciona" className="lp-como scroll-mt-24">
      <div className="lp-como-texto">
        <p className="lp-etiqueta">Como funciona?</p>
        <h2 className="lp-h2">Simples, direto e feito para o seu resultado.</h2>
        <p className="lp-como-desc">Você não precisa de horas de estudo. Precisa de método. O APROVUM te guia do início ao fim.</p>
        <a href="#exemplo" className="lp-btn lp-btn-vermelho lp-btn-grande">
          Conheça o método <ChevronRight className="size-5" aria-hidden />
        </a>
      </div>
      <ol className="lp-passos">
        {STEPS.map(({ icon: Icon, title, text }, i) => (
          <li key={title} className="lp-passo">
            <span className="lp-passo-num" aria-hidden>
              {i + 1}
            </span>
            <Icon className="lp-passo-icone" aria-hidden />
            <h3 className="lp-passo-titulo">
              <span className="sr-only">Passo {i + 1}: </span>
              {title}
            </h3>
            <p className="lp-passo-texto">{text}</p>
            {i < STEPS.length - 1 && <ChevronRight className="lp-passo-seta" aria-hidden />}
          </li>
        ))}
      </ol>
    </section>
  );
}

const BENEFITS: Array<{ icon: LucideIcon; text: string }> = [
  { icon: BookOpenText, text: "Aula completa e organizada, do básico ao avançado" },
  { icon: Layers3, text: "Esquemas e quadros comparativos" },
  { icon: Lightbulb, text: "Exemplos práticos e casos de aplicação" },
  { icon: Scale, text: "Doutrina e jurisprudência, sinalizadas para conferência na fonte" },
  { icon: ListChecks, text: "Questões inéditas no estilo Cebraspe, FGV, VUNESP e mais" },
];

/**
 * Prévia de conteúdo: o Art. 5º decomposto AGORA pelo motor real do APROVUM (itens e
 * régua de cobertura), ao lado do que cada aula entrega.
 */
export function LandingContentPreview({ demo, nodes, segments }: { demo: string; nodes: ExtractedNode[]; segments: Array<{ key: string; state: RulerState; title: string }> }) {
  return (
    <section id="recursos" className="lp-previa scroll-mt-24">
      <div id="exemplo" className="lp-previa-conteudo scroll-mt-24">
        <div className="lp-previa-topo">
          <span className="lp-previa-icone" aria-hidden>
            <BookOpenText className="size-6" />
          </span>
          <div className="min-w-0">
            <h2 className="lp-previa-titulo">Exemplo de conteúdo</h2>
            <p className="lp-previa-trilha">
              Direito Constitucional <span aria-hidden>•</span> Art. 5º <span aria-hidden>•</span> Direitos e Garantias Fundamentais
            </p>
          </div>
        </div>
        <figure className="mt-4">
          <figcaption className="text-[13px] text-[#555]">Trecho do artigo (caput e incisos I a III), decomposto agora pelo motor do APROVUM:</figcaption>
          <blockquote className="lp-citacao">
            {demo.split("\n").map((line, i) => (
              <p key={i}>
                {i === 0 ? (
                  <>
                    <strong>Art. 5º</strong>
                    {line.replace(/^Art\. 5º/, "")}
                  </>
                ) : (
                  line
                )}
              </p>
            ))}
          </blockquote>
          <div className="mt-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">{segments.length} itens a cobrir</p>
              <p className="text-[12px] text-[#777]">Progresso ilustrativo</p>
            </div>
            <div className="mt-2">
              <CoverageRuler segments={segments} label="Cobertura do exemplo" size="lg" />
            </div>
            <div className="mt-2">
              <RulerLegend states={["dominado", "ensinado", "nao_verificado", "planejado", "pendente"]} />
            </div>
          </div>
          <ol className="lp-itens">
            {nodes.slice(0, 14).map((n) => (
              <li key={n.key} style={{ paddingLeft: `${Math.min(n.depth, 3) * 14}px` }}>
                <span className="lp-itens-marca">{n.marker ?? ""}</span>
                <span className={n.requiresDirectCoverage ? "" : "font-semibold"}>{n.title}</span>
              </li>
            ))}
          </ol>
        </figure>
      </div>
      <ul className="lp-beneficios" aria-label="O que cada aula entrega">
        {BENEFITS.map(({ icon: Icon, text }) => (
          <li key={text}>
            <Icon className="lp-beneficio-icone" aria-hidden />
            <span>{text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Banner final de conversão. */
export function LandingFinalCta({ href, label }: { href: string; label: string }) {
  return (
    <section className="lp-final" aria-labelledby="lp-final-titulo">
      <span className="lp-final-arte" aria-hidden />
      <span className="lp-final-sombra" aria-hidden />
      <Crosshair className="lp-final-alvo" aria-hidden />
      <div className="lp-final-texto">
        <p className="lp-final-kicker">Teste sua estratégia</p>
        <h2 id="lp-final-titulo" className="lp-final-titulo">
          Está pronto para
          <br />
          fazer parte dessa missão?
        </h2>
        <p className="lp-final-sub">Agora é a sua vez.</p>
      </div>
      <Link href={href} className="lp-btn lp-btn-vermelho lp-btn-grande lp-final-btn">
        {label} <ArrowRight className="size-5" aria-hidden />
      </Link>
      <div className="lp-final-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/aprovum-login-logo.png" alt="APROVUM — Sua preparação. Seu próximo cargo." width={523} height={107} />
      </div>
    </section>
  );
}

/** Rodapé: logo, links das seções e direitos. Sem redes sociais (nenhum perfil oficial cadastrado no projeto). */
export function LandingFooter() {
  return (
    <footer className="lp-rodape">
      <Link href="/" aria-label="APROVUM — início" className="lp-rodape-logo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/aprovum-logo-escura.png" alt="APROVUM — Sua preparação. Seu próximo cargo." width={523} height={107} />
      </Link>
      <nav aria-label="Rodapé" className="lp-rodape-nav">
        <a href="#inicio">Início</a>
        <a href="#como-funciona">Como Funciona</a>
        <a href="#recursos">Recursos</a>
        <Link href="/entrar">Entrar</Link>
        <Link href="/cadastro">Criar conta</Link>
      </nav>
      <p className="lp-rodape-copy">
        © {new Date().getFullYear()} APROVUM. Todos os direitos reservados.
        <br />
        Conteúdo gerado com apoio de IA, com verificação de cobertura e sinalização de pontos não verificados.
      </p>
    </footer>
  );
}
