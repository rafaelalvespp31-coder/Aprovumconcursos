import type { Criterio, Rubrica } from "./rubricas";

/** Dupla avaliação + auditoria. Lógica pura (testável): compara os dois avaliadores independentes e reconcilia SEM média cega. */

export interface PontuacaoAvaliador { key: string; pontuacao: number; justificativa: string }
export type Autoridade = "lingua" | "banca";

/** Critérios cuja palavra final de especialidade é do Avaliador 1 (língua portuguesa, norma culta e coesão textual). */
const LINGUA = new Set(["c1", "c4", "norma_culta", "coesao", "coesao_coerencia"]);
/** Demais critérios (tema, gênero, argumentação, proposta, conteúdo, critérios do edital) são do Avaliador 2 (banca/argumentação). */
export const autoridadeDe = (key: string): Autoridade => (LINGUA.has(key) ? "lingua" : "banca");

/** Divergência relevante: a distância entre os avaliadores chega a 25% do máximo do critério (no ENEM, 2 níveis ou mais). */
export const LIMIAR_RELEVANTE = 0.25;

export type Gravidade = "nenhuma" | "leve" | "relevante";
export interface Divergencia {
  key: string;
  label: string;
  avaliador1: number | null;
  avaliador2: number | null;
  gravidade: Gravidade;
  final: number;
  decididoPor: "ambos_iguais" | "especialista" | "auditor" | "menor_nota" | "unico_avaliador";
  motivo: string;
}
export interface ResultadoAuditoria {
  pontuacoes: PontuacaoAvaliador[];
  divergencias: Divergencia[];
  revisaoHumana: boolean;
  notas: string[];
}

export function gravidadeDaDivergencia(a: number, b: number, c: Criterio): Gravidade {
  const d = Math.abs(a - b);
  if (d < 1e-9) return "nenhuma";
  return d / (c.max || 1) >= LIMIAR_RELEVANTE - 1e-9 ? "relevante" : "leve";
}

/** Critérios com divergência relevante: só eles vão ao auditor (IA). */
export function criteriosParaAuditar(rubrica: Rubrica, a1: PontuacaoAvaliador[], a2: PontuacaoAvaliador[]): string[] {
  const m1 = new Map(a1.map((p) => [p.key, p.pontuacao]));
  const m2 = new Map(a2.map((p) => [p.key, p.pontuacao]));
  return rubrica.criteria.filter((c) => m1.has(c.key) && m2.has(c.key) && gravidadeDaDivergencia(m1.get(c.key)!, m2.get(c.key)!, c) === "relevante").map((c) => c.key);
}

export interface VereditoAuditor { key: string; pontuacao: number; motivo: string; descontoSemEvidencia?: boolean; penalidadeDuplicada?: boolean }

/**
 * Reconciliação. Regras:
 * - iguais → mantém;
 * - divergência leve → prevalece o avaliador especialista do critério (nunca média);
 * - divergência relevante → vale o veredito do auditor, limitado ao intervalo [menor, maior] dos dois avaliadores; sem auditor,
 *   adota a menor nota (conservadora). Em ambos os casos, revisão humana recomendada;
 * - um avaliador sem nota para o critério → usa o outro e avisa.
 */
export function reconciliar(rubrica: Rubrica, a1: PontuacaoAvaliador[], a2: PontuacaoAvaliador[], vereditos: VereditoAuditor[] = []): ResultadoAuditoria {
  const m1 = new Map(a1.map((p) => [p.key, p]));
  const m2 = new Map(a2.map((p) => [p.key, p]));
  const mv = new Map(vereditos.map((v) => [v.key, v]));
  const pontuacoes: PontuacaoAvaliador[] = [];
  const divergencias: Divergencia[] = [];
  const notas: string[] = [];
  let revisaoHumana = false;

  for (const c of rubrica.criteria) {
    const p1 = m1.get(c.key);
    const p2 = m2.get(c.key);
    if (!p1 && !p2) continue; // consistência.ts avisa e considera 0
    if (!p1 || !p2) {
      const u = (p1 ?? p2)!;
      pontuacoes.push(u);
      divergencias.push({ key: c.key, label: c.label, avaliador1: p1?.pontuacao ?? null, avaliador2: p2?.pontuacao ?? null, gravidade: "nenhuma", final: u.pontuacao, decididoPor: "unico_avaliador", motivo: "Só um avaliador atribuiu nota a este critério." });
      notas.push(`${c.label}: apenas um dos avaliadores atribuiu nota; usada a nota disponível.`);
      continue;
    }
    const g = gravidadeDaDivergencia(p1.pontuacao, p2.pontuacao, c);
    const lo = Math.min(p1.pontuacao, p2.pontuacao);
    const hi = Math.max(p1.pontuacao, p2.pontuacao);
    if (g === "nenhuma") {
      pontuacoes.push({ key: c.key, pontuacao: p1.pontuacao, justificativa: p1.justificativa });
      divergencias.push({ key: c.key, label: c.label, avaliador1: p1.pontuacao, avaliador2: p2.pontuacao, gravidade: g, final: p1.pontuacao, decididoPor: "ambos_iguais", motivo: "Os dois avaliadores concordam." });
      continue;
    }
    if (g === "leve") {
      const dono = autoridadeDe(c.key) === "lingua" ? p1 : p2;
      pontuacoes.push({ key: c.key, pontuacao: dono.pontuacao, justificativa: dono.justificativa });
      const quem = autoridadeDe(c.key) === "lingua" ? "o avaliador de língua portuguesa" : "o avaliador de banca e argumentação";
      const motivo = `Divergência leve (${p1.pontuacao} × ${p2.pontuacao}); prevaleceu ${quem}, especialista neste critério.`;
      divergencias.push({ key: c.key, label: c.label, avaliador1: p1.pontuacao, avaliador2: p2.pontuacao, gravidade: g, final: dono.pontuacao, decididoPor: "especialista", motivo });
      notas.push(`${c.label}: ${motivo}`);
      continue;
    }
    revisaoHumana = true;
    const v = mv.get(c.key);
    if (v) {
      const final = Math.max(lo, Math.min(hi, v.pontuacao));
      const motivo = `Divergência relevante (${p1.pontuacao} × ${p2.pontuacao}); a auditoria decidiu ${final}${final !== v.pontuacao ? ` (limitado ao intervalo dos avaliadores)` : ""}: ${v.motivo}`;
      pontuacoes.push({ key: c.key, pontuacao: final, justificativa: v.motivo });
      divergencias.push({ key: c.key, label: c.label, avaliador1: p1.pontuacao, avaliador2: p2.pontuacao, gravidade: g, final, decididoPor: "auditor", motivo });
      notas.push(`${c.label}: ${motivo}`);
      if (v.descontoSemEvidencia) notas.push(`${c.label}: a auditoria identificou desconto sem evidência suficiente no texto.`);
      if (v.penalidadeDuplicada) notas.push(`${c.label}: a auditoria identificou possível penalidade duplicada do mesmo problema.`);
    } else {
      const dono = p1.pontuacao <= p2.pontuacao ? p1 : p2;
      const motivo = `Divergência relevante (${p1.pontuacao} × ${p2.pontuacao}) sem veredito da auditoria; adotada a menor nota por cautela.`;
      pontuacoes.push({ key: c.key, pontuacao: lo, justificativa: dono.justificativa });
      divergencias.push({ key: c.key, label: c.label, avaliador1: p1.pontuacao, avaliador2: p2.pontuacao, gravidade: g, final: lo, decididoPor: "menor_nota", motivo });
      notas.push(`${c.label}: ${motivo}`);
    }
  }
  if (revisaoHumana) notas.unshift("Houve divergência relevante entre os avaliadores: recomendamos revisão humana desta nota.");
  return { pontuacoes, divergencias, revisaoHumana, notas };
}

/** Descontos sem justificativa suficiente: critério abaixo do máximo com justificativa curta demais. */
export function descontosSemJustificativa(rubrica: Rubrica, finais: PontuacaoAvaliador[]): string[] {
  return finais
    .filter((p) => {
      const c = rubrica.criteria.find((x) => x.key === p.key);
      return c && p.pontuacao < c.max && p.justificativa.trim().length < 25;
    })
    .map((p) => `${rubrica.criteria.find((x) => x.key === p.key)!.label}: desconto sem justificativa suficiente.`);
}

/**
 * Regra de evidência: um critério só perde nota se houver base concreta no texto. Aqui ficam as categorias de
 * apontamento que sustentam cada critério ligado a problemas localizáveis (coesão). Critérios holísticos
 * (tema, argumentação, proposta) e a norma culta (que tem teto próprio por desvios) ficam de fora.
 */
const EVIDENCIA_POR_CRITERIO: Record<string, string[]> = {
  c4: ["coesao"],
  coesao: ["coesao"],
  coesao_coerencia: ["coesao", "coerencia"],
};

export interface ApontamentoResumo { categoria: string; tipo: string }

/** Critérios com nota abaixo do máximo e NENHUM apontamento localizado que sustente a perda (desconto sem evidência). */
export function criteriosSemEvidencia(rubrica: Rubrica, finais: PontuacaoAvaliador[], apontamentos: ApontamentoResumo[]): string[] {
  const reais = apontamentos.filter((a) => a.tipo === "erro_objetivo" || a.tipo === "problema_construcao");
  return finais
    .filter((p) => {
      const cats = EVIDENCIA_POR_CRITERIO[p.key];
      const c = rubrica.criteria.find((x) => x.key === p.key);
      return cats && c && p.pontuacao < c.max && !reais.some((a) => cats.includes(a.categoria));
    })
    .map((p) => p.key);
}

export interface VereditoEvidencia { key: string; pontuacao: number; trecho?: string | null; motivo: string }

/**
 * Aplica o resultado da checagem de evidência. A nota só se mantém abaixo do máximo se a IA citou um trecho que EXISTE no texto
 * (`trechoExiste`); do contrário o desconto é desfeito (nota máxima). A nota nunca desce além da original.
 */
export function aplicarEvidencias(rubrica: Rubrica, finais: PontuacaoAvaliador[], vereditos: VereditoEvidencia[], trechoExiste: (t: string) => boolean): { pontuacoes: PontuacaoAvaliador[]; notas: string[] } {
  const mv = new Map(vereditos.map((v) => [v.key, v]));
  const notas: string[] = [];
  const pontuacoes = finais.map((p) => {
    const v = mv.get(p.key);
    const c = rubrica.criteria.find((x) => x.key === p.key);
    if (!v || !c) return p;
    const comEvidencia = !!v.trecho && trechoExiste(v.trecho);
    const nova = comEvidencia ? Math.max(p.pontuacao, Math.min(c.max, v.pontuacao)) : c.max;
    if (nova !== p.pontuacao) notas.push(`${c.label}: ${p.pontuacao} → ${nova} (${comEvidencia ? "desconto parcialmente revisto na checagem de evidência" : "desconto desfeito: nenhum trecho do texto sustentou a perda de nota"}).`);
    return nova === p.pontuacao ? p : { key: p.key, pontuacao: nova, justificativa: comEvidencia ? v.motivo : `${p.justificativa} (Sem evidência localizada no texto para descontar neste critério.)` };
  });
  return { pontuacoes, notas };
}
