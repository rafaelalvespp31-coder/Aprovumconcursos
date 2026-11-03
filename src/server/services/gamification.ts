import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/server/supabase";
import { computeMentor } from "@/server/services/mentor";
import { lessonPct } from "@/domain/mentor/engine";
import { UserFacingError } from "@/server/services/trails";
import type { GamificationState, PerformanceState } from "@/domain/gamification/home";

/**
 * Home gamificada. O id do aluno vem SEMPRE da sessão verificada no servidor (requireUser).
 * A concessão de XP/conquistas acontece só em gamification_sync (banco, idempotente).
 */

export interface ContinueLesson {
  lessonId: string;
  lesson: string;
  subject: string;
  module: string | null;
  pct: number;
  at: string;
}

export interface Contest {
  id: string;
  name: string;
  institution: string;
  roleName: string | null;
  status: string;
  vacancies: number | null;
  salary: string | null;
  examDate: string | null;
  examDateConfirmed: boolean;
  infoConfirmed: boolean;
  sourceName: string;
  sourceUrl: string | null;
  infoUpdatedAt: string;
}

export interface Insight {
  title: string;
  reason: string;
  href: string;
  actionLabel: string;
}

export interface RankingRow {
  pos: number;
  name: string;
  level: number;
  xp: number;
}

export interface HomeData {
  game: GamificationState;
  performance: PerformanceState | null;
  continueLesson: ContinueLesson | null;
  contests: Contest[];
  insights: Insight[] | null;
  top: RankingRow[];
}

const OPEN = ["disponivel", "em_andamento", "aula_concluida", "em_revisao", "aguardando_dominio"];

export async function syncGamification(userId: string): Promise<GamificationState> {
  const { data, error } = await createAdminClient().rpc("gamification_sync", { p_user: userId });
  if (error) throw new Error(error.message);
  const s = data as GamificationState;
  return { ...s, xp: Number(s.xp), levelFloor: Number(s.levelFloor), levelNext: Number(s.levelNext), xpToday: Number(s.xpToday) };
}

async function loadPerformance(userId: string): Promise<PerformanceState> {
  const { data, error } = await createAdminClient().rpc("gamification_performance", { p_user: userId });
  if (error) throw new Error(error.message);
  const p = data as PerformanceState;
  return { ...p, answered: Number(p.answered), correct: Number(p.correct), wrong: Number(p.wrong), seconds: Number(p.seconds) };
}

export async function loadTop(limit = 5): Promise<RankingRow[]> {
  const { data, error } = await createAdminClient().rpc("gamification_top", { p_limit: limit });
  if (error) throw new Error(error.message);
  return ((data ?? []) as Array<{ pos: number; name: string; level: number; xp: number | string }>).map((r) => ({ ...r, xp: Number(r.xp) }));
}

/** Última aula realmente em andamento do aluno (nada inventado: sem progresso → null). */
async function loadContinue(userId: string): Promise<ContinueLesson | null> {
  const { data, error } = await createAdminClient()
    .from("learning_progress")
    .select("lesson_id, state, levels_passed, reading_completed_at, updated_at, lessons(title, learning_modules(title)), study_trails(title, archived_at)")
    .eq("user_id", userId)
    .in("state", OPEN)
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  type Row = {
    lesson_id: string; levels_passed: number | null; reading_completed_at: string | null; updated_at: string;
    lessons: { title: string; learning_modules: { title: string } | null } | null;
    study_trails: { title: string; archived_at: string | null } | null;
  };
  for (const r of (data ?? []) as unknown as Row[]) {
    if (!r.lessons || !r.study_trails || r.study_trails.archived_at) continue;
    const pct = lessonPct(!!r.reading_completed_at, r.levels_passed ?? 0);
    if (pct >= 100) continue;
    return { lessonId: r.lesson_id, lesson: r.lessons.title, subject: r.study_trails.title, module: r.lessons.learning_modules?.title ?? null, pct, at: r.updated_at };
  }
  return null;
}

/** Concursos cadastrados pela equipe, ainda não encerrados, por data de prova. */
export async function loadContests(today: string, limit = 3): Promise<Contest[]> {
  const { data, error } = await createAdminClient()
    .from("contest_catalog")
    .select("*")
    .eq("active", true)
    .not("status", "in", "(prova_realizada,encerrado)")
    .order("exam_date", { ascending: true, nullsFirst: false })
    .order("updated_at", { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ContestRow[])
    .filter((c) => !c.exam_date || c.exam_date >= today)
    .slice(0, limit)
    .map(toContest);
}

async function loadInsights(userId: string): Promise<Insight[]> {
  const m = await computeMentor(userId);
  return m.visible.slice(0, 2).map((r) => ({ title: r.explanation, reason: r.reason, href: r.href, actionLabel: r.actionLabel }));
}

const soft = async <T>(p: Promise<T>, fallback: T): Promise<T> => {
  try {
    return await p;
  } catch (e) {
    console.error("[home]", (e as Error).message);
    return fallback;
  }
};

export async function loadHome(userId: string): Promise<HomeData> {
  const game = await syncGamification(userId);
  const [performance, continueLesson, contests, insights, top] = await Promise.all([
    soft(loadPerformance(userId), null),
    soft(loadContinue(userId), null),
    soft(loadContests(game.today), []),
    soft(loadInsights(userId), null),
    soft(loadTop(5), []),
  ]);
  return { game, performance, continueLesson, contests, insights, top };
}

export async function ackLevelUps(userId: string): Promise<void> {
  const { error } = await createAdminClient().rpc("gamification_ack_levels", { p_user: userId });
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------------------
// Catálogo de concursos (equipe)
// ---------------------------------------------------------------------------
type ContestRow = {
  id: string; name: string; institution: string; role_name: string | null; status: string; vacancies: number | null;
  salary: string | null; exam_date: string | null; exam_date_confirmed: boolean; info_confirmed: boolean;
  source_name: string; source_url: string | null; info_updated_at: string; active: boolean;
};
const toContest = (c: ContestRow): Contest => ({
  id: c.id, name: c.name, institution: c.institution, roleName: c.role_name, status: c.status, vacancies: c.vacancies,
  salary: c.salary, examDate: c.exam_date, examDateConfirmed: c.exam_date_confirmed, infoConfirmed: c.info_confirmed,
  sourceName: c.source_name, sourceUrl: c.source_url, infoUpdatedAt: c.info_updated_at,
});

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? null : v);
export const contestSchema = z.object({
  name: z.string().trim().min(2).max(120),
  institution: z.string().trim().min(2).max(160),
  role_name: z.preprocess(blank, z.string().trim().max(160).nullable()),
  status: z.enum(["previsto", "autorizado", "edital_publicado", "inscricoes_abertas", "inscricoes_encerradas", "prova_realizada", "encerrado"]),
  vacancies: z.preprocess((v) => (blank(v) == null ? null : Number(v)), z.number().int().min(0).max(1_000_000).nullable()),
  salary: z.preprocess(blank, z.string().trim().max(80).nullable()),
  exam_date: z.preprocess(blank, z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable()),
  exam_date_confirmed: z.boolean(),
  info_confirmed: z.boolean(),
  source_name: z.string().trim().min(2).max(160),
  source_url: z.preprocess(blank, z.string().trim().url().regex(/^https?:\/\//).nullable()),
  active: z.boolean(),
});

export async function listContestsAdmin(): Promise<Array<Contest & { active: boolean }>> {
  const { data, error } = await createAdminClient().from("contest_catalog").select("*").order("exam_date", { ascending: true, nullsFirst: false }).limit(200);
  if (error) throw new Error(error.message);
  return ((data ?? []) as ContestRow[]).map((c) => ({ ...toContest(c), active: c.active }));
}

export async function saveContest(adminId: string, id: string | null, input: unknown) {
  const parsed = contestSchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError("Confira os campos: nome, órgão e fonte são obrigatórios; datas no formato AAAA-MM-DD; link começando com http.", "invalid_input");
  const v = parsed.data;
  if (v.exam_date_confirmed && !v.exam_date) throw new UserFacingError("Para marcar a data como confirmada, informe a data da prova.", "invalid_input");
  const row = { ...v, info_updated_at: new Date().toISOString().slice(0, 10), updated_at: new Date().toISOString() };
  const db = createAdminClient();
  const r = id
    ? await db.from("contest_catalog").update(row).eq("id", z.uuid().parse(id))
    : await db.from("contest_catalog").insert({ ...row, created_by: adminId });
  if (r.error) throw new Error(r.error.message);
}
