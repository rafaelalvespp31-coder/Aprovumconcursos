/** Tendências reais do Meu Estudo (nada é estimado: sem histórico suficiente, devolve null). */
const DIA = 86_400_000;

export interface TendenciaAulas {
  /** Total acumulado de aulas ao fim de cada uma das últimas semanas (a última é hoje). */
  serie: number[];
  /** Crescimento percentual nos últimos 30 dias; null quando não há base de comparação. */
  pct30: number | null;
}

export function tendenciaAulas(criadasEm: readonly string[], agora: number = Date.now(), semanas = 8): TendenciaAulas {
  const ts = criadasEm.map((c) => new Date(c).getTime()).filter((n) => Number.isFinite(n));
  const serie = Array.from({ length: semanas }, (_, i) => {
    const limite = agora - (semanas - 1 - i) * 7 * DIA;
    return ts.filter((t) => t <= limite).length;
  });
  const novas = ts.filter((t) => t > agora - 30 * DIA).length;
  const antes = ts.length - novas;
  return { serie, pct30: antes > 0 && novas > 0 ? Math.round((novas / antes) * 100) : null };
}

/** Variação do tempo de estudo desta semana sobre a anterior; null sem base de comparação. */
export function variacaoSemanal(semanas: readonly number[]): number | null {
  if (semanas.length < 2) return null;
  const atual = semanas[semanas.length - 1]!;
  const anterior = semanas[semanas.length - 2]!;
  if (anterior <= 0) return null;
  return Math.round(((atual - anterior) / anterior) * 100);
}
