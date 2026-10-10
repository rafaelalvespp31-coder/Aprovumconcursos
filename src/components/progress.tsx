/**
 * Progresso em três camadas — estudado ⊃ praticado ⊃ dominado — numa única trilha.
 * Diferencia leitura de prática e de domínio demonstrado (nunca uma barra genérica).
 */
export interface TripleCounts {
  total: number;
  studied: number;
  practiced: number;
  mastered: number;
}

const pct = (n: number, t: number) => (t ? Math.round((n / t) * 100) : 0);

export function TripleProgress({ counts, label, compact = false }: { counts: TripleCounts; label: string; compact?: boolean }) {
  const { total, studied, practiced, mastered } = counts;
  const s = pct(studied, total);
  const p = pct(practiced, total);
  const m = pct(mastered, total);
  return (
    <div>
      <div
        role="img"
        aria-label={`${label}: ${studied} de ${total} estudados, ${practiced} praticados, ${mastered} dominados`}
        className={`relative w-full overflow-hidden rounded-sm bg-linha ${compact ? "h-1.5" : "h-2.5"}`}
      >
        <div className="absolute inset-y-0 left-0 bg-estudado transition-[width] duration-500" style={{ width: `${s}%` }} />
        <div className="absolute inset-y-0 left-0 bg-praticado transition-[width] duration-500" style={{ width: `${p}%` }} />
        <div className="absolute inset-y-0 left-0 bg-dominado transition-[width] duration-500" style={{ width: `${m}%` }} />
      </div>
      {!compact && (
        <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 t-tiny text-tinta-suave">
          <Metric color="bg-estudado" label="Estudado" value={studied} total={total} />
          <Metric color="bg-praticado" label="Praticado" value={practiced} total={total} />
          <Metric color="bg-dominado" label="Dominado" value={mastered} total={total} />
        </dl>
      )}
    </div>
  );
}

function Metric({ color, label, value, total }: { color: string; label: string; value: number; total: number }) {
  return (
    <div className="inline-flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-[2px] ${color}`} aria-hidden />
      <dt>{label}</dt>
      <dd className="font-semibold tabular-nums text-tinta">
        {value}/{total}
      </dd>
    </div>
  );
}

/** Barras verticais simples para séries curtas (ex.: acertos por dia). */
export function MiniBars({
  data,
  label,
  max,
}: {
  /** `hint`: texto completo da dica (ex.: a data); padrão é o rótulo do eixo. */
  data: Array<{ key: string; label: string; value: number; secondary?: number; hint?: string }>;
  label: string;
  max?: number;
}) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value + (d.secondary ?? 0)));
  // Séries longas (ex.: 30 dias) precisam caber em 320px: espaço menor e rótulo semanal.
  const dense = data.length > 20;
  const gap = dense ? "gap-[2px]" : "gap-1.5";
  const showLabel = (i: number) => !dense || (data.length - 1 - i) % 7 === 0;
  return (
    <figure className="min-w-0">
      <div className={`flex h-28 items-end ${gap}`} role="img" aria-label={label}>
        {data.map((d) => {
          const total = d.value + (d.secondary ?? 0);
          return (
            <div key={d.key} className="flex h-full min-w-0 flex-1 flex-col justify-end" title={`${d.hint ?? d.label}: ${d.value} acerto(s), ${d.secondary ?? 0} erro(s)`}>
              {total === 0 ? (
                <div className="h-px bg-linha-forte" />
              ) : (
                <div className="flex flex-col gap-[2px] overflow-hidden rounded-t-[3px]" style={{ height: `${(total / top) * 100}%` }}>
                  <div className="bg-erro/70" style={{ flexGrow: d.secondary ?? 0 }} />
                  <div className="bg-azul" style={{ flexGrow: d.value }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className={`mt-1.5 flex ${gap} t-tiny text-tinta-fraca`} aria-hidden>
        {data.map((d, i) => (
          <span key={d.key} className="min-w-0 flex-1 overflow-visible whitespace-nowrap text-center">
            {showLabel(i) ? (dense ? (d.hint ?? d.label).slice(0, 5) : d.label) : ""}
          </span>
        ))}
      </div>
      <figcaption className="mt-2 flex gap-4 t-tiny text-tinta-suave">
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-azul" aria-hidden />Acertos</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2.5 rounded-[2px] bg-erro/70" aria-hidden />Erros</span>
      </figcaption>
    </figure>
  );
}

/** Anel de meta (ex.: questões do dia). */
export function GoalRing({ value, goal, label }: { value: number; goal: number; label: string }) {
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0;
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex items-center gap-3">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90" role="img" aria-label={`${label}: ${value} de ${goal}`}>
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-linha)" strokeWidth="7" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={ratio >= 1 ? "var(--color-dominado)" : "var(--color-azul)"}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${c * ratio} ${c}`}
          className="transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <div>
        <p className="t-h2 tabular-nums">
          {value}
          <span className="t-small font-normal text-tinta-fraca">/{goal}</span>
        </p>
        <p className="t-tiny text-tinta-suave">{label}</p>
      </div>
    </div>
  );
}
