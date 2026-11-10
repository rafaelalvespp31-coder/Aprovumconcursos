/** Código de indicação do aluno: "APV-" + 6 caracteres sem letras/números parecidos (0/O, 1/I/L). Puro. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const PREFIX = "APV-";

export function generateReferralCode(rand: (max: number) => number = (m) => Math.floor(Math.random() * m)): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[rand(ALPHABET.length)];
  return PREFIX + s;
}

/** Normaliza o que o aluno digitou (aceita minúsculas, espaços e sem o prefixo). null se não parecer um código. */
export function normalizeReferralCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (s.startsWith("APV")) s = s.slice(3);
  if (s.length !== 6 || ![...s].every((c) => ALPHABET.includes(c))) return null;
  return PREFIX + s;
}

/** Planos que dão o prêmio da indicação. */
export const REFERRAL_OFFERS = ["anual", "vitalicio"] as const;
export const isReferralOffer = (o: string): boolean => (REFERRAL_OFFERS as readonly string[]).includes(o);
