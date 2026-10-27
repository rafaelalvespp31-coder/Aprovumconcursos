/**
 * Tópicos do edital: agrupam as aulas do catálogo ("4. Ilicitude" → aulas 4.1, 4.2…) e o
 * plano de tópicos (sumário colado pela equipe → árvore tópico › subtópico › itens).
 * Puro: sem banco e sem React.
 */

export interface CodedTitle {
  /** Numeração do edital ("4", "4.1"), ou null quando não veio número. */
  code: string | null;
  title: string;
}

const CODE = /^(\d{1,3}(?:\.\d{1,3}){0,4})\.?(?:\s*[-–—):]\s*|\s+)(.+)$/;

/** "4. Ilicitude" → { code: "4", title: "Ilicitude" }; "Ilicitude" → { code: null, title: "Ilicitude" }. */
export function parseCodedTitle(raw: string): CodedTitle | null {
  const v = raw
    .replace(/^[\s*•\-–—]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.;]+$/, "");
  if (!v) return null;
  const m = v.match(CODE);
  if (m) {
    const title = m[2]!.trim().replace(/[.;]+$/, "");
    return title.length >= 2 ? { code: m[1]!, title: title.slice(0, 160) } : null;
  }
  return v.length >= 2 ? { code: null, title: v.slice(0, 160) } : null;
}

/** Profundidade da numeração: "4" = 1, "4.1" = 2, "4.1.1" = 3. */
export const codeDepth = (code: string) => code.split(".").length;

/** Ordena numerações do edital (4.2 antes de 4.10); sem número vai para o fim. */
export function compareCodes(a: string | null | undefined, b: string | null | undefined): number {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? -1) - (pb[i] ?? -1);
    if (d) return d;
  }
  return 0;
}

const foldKey = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Chave do tópico (mesmo nome = mesmo tópico, sem diferença de acento ou maiúscula). */
export const groupKey = (title: string) => foldKey(title);

/** O código do subtópico pertence ao tópico? ("4.1" é de "4"). */
export const codeBelongs = (sub: string | null, group: string | null) => !sub || !group || sub === group || sub.startsWith(`${group}.`);

// ---------------------------------------------------------------------------
// Agrupar aulas por tópico (catálogo do admin e mapa do aluno)
// ---------------------------------------------------------------------------

export interface GroupedTopicFields {
  title: string;
  topicGroup: string | null;
  topicGroupCode: string | null;
  subtopicCode: string | null;
}

export interface TopicGroup<T> {
  /** null = aulas avulsas (sem tópico). */
  key: string | null;
  title: string | null;
  code: string | null;
  items: T[];
}

/** Junta as aulas de cada tópico, na ordem do edital; as avulsas ficam num grupo sem título no fim. */
export function groupByTopic<T extends GroupedTopicFields>(items: readonly T[]): TopicGroup<T>[] {
  const map = new Map<string, TopicGroup<T>>();
  const loose: T[] = [];
  for (const it of items) {
    if (!it.topicGroup) {
      loose.push(it);
      continue;
    }
    const key = groupKey(it.topicGroup);
    const g = map.get(key) ?? { key, title: it.topicGroup, code: null, items: [] };
    g.code = g.code ?? it.topicGroupCode;
    g.items.push(it);
    map.set(key, g);
  }
  const byCode = (a: T, b: T) => compareCodes(a.subtopicCode, b.subtopicCode) || a.title.localeCompare(b.title, "pt-BR");
  const groups = [...map.values()].map((g) => ({ ...g, items: [...g.items].sort(byCode) }));
  groups.sort((a, b) => compareCodes(a.code, b.code) || a.title!.localeCompare(b.title!, "pt-BR"));
  if (loose.length) groups.push({ key: null, title: null, code: null, items: [...loose].sort((a, b) => a.title.localeCompare(b.title, "pt-BR")) });
  return groups;
}

// ---------------------------------------------------------------------------
// Plano de tópicos: sumário do edital colado → árvore
// ---------------------------------------------------------------------------

export interface OutlineItem {
  code: string | null;
  title: string;
}
export interface OutlineSubtopic extends OutlineItem {
  items: OutlineItem[];
}
export interface OutlineGroup extends OutlineItem {
  subtopics: OutlineSubtopic[];
}
export interface Outline {
  groups: OutlineGroup[];
  warnings: string[];
}

const GROUP_LABEL = /^(t[oó]pico|tema|assunto|unidade|cap[ií]tulo|m[oó]dulo)\s*[:\-–—]\s*/i;
const SUB_LABEL = /^(subt[oó]pico|subtema)\s*[:\-–—]\s*/i;

/**
 * Lê o sumário colado. Aceita "tópico: Ilicitude", "4. Ilicitude", "4.1. Causas…", "* 4.1.1. Conceito…",
 * com ou sem marcadores de lista. Quem decide o nível é a numeração; sem numeração, o rótulo
 * ("tópico:", "subtópico:") ou o marcador de lista (item).
 */
export function parseOutline(text: string): Outline {
  const warnings: string[] = [];
  const groups: OutlineGroup[] = [];
  let g: OutlineGroup | null = null;
  let s: OutlineSubtopic | null = null;
  const ensureGroup = (code: string | null): OutlineGroup => {
    if (!g) {
      g = { code, title: "Tópico sem nome", subtopics: [] };
      groups.push(g);
    }
    return g;
  };
  for (const rawLine of text.replace(/\r/g, "").split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const bullet = /^[*•\-–—]\s+/.test(line);
    if (GROUP_LABEL.test(line)) {
      const ct = parseCodedTitle(line.replace(GROUP_LABEL, ""));
      if (!ct) continue;
      g = { code: ct.code, title: ct.title, subtopics: [] };
      groups.push(g);
      s = null;
      continue;
    }
    if (SUB_LABEL.test(line)) {
      const ct = parseCodedTitle(line.replace(SUB_LABEL, ""));
      if (!ct) continue;
      s = { code: ct.code, title: ct.title, items: [] };
      ensureGroup(ct.code ? ct.code.split(".")[0]! : null).subtopics.push(s);
      continue;
    }
    const ct = parseCodedTitle(line);
    if (!ct) continue;
    const depth = ct.code ? codeDepth(ct.code) : bullet ? 3 : 2;
    if (depth === 1) {
      // Mesmo número do tópico aberto por "tópico: …" (sem número): só completa o número.
      const cur = g as OutlineGroup | null;
      if (cur && !cur.code && !cur.subtopics.length) {
        cur.code = ct.code;
        if (cur.title === "Tópico sem nome") cur.title = ct.title;
        continue;
      }
      g = { code: ct.code, title: ct.title, subtopics: [] };
      groups.push(g);
      s = null;
    } else if (depth === 2) {
      const grp = ensureGroup(ct.code ? ct.code.split(".")[0]! : null);
      if (grp.code === null && ct.code) grp.code = ct.code.split(".")[0]!;
      s = { code: ct.code, title: ct.title, items: [] };
      grp.subtopics.push(s);
    } else {
      if (!s) {
        const grp = ensureGroup(ct.code ? ct.code.split(".")[0]! : null);
        const subCode = ct.code ? ct.code.split(".").slice(0, 2).join(".") : null;
        s = { code: subCode, title: grp.title, items: [] };
        grp.subtopics.push(s);
      }
      s.items.push({ code: ct.code, title: ct.title });
    }
  }
  for (const grp of groups as OutlineGroup[]) {
    if (!grp.subtopics.length) warnings.push(`O tópico “${grp.title}” não tem subtópicos (4.1, 4.2…).`);
    for (const sub of grp.subtopics) {
      if (!sub.items.length) warnings.push(`O subtópico “${sub.code ? `${sub.code} ` : ""}${sub.title}” não tem itens: a aula terá só os módulos fixos.`);
      if (sub.items.length > 12) warnings.push(`O subtópico “${sub.code ? `${sub.code} ` : ""}${sub.title}” tem ${sub.items.length} itens; acima de 10 a aula fica longa — considere dividir.`);
      if (sub.code && grp.code && !codeBelongs(sub.code, grp.code)) warnings.push(`O subtópico ${sub.code} não começa com o número do tópico (${grp.code}).`);
    }
  }
  if (!groups.length) warnings.push("Não encontrei tópicos. Cole o sumário com a numeração do edital (4. Tópico, 4.1 Subtópico, 4.1.1 Item).");
  return { groups, warnings };
}

/** Linhas "Tópico:" e "Subtópico:" do bloco === AULA === para um subtópico do plano. */
export function groupHeaderLines(group: OutlineItem, sub: OutlineItem): string[] {
  const label = (x: OutlineItem) => `${x.code ? `${x.code} ` : ""}${x.title}`;
  return [`Tópico: ${group.code ? `${group.code}. ` : ""}${group.title}`, `Subtópico: ${label(sub)}`];
}

/** Situação de cada subtópico do plano em relação ao catálogo. */
export type OutlineStatus = "publicado" | "rascunho" | "pendente";

export interface CatalogGroupRef {
  id: string;
  title: string;
  status: string;
  topicGroup: string | null;
  subtopicCode: string | null;
}

/**
 * Acha a aula do catálogo que cobre o subtópico: mesmo tópico e mesmo número. Sem número de um
 * dos lados, vale só o título IDÊNTICO — nunca "contém": "Extorsão" e "Extorsão mediante
 * sequestro" (ou "Furto" e "Furto de coisa comum") são aulas diferentes e uma não toca a outra.
 */
export function findCatalogFor(group: OutlineItem, sub: OutlineItem, catalog: readonly CatalogGroupRef[]): CatalogGroupRef | null {
  const gk = groupKey(group.title);
  const same = catalog.filter((c) => c.topicGroup && groupKey(c.topicGroup) === gk && c.status !== "arquivado");
  if (sub.code) {
    const byCode = same.find((c) => c.subtopicCode === sub.code);
    if (byCode) return byCode;
  }
  const sk = foldKey(sub.title);
  // Número diferente nos dois lados = subtópicos diferentes, mesmo com o mesmo nome.
  return same.find((c) => foldKey(c.title) === sk && !(sub.code && c.subtopicCode && c.subtopicCode !== sub.code)) ?? null;
}
