/** Cronômetro de estudo do dia: regras puras (testáveis). */
export const IDLE_LIMIT_SECONDS = 600;

export interface ClockState {
  /** Segundos líquidos de estudo no dia. */
  seconds: number;
  /** Segundos desde a última interação do aluno. */
  idleFor: number;
  paused: boolean;
}

/**
 * Avança 1 segundo. Enquanto o aluno interage, soma. Ao completar 10 min sem interação o
 * relógio para e desconta os 10 min parados (tempo líquido); continua parado até nova interação.
 */
export function tickClock(s: ClockState): ClockState {
  if (s.paused) return s;
  const idleFor = s.idleFor + 1;
  if (idleFor >= IDLE_LIMIT_SECONDS) return { seconds: Math.max(0, s.seconds + 1 - IDLE_LIMIT_SECONDS), idleFor, paused: true };
  return { seconds: s.seconds + 1, idleFor, paused: false };
}

/** O aluno mexeu na página: zera a inatividade e retoma. */
export const touchClock = (s: ClockState): ClockState => (s.idleFor === 0 && !s.paused ? s : { ...s, idleFor: 0, paused: false });

export function formatHMS(total: number): string {
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const sec = total % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(h)}:${p(m)}:${p(sec)}`;
}
