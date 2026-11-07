import "server-only";
import { createAdminClient } from "../supabase";
import { listPreparations, type PrepSummary } from "./edital";
import { isTopicDone, lessonStudyPct } from "./edital-view";
import { computeOverview, type OvAttempt, type OvLink, type OvStudy, type OvTopic, type Overview, type PrepProgress } from "@/domain/edital/overview";

type Row = Record<string, unknown>;
const PAGE = 1000;

export interface EditalCard extends PrepSummary {
  progress: PrepProgress | null;
  /** Raio-X publicado para este edital (análise estratégica) e quando foi atualizado. */
  raioX: { available: boolean; analyzedAt: string | null };
  studyFolderId: string | null;
}

export interface EditaisOverview {
  cards: EditalCard[];
  totals: Pick<Overview, "analyzed" | "avgPct" | "evolution7d" | "questions">;
  /** O progresso não pôde ser calculado agora (os editais continuam listados). */
  progressError: boolean;
}

/** Busca paginada (o Supabase devolve no máximo ~1000 linhas por vez). */
async function all<T>(q: (from: number, to: number) => PromiseLike<{ data: unknown; error: { message: string } | null }>, max = 20_000): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; from < max; from += PAGE) {
    const r = await q(from, from + PAGE - 1);
    if (r.error) throw new Error(r.error.message);
    const rows = (r.data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

const chunks = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/**
 * "Meus Editais": todos os editais do aluno com o progresso REAL de cada um, em poucas consultas
 * agrupadas (sem uma consulta por edital). Tudo filtrado pelo usuário autenticado.
 */
export async function getEditaisOverview(userId: string): Promise<EditaisOverview> {
  const preps = await listPreparations(userId);
  const db = createAdminClient();
  const ready = preps.filter((p) => p.status === "concluido");
  const empty = { analyzed: ready.length, avgPct: null, evolution7d: null, questions: 0 };
  if (!preps.length) return { cards: [], totals: { ...empty, analyzed: 0 }, progressError: false };

  // Raio-X (análise estratégica publicada) de cada edital — 2 consultas para todos.
  const raio = new Map<string, { available: boolean; analyzedAt: string | null }>();
  try {
    const links = await db.from("edital_preparations").select("id, strategic_exam_id").eq("user_id", userId).in("id", preps.map((p) => p.id));
    const examIds = [...new Set(((links.data ?? []) as Row[]).map((r) => r.strategic_exam_id as string | null).filter((x): x is string => !!x))];
    const exams = examIds.length ? await db.from("strategic_exams").select("id, status, updated_at").in("id", examIds) : { data: [] };
    const byExam = new Map(((exams.data ?? []) as Row[]).map((e) => [e.id as string, e]));
    for (const r of (links.data ?? []) as Row[]) {
      const e = byExam.get(r.strategic_exam_id as string);
      raio.set(r.id as string, { available: e?.status === "publicado", analyzedAt: e?.status === "publicado" ? ((e.updated_at as string | null) ?? null) : null });
    }
  } catch {
    /* sem Raio-X: os cards só não mostram o atalho */
  }

  let overview: Overview | null = null;
  try {
    const readyIds = ready.map((p) => p.id);
    const topics: OvTopic[] = [];
    for (const ids of chunks(readyIds, 50)) {
      const rows = await all<Row>((f, t) => db.from("edital_topics").select("id, preparation_id, match_status, position").eq("user_id", userId).in("preparation_id", ids).order("preparation_id").order("position").range(f, t));
      topics.push(...rows.map((r) => ({ id: r.id as string, prepId: r.preparation_id as string, status: r.match_status as string })));
    }
    const links: OvLink[] = [];
    for (const ids of chunks(topics.map((t) => t.id), 300)) {
      const r = await db.from("edital_topic_lessons").select("topic_id, catalog_topic_id").in("topic_id", ids);
      if (r.error) throw new Error(r.error.message);
      links.push(...((r.data ?? []) as Row[]).map((l) => ({ topicId: l.topic_id as string, catalogId: l.catalog_topic_id as string })));
    }
    const catalogIds = [...new Set(links.map((l) => l.catalogId))];

    // Estudo do aluno nessas aulas (mesma regra do detalhe do edital: a melhor cópia de cada aula).
    const study = new Map<string, OvStudy>();
    const attempts: OvAttempt[] = [];
    for (const part of chunks(catalogIds, 150)) {
      const ls = await db.from("lessons").select("id, catalog_topic_id").eq("user_id", userId).in("catalog_topic_id", part);
      if (ls.error) throw new Error(ls.error.message);
      const lessonRows = (ls.data ?? []) as Row[];
      if (lessonRows.length) {
        const pr = await db.from("learning_progress").select("lesson_id, levels_passed, reading_completed_at, passed_at, updated_at").eq("user_id", userId).in("lesson_id", lessonRows.map((l) => l.id as string));
        if (pr.error) throw new Error(pr.error.message);
        const byLesson = new Map(((pr.data ?? []) as Row[]).map((p) => [p.lesson_id as string, p]));
        for (const l of lessonRows) {
          const p = byLesson.get(l.id as string);
          const pct = lessonStudyPct(p);
          const cid = l.catalog_topic_id as string;
          // Aula concluída quando terminou a leitura E os níveis: vale a data mais recente das duas.
          const doneAt = pct >= 100 ? ([p?.reading_completed_at, p?.passed_at].filter(Boolean).sort().pop() as string | undefined) ?? null : null;
          const cur = study.get(cid);
          if (!cur || pct > cur.pct) study.set(cid, { pct, lessonId: l.id as string, doneAt, lastAt: (p?.updated_at as string | null) ?? null });
          else if (p?.updated_at && (!cur.lastAt || (p.updated_at as string) > cur.lastAt)) cur.lastAt = p.updated_at as string;
        }
      }
      const since = ready.reduce((m, p) => (p.createdAt < m ? p.createdAt : m), ready[0]!.createdAt);
      const at = await all<Row>((f, t) => db.from("quiz_attempts").select("id, topic_id, created_at").eq("user_id", userId).gte("created_at", since).in("topic_id", part).range(f, t));
      attempts.push(...at.map((a) => ({ id: a.id as string, catalogId: a.topic_id as string, createdAt: a.created_at as string })));
    }

    overview = computeOverview({ preps: preps.map((p) => ({ id: p.id, createdAt: p.createdAt, ready: p.status === "concluido" })), topics, links, study, attempts, isDone: isTopicDone });
  } catch {
    overview = null;
  }

  const cards: EditalCard[] = preps.map((p) => ({
    ...p,
    progress: overview?.byPrep.get(p.id) ?? null,
    raioX: raio.get(p.id) ?? { available: false, analyzedAt: null },
    studyFolderId: (p.stats as { studyFolderId?: string }).studyFolderId ?? null,
  }));
  return {
    cards,
    totals: overview ? { analyzed: overview.analyzed, avgPct: overview.avgPct, evolution7d: overview.evolution7d, questions: overview.questions } : empty,
    progressError: !overview && ready.length > 0,
  };
}
