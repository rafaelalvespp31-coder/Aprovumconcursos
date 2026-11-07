import type { Criterio, Rubrica } from "./rubricas";
import type { Analise } from "./schemas";

export interface CriterioNota { key: string; label: string; score: number; max: number; level: number | null; justification: string; adjusted: boolean }
export interface ResultadoNota { criterios: CriterioNota[]; total: number; max: number; zeroReason: string | null; notes: string[] }

const OBJETIVAS = new Set(["ortografia", "gramatica", "pontuacao", "concordancia", "regencia"]);

/** Degrau válido mais próximo sem passar do valor; sem degraus, inteiro entre 0 e max. */
export function ajustar(score: number, c: Criterio): number {
  const v = Math.max(0, Math.min(c.max, Number.isFinite(score) ? score : 0));
  if (c.steps?.length) return [...c.steps].filter((s) => s <= v + 1e-9).pop() ?? 0;
  return Math.round(v);
}

/** Teto da Competência I pelo número de desvios objetivos apontados (heurística de consistência APROVUM). */
export function tetoNormaCulta(desvios: number): number {
  if (desvios <= 2) return 200;
  if (desvios <= 5) return 160;
  if (desvios <= 9) return 120;
  if (desvios <= 14) return 80;
  return 40;
}

export interface EntradaConsistencia {
  rubrica: Rubrica;
  pontuacoes: { key: string; pontuacao: number; justificativa: string }[];
  analise: Analise;
  /** Quantidade de erros objetivos de norma culta realmente localizados no texto. */
  desviosObjetivos: number;
}

/**
 * Etapa 8 — revisão de consistência (código, não IA): garante critérios completos, degraus válidos, nota zero,
 * proposta de intervenção ausente e tetos coerentes com os erros apontados. Cada ajuste é registrado e mostrado ao aluno.
 */
export function revisarPontuacao(e: EntradaConsistencia): ResultadoNota {
  const notes: string[] = [];
  const byKey = new Map(e.pontuacoes.map((p) => [p.key, p]));
  const enem = e.rubrica.key === "enem";
  const zero = e.analise.nota_zero.aplica ? e.analise.nota_zero.motivo?.trim() || "Situação de nota zero identificada." : e.analise.tema.aderencia === "fuga" && enem ? "Fuga ao tema." : null;

  const criterios: CriterioNota[] = e.rubrica.criteria.map((c) => {
    const p = byKey.get(c.key);
    let score = p ? ajustar(p.pontuacao, c) : 0;
    let adjusted = false;
    const cap = (teto: number, why: string) => {
      const t = ajustar(teto, c);
      if (score > t) {
        notes.push(`${c.label}: ${score} → ${t} (${why}).`);
        score = t;
        adjusted = true;
      }
    };
    if (!p) notes.push(`${c.label}: a IA não atribuiu pontuação; considerado 0.`);
    else if (Math.abs(p.pontuacao - score) > 1e-9 && p.pontuacao <= c.max) notes.push(`${c.label}: ${p.pontuacao} ajustado para o degrau válido ${score}.`);
    if (zero) {
      if (score > 0) adjusted = true;
      score = 0;
    } else if (enem) {
      if (c.key === "c1") cap(tetoNormaCulta(e.desviosObjetivos), `${e.desviosObjetivos} desvio(s) objetivo(s) de norma culta apontado(s)`);
      if (c.key === "c2" && e.analise.tema.aderencia === "tangencia") cap(40, "tangenciamento do tema");
      if (c.key === "c2" && e.analise.tema.tipoTextual === "inadequado") cap(40, "tipo textual inadequado");
      if (c.key === "c5" && !e.analise.propostaIntervencao.presente) cap(0, "proposta de intervenção ausente");
      if (c.key === "c5" && e.analise.propostaIntervencao.presente && !e.analise.propostaIntervencao.respeitaDireitosHumanos) cap(0, "proposta que desrespeita direitos humanos");
    } else if (c.key === "norma_culta") {
      cap(Math.round(c.max * (tetoNormaCulta(e.desviosObjetivos) / 200)), `${e.desviosObjetivos} desvio(s) objetivo(s) apontado(s)`);
    }
    return { key: c.key, label: c.label, score, max: c.max, level: c.steps ? c.steps.indexOf(score) : null, justification: p?.justificativa ?? "Sem justificativa fornecida.", adjusted };
  });
  const total = criterios.reduce((s, c) => s + c.score, 0);
  if (zero) notes.unshift(`Nota zero: ${zero}`);
  return { criterios, total, max: e.rubrica.max, zeroReason: zero, notes };
}

/** Classificação pedagógica pelo aproveitamento. */
export function classificar(total: number, max: number): string {
  const p = max ? total / max : 0;
  if (p >= 0.9) return "Excelente";
  if (p >= 0.75) return "Muito bom";
  if (p >= 0.6) return "Bom";
  if (p >= 0.4) return "Em desenvolvimento";
  return "Precisa de reforço";
}

export function contaDesviosObjetivos(erros: { tipo: string; categoria: string }[]): number {
  return erros.filter((x) => x.tipo === "erro_objetivo" && OBJETIVAS.has(x.categoria)).length;
}
