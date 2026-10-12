/**
 * Reconhecimento do pedido do aluno no catálogo revisado — puro e determinístico.
 *  - Referências de lei ("art. 5º da CF", "arts. 121 a 129 do Código Penal",
 *    "Lei 11.340, arts. 1º a 7º") viram chaves (lei + artigo), sem IA.
 *  - Temas ("prisão em flagrante") são achados pelo título e pelos sinônimos cadastrados.
 * O catálogo só é usado quando cobre TODO o pedido; cobertura parcial segue para a IA.
 */

/** Minúsculas, sem acentos, pontuação vira espaço, espaços simples. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[º°ª]/g, "")
    .replace(/[^a-z0-9/.\-\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Leis reconhecidas por nome, sigla ou número. A chave é a usada no catálogo. */
export const LAWS: ReadonlyArray<{ code: string; name: string; patterns: RegExp[] }> = [
  { code: "CF", name: "Constituição Federal", patterns: [/\bcf\b/, /\bcf\/88\b/, /\bcrfb\b/, /constituicao( federal| da republica)?/] },
  { code: "CPP", name: "Código de Processo Penal", patterns: [/\bcpp\b/, /codigo de processo penal/] },
  { code: "CP", name: "Código Penal", patterns: [/\bcp\b/, /codigo penal/] },
  { code: "LEP", name: "Lei de Execução Penal (Lei 7.210/1984)", patterns: [/\blep\b/, /lei de execucao penal/, /\blei (n )?7\.?210\b/] },
  { code: "L11340", name: "Lei Maria da Penha (Lei 11.340/2006)", patterns: [/maria da penha/, /\blei (n )?11\.?340\b/] },
  { code: "L8112", name: "Lei 8.112/1990", patterns: [/\blei (n )?8\.?112\b/, /estatuto dos servidores/] },
  { code: "L9784", name: "Lei 9.784/1999", patterns: [/\blei (n )?9\.?784\b/, /lei do processo administrativo/] },
  { code: "L8429", name: "Lei de Improbidade (Lei 8.429/1992)", patterns: [/\blei (n )?8\.?429\b/, /improbidade administrativa/] },
  { code: "L13869", name: "Lei de Abuso de Autoridade (Lei 13.869/2019)", patterns: [/\blei (n )?13\.?869\b/, /abuso de autoridade/] },
  { code: "L11343", name: "Lei de Drogas (Lei 11.343/2006)", patterns: [/\blei (n )?11\.?343\b/, /lei de drogas/] },
  { code: "L10826", name: "Estatuto do Desarmamento (Lei 10.826/2003)", patterns: [/\blei (n )?10\.?826\b/, /estatuto do desarmamento/] },
  { code: "L8072", name: "Lei dos Crimes Hediondos (Lei 8.072/1990)", patterns: [/\blei (n )?8\.?072\b/, /crimes hediondos/] },
  { code: "L12850", name: "Lei de Organização Criminosa (Lei 12.850/2013)", patterns: [/\blei (n )?12\.?850\b/, /organizacao criminosa/] },
  { code: "L9455", name: "Lei de Tortura (Lei 9.455/1997)", patterns: [/\blei (n )?9\.?455\b/, /lei de tortura/] },
  { code: "ECA", name: "Estatuto da Criança e do Adolescente (Lei 8.069/1990)", patterns: [/\beca\b/, /\blei (n )?8\.?069\b/, /estatuto da crianca/] },
  { code: "CTB", name: "Código de Trânsito Brasileiro", patterns: [/\bctb\b/, /codigo de transito/] },
];

/** Identificador de artigo normalizado: "5", "121", "121-A". */
export function articleId(raw: string): string {
  const m = raw.toUpperCase().replace(/\s+/g, "").match(/^(\d+)(?:-?([A-Z]))?$/);
  if (!m) return raw.trim().toUpperCase();
  return m[2] ? `${Number(m[1])}-${m[2]}` : String(Number(m[1]));
}

const MAX_RANGE = 80;

export interface LawReference {
  law: string | null;
  articles: string[];
}

/** Extrai a lei e os artigos pedidos. Sem artigos explícitos, `articles` vem vazio. */
export function parseLawReference(text: string): LawReference {
  const t = normalizeText(text);
  let law: string | null = null;
  // "lei 1.234/2000" genérica, quando não é uma das conhecidas.
  for (const l of LAWS) if (l.patterns.some((p) => p.test(t))) { law = l.code; break; }
  if (!law) {
    const generic = t.match(/\blei (?:n )?(\d{1,2}\.?\d{3})\b/);
    if (generic) law = `L${generic[1]!.replace(".", "")}`;
  }

  const articles: string[] = [];
  // "art. 5", "arts. 121 a 129", "artigos 1 ao 7", "art 121-a e 122", "arts. 33, 34 e 35"
  const block = /\b(?:arts?|artigos?)\.?\s+((?:\d+(?:\s*-\s*[a-z]\b)?(?:\s*(?:e|a|ao|ate|-|\/)?\s*))+)/g;
  for (const m of t.matchAll(block)) {
    // "121-129" é intervalo; "121-A" é artigo com letra.
    const seq = m[1]!.replace(/(\d)\s*-\s*(\d)/g, "$1 a $2");
    const tokens = [...seq.matchAll(/(\d+(?:\s*-\s*[a-z](?![a-z]))?)|(\ba\b|\bao\b|\bate\b)/g)];
    let prev: string | null = null;
    let rangeNext = false;
    for (const tk of tokens) {
      if (tk[2]) { rangeNext = prev !== null; continue; }
      const id = articleId(tk[1]!.replace(/\s/g, ""));
      if (rangeNext && prev && /^\d+$/.test(prev) && /^\d+$/.test(id) && Number(id) > Number(prev) && Number(id) - Number(prev) <= MAX_RANGE) {
        for (let n = Number(prev) + 1; n <= Number(id); n++) articles.push(String(n));
      } else {
        articles.push(id);
      }
      prev = id;
      rangeNext = false;
    }
  }
  return { law, articles: [...new Set(articles)] };
}

export interface CatalogTopicIndex {
  id: string;
  title: string;
  kind: "tema" | "dispositivo";
  lawCode: string | null;
  articles: string[];
  aliases: string[];
}

export type CatalogMatch =
  | { kind: "completo"; topics: CatalogTopicIndex[]; reason: string }
  | { kind: "parcial"; topics: CatalogTopicIndex[]; missing: string[]; reason: string }
  | { kind: "nenhum" };

const STOP = new Set(["a", "o", "as", "os", "de", "do", "da", "dos", "das", "e", "em", "no", "na", "nos", "nas", "para", "por", "com", "sobre", "estudar", "quero", "tema", "materia", "conteudo"]);
const tokens = (s: string) => normalizeText(s).split(" ").filter((w) => w.length > 1 && !STOP.has(w));

function themeScore(query: string, topic: CatalogTopicIndex): number {
  const q = normalizeText(query);
  const names = [topic.title, ...topic.aliases].map(normalizeText).filter(Boolean);
  if (names.some((n) => n === q)) return 1;
  // O pedido contém o nome inteiro do tema (ex.: "quero estudar prisão em flagrante").
  if (names.some((n) => n.length >= 6 && (` ${q} `).includes(` ${n} `))) return 0.95;
  const qt = new Set(tokens(query));
  if (!qt.size) return 0;
  let best = 0;
  for (const n of names) {
    const nt = new Set(tokens(n));
    if (!nt.size) continue;
    const inter = [...qt].filter((w) => nt.has(w)).length;
    best = Math.max(best, inter / new Set([...qt, ...nt]).size);
  }
  return best;
}

export const THEME_THRESHOLD = 0.75;

/** Procura o pedido no catálogo publicado. */
export function matchCatalog(query: string, topics: readonly CatalogTopicIndex[]): CatalogMatch {
  const ref = parseLawReference(query);
  if (ref.law && ref.articles.length) {
    const byArticle = new Map<string, CatalogTopicIndex>();
    for (const t of topics) {
      if (t.kind !== "dispositivo" || t.lawCode !== ref.law) continue;
      for (const a of t.articles) if (!byArticle.has(articleId(a))) byArticle.set(articleId(a), t);
    }
    const found: CatalogTopicIndex[] = [];
    const missing: string[] = [];
    for (const a of ref.articles) {
      const t = byArticle.get(a);
      if (!t) missing.push(a);
      else if (!found.includes(t)) found.push(t);
    }
    const lawName = LAWS.find((l) => l.code === ref.law)?.name ?? ref.law;
    if (!missing.length) return { kind: "completo", topics: found, reason: `${lawName}: art(s). ${ref.articles.join(", ")}` };
    if (found.length) return { kind: "parcial", topics: found, missing, reason: `${lawName}: faltam art(s). ${missing.join(", ")} no catálogo` };
    return { kind: "nenhum" };
  }
  // Pedido longo (texto colado) não é um "tema": segue para a IA, que respeita o texto do aluno.
  if (query.length > 300) return { kind: "nenhum" };
  let best: { t: CatalogTopicIndex; s: number } | null = null;
  // Sem referência a lei/artigo, temas e dispositivos concorrem pelo nome e pelos
  // sinônimos (ex.: "homicídio qualificado" → dispositivo "CP, art. 121").
  for (const t of topics) {
    const s = themeScore(query, t);
    if (!best || s > best.s) best = { t, s };
  }
  if (best && best.s >= THEME_THRESHOLD) return { kind: "completo", topics: [best.t], reason: `Tema: ${best.t.title}` };
  return { kind: "nenhum" };
}
