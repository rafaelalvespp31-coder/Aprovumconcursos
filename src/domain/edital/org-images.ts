import { fold } from "./text";

/** Imagens oficiais dos órgãos mais comuns: `card` (arte 25:16 dos concursos) `logo` (brasão quadrado) e `capa` (vertical, preenche o card do destrinche). */
const ORGS: Array<{ slug: string; re: RegExp }> = [
  { slug: "pmerj", re: /\bpmerj\b|policia militar do estado do rio de janeiro|policia militar rj\b/ },
  { slug: "pmdf", re: /\bpmdf\b|policia militar do distrito federal/ },
  { slug: "pcdf", re: /\bpcdf\b|policia civil do distrito federal|policia civil df\b/ },
  { slug: "pcmg", re: /\bpcmg\b|policia civil (do estado )?de minas gerais|policia civil mg\b/ },
  { slug: "prf", re: /\bprf\b|policia rodoviaria federal/ },
];

export function orgImageFor(...texts: Array<string | null | undefined>): { card: string; logo: string; capa: string } | null {
  const t = fold(texts.filter(Boolean).join(" "));
  if (!t) return null;
  const hit = ORGS.find((o) => o.re.test(t));
  return hit ? { card: `/orgs/${hit.slug}-card.webp`, logo: `/orgs/${hit.slug}-logo.webp`, capa: `/orgs/${hit.slug}-capa.webp` } : null;
}
