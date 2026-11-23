import type { Identificacao } from "./especialista";
import type { ParsedEdital } from "./parser";
import { fold } from "./text";

/**
 * A leitura do edital (matérias e tópicos) é gravada uma vez por PDF e cargo e reaproveitada por todo aluno que anexar o mesmo edital.
 * Suba LEITURA_V quando a leitura melhorar: entradas antigas deixam de valer e o próximo aluno gera (e grava) a nova.
 */
export const LEITURA_V = 1;
/** Só vira leitura compartilhada a que cobriu bem o texto do edital: uma leitura fraca não pode ser servida a todos. */
export const COBERTURA_PARA_COMPARTILHAR = 0.85;

/** O mesmo cargo escrito de jeitos diferentes (caixa, acento, espaços) cai na mesma chave. */
export const chaveCargo = (cargo: string | null | undefined): string => fold(cargo ?? "").slice(0, 120);

export interface LeituraCompartilhada {
  modelo: string;
  info: Identificacao;
  parsed: ParsedEdital;
  leitura: { cobertura: number; trechos: number; descartados: number; naoClassificados: string[] };
}

export const podeCompartilhar = (parsed: ParsedEdital | null, cobertura: number): parsed is ParsedEdital =>
  !!parsed && parsed.found && parsed.disciplines.length > 0 && parsed.disciplines.every((d) => d.topics.length > 0) && cobertura >= COBERTURA_PARA_COMPARTILHAR;

/** Confere a forma do que veio do banco antes de usar: linha estragada vale como "não existe". */
export function validarCompartilhada(row: { modelo?: unknown; info?: unknown; parsed?: unknown; leitura?: unknown } | null): LeituraCompartilhada | null {
  if (!row) return null;
  const p = row.parsed as ParsedEdital | undefined;
  const i = row.info as Identificacao | undefined;
  const l = row.leitura as LeituraCompartilhada["leitura"] | undefined;
  if (!p || !Array.isArray(p.disciplines) || !p.disciplines.length || !i || !Array.isArray(i.cargos) || !l || typeof l.cobertura !== "number") return null;
  for (const d of p.disciplines) {
    if (typeof d?.name !== "string" || !Array.isArray(d.topics) || !d.topics.length) return null;
    for (const t of d.topics) if (typeof t?.title !== "string" || typeof t.depth !== "number" || typeof t.titleKey !== "string") return null;
  }
  return { modelo: typeof row.modelo === "string" ? row.modelo : "", info: i, parsed: p, leitura: l };
}
