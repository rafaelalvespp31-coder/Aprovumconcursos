import "server-only";
import { disciplineLabel } from "@/ai/pedagogy";
import { ensureDisciplines } from "./services/disciplines";
import { computeGamification } from "@/domain/progress/gamification";
import { buildStudiesHome, type StudiesHome } from "@/domain/studies/home";
import { createAdminClient, createUserClient } from "./supabase";
import { getSessionUser } from "./auth";
import { getStudyStats } from "./queries";

/**
 * Dados da página de Estudos. Leituras do aluno sempre filtradas pelo id dele (contas de
 * equipe também leem dados de outros pela RLS "admin le"). O catálogo é público (publicado).
 */
export async function getStudiesHome(): Promise<StudiesHome> {
  await ensureDisciplines();
  const db = await createUserClient();
  const me = (await getSessionUser())?.id ?? "00000000-0000-0000-0000-000000000000";
  const admin = createAdminClient();
  const [profile, stats, trails, folders, lessons, progress, questions, attempts, topics, bank] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", me).maybeSingle(),
    getStudyStats(),
    db.from("study_trails").select("id, title, status, last_studied_at, updated_at, folder_id, scope_summary").eq("user_id", me).is("archived_at", null),
    db.from("study_folders").select("id, name").eq("user_id", me),
    db.from("lessons").select("id, trail_id, title, objective, estimated_minutes, sort_order").eq("user_id", me),
    db.from("learning_progress").select("lesson_id, trail_id, state, levels_passed, updated_at").eq("user_id", me),
    db.from("questions").select("id, lesson_id").eq("user_id", me).eq("active", true).limit(10000),
    db.from("answer_attempts").select("question_id, created_at, time_spent_seconds").eq("user_id", me).limit(20000),
    admin.from("catalog_topics").select("id, title, discipline_mode, estimated_minutes, topic_group, topic_group_code, subtopic_code").eq("status", "publicado").limit(5000),
    admin.from("catalog_questions").select("topic_id").eq("active", true).limit(50000),
  ]);
  for (const r of [trails, lessons, progress, questions, attempts]) if (r.error) throw new Error(r.error.message);
  const perTopic = new Map<string, number>();
  for (const q of (bank.data ?? []) as Array<{ topic_id: string }>) perTopic.set(q.topic_id, (perTopic.get(q.topic_id) ?? 0) + 1);
  const g = computeGamification(stats);
  return buildStudiesHome({
    name: (profile.data?.display_name as string | null | undefined)?.split(" ")[0] ?? null,
    streak: { current: g.streak.current, last7: g.streak.last7 },
    trails: ((trails.data ?? []) as Array<{ id: string; title: string; status: string; last_studied_at: string | null; updated_at: string; folder_id: string | null; scope_summary: { catalogTopics?: Array<{ id: string }> } | null }>).map(
      (t) => ({ ...t, catalogTopicIds: (t.scope_summary?.catalogTopics ?? []).map((c) => c.id) }),
    ),
    folders: (folders.data ?? []) as Array<{ id: string; name: string }>,
    lessons: (lessons.data ?? []) as StudiesRawLessons,
    progress: ((progress.data ?? []) as Array<{ lesson_id: string; trail_id: string; state: string; levels_passed: number | null; updated_at: string }>).map((p) => ({ ...p, levels_passed: p.levels_passed ?? 0 })),
    questions: (questions.data ?? []) as Array<{ id: string; lesson_id: string }>,
    attempts: (attempts.data ?? []) as Array<{ question_id: string; created_at: string; time_spent_seconds: number | null }>,
    catalog: ((topics.data ?? []) as Array<{ id: string; title: string; discipline_mode: string; estimated_minutes: number | null; topic_group: string | null; topic_group_code: string | null; subtopic_code: string | null }>).map((t) => ({
      id: t.id,
      title: t.title,
      minutes: t.estimated_minutes ?? 0,
      discipline: disciplineLabel(t.discipline_mode as string) ?? "Outras matérias",
      questions: perTopic.get(t.id) ?? 0,
      group: t.topic_group ? { title: t.topic_group, code: t.topic_group_code, sub: t.subtopic_code } : null,
    })),
  });
}

type StudiesRawLessons = Array<{ id: string; trail_id: string; title: string; objective: string; estimated_minutes: number; sort_order: number }>;
