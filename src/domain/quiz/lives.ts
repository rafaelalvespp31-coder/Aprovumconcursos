/** Vidas do Modo Jogo: acabaram todas, o jogo trava por 24 h. Gratuito: 2 vidas e trava. Plano pago (qualquer) e admin: sem trava. */
export const LIVES_FREE = 2;
export const LIVES_PAID = 5;
export const LOCK_MS = 24 * 60 * 60 * 1000;

/** Plano pago (Pro, Premium…) e admin jogam sem perder vidas e sem a trava de 24 h. A degustação promocional continua com as vidas do plano gratuito/pago de origem. */
export const semTrava = (p: { paid: boolean; admin: boolean }): boolean => p.paid || p.admin;

export const maxLives = (paid: boolean): number => (paid ? LIVES_PAID : LIVES_FREE);

/** "daqui a 3 h 20 min" a partir do fim do bloqueio. */
export function faltaPara(lockedUntil: string | Date, now: Date = new Date()): string {
  const ms = Math.max(0, new Date(lockedUntil).getTime() - now.getTime());
  const min = Math.ceil(ms / 60_000);
  const h = Math.floor(min / 60), m = min % 60;
  if (h <= 0) return `${Math.max(1, m)} min`;
  return m ? `${h} h ${m} min` : `${h} h`;
}
