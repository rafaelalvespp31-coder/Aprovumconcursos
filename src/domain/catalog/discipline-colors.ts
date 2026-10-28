import { customDisciplines, DISCIPLINE_MODES } from "@/ai/pedagogy";

/**
 * Cor sólida de cada matéria no admin (pastas e cards do plano de tópicos): todas diferentes entre
 * si e escuras o bastante para texto branco (contraste ≥ 4,5:1).
 */
const FIXED: Record<(typeof DISCIPLINE_MODES)[number], string> = {
  direito_penal: "#C62828", // vermelho
  direito_processual_penal: "#C43E00", // laranja queimado
  direito_constitucional: "#6A1B9A", // roxo
  direito_administrativo: "#1565C0", // azul
  legislacao_especial: "#AD1457", // magenta
  lingua_portuguesa: "#00796B", // verde-azulado
  matematica: "#2E7D32", // verde
  raciocinio_logico: "#5D4037", // marrom
  informatica: "#283593", // índigo
  conhecimentos_especificos: "#455A64", // cinza-azulado
  outra: "#424242", // grafite
};

/** Para matérias cadastradas pela equipe: outras cores, sem repetir as fixas. */
const EXTRA = ["#827717", "#006978", "#33691E", "#0D47A1", "#8E24AA", "#8D3B00", "#880E4F", "#263238"]; // oliva, petróleo, musgo, marinho, orquídea, ferrugem, vinho, chumbo

export function disciplineColor(slug: string): string {
  if (slug in FIXED) return FIXED[slug as keyof typeof FIXED];
  const i = customDisciplines().findIndex((d) => d.slug === slug);
  if (i < 0) return FIXED.outra;
  return EXTRA[i % EXTRA.length]!;
}

/** Todas as cores usadas (para conferir que não se repetem). */
export const DISCIPLINE_PALETTE = { fixed: FIXED, extra: EXTRA };
