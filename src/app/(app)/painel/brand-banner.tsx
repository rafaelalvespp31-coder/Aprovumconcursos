/**
 * Banner "Carreiras Policiais" no topo do painel. As bordas somem com máscara,
 * então ele se funde a qualquer fundo claro da página (sem caixa nem contorno).
 */
export function BrandBanner() {
  const fade = "linear-gradient(to bottom, transparent 0%, #000 10%, #000 74%, transparent 100%), linear-gradient(to right, transparent 0%, #000 9%, #000 91%, transparent 100%)";
  return (
    <div className="relative -mx-4 -mt-7 mb-4 h-[300px] overflow-hidden sm:-mx-5 sm:h-[340px] lg:-mx-10 lg:mb-6 lg:h-[420px]" data-testid="painel-banner">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_45%,rgba(255,60,48,0.16),transparent_62%)]" aria-hidden />
      <div
        className="relative mx-auto h-full w-full lg:max-w-[620px]"
        style={{ maskImage: fade, WebkitMaskImage: fade, maskComposite: "intersect", WebkitMaskComposite: "source-in" }}
      >
        <img
          src="/banner-carreiras.webp"
          srcSet="/banner-carreiras-sm.webp 900w, /banner-carreiras.webp 1664w"
          sizes="(min-width: 1024px) 620px, 100vw"
          alt="Carreiras Policiais — APROVUM: sua preparação, seu próximo cargo. O PWA de estudos para concursos com IA e gamificação."
          className="marca-zoom absolute inset-0 h-full w-full object-cover object-[50%_14%] lg:object-[50%_12%]"
          fetchPriority="high"
        />
        <div className="marca-brilho pointer-events-none absolute inset-0" aria-hidden />
      </div>
    </div>
  );
}
