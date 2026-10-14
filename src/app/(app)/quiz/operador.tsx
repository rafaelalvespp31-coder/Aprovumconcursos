"use client";

/**
 * Operador do Modo Jogo: boneco tático com animação suave em camadas
 * (flutua, respira, olhos pulsam, lanterna varre a tela) e reage à resposta:
 * pulinho no acerto, tremida no erro. Tudo em CSS; "reduzir movimento" desliga.
 */
export function Operador({ mood, className = "" }: { mood: "ok" | "erro" | null; className?: string }) {
  return (
    <div className={`pointer-events-none relative ${className}`} aria-hidden>
      {/* sombra no chão acompanha a flutuação */}
      <span className="op-shadow absolute bottom-[1%] left-1/2 h-[5%] w-[70%] -translate-x-1/2 rounded-[50%] bg-black/70 blur-[6px]" />
      <div className="op-float relative h-full">
        <div key={mood ?? "idle"} className={`relative h-full ${mood === "ok" ? "op-hop" : mood === "erro" ? "op-shake" : ""}`}>
          <div className="op-breathe relative inline-block h-full">
            {/* facho da lanterna (sai da lente, à esquerda) */}
            <span className="op-beam absolute right-[96%] top-[24%] h-[46%] w-[240%] origin-right" />
            <img src="/icons/operador.webp" alt="" width={450} height={724} className="relative h-full w-auto select-none drop-shadow-[0_18px_28px_rgba(0,0,0,0.75)]" draggable={false} />
            {/* brilho da lente */}
            <span className="op-lens absolute left-[1%] top-[22.5%] h-[5%] w-[8%] rounded-full bg-[#FFF6D8] blur-[5px]" />
            {/* olhos */}
            <span className="op-eye absolute left-[51%] top-[20%] h-[4%] w-[9%] rounded-full bg-[#FF1E1E] mix-blend-screen blur-[5px]" />
            <span className="op-eye absolute left-[62%] top-[21%] h-[4%] w-[9%] rounded-full bg-[#FF1E1E] mix-blend-screen blur-[5px] [animation-delay:120ms]" />
          </div>
        </div>
      </div>
    </div>
  );
}
