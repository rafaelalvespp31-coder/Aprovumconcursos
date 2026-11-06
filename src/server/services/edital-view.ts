import "server-only";
import { createAdminClient } from "../supabase";
import { disciplineLabel } from "@/ai/pedagogy";
import { UserFacingError } from "./trails";
import { displayTitle } from "@/domain/edital/info";
import { backfillInfo } from "./edital";
import type { PrepStats, PrepStatus, PrepSummary } from "./edital";

type Row = Record<string, unknown>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface LinkedLesson {
  catalogId: string;
  title: string;
  coverage: "completa" | "parcial" | "conferencia";
  /** 0–100: só conta o que o aluno realmente estudou (leitura + níveis). */
  pct: number;
  done: boolean;
}
export interface TreeTopic {
  id: string;
  code: string | null;
  depth: number;
  title: string;
  page: number | null;
  status: "pendente" | "completa" | "parcial" | "nao_encontrado" | "conferencia";
  lessons: LinkedLesson[];
  /** Estudado de verdade: tem aula e todas as aulas vinculadas foram concluídas pelo aluno. */
  done: boolean;
}
export interface TreeDiscipline {
  id: string;
  name: string;
  page: number | null;
  mode: string | null;
  modeLabel: string | null;
  topics: TreeTopic[];
  doneCount: number;
  pct: number;
}
export interface PreparationTree {
  prep: PrepSummary;
  disciplines: TreeDiscipline[];
  totals: { topics: number; done: number; pct: number; lessonsAvailable: number; lessonsDone: number; pending: number; questionsAnswered: number };
}

const summaryOf = (r: Row): PrepSummary => ({
  id: r.id as string,
  title: displayTitle((r.contest_name as string | null) ?? null, r.file_name as string),
  contestName: (r.contest_name as string | null) ?? null,
  roleName: (r.role_name as string | null) ?? null,
  board: (r.board as string | null) ?? null,
  year: (r.contest_year as number | null) ?? null,
  fileName: r.file_name as string,
  fileSize: r.file_size as number,
  pageCount: (r.page_count as number | null) ?? null,
  status: r.status as PrepStatus,
  step: r.step as number,
  error: (r.error as string | null) ?? null,
  stats: (r.stats as PrepStats) ?? {},
  createdAt: r.created_at as string,
});

/** Títulos das aulas do catálogo e o quanto o aluno realmente estudou de cada uma (0–100: leitura + níveis). */
export async function loadStudy(userId: string, catalogIds: string[]): Promise<{ titles: Map<string, string>; studied: Map<string, number> }> {
  const db = createAdminClient();
  const titles = new Map<string, string>();
  const studied = new Map<string, number>();
  for (let o = 0; o < catalogIds.length; o += 150) {
    const part = catalogIds.slice(o, o + 150);
    const [c, ls] = await Promise.all([
      db.from("catalog_topics").select("id, title").in("id", part),
      db.from("lessons").select("id, catalog_topic_id").eq("user_id", userId).in("catalog_topic_id", part),
    ]);
    for (const t of (c.data ?? []) as Row[]) titles.set(t.id as string, t.title as string);
    const lessonRows = (ls.data ?? []) as Row[];
    if (!lessonRows.length) continue;
    const pr = await db.from("learning_progress").select("lesson_id, levels_passed, reading_completed_at").eq("user_id", userId).in("lesson_id", lessonRows.map((l) => l.id as string));
    const byLesson = new Map(((pr.data ?? []) as Row[]).map((p) => [p.lesson_id as string, p]));
    for (const l of lessonRows) {
      const p = byLesson.get(l.id as string);
      const pct = p ? Math.round((((p.reading_completed_at ? 1 : 0) + Math.min(3, (p.levels_passed as number | null) ?? 0)) / 4) * 100) : 0;
      const cid = l.catalog_topic_id as string;
      studied.set(cid, Math.max(studied.get(cid) ?? 0, pct));
    }
  }
  return { titles, studied };
}

/** Preparação completa do aluno (disciplinas › tópicos › aulas do catálogo) com o progresso real dele. */
export async function getPreparationTree(userId: string, id: string): Promise<PreparationTree> {
  if (!UUID.test(id)) throw new UserFacingError("Preparação não encontrada.", "not_found");
  const db = createAdminClient();
  const prep = await db.from("edital_preparations").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!prep.data) throw new UserFacingError("Preparação não encontrada.", "not_found");
  await backfillInfo([prep.data as Row]);
  const [discs, tops] = await Promise.all([
    db.from("edital_disciplines").select("id, name, position, discipline_mode, source_page").eq("preparation_id", id).order("position"),
    db.from("edital_topics").select("id, discipline_id, position, code, depth, title, source_page, match_status").eq("preparation_id", id).order("position").limit(5000),
  ]);
  if (discs.error) throw new Error(discs.error.message);
  if (tops.error) throw new Error(tops.error.message);
  const topIds = ((tops.data ?? []) as Row[]).map((t) => t.id as string);
  const links: Row[] = [];
  for (let o = 0; o < topIds.length; o += 300) {
    const r = await db.from("edital_topic_lessons").select("topic_id, catalog_topic_id, coverage").in("topic_id", topIds.slice(o, o + 300));
    if (r.error) throw new Error(r.error.message);
    links.push(...((r.data ?? []) as Row[]));
  }
  const catalogIds = [...new Set(links.map((l) => l.catalog_topic_id as string))];
  const { titles, studied } = await loadStudy(userId, catalogIds);
  const linksByTopic = new Map<string, LinkedLesson[]>();
  for (const l of links) {
    const cid = l.catalog_topic_id as string;
    const pct = studied.get(cid) ?? 0;
    const arr = linksByTopic.get(l.topic_id as string) ?? [];
    arr.push({ catalogId: cid, title: titles.get(cid) ?? "Aula", coverage: l.coverage as LinkedLesson["coverage"], pct, done: pct >= 100 });
    linksByTopic.set(l.topic_id as string, arr);
  }
  const byDisc = new Map<string, TreeTopic[]>();
  for (const t of (tops.data ?? []) as Row[]) {
    const lessons = (linksByTopic.get(t.id as string) ?? []).sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    const status = t.match_status as TreeTopic["status"];
    const done = (status === "completa" || status === "parcial") && lessons.length > 0 && lessons.every((l) => l.done);
    const topic: TreeTopic = { id: t.id as string, code: (t.code as string | null) ?? null, depth: t.depth as number, title: t.title as string, page: (t.source_page as number | null) ?? null, status, lessons, done };
    const arr = byDisc.get(t.discipline_id as string) ?? [];
    arr.push(topic);
    byDisc.set(t.discipline_id as string, arr);
  }
  const disciplines: TreeDiscipline[] = ((discs.data ?? []) as Row[]).map((d) => {
    const topics = byDisc.get(d.id as string) ?? [];
    const doneCount = topics.filter((t) => t.done).length;
    return { id: d.id as string, name: d.name as string, page: (d.source_page as number | null) ?? null, mode: (d.discipline_mode as string | null) ?? null, modeLabel: d.discipline_mode ? (disciplineLabel(d.discipline_mode as string) ?? null) : null, topics, doneCount, pct: topics.length ? Math.round((doneCount / topics.length) * 100) : 0 };
  });
  const all = disciplines.flatMap((d) => d.topics);
  const lessonIds = new Set(all.flatMap((t) => t.lessons.map((l) => l.catalogId)));
  const lessonsDone = [...lessonIds].filter((cid) => (studied.get(cid) ?? 0) >= 100).length;
  // Questões (Modo Jogo) respondidas nas aulas do catálogo desta preparação, a partir da criação dela.
  let questionsAnswered = 0;
  if (lessonIds.size) {
    // Só o que foi respondido depois de criar esta preparação (o histórico de antes não é deste edital).
    const att = await db.from("quiz_attempts").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", (prep.data as Row).created_at as string).in("topic_id", [...lessonIds].slice(0, 300));
    questionsAnswered = att.count ?? 0;
  }
  const done = all.filter((t) => t.done).length;
  return {
    prep: summaryOf(prep.data as Row),
    disciplines,
    totals: { topics: all.length, done, pct: all.length ? Math.round((done / all.length) * 100) : 0, lessonsAvailable: lessonIds.size, lessonsDone, pending: all.filter((t) => t.status === "nao_encontrado").length, questionsAnswered },
  };
}

export interface GapRow {
  title: string;
  discipline: string;
  editais: number;
  alunos: number;
}

/** Visão administrativa: assuntos de editais enviados que ainda não têm aula, do mais frequente ao menos. */
export async function listCatalogGaps(limit = 100): Promise<{ gaps: GapRow[]; preparations: number }> {
  const db = createAdminClient();
  const [prepCount, rows] = await Promise.all([
    db.from("edital_preparations").select("id", { count: "exact", head: true }).eq("status", "concluido"),
    db.from("edital_topics").select("title, title_key, preparation_id, user_id, discipline_id").eq("match_status", "nao_encontrado").limit(20000),
  ]);
  if (rows.error) throw new Error(rows.error.message);
  const discIds = [...new Set(((rows.data ?? []) as Row[]).map((r) => r.discipline_id as string))];
  const discName = new Map<string, string>();
  for (let o = 0; o < discIds.length; o += 200) {
    const d = await db.from("edital_disciplines").select("id, name").in("id", discIds.slice(o, o + 200));
    for (const x of (d.data ?? []) as Row[]) discName.set(x.id as string, x.name as string);
  }
  const map = new Map<string, { title: string; discipline: string; preps: Set<string>; users: Set<string> }>();
  for (const r of (rows.data ?? []) as Row[]) {
    const key = `${(discName.get(r.discipline_id as string) ?? "").toLowerCase()}|${r.title_key as string}`;
    const g = map.get(key) ?? { title: r.title as string, discipline: discName.get(r.discipline_id as string) ?? "—", preps: new Set(), users: new Set() };
    g.preps.add(r.preparation_id as string);
    g.users.add(r.user_id as string);
    map.set(key, g);
  }
  const gaps = [...map.values()].map((g) => ({ title: g.title, discipline: g.discipline, editais: g.preps.size, alunos: g.users.size })).sort((a, b) => b.editais - a.editais || b.alunos - a.alunos || a.title.localeCompare(b.title, "pt-BR")).slice(0, limit);
  return { gaps, preparations: prepCount.count ?? 0 };
}
