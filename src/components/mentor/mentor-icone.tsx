/**
 * Ícone do Mentor APROVUM: a caveira com headset dentro da mira. A arte é a imagem de referência;
 * por cima, duas faixas de vermelho neon correm dentro do anel externo (uma persegue a outra),
 * como energia fluindo num tubo de neon. Feito em SVG + CSS, sem GIF.
 */
export function MentorIcone({ size = 64, className = "" }: { size?: number; className?: string }) {
  return (
    <span className={`mi ${className}`} style={{ width: size, height: size }} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- ícone fixo e pequeno */}
      <img src="/mentor/caveira.webp" alt="" width={size} height={size} draggable={false} />
      <svg viewBox="0 0 100 100" focusable="false">
        <g transform="rotate(-90 50 50)">
          <circle className="mi-run" cx="50" cy="50" r="40.6" pathLength="100" stroke="#FF0000" strokeWidth="1.3" />
          <circle className="mi-run mi-run2" cx="50" cy="50" r="40.6" pathLength="100" stroke="#FF3B3B" strokeWidth="1.3" />
        </g>
      </svg>
    </span>
  );
}
