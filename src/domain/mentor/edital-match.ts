const STOP = new Set(["de", "da", "do", "das", "dos", "e", "o", "a", "para", "estado", "concurso", "publico", "cargo"]);

const tokens = (s: string): Set<string> =>
  new Set(s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length >= 2 && !STOP.has(w)));

/** Quanto dois nomes de concurso se parecem (0 a 1). Exige 2 palavras em comum para não confundir concursos. */
export function nameScore(query: string, candidate: string): number {
  const q = tokens(query), c = tokens(candidate);
  let overlap = 0;
  for (const w of q) if (c.has(w)) overlap++;
  if (overlap < 2) return 0;
  return overlap / Math.min(q.size, c.size);
}

export const EDITAL_MIN_SCORE = 0.6;

const sem = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

/** Tipo de órgão: sigla ou nome por extenso. "federais" não precisam de estado; os demais precisam. */
const ORGAOS: Array<{ id: string; federal: boolean; re: RegExp }> = [
  { id: "prf", federal: true, re: /\bprf\b|policia rodoviaria federal/ },
  { id: "pf", federal: true, re: /\bpf\b|policia federal/ },
  { id: "pc", federal: false, re: /\bpc\b|policia civil/ },
  { id: "pm", federal: false, re: /\bpm\b|policia militar/ },
  { id: "pp", federal: false, re: /\bpp\b|policia penal|agente penitenciario|agente de seguranca penitenciario/ },
  { id: "gcm", federal: false, re: /\bgcm\b|guarda civil|guarda municipal/ },
  { id: "cbm", federal: false, re: /\bcbm\b|corpo de bombeiros|bombeiro/ },
];

const ESTADOS: Array<[string, string]> = [
  ["ac", "acre"], ["al", "alagoas"], ["ap", "amapa"], ["am", "amazonas"], ["ba", "bahia"], ["ce", "ceara"], ["df", "distrito federal"], ["es", "espirito santo"],
  ["go", "goias"], ["ma", "maranhao"], ["ms", "mato grosso do sul"], ["mt", "mato grosso"], ["mg", "minas gerais"], ["pb", "paraiba"], ["pr", "parana"], ["pe", "pernambuco"],
  ["pi", "piaui"], ["rj", "rio de janeiro"], ["rn", "rio grande do norte"], ["rs", "rio grande do sul"], ["ro", "rondonia"], ["rr", "roraima"], ["sc", "santa catarina"],
  ["sp", "sao paulo"], ["se", "sergipe"], ["to", "tocantins"], ["pa", "estado do para"],
];

/** Tipos de órgão que o texto cita (ex.: "PC MG" → pc; "Polícia Rodoviária Federal" → prf). */
export function orgaosDe(texto: string): string[] {
  const t = sem(texto);
  return ORGAOS.filter((o) => o.re.test(t)).map((o) => o.id);
}

/** Estado citado (sigla colada ao órgão ou no fim, ou nome por extenso). null se não houver ou se houver mais de um. */
export function estadoDe(texto: string): string | null {
  const t = sem(texto);
  const found = new Set<string>();
  let resto = t;
  // nomes por extenso, do mais longo ao mais curto ("mato grosso do sul" antes de "mato grosso")
  for (const [uf, nome] of [...ESTADOS].sort((a, b) => b[1].length - a[1].length)) {
    const re = new RegExp(`\\b${nome}\\b`);
    if (re.test(resto)) { found.add(uf); resto = resto.replace(re, " "); }
  }
  const toks = resto.split(" ").filter(Boolean);
  const orgTok = new Set(["pc", "pm", "pp", "gcm", "cbm", "civil", "militar", "penal", "bombeiros", "municipal"]);
  toks.forEach((tk, i) => {
    const uf = ESTADOS.find(([u]) => u === tk)?.[0];
    if (!uf || uf === "pa") return;
    if (i === toks.length - 1 || orgTok.has(toks[i - 1] ?? "")) found.add(uf);
  });
  return found.size === 1 ? [...found][0]! : null;
}

/**
 * Quanto o edital `candidato` é o concurso pedido (0 = não é). Para polícias e guardas: mesmo órgão E mesmo estado
 * (PC MG nunca casa com PC BA nem com a PRF); sem estado no pedido de órgão estadual, não casa. Demais concursos: nome parecido.
 */
export function concursoScore(pedido: string, candidato: string): number {
  const q = orgaosDe(pedido);
  if (q.length) {
    const c = orgaosDe(candidato);
    const comum = q.filter((o) => c.includes(o));
    if (!comum.length) return 0;
    const federal = ORGAOS.filter((o) => comum.includes(o.id)).every((o) => o.federal);
    if (federal) return 1;
    const uq = estadoDe(pedido), uc = estadoDe(candidato);
    return uq && uc && uq === uc ? 1 : 0;
  }
  return nameScore(pedido, candidato);
}

/** Quantas palavras do cargo do edital aparecem no pedido (desempata Investigador × Escrivão × Delegado). */
export function cargoHits(pedido: string, cargo: string | null | undefined): number {
  if (!cargo) return 0;
  const q = tokens(pedido);
  let n = 0;
  for (const w of tokens(cargo)) if (w.length >= 4 && q.has(w)) n++;
  return n;
}
