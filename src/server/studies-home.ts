import "server-only";
import { unstable_cache } from "next/cache";
import { disciplineLabel } from "@/ai/pedagogy";
import { ensureDisciplines } from "./services/disciplines";
import { computeGamification } from "@/domain/progress/gamification";
import { buildStudiesHome, type StudiesHome } from "@/domain/studies/home";
import { createAdminClient, createUserClient } from "./supabase";
import { getSessionUser } from "./auth";
import { getStudyStats } from "./queries";

type CatalogRow = { id: string; title: string; discipline_mode: string; estimated_minutes: number | null; topic_group: string | null; topic_group_code: string | null; subtopic_code: string | null };
/** Catálogo publicado + questões por tema: igual para todos os alunos, então fica em cache por 5 minutos (e o banco já agrega a contagem). */
const loadCatalog = unstable_cache(
  async (): Promise<{ topics: CatalogRow[]; perTopic: Array<[string, number]> }> => {
    const admin = createAdminClient();
    const [topics, counts] = await Promise.all([
      admin.from("catalog_topics").select("id, title, discipline_mode, estimated_minutes, topic_group, topic_group_code, subtopic_code").eq("status", "publicado").limit(5000),
      admin.rpc("catalog_question_counts").limit(10000),
    ]);
    if (topics.error) throw new Error(topics.error.message);
    return { topics: (topics.data ?? []) as CatalogRow[], perTopic: ((counts.data ?? []) as Array<{ topic_id: string; n: number }>).map((r) => [r.topic_id, Number(r.n)] as [string, number]) };
  },
  ["estudos-catalogo-v1"],
  { revalidate: 300 },
);

/**
 * Dados da página de Estudos. Leituras do aluno sempre filtradas pelo id dele (contas de
 * equipe também leem dados de outros pela RLS "admin le"). O catálogo é público (publicado).
 */
export async function getStudiesHome(): Promise<StudiesHome> {
  await ensureDisciplines();
  const db = await createUserClient();
  const me = (await getSessionUser())?.id ?? "00000000-0000-0000-0000-000000000000";
  const [profile, stats, trails, folders, lessons, progress, questions, attempts, bank] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", me).maybeSingle(),
    getStudyStats(),
    db.from("study_trails").select("id, title, status, last_studied_at, updated_at, folder_id, scope_summary").eq("user_id", me).is("archived_at", null),
    db.from("study_folders").select("id, name").eq("user_id", me),
    db.from("lessons").select("id, trail_id, title, objective, estimated_minutes, sort_order").eq("user_id", me),
    db.from("learning_progress").select("lesson_id, trail_id, state, levels_passed, updated_at").eq("user_id", me),
    db.from("questions").select("id, lesson_id").eq("user_id", me).eq("active", true).limit(10000),
    db.rpc("my_attempts_compact").limit(20000),
    loadCatalog(),
  ]);
  for (const r of [trails, lessons, progress, questions, attempts]) if (r.error) throw new Error(r.error.message);
  const perTopic = new Map<string, number>(bank.perTopic);
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
    // Uma linha por questão (última tentativa e tempo somado): o mesmo resultado para respondidas, tempo e último acesso.
    attempts: (attempts.data ?? []) as Array<{ question_id: string; created_at: string; time_spent_seconds: number | null }>,
    catalog: bank.topics.map((t) => ({
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
