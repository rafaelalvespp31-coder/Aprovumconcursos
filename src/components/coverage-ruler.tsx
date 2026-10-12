/**
 * Régua de cobertura: um segmento por item do conteúdo, colorido pelo estado.
 * É a forma visual do diferencial do produto — ver exatamente o que já foi coberto.
 */
export type RulerState = "pendente" | "planejado" | "ensinado" | "praticado" | "dominado" | "nao_verificado";

const fill: Record<RulerState, string> = {
  pendente: "bg-linha",
  planejado: "bg-planejado",
  ensinado: "bg-estudado",
  praticado: "bg-praticado",
  dominado: "bg-dominado",
  // Listras branco/cinza: distingue "não verificado" de "dominado" (preto sólido) sem usar outra cor.
  nao_verificado: "bg-[repeating-linear-gradient(135deg,#0a0a0a_0_2px,#d4d4d4_2px_5px)]",
};

export const RULER_LABELS: Record<RulerState, string> = {
  pendente: "Sem aula",
  planejado: "Planejado",
  ensinado: "Estudado",
  praticado: "Praticado",
  dominado: "Dominado",
  nao_verificado: "Não verificado",
};

export function CoverageRuler({
  segments,
  label,
  size = "md",
}: {
  segments: Array<{ key: string; state: RulerState; title?: string }>;
  label: string;
  size?: "sm" | "md" | "lg";
}) {
  const counts = segments.reduce<Record<string, number>>((acc, s) => {
    acc[s.state] = (acc[s.state] ?? 0) + 1;
    return acc;
  }, {});
  const summary = Object.entries(counts)
    .map(([k, v]) => `${v} ${RULER_LABELS[k as RulerState].toLowerCase()}`)
    .join(", ");
  const h = size === "lg" ? "h-4" : size === "sm" ? "h-1.5" : "h-2.5";
  const gap = segments.length > 80 ? "gap-px" : "gap-[3px]";
  return (
    <div role="img" aria-label={`${label}: ${segments.length} itens — ${summary || "nenhum"}`} className={`flex w-full ${gap}`}>
      {segments.length === 0 ? (
        <div className={`${h} w-full rounded-sm bg-linha`} />
      ) : (
        segments.map((s) => (
          <div key={s.key} title={s.title} className={`${h} min-w-[2px] flex-1 first:rounded-l-sm last:rounded-r-sm ${fill[s.state]}`} />
        ))
      )}
    </div>
  );
}

export function RulerLegend({ states }: { states: RulerState[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 t-tiny text-tinta-suave">
      {states.map((s) => (
        <li key={s} className="inline-flex items-center gap-1.5">
          <span className={`inline-block size-2.5 rounded-[2px] ${fill[s]}`} aria-hidden />
          {RULER_LABELS[s]}
        </li>
      ))}
    </ul>
  );
}
