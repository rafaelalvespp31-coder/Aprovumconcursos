/**
 * Banner da marca no topo do painel (modo estudo), de ponta a ponta da área de conteúdo.
 * - Celular: largura total, arte inteira (sem cortar textos).
 * - Desktop: faixa com a altura da tela; arte inteira no centro e laterais preenchidas
 *   pela própria arte desfocada, sem caixa nem contorno.
 *
 * Animações (todas decorativas e suaves):
 * - Olhos: fogo dentro do contorno exato do brilho dos olhos (máscara recortada da própria
 *   arte), com línguas subindo das bordas. Duas camadas de textura de fogo deslizam para
 *   cima em velocidades diferentes — movimento contínuo, sem saltos.
 * - Letras e frases: um reflexo de luz que atravessa os textos devagar (máscara gerada
 *   a partir da própria arte, então só as letras brilham).
 * - "V" do APROVUM: letreiro de neon — halo vermelho, tubo aceso e falhas de acendimento.
 */

const W = 1664;
const H = 1536;
const pct = (v: number, total: number) => `${(v / total) * 100}%`;

/** Região dos olhos na arte original (px): a máscara do fogo foi recortada desta área. */
const EYES_BOX = { x0: 400, y0: 250, x1: 1020, y1: 430 };

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

          {/* Fogo exatamente no contorno dos olhos (máscara recortada do brilho da arte) */}
          <div
            className="olhos-fogo absolute"
            style={{ left: pct(EYES_BOX.x0, W), top: pct(EYES_BOX.y0, H), width: pct(EYES_BOX.x1 - EYES_BOX.x0, W), height: pct(EYES_BOX.y1 - EYES_BOX.y0, H) }}
          >
            <div className="olhos-fogo-camada olhos-fogo-a" />
            <div className="olhos-fogo-camada olhos-fogo-b" />
          </div>
        </div>
      </div>
    </div>
  );
}
