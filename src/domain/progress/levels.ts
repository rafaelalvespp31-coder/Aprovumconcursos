/**
 * Avaliação em três níveis por unidade de estudo: fácil → médio → difícil.
 * Cada nível precisa de pelo menos 90% de aproveitamento para liberar o seguinte.
 */

export const LEVELS = [
  { n: 1, key: "facil", label: "Fácil", difficulties: [1, 2] },
  { n: 2, key: "medio", label: "Médio", difficulties: [3] },
  { n: 3, key: "dificil", label: "Difícil", difficulties: [4, 5] },
] as const;

export type LevelKey = (typeof LEVELS)[number]["key"];
export type LevelNumber = (typeof LEVELS)[number]["n"];

export const LEVEL_KEYS = LEVELS.map((l) => l.key) as [LevelKey, ...LevelKey[]];

export function levelByKey(key: LevelKey) {
  return LEVELS.find((l) => l.key === key)!;
}

export function levelByNumber(n: number) {
  return LEVELS.find((l) => l.n === n) ?? null;
}

/** Nível que corresponde a uma dificuldade 1–5. */
export function levelForDifficulty(difficulty: number): LevelKey {
  if (difficulty <= 2) return "facil";
  if (difficulty === 3) return "medio";
  return "dificil";
}

/** Situação de cada nível para a interface: aprovado, liberado ou bloqueado. */
export function levelStatus(levelsPassed: number, n: LevelNumber): "aprovado" | "liberado" | "bloqueado" {
  if (n <= levelsPassed) return "aprovado";
  if (n === levelsPassed + 1) return "liberado";
  return "bloqueado";
}

/**
 * Questões necessárias para 90%: com N questões, é preciso acertar ⌈0,9·N⌉.
 * Ex.: 10 questões → 9 acertos.
 */
export function requiredCorrect(total: number, minAccuracy = 0.9): number {
  return Math.ceil(total * minAccuracy - 1e-9);
}
