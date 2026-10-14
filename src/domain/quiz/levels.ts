/**
 * Progressão do Modo Jogo: a cada 10 questões respondidas, o aluno sobe de nível (patente)
 * e a dificuldade aumenta. Regras puras, usadas no servidor (conferência e XP) e na tela.
 */

export const QUESTIONS_PER_LEVEL = 10;

const PATENTES = ["Recruta", "Soldado", "Cabo", "Sargento", "Subtenente", "Tenente", "Capitão", "Major", "Tenente-Coronel", "Coronel"];

export interface Tier {
  /** 1 = Fácil … 4 = Elite. */
  tier: 1 | 2 | 3 | 4;
  label: string;
  /** Lacunas por dispositivo (no máximo; menos se o texto não tiver termos suficientes). */
  blanks: number;
  /** Palavras no banco (respostas + erradas). */
  bank: number;
  /** Mostra o caput acima do inciso/alínea. */
  context: boolean;
  /** XP por acerto. */
  xp: number;
  description: string;
}

const TIERS: Tier[] = [
  { tier: 1, label: "Fácil", blanks: 1, bank: 4, context: true, xp: 10, description: "1 lacuna e 4 palavras" },
  { tier: 2, label: "Médio", blanks: 2, bank: 6, context: true, xp: 15, description: "2 lacunas e 6 palavras" },
  { tier: 3, label: "Difícil", blanks: 3, bank: 8, context: true, xp: 20, description: "3 lacunas e 8 palavras, com mais pegadinhas" },
  { tier: 4, label: "Elite", blanks: 3, bank: 8, context: false, xp: 25, description: "3 lacunas, 8 palavras e sem o texto de apoio" },
];

/** Nível a partir do total de questões já respondidas (1, 2, 3…). */
export function levelFor(answered: number): number {
  return Math.floor(Math.max(0, answered) / QUESTIONS_PER_LEVEL) + 1;
}

export function tierFor(level: number): Tier {
  return TIERS[Math.min(TIERS.length, Math.max(1, level)) - 1]!;
}

export function tierByNumber(n: number): Tier {
  return TIERS[Math.min(4, Math.max(1, Math.round(n))) - 1]!;
}

/** Patente do nível: Recruta, Soldado, … Coronel; depois "Coronel ★2", "Coronel ★3"… */
export function patente(level: number): string {
  if (level <= PATENTES.length) return PATENTES[Math.max(1, level) - 1]!;
  return `Coronel ★${level - PATENTES.length + 1}`;
}

/** Quantas questões faltam para o próximo nível. */
export function toNextLevel(answered: number): number {
  return QUESTIONS_PER_LEVEL - (Math.max(0, answered) % QUESTIONS_PER_LEVEL);
}
