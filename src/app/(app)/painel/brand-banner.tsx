/**
 * Banner da marca no topo do painel (modo estudo), de ponta a ponta da área de conteúdo.
 * - Celular: largura total, arte inteira (sem cortar textos).
 * - Desktop: faixa com a altura da tela; arte inteira no centro e laterais preenchidas
 *   pela própria arte desfocada, sem caixa nem contorno.
 *
 * Animações (todas decorativas e suaves):
 * - Olhos: fogo discreto saindo das órbitas — línguas de chama em camadas, cada uma com
 *   ritmo próprio, distorcidas por turbulência lenta, e calor pulsando ao redor.
 * - Letras e frases: um reflexo de luz que atravessa os textos devagar (máscara gerada
 *   a partir da própria arte, então só as letras brilham).
 * - "V" do APROVUM: letreiro de neon — halo vermelho, tubo aceso e falhas de acendimento.
 */

const W = 1664;
const H = 1536;
const pct = (v: number, total: number) => `${(v / total) * 100}%`;

/** Centro das órbitas na arte original (px) e largura da chama (px). */
const EYES = [
  { x: 816, y: 384, w: 96, d: 0 },
  { x: 953, y: 357, w: 104, d: 0.9 },
  { x: 444, y: 394, w: 64, d: 1.7 },
  { x: 541, y: 379, w: 66, d: 0.5 },
] as const;

/** Caixa da letra V na arte original (px). */
const V = { x0: 1075, y0: 772, x1: 1245, y1: 945 };

export function BrandBanner() {
  const bottomFade = "linear-gradient(to bottom, #000 0%, #000 92%, transparent 100%)";
  const sideFade = "linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)";
  return (
    <div
      className="relative -mx-4 -mt-7 mb-4 overflow-hidden sm:-mx-5 lg:-mx-10 lg:mb-6 lg:h-[min(calc(100dvh-6rem),880px)] lg:min-h-[560px]"
      style={{ maskImage: bottomFade, WebkitMaskImage: bottomFade }}
      data-testid="painel-banner"
    >
      <SoftFireFilter />
      {/* Laterais no desktop: a própria arte, ampliada e desfocada */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        <img src="/banner-estudo-fundo.webp" alt="" className="h-full w-full scale-110 object-cover blur-2xl" />
        <div className="absolute inset-0 bg-white/60" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(225,6,0,0.08),transparent_60%)]" />
      </div>
      <div
        className="relative mx-auto aspect-[1664/1536] w-full lg:h-full lg:w-auto lg:max-w-full lg:[mask-image:var(--lado)] lg:[-webkit-mask-image:var(--lado)]"
        style={{ ["--lado" as string]: sideFade }}
      >
        <img
          src="/banner-estudo.webp"
          srcSet="/banner-estudo-sm.webp 1040w, /banner-estudo.webp 1664w"
          sizes="(min-width: 1024px) 955px, 100vw"
          width={W}
          height={H}
          alt="APROVUM — Sua preparação. Seu próximo cargo. O PWA de estudos para concursos com IA e gamificação: aulas inteligentes, gamificação, todos os concursos, questões reais e seu progresso. Mais que estudo, é estratégia."
          className="marca-zoom block h-full w-full object-contain"
          fetchPriority="high"
          decoding="async"
        />

        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {/* Reflexo de luz passando pelas letras e frases */}
          <div className="estudo-reflexo absolute inset-0" />

          {/* V em neon */}
          <div className="absolute" style={{ left: pct(V.x0, W), top: pct(V.y0, H), width: pct(V.x1 - V.x0, W), height: pct(V.y1 - V.y0, H) }}>
            <div className="neon-v-apagado neon-v-forma absolute inset-0" />
            <div className="neon-v-halo absolute inset-0">
              <div className="neon-v-forma absolute inset-0" />
            </div>
            <div className="neon-v-tubo neon-v-forma absolute inset-0" />
          </div>

          {/* Fogo suave nos olhos */}
          {EYES.map((e, i) => (
            <SoftFireEye key={i} n={i} left={(e.x / W) * 100} top={(e.y / H) * 100} width={(e.w / W) * 100} delay={e.d} />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Chama em três línguas (central e duas laterais), cada uma com duração e atraso próprios,
 * para nunca repetir o mesmo desenho. Cores puxadas do vermelho dos olhos da arte, com
 * núcleo quente bem pequeno. A turbulência lenta faz as bordas "lamberem" para cima.
 */
function SoftFireEye({ n, left, top, width, delay }: { n: number; left: number; top: number; width: number; delay: number }) {
  const g = `fogo-suave-g${n}`;
  return (
    <div
      className="fogo-suave absolute"
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, aspectRatio: "1 / 1.6", transform: "translate(-50%, -84%)", ["--d" as string]: `${delay}s` }}
    >
      <span className="fogo-suave-calor absolute left-1/2 top-[82%] h-[48%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full" />
      <svg viewBox="0 0 100 160" className="absolute inset-0 h-full w-full overflow-visible" style={{ filter: "url(#fogo-suave-turb)" }}>
        <defs>
          <radialGradient id={g} cx="50%" cy="86%" r="62%">
            <stop offset="0%" stopColor="#FFE3B0" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#FF9A40" stopOpacity="0.95" />
            <stop offset="46%" stopColor="#FF3414" stopOpacity="0.9" />
            <stop offset="78%" stopColor="#C80E00" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#6E0000" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="fogo-suave-lingua fogo-suave-l1">
          <path d="M50 156 C26 150 22 124 32 104 C38 92 36 78 44 62 C46 78 54 80 55 66 C57 50 52 36 58 18 C66 44 78 60 76 86 C84 80 84 72 82 64 C92 84 88 116 80 132 C74 146 64 155 50 156 Z" fill={`url(#${g})`} />
        </g>
        <g className="fogo-suave-lingua fogo-suave-l2">
          <path d="M30 150 C18 140 18 122 26 110 C30 104 30 96 34 88 C38 100 42 104 44 116 C46 128 42 142 30 150 Z" fill={`url(#${g})`} opacity="0.75" />
        </g>
        <g className="fogo-suave-lingua fogo-suave-l3">
          <path d="M70 150 C82 140 84 120 76 106 C72 98 72 90 68 82 C64 96 60 104 58 116 C56 130 60 144 70 150 Z" fill={`url(#${g})`} opacity="0.75" />
        </g>
        <ellipse className="fogo-suave-nucleo" cx="50" cy="138" rx="9" ry="12" fill="#FFE2B0" opacity="0.4" />
      </svg>
    </div>
  );
}

/** Turbulência lenta e contínua (sem saltos de semente) para um fogo calmo. */
function SoftFireFilter() {
  return (
    <svg width="0" height="0" className="absolute" aria-hidden focusable="false">
      <filter id="fogo-suave-turb" x="-35%" y="-35%" width="170%" height="170%">
        <feTurbulence type="fractalNoise" baseFrequency="0.03 0.075" numOctaves="2" seed="3" result="ruido">
          <animate attributeName="baseFrequency" dur="5.5s" values="0.03 0.075;0.036 0.095;0.028 0.082;0.03 0.075" keyTimes="0;0.4;0.75;1" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1" repeatCount="indefinite" />
        </feTurbulence>
        <feDisplacementMap in="SourceGraphic" in2="ruido" scale="14" xChannelSelector="R" yChannelSelector="G" />
        <feGaussianBlur stdDeviation="0.9" />
      </filter>
    </svg>
  );
}
