/**
 * Banner da marca no topo do painel, de ponta a ponta da área de conteúdo.
 * - Celular: ocupa toda a largura e mostra a arte inteira (sem cortar textos).
 * - Desktop: faixa larga com a altura da tela; a arte fica inteira no centro e as
 *   laterais são preenchidas pela própria arte desfocada, sem caixa nem contorno.
 * A borda de baixo some com máscara e se funde ao fundo da página.
 */
export function BrandBanner() {
  const bottomFade = "linear-gradient(to bottom, #000 0%, #000 92%, transparent 100%)";
  const sideFade = "linear-gradient(to right, transparent 0%, #000 6%, #000 94%, transparent 100%)";
  return (
    <div
      className="relative -mx-4 -mt-7 mb-4 overflow-hidden sm:-mx-5 lg:-mx-10 lg:mb-6 lg:h-[min(calc(100dvh-6rem),880px)] lg:min-h-[560px]"
      style={{ maskImage: bottomFade, WebkitMaskImage: bottomFade }}
      data-testid="painel-banner"
    >
      {/* Fundo: a própria arte, ampliada e desfocada (aparece nas laterais do desktop) */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        <img src="/banner-painel-fundo.webp" alt="" className="h-full w-full scale-110 object-cover blur-2xl" />
        <div className="absolute inset-0 bg-white/65" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(225,6,0,0.10),transparent_60%)]" />
      </div>
      <div className="relative mx-auto aspect-[1312/1199] w-full lg:h-full lg:w-auto lg:max-w-full lg:[mask-image:var(--lado)] lg:[-webkit-mask-image:var(--lado)]" style={{ ["--lado" as string]: sideFade }}>
        <img
          src="/banner-painel.webp"
          srcSet="/banner-painel-sm.webp 860w, /banner-painel.webp 1312w"
          sizes="(min-width: 1024px) 963px, 100vw"
          width={1312}
          height={1199}
          alt="APROVUM — Sua preparação. Seu próximo cargo. O PWA de estudos para concursos com IA e gamificação: aulas inteligentes, gamificação, todos os concursos, questões reais e seu progresso."
          className="marca-zoom block h-full w-full object-contain"
          fetchPriority="high"
        />
        <div className="marca-brilho pointer-events-none absolute inset-y-0 left-0" aria-hidden />
      </div>
    </div>
  );
}
