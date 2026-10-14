/**
 * Banner do Modo Jogo (arte "APROVUM — operadores caveira"), de ponta a ponta.
 * - Celular: largura total, arte inteira (sem cortar textos).
 * - Desktop: faixa com a altura da tela; arte inteira no centro e laterais com a
 *   própria arte desfocada e escurecida.
 * Os olhos em brasa ganham fogo animado: chamas com distorção de turbulência (SVG),
 * brilho pulsante e brasas subindo. Sobre a arte flutuam brasas e cinzas, como depois
 * de uma explosão. Tudo é decorativo (aria-hidden).
 */

const W = 1664;
const H = 1536;

/** Olhos na arte original (px) e tamanho da chama (px de largura). */
const EYES = [
  { x: 810, y: 346, w: 86, d: 0 },
  { x: 921, y: 324, w: 94, d: 0.35 },
  { x: 493, y: 381, w: 58, d: 0.7 },
  { x: 561, y: 369, w: 62, d: 0.15 },
] as const;

export function JogoHero() {
  const bottomFade = "linear-gradient(to bottom, #000 0%, #000 90%, transparent 100%)";
  const sideFade = "linear-gradient(to right, transparent 0%, #000 7%, #000 93%, transparent 100%)";
  return (
    <div
      className="relative -mx-4 -mt-6 mb-5 overflow-hidden sm:-mx-5 lg:-mx-10 lg:h-[min(calc(100dvh-6rem),900px)] lg:min-h-[560px]"
      style={{ maskImage: bottomFade, WebkitMaskImage: bottomFade }}
      data-testid="jogo-banner-marca"
    >
      <FireFilter />
      {/* Laterais no desktop: a própria arte, desfocada e escurecida */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        <img src="/banner-jogo-fundo.webp" alt="" className="h-full w-full scale-110 object-cover blur-2xl" />
        <div className="absolute inset-0 bg-[#070707]/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_35%,rgba(225,6,0,0.22),transparent_62%)]" />
      </div>

      <div
        className="relative mx-auto aspect-[1664/1536] w-full lg:h-full lg:w-auto lg:max-w-full lg:[mask-image:var(--lado)] lg:[-webkit-mask-image:var(--lado)]"
        style={{ ["--lado" as string]: sideFade }}
      >
        <img
          src="/banner-jogo.webp"
          srcSet="/banner-jogo-sm.webp 1040w, /banner-jogo.webp 1664w"
          sizes="(min-width: 1024px) 975px, 100vw"
          width={W}
          height={H}
          alt="APROVUM — Sua preparação. Seu próximo cargo. O PWA de estudos para concursos com IA e gamificação: aulas inteligentes, gamificação, todos os concursos, questões reais e seu progresso. Mais que estudo, é estratégia."
          className="marca-zoom block h-full w-full object-contain"
          fetchPriority="high"
          decoding="async"
        />
        {/* Fogo nos olhos (posição em % da arte, então acompanha qualquer tamanho de tela) */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          {EYES.map((e, i) => (
            <FireEye key={i} left={(e.x / W) * 100} top={(e.y / H) * 100} width={(e.w / W) * 100} delay={e.d} />
          ))}
        </div>
      </div>
      {/* Brasas e cinzas flutuando sobre todo o banner (inclusive as laterais do desktop) */}
      <Embers />
    </div>
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
