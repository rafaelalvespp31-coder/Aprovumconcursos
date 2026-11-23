import { fold } from "@/domain/edital/text";

/** Arte vertical usada como marca d'água na página de análise de cada órgão (arquivos em public/orgs). */
const FUNDOS: Array<{ re: RegExp; url: string }> = [{ re: /\bpc ?mg\b|policia civil (do estado )?de minas gerais|policia civil mg\b/, url: "/orgs/pcmg-fundo.webp" }];

export function fundoDoConcurso(...textos: Array<string | null | undefined>): string | null {
  const t = fold(textos.filter(Boolean).join(" "));
  return t ? (FUNDOS.find((f) => f.re.test(t))?.url ?? null) : null;
}
