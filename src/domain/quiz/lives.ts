/** Vidas do Modo Jogo: acabaram todas, o jogo trava por 24 h. Gratuito 2 vidas; plano pago 5. */
export const LIVES_FREE = 2;
export const LIVES_PAID = 5;
export const LOCK_MS = 24 * 60 * 60 * 1000;

export const maxLives = (paid: boolean): number => (paid ? LIVES_PAID : LIVES_FREE);

/** "daqui a 3 h 20 min" a partir do fim do bloqueio. */
export function faltaPara(lockedUntil: string | Date, now: Date = new Date()): string {
  const ms = Math.max(0, new Date(lockedUntil).getTime() - now.getTime());
  const min = Math.ceil(ms / 60_000);
  const h = Math.floor(min / 60), m = min % 60;
  if (h <= 0) return `${Math.max(1, m)} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
