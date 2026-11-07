import type { ReactNode } from "react";

export const MODALIDADE_LABEL: Record<string, string> = { enem: "ENEM", concurso: "Concurso público", vestibular: "Vestibular", discursiva: "Redação discursiva", dissertacao: "Dissertação", argumentativo: "Texto argumentativo", expositivo: "Texto expositivo", narrativo: "Texto narrativo", descritivo: "Texto descritivo", oficial: "Redação oficial", relatorio: "Relatório", administrativo: "Texto administrativo" };

export function Secao({ titulo, children, id, aside }: { titulo: string; children: ReactNode; id?: string; aside?: ReactNode }) {
  return (
    <section id={id} className="pc min-w-0 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-extrabold tracking-[-0.01em] text-[#08090B]">{titulo}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Lista({ itens, vazio }: { itens: string[]; vazio?: string }) {
  if (!itens.length) return vazio ? <p className="text-[13px] text-[#64666D]">{vazio}</p> : null;
  return (
    <ul className="flex flex-col gap-1.5">
      {itens.map((t, i) => (
        <li key={i} className="flex gap-2 text-[13.5px] leading-snug text-[#2B2D33]">
          <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-[#E50914]" />
          <span className="min-w-0 [overflow-wrap:anywhere]">{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function Aviso({ children, tom = "info" }: { children: ReactNode; tom?: "info" | "alerta" | "erro" }) {
  const c = tom === "erro" ? "border-[#E50914]/40 bg-[#FFF5F5] text-[#8A0710]" : tom === "alerta" ? "border-[#E8C16A] bg-[#FFF9EB] text-[#6B4A00]" : "border-[#E6E7EB] bg-[#F7F7F9] text-[#3A3C42]";
  return <p role={tom === "erro" ? "alert" : "status"} className={`rounded-[12px] border px-3 py-2 text-[13px] leading-snug ${c}`}>{children}</p>;
}

export const dataBR = (iso: string) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(iso));

/** Gráfico de linha em SVG (sem biblioteca): valores em %. */
export function Linha({ pontos, rotulo, altura = 140 }: { pontos: { x: string; y: number }[]; rotulo: string; altura?: number }) {
  if (!pontos.length) return null;
  const W = 320;
  const H = altura;
  const pad = 22;
  const step = pontos.length > 1 ? (W - pad * 2) / (pontos.length - 1) : 0;
  const xy = pontos.map((p, i) => [pad + (pontos.length > 1 ? i * step : (W - pad * 2) / 2), pad + (1 - Math.max(0, Math.min(100, p.y)) / 100) * (H - pad * 2)] as const);
  const d = xy.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${rotulo}: ${pontos.map((p) => `${p.x} ${Math.round(p.y)}%`).join(", ")}`} className="h-auto w-full">
      {[0, 50, 100].map((g) => {
        const y = pad + (1 - g / 100) * (H - pad * 2);
        return (
          <g key={g}>
            <line x1={pad} x2={W - pad} y1={y} y2={y} stroke="#ECEDF0" />
            <text x={pad - 4} y={y + 3} textAnchor="end" fontSize="8" fill="#9A9CA3">{g}</text>
          </g>
        );
      })}
      <path d={d} fill="none" stroke="#E50914" strokeWidth="2" strokeLinejoin="round" />
      {xy.map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="3.5" fill="#fff" stroke="#E50914" strokeWidth="2" />
          <text x={x} y={Math.max(10, y - 7)} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#08090B">{Math.round(pontos[i]!.y)}</text>
          <text x={x} y={H - 6} textAnchor="middle" fontSize="7.5" fill="#64666D">{pontos[i]!.x}</text>
        </g>
      ))}
    </svg>
  );
}
