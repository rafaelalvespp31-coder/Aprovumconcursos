import { fold } from "./text";

/** Imagens oficiais dos órgãos mais comuns: `card` (arte 25:16 dos concursos) `logo` (brasão quadrado) e `capa` (vertical, preenche o card do destrinche). */
const ORGS: Array<{ slug: string; nome: string; re: RegExp }> = [
  { slug: "pmerj", nome: "Polícia Militar do Estado do Rio de Janeiro", re: /\bpmerj\b|policia militar do estado do rio de janeiro|policia militar rj\b/ },
  { slug: "pmdf", nome: "Polícia Militar do Distrito Federal", re: /\bpmdf\b|policia militar do distrito federal/ },
  { slug: "pcdf", nome: "Polícia Civil do Distrito Federal", re: /\bpcdf\b|policia civil do distrito federal|policia civil df\b/ },
  { slug: "pcmg", nome: "Polícia Civil do Estado de Minas Gerais", re: /\bpcmg\b|policia civil (do estado )?de minas gerais|policia civil mg\b/ },
  { slug: "prf", nome: "Polícia Rodoviária Federal", re: /\bprf\b|policia rodoviaria federal/ },
];

export function orgImageFor(...texts: Array<string | null | undefined>): { card: string; logo: string; capa: string; nome: string; slug: string } | null {
  const t = fold(texts.filter(Boolean).join(" "));
  if (!t) return null;
  const hit = ORGS.find((o) => o.re.test(t));
  return hit ? { card: `/orgs/${hit.slug}-card.webp`, logo: `/orgs/${hit.slug}-logo.webp`, capa: `/orgs/${hit.slug}-capa.webp`, nome: hit.nome, slug: hit.slug } : null;
}
