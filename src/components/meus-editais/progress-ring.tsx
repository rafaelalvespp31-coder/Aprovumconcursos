/** Anel de progresso em SVG (preenche com animação via CSS; sem imagem estática). */
export function ProgressRing({ pct, size = 88, stroke = 8, label, tone = "red", children }: { pct: number | null; size?: number; stroke?: number; label?: string; tone?: "red" | "green" | "gray"; children?: React.ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = pct === null ? 0 : Math.max(0, Math.min(100, pct));
  return (
    <span className="me-ring" data-tone={tone} style={{ width: size, height: size, ["--c" as string]: c, ["--o" as string]: c * (1 - v / 100) }} role="img" aria-label={label ?? (pct === null ? "Sem dados suficientes" : `${v}%`)}>
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="me-ring-fundo" strokeWidth={stroke} />
        {v > 0 && <circle cx={size / 2} cy={size / 2} r={r} className="me-ring-valor" strokeWidth={stroke} strokeDasharray={c} strokeLinecap="round" />}
      </svg>
      <span className="me-ring-miolo">{children}</span>
    </span>
  );
}
