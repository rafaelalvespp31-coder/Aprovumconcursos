import { z } from "zod";

/**
 * Filtros de um caderno de questões (salvos em question_notebooks.filters) e a regra,
 * pura, que decide se uma questão publicada do banco entra no caderno.
 */

export const DIFFICULTIES = ["dificil", "muito_dificil", "extrema"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];
export const DIFFICULTY_LABEL: Record<Difficulty, string> = { dificil: "Difícil", muito_dificil: "Muito difícil", extrema: "Extrema" };

export const SCOPES = ["todas", "minhas", "favoritas"] as const;
export type Scope = (typeof SCOPES)[number];
export const SCOPE_LABEL: Record<Scope, string> = { todas: "Todas as questões", minhas: "Minhas questões", favoritas: "Questões favoritas" };

export const FAVORITES = ["todas", "so", "sem"] as const;
export type FavoritesFilter = (typeof FAVORITES)[number];
export const FAVORITES_LABEL: Record<FavoritesFilter, string> = { todas: "Todas as questões", so: "Só as favoritas", sem: "Sem as favoritas" };

const uuids = z.array(z.uuid()).max(100);
export const filtersSchema = z.object({
  subjects: uuids.default([]),
  topics: uuids.default([]),
  boards: z.array(z.string().regex(/^[a-z0-9_]{2,32}$/)).max(50).default([]),
  exams: uuids.default([]),
  years: z.array(z.number().int().min(1950).max(2100)).max(80).default([]),
  difficulty: z.array(z.enum(DIFFICULTIES)).max(3).default([]),
  types: z.array(z.enum(["multipla_escolha", "certo_errado"])).max(2).default([]),
  favorites: z.enum(FAVORITES).default("todas"),
  scope: z.enum(SCOPES).default("todas"),
});
export type NotebookFilters = z.infer<typeof filtersSchema>;
export const EMPTY_FILTERS: NotebookFilters = filtersSchema.parse({});

/** Lê o que está no banco com tolerância (filtros antigos ou parciais viram o padrão). */
export function parseFilters(raw: unknown): NotebookFilters {
  const r = filtersSchema.safeParse(raw ?? {});
  return r.success ? r.data : EMPTY_FILTERS;
}

/** Questão publicada, só com o que os filtros usam. */
export interface IndexedQuestion {
  id: string;
  subject: string | null;
  topic: string | null;
  board: string | null;
  exam: string | null;
  year: number | null;
  difficulty: Difficulty;
  type: "multipla_escolha" | "certo_errado";
}

export interface MatchContext {
  /** Questões já respondidas pelo aluno (para "Minhas questões"). */
  answered: ReadonlySet<string>;
  favorites: ReadonlySet<string>;
  /** Assunto → assunto pai (para incluir os subassuntos de um assunto escolhido). */
  topicParent?: ReadonlyMap<string, string | null>;
}

function topicSelected(topic: string | null, chosen: ReadonlySet<string>, parent?: ReadonlyMap<string, string | null>) {
  let t = topic;
  for (let guard = 0; t && guard < 20; guard++) {
    if (chosen.has(t)) return true;
    t = parent?.get(t) ?? null;
  }
  return false;
}

export function matchQuestion(q: IndexedQuestion, f: NotebookFilters, ctx: MatchContext): boolean {
  if (f.subjects.length || f.topics.length) {
    const bySubject = !!q.subject && f.subjects.includes(q.subject);
    const byTopic = f.topics.length > 0 && topicSelected(q.topic, new Set(f.topics), ctx.topicParent);
    if (!bySubject && !byTopic) return false;
  }
  if (f.boards.length && (!q.board || !f.boards.includes(q.board))) return false;
  if (f.exams.length && (!q.exam || !f.exams.includes(q.exam))) return false;
  if (f.years.length && (q.year === null || !f.years.includes(q.year))) return false;
  if (f.difficulty.length && !f.difficulty.includes(q.difficulty)) return false;
  if (f.types.length && !f.types.includes(q.type)) return false;
  const fav = ctx.favorites.has(q.id);
  if (f.favorites === "so" && !fav) return false;
  if (f.favorites === "sem" && fav) return false;
  if (f.scope === "minhas" && !ctx.answered.has(q.id)) return false;
  if (f.scope === "favoritas" && !fav) return false;
  return true;
}

export function countMatches(index: readonly IndexedQuestion[], f: NotebookFilters, ctx: MatchContext): number {
  let n = 0;
  for (const q of index) if (matchQuestion(q, f, ctx)) n++;
  return n;
}

/** Quantos filtros (fora a aba) estão ativos. */
export function activeFilterCount(f: NotebookFilters): number {
  return f.subjects.length + f.topics.length + f.boards.length + f.exams.length + f.years.length + f.difficulty.length + f.types.length + (f.favorites !== "todas" ? 1 : 0);
}

export interface FilterNames {
  subject: (id: string) => string | undefined;
  topic: (id: string) => string | undefined;
  board: (slug: string) => string | undefined;
  exam: (id: string) => string | undefined;
}

/** Rótulos legíveis dos filtros (chips do caderno e "Filtro ativo"). */
export function filterLabels(f: NotebookFilters, names: FilterNames): string[] {
  const out: string[] = [];
  for (const s of f.subjects) out.push(names.subject(s) ?? "Matéria");
  for (const t of f.topics) out.push(names.topic(t) ?? "Assunto");
  for (const b of f.boards) out.push(`Banca ${names.board(b) ?? b.toUpperCase()}`);
  for (const e of f.exams) out.push(names.exam(e) ?? "Concurso");
  for (const y of [...f.years].sort((a, b) => b - a)) out.push(String(y));
  for (const d of f.difficulty) out.push(DIFFICULTY_LABEL[d]);
  for (const t of f.types) out.push(t === "certo_errado" ? "Certo ou errado" : "Múltipla escolha");
  if (f.favorites !== "todas") out.push(FAVORITES_LABEL[f.favorites]);
  if (f.scope !== "todas") out.push(SCOPE_LABEL[f.scope]);
  return out;
}

/** Nome automático do caderno a partir dos filtros. */
export function autoTitle(f: NotebookFilters, names: FilterNames): string {
  const main = [...f.subjects.map(names.subject), ...f.topics.map(names.topic), ...f.exams.map(names.exam)].filter(Boolean) as string[];
  if (main.length) return (main.length > 1 ? `${main[0]} +${main.length - 1}` : main[0]!).slice(0, 80);
  if (f.boards.length) return `Questões ${f.boards.map((b) => names.board(b) ?? b.toUpperCase()).join(", ")}`.slice(0, 80);
  if (f.scope === "favoritas" || f.favorites === "so") return "Minhas favoritas";
  if (f.scope === "minhas") return "Minhas questões";
  return "Caderno de Questões";
}
