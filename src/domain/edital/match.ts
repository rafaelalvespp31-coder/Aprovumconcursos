import { stem, tokensOf, type Tokens } from "./text";
import { fold } from "./text";

/**
 * Correspondência entre o conteúdo do edital e as aulas JÁ existentes no catálogo (sem IA externa).
 * Nunca liga uma aula só porque uma palavra do título é parecida: a cobertura é medida por palavras
 * significativas (as raras no catálogo pesam mais) e comparada com título, sinônimos e tópico da aula.
 */

export interface CatalogEntry {
  id: string;
  title: string;
  aliases: string[];
  mode: string;
  group: string | null;
  lawCode: string | null;
  articles: string[];
}

export type MatchStatus = "completa" | "parcial" | "conferencia" | "nao_encontrado";

export interface MatchLink {
  catalogId: string;
  coverage: "completa" | "parcial" | "conferencia";
  score: number;
}
export interface MatchResult {
  status: MatchStatus;
  score: number;
  links: MatchLink[];
}

interface Indexed {
  entry: CatalogEntry;
  names: Tokens[];
  union: Set<string>;
  exact: Set<string>;
}

export interface CatalogIndex {
  items: Indexed[];
  idf: Map<string, number>;
  n: number;
}

const GENERIC_MODES = new Set(["conhecimentos_especificos", "legislacao_especial", "outra"]);

export function buildIndex(catalog: readonly CatalogEntry[]): CatalogIndex {
  const items: Indexed[] = catalog.map((entry) => {
    const names = [entry.title, ...entry.aliases].map(tokensOf).filter((t) => t.all.length);
    const union = new Set<string>();
    for (const t of tokensOf(`${entry.title} ${entry.aliases.join(" ")} ${entry.group ?? ""}`).all) union.add(t);
    return { entry, names, union, exact: new Set([entry.title, ...entry.aliases].map(fold)) };
  });
  const df = new Map<string, number>();
  for (const it of items) for (const t of it.union) df.set(t, (df.get(t) ?? 0) + 1);
  const n = Math.max(1, items.length);
  const idf = new Map<string, number>();
  for (const [t, c] of df) idf.set(t, Math.log(1 + n / (1 + c)));
  return { items, idf, n };
}

const weight = (idx: CatalogIndex, t: string) => idx.idf.get(t) ?? Math.log(1 + idx.n); // palavra que o catálogo não tem pesa o máximo

function recall(idx: CatalogIndex, clause: Tokens, against: Set<string>): number {
  let hit = 0;
  let all = 0;
  for (const t of clause.all) {
    const w = weight(idx, t);
    all += w;
    if (against.has(t)) hit += w;
  }
  return all ? hit / all : 0;
}

/** Separa um item longo do edital em assuntos menores ("a; b; c" / "a, b e c" após dois-pontos). */
export function clausesOf(text: string): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  const lead = t.includes(":") ? t.slice(t.indexOf(":") + 1) : t;
  const parts = lead.split(/\s*;\s*/).map((x) => x.trim()).filter((x) => x.length >= 3);
  if (parts.length >= 2) return parts.slice(0, 12);
  const commas = lead.split(/\s*,\s*|\s+e\s+/).map((x) => x.trim()).filter((x) => x.length >= 3);
  if (t.includes(":") && commas.length >= 3 && commas.every((c) => c.split(" ").length <= 5)) return commas.slice(0, 12);
  return [t];
}

function scoreClause(idx: CatalogIndex, clauseText: string, mode: string | null, parent: string | null = null): MatchResult {
  const clause = tokensOf(clauseText);
  if (!clause.all.length) return { status: "nao_encontrado", score: 0, links: [] };
  const key = fold(clauseText);
  const parentTok = parent ? tokensOf(parent) : null;
  const scored: Array<MatchLink & { r: number }> = [];
  for (const it of idx.items) {
    const m = it.entry.mode;
    const factor = mode ? (m === mode ? 1 : GENERIC_MODES.has(m) ? 0.85 : 0.6) : 0.92;
    let rName = 0;
    for (const n of it.names) rName = Math.max(rName, recall(idx, clause, n.set));
    const rUnion = recall(idx, clause, it.union);
    const exact = it.exact.has(key);
    // Dispositivo legal citado ("art. 121 do CP") conta a favor.
    const arts = [...clauseText.matchAll(/\b(\d{1,4})\b/g)].map((x) => x[1]!);
    const lawHit = !!it.entry.lawCode && it.entry.articles.some((a) => arts.includes(a)) && new RegExp(`\\b${it.entry.lawCode}\\b`, "i").test(clauseText);
    const matched = clause.all.filter((t) => it.union.has(t)).length;
    if (!exact && !lawHit && matched < Math.min(2, clause.all.length)) continue;
    const base = exact || lawHit ? 1 : Math.max(rName, 0.85 * rUnion);
    // Hierarquia: o tópico do edital onde o assunto está deve ter a ver com o tópico da aula no catálogo.
    // Sem nenhuma palavra em comum, é outro contexto: pesa menos e nunca vira "completa" só por parecer.
    let otherContext = false;
    if (parentTok?.all.length && it.entry.group) {
      const g = tokensOf(it.entry.group);
      if (g.all.length) otherContext = !parentTok.all.some((t) => g.set.has(t)) && !g.all.some((t) => parentTok.set.has(t));
    }
    const score = base * factor * (otherContext ? 0.85 : 1);
    if (score < 0.3) continue;
    const sameArea = factor >= 0.85;
    const coverage: MatchLink["coverage"] = (exact || lawHit || (rName >= 0.8 && !otherContext)) && sameArea ? "completa" : exact || lawHit ? "conferencia" : rName >= 0.5 || (rUnion >= 0.75 && matched >= 2) ? "parcial" : "conferencia";
    scored.push({ catalogId: it.entry.id, coverage, score: Math.round(score * 1000) / 1000, r: rName });
  }
  scored.sort((a, b) => b.score - a.score);
  const top = scored[0];
  if (!top) return { status: "nao_encontrado", score: 0, links: [] };
  const links = scored.filter((s) => s.score >= top.score - 0.12).slice(0, 3).map(({ r: _r, ...l }) => l);
  return { status: top.coverage, score: top.score, links };
}

/**
 * Classifica um assunto do edital. Itens com vários trechos são avaliados trecho a trecho:
 * todos cobertos = completa; alguns = parcial; nenhum = não encontrado (ou conferência).
 */
export function matchTopic(idx: CatalogIndex, text: string, mode: string | null, parent: string | null = null): MatchResult {
  const clauses = clausesOf(text);
  if (clauses.length === 1) return scoreClause(idx, clauses[0]!, mode, parent);
  // O título inteiro (com dois-pontos e vírgulas) pode ser, ele mesmo, o nome de uma aula do catálogo.
  const whole = scoreClause(idx, text, mode, parent);
  if (whole.status === "completa") return whole;
  const parts = clauses.map((c) => scoreClause(idx, c, mode, parent));
  const done = parts.filter((p) => p.status === "completa").length;
  const some = parts.filter((p) => p.status !== "nao_encontrado").length;
  const links = new Map<string, MatchLink>();
  for (const p of parts) for (const l of p.links) if (!links.has(l.catalogId) || links.get(l.catalogId)!.score < l.score) links.set(l.catalogId, l);
  const all = [...links.values()].sort((a, b) => b.score - a.score).slice(0, 6);
  const score = parts.reduce((s, p) => s + p.score, 0) / parts.length;
  let status: MatchStatus;
  if (done === parts.length) status = "completa";
  else if (!some) status = "nao_encontrado";
  else if (done + parts.filter((p) => p.status === "parcial").length >= Math.ceil(parts.length / 2)) status = "parcial";
  else status = "conferencia";
  return { status, score: Math.round(score * 1000) / 1000, links: all };
}

export { stem };
