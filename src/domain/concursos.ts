/** Concursos por estado: siglas, grupos de situação e contagens. Puro (sem banco). */
export const UFS = [
  ["AC", "Acre"], ["AL", "Alagoas"], ["AP", "Amapá"], ["AM", "Amazonas"], ["BA", "Bahia"], ["CE", "Ceará"], ["DF", "Distrito Federal"],
  ["ES", "Espírito Santo"], ["GO", "Goiás"], ["MA", "Maranhão"], ["MT", "Mato Grosso"], ["MS", "Mato Grosso do Sul"], ["MG", "Minas Gerais"],
  ["PA", "Pará"], ["PB", "Paraíba"], ["PR", "Paraná"], ["PE", "Pernambuco"], ["PI", "Piauí"], ["RJ", "Rio de Janeiro"], ["RN", "Rio Grande do Norte"],
  ["RS", "Rio Grande do Sul"], ["RO", "Rondônia"], ["RR", "Roraima"], ["SC", "Santa Catarina"], ["SP", "São Paulo"], ["SE", "Sergipe"], ["TO", "Tocantins"],
] as const;
const plain = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/** Estado citado no texto (nome por extenso ou sigla em maiúsculas, ex.: "PC MG"); null se nenhum ou se houver mais de um. */
export function inferUf(...texts: Array<string | null | undefined>): string | null {
  const found = new Set<string>();
  for (const t of texts) {
    if (!t) continue;
    const p = plain(t);
    for (const [u, n] of UFS) {
      // "Rio Grande do Sul/Norte" e "Mato Grosso (do Sul)" contêm outros nomes: confere a palavra inteira.
      if (new RegExp(`(^|[^a-z])${plain(n)}([^a-z]|$)`).test(p)) found.add(u);
      if (new RegExp(`(^|[^A-Za-z])${u}([^A-Za-z]|$)`).test(t)) found.add(u);
    }
  }
  // "Mato Grosso do Sul" também contém "Mato Grosso": o nome mais longo vence.
  for (const u of [...found]) for (const o of found) if (u !== o && plain(UF_NAME[o]!).startsWith(plain(UF_NAME[u]!))) found.delete(u);
  return found.size === 1 ? [...found][0]! : null;
}
export type Uf = (typeof UFS)[number][0];
export const UF_NAME: Record<string, string> = Object.fromEntries(UFS);

export type Bucket = "abertos" | "andamento" | "concluidos" | "embreve";
export const BUCKETS: Array<{ id: Bucket; label: string; short: string }> = [
  { id: "abertos", label: "Concursos abertos", short: "Abertos" },
  { id: "andamento", label: "Concursos em andamento", short: "Em andamento" },
  { id: "concluidos", label: "Concursos concluídos", short: "Concluídos" },
  { id: "embreve", label: "Em breve", short: "Em breve" },
];

/** Situação cadastrada → grupo exibido. */
export function bucketOf(status: string): Bucket {
  switch (status) {
    case "inscricoes_abertas":
      return "abertos";
    case "edital_publicado":
    case "inscricoes_encerradas":
      return "andamento";
    case "prova_realizada":
    case "encerrado":
      return "concluidos";
    default:
      return "embreve"; // previsto, autorizado
  }
}

export function countBuckets<T extends { status: string }>(list: readonly T[]): Record<Bucket, number> {
  const out: Record<Bucket, number> = { abertos: 0, andamento: 0, concluidos: 0, embreve: 0 };
  for (const c of list) out[bucketOf(c.status)]++;
  return out;
}

export function byUf<T extends { uf?: string | null }>(list: readonly T[]): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const c of list) if (c.uf) m.set(c.uf, [...(m.get(c.uf) ?? []), c]);
  return m;
}

export type DescBlock =
  | { kind: "text"; text: string }
  | { kind: "titulo"; text: string; nivel: number }
  | { kind: "tabela"; head: string[]; rows: string[][] }
  | { kind: "list"; items: string[] }
  | { kind: "cargos"; rows: Array<{ cargo: string; requisito: string | null; valor: string | null }> };

const money = (v: string) => (/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(v) ? `R$ ${v}` : v);

/**
 * Organiza a descrição digitada pelo admin (uma informação por linha): linhas "Cargo - requisito: valor"
 * viram uma tabela de cargos, linhas com "-" ou "•" viram lista e o resto vira parágrafo.
 */
/** Pedaços de um texto com **negrito**; os marcadores não aparecem. */
export function inlineParts(text: string): Array<{ t: string; b: boolean }> {
  return text.split(/\*\*(.+?)\*\*/).map((t, k) => ({ t, b: k % 2 === 1 })).filter((x) => x.t !== "");
}

const cells = (l: string) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
const isSep = (l: string) => /^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$/.test(l);

export function formatDescription(raw: string | null | undefined): DescBlock[] {
  const lines = (raw ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const blocks: DescBlock[] = [];
  const push = (b: DescBlock) => {
    const last = blocks[blocks.length - 1];
    if (last && last.kind === "cargos" && b.kind === "cargos") last.rows.push(...b.rows);
    else if (last && last.kind === "list" && b.kind === "list") last.items.push(...b.items);
    else blocks.push(b);
  };
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i]!;
    // Tabela em markdown: cabeçalho, linha "|---|---|" e as linhas de dados.
    if (l.startsWith("|") && lines[i + 1] && isSep(lines[i + 1]!)) {
      const rows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j]!.startsWith("|")) rows.push(cells(lines[j++]!));
      blocks.push({ kind: "tabela", head: cells(l), rows });
      i = j - 1;
      continue;
    }
    const h = /^(#{1,6})\s+(.+)$/.exec(l);
    if (h) { blocks.push({ kind: "titulo", text: h[2]!.replace(/\*\*/g, "").trim(), nivel: h[1]!.length }); continue; }
    const cargo = /^(.{2,60}?)\s+[-–—]\s+(.+?):\s*(R\$\s*)?([\d.]+(?:,\d{1,2})?)(\s*(?:até|a)\s*(?:R\$\s*)?[\d.]+(?:,\d{1,2})?)?\s*$/.exec(l);
    if (cargo) push({ kind: "cargos", rows: [{ cargo: cargo[1]!.trim(), requisito: cargo[2]!.trim(), valor: money(`${cargo[4]}${cargo[5] ?? ""}`) }] });
    else if (/^[-•*]\s+/.test(l)) push({ kind: "list", items: [l.replace(/^[-•*]\s+/, "")] });
    else push({ kind: "text", text: l });
  }
  return blocks;
}
