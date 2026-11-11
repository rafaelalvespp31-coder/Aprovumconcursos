import { findAllCatalogFor, groupKey, type CatalogGroupRef, type Outline } from "./topic-group";

/** Aula do catálogo que aparece numa duplicidade. */
export interface DupLesson {
  id: string;
  title: string;
  status: string;
  code: string | null;
  group: string | null;
}
/** Aulas com o MESMO título na mesma matéria. */
export interface DupTitle {
  title: string;
  lessons: DupLesson[];
}
/** Subtópico do plano coberto por mais de uma aula. */
export interface DupSubtopic {
  ref: string;
  code: string | null;
  title: string;
  groupTitle: string;
  lessons: DupLesson[];
}
/** Item repetido DENTRO do próprio plano (colado duas vezes, mesmo número ou mesmo título). */
export interface DupOutlineItem {
  kind: "topico" | "subtopico";
  code: string | null;
  title: string;
  times: number;
  where: string;
  /** "g:<n>" (tópico) ou "<g>-<s>" (subtópico): quem marcar na tela. */
  refs: string[];
}
export interface PlanDuplicates {
  titles: DupTitle[];
  subtopics: DupSubtopic[];
  outline: DupOutlineItem[];
  total: number;
  /** Subtópicos (ref) e tópicos ("g:<n>") com algum problema, para marcar na lista. */
  flagged: string[];
}

const asRef = (c: CatalogGroupRef): DupLesson => ({ id: c.id, title: c.title, status: c.status, code: c.subtopicCode, group: c.topicGroup });
const rank = (s: string) => (s === "publicado" ? 0 : 1);
const label = (code: string | null, title: string) => `${code ? `${code} ` : ""}${title}`;

/**
 * Tudo o que está duplicado num plano de tópicos: aulas gêmeas (mesmo título), subtópicos com 2+ aulas
 * e itens repetidos no próprio sumário. Aulas arquivadas não contam.
 */
export function findPlanDuplicates(outline: Outline, catalog: readonly CatalogGroupRef[]): PlanDuplicates {
  const live = catalog.filter((c) => c.status !== "arquivado");

  const subtopics: DupSubtopic[] = [];
  outline.groups.forEach((g, gi) =>
    g.subtopics.forEach((s, si) => {
      const all = findAllCatalogFor(g, s, live);
      if (all.length > 1) subtopics.push({ ref: `${gi}-${si}`, code: s.code, title: s.title, groupTitle: label(g.code, g.title), lessons: all.map(asRef) });
    }),
  );

  const byTitle = new Map<string, CatalogGroupRef[]>();
  for (const c of live) {
    const k = groupKey(c.title);
    if (k) byTitle.set(k, [...(byTitle.get(k) ?? []), c]);
  }
  const inSub = subtopics.map((d) => new Set(d.lessons.map((l) => l.id)));
  const titles: DupTitle[] = [];
  for (const list of byTitle.values()) {
    if (list.length < 2) continue;
    if (inSub.some((set) => list.every((c) => set.has(c.id)))) continue; // já aparece como subtópico duplicado
    titles.push({ title: list[0]!.title, lessons: [...list].sort((a, b) => rank(a.status) - rank(b.status)).map(asRef) });
  }
  titles.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));

  const out: DupOutlineItem[] = [];
  const seenG = new Map<string, number[]>();
  outline.groups.forEach((g, gi) => {
    for (const k of [g.code ? `c:${g.code}` : null, `t:${groupKey(g.title)}`]) if (k) seenG.set(k, [...(seenG.get(k) ?? []), gi]);
  });
  const doneG = new Set<number>();
  for (const idxs of seenG.values()) {
    if (idxs.length < 2 || idxs.every((i) => doneG.has(i))) continue;
    idxs.forEach((i) => doneG.add(i));
    const g = outline.groups[idxs[0]!]!;
    out.push({ kind: "topico", code: g.code, title: g.title, times: idxs.length, where: "no sumário do plano", refs: idxs.map((i) => `g:${i}`) });
  }
  const seenS = new Map<string, Array<{ gi: number; si: number }>>();
  outline.groups.forEach((g, gi) =>
    g.subtopics.forEach((s, si) => {
      const keys = [s.code ? `c:${gi}:${s.code}` : null, `t:${gi}:${groupKey(s.title)}`];
      for (const k of keys) if (k) seenS.set(k, [...(seenS.get(k) ?? []), { gi, si }]);
      const tk = groupKey(s.title);
      if (tk.length >= 15) seenS.set(`x:${tk}`, [...(seenS.get(`x:${tk}`) ?? []), { gi, si }]);
    }),
  );
  const doneS = new Set<string>();
  for (const list of seenS.values()) {
    const refs = list.map((x) => `${x.gi}-${x.si}`);
    if (refs.length < 2 || refs.every((r) => doneS.has(r))) continue;
    refs.forEach((r) => doneS.add(r));
    const first = list[0]!;
    const s = outline.groups[first.gi]!.subtopics[first.si]!;
    const groups = [...new Set(list.map((x) => label(outline.groups[x.gi]!.code, outline.groups[x.gi]!.title)))];
    out.push({ kind: "subtopico", code: s.code, title: s.title, times: refs.length, where: groups.length > 1 ? `em ${groups.length} tópicos` : `no tópico ${groups[0]}`, refs });
  }

  const flagged = new Set<string>([...subtopics.map((d) => d.ref), ...out.flatMap((o) => o.refs)]);
  return { titles, subtopics, outline: out, total: titles.length + subtopics.length + out.length, flagged: [...flagged] };
}
