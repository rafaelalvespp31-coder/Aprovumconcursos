import type { LucideIcon } from "lucide-react";
import { BookOpen, BrainCircuit, Calculator, FileText, Gavel, Landmark, Laptop, Puzzle, Scale, Shield, Target } from "lucide-react";

/** Anel de progresso (SVG). O valor é sempre o real; 0 quando não há dados. */
export function Ring({ value, size = 96, stroke = 10, dark = false, label }: { value: number; size?: number; stroke?: number; dark?: boolean; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <span className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${v}%`}>
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={60 - stroke / 2 - 2} fill="none" strokeWidth={stroke} className={dark ? "stroke-white/15" : "stroke-[#E5E8ED]"} />
        {v > 0 && (
        <circle
          cx="60"
          cy="60"
          r={60 - stroke / 2 - 2}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray={`${v} 100`}
          className="stroke-[#F01820] transition-[stroke-dasharray] duration-700"
          style={{ filter: dark ? "drop-shadow(0 0 4px rgba(240,24,32,.7))" : undefined }}
        />
        )}
      </svg>
      <span className={`absolute font-bold tabular-nums ${dark ? "text-white" : "text-[#080808]"}`} style={{ fontSize: size * 0.24 }}>
        {v}%
      </span>
    </span>
  );
}

/** Barras inclinadas de foco (dias com estudo). */
export function FocusBars({ days, className = "" }: { days: boolean[]; className?: string }) {
  return (
    <span className={`flex gap-1 ${className}`} role="img" aria-label={`Estudou em ${days.filter(Boolean).length} dos últimos ${days.length} dias`}>
      {days.map((on, i) => (
        <span key={i} className={`h-[9px] w-[18px] -skew-x-[28deg] ${on ? "bg-[#F01820] shadow-[0_0_8px_rgba(240,24,32,.5)]" : "bg-[#E5E8ED]"}`} />
      ))}
    </span>
  );
}

const ICONS: Array<[RegExp, LucideIcon]> = [
  [/constitucional/i, Landmark],
  [/processual penal|processo penal/i, Gavel],
  [/penal/i, Scale],
  [/administrativ/i, FileText],
  [/legisla/i, Shield],
  [/humanos/i, Shield],
  [/inform/i, Laptop],
  [/portugu/i, BookOpen],
  [/matem/i, Calculator],
  [/racioc|l[oó]gic/i, Puzzle],
  [/espec[ií]fic/i, Target],
];

/** Ícone da matéria (ícones lineares; matéria desconhecida usa o cérebro de "aulas inteligentes"). */
export function DisciplineIcon({ discipline, className = "size-6" }: { discipline: string | null; className?: string }) {
  const Icon = ICONS.find(([re]) => discipline && re.test(discipline))?.[1] ?? BrainCircuit;
  return <Icon className={className} aria-hidden />;
}
