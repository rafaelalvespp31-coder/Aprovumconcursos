import "server-only";
import { groupKey } from "@/domain/catalog/topic-group";
import type { SubtopicEntry } from "@/domain/catalog/subtopic-search";
import { createAdminClient, createUserClient } from "./supabase";
import { getSessionUser } from "./auth";

export interface TopicSiblings {
  group: { title: string; code: string | null };
  discipline: string;
  items: SubtopicEntry[];
}

/**
 * Subtópicos do mesmo tópico do edital que a aula atual (ex.: Crimes contra a Administração
 * Pública › 1.1 Peculato, 1.2 Concussão…), com o andamento do aluno em cada um.
 * O catálogo publicado é lido pelo servidor; as aulas e o progresso, só do próprio aluno.
 */
export async function getTopicSiblings(catalogTopicId: string | null): Promise<TopicSiblings | null> {
  if (!catalogTopicId) return null;
  const admin = createAdminClient();
  const { data: cur } = await admin.from("catalog_topics").select("id, discipline_mode, topic_group, topic_group_code").eq("id", catalogTopicId).maybeSingle();
  if (!cur?.topic_group) return null;
  const { data: rows } = await admin
    .from("catalog_topics")
    .select("id, title, topic_group, topic_group_code, subtopic_code")
    .eq("status", "publicado")
    .eq("discipline_mode", cur.discipline_mode as string)
    .not("topic_group", "is", null)
    .limit(500);
  const key = groupKey(cur.topic_group as string);
  const same = (rows ?? []).filter((r) => groupKey(r.topic_group as string) === key);
  if (same.length < 2) return null;

  const me = (await getSessionUser())?.id;
  const lessonOf = new Map<string, { lessonId: string; levels: number }>();
  if (me) {
    const db = await createUserClient();
    const ids = same.map((r) => r.id as string);
    const { data: lessons } = await db
      .from("lessons")
      .select("id, catalog_topic_id, created_at, study_trails!inner(archived_at)")
      .eq("user_id", me)
      .in("catalog_topic_id", ids)
      .is("study_trails.archived_at", null)
      .order("created_at", { ascending: true })
      .limit(500);
    const lessonIds = (lessons ?? []).map((l) => l.id as string);
    const { data: progress } = lessonIds.length
      ? await db.from("learning_progress").select("lesson_id, levels_passed").eq("user_id", me).in("lesson_id", lessonIds)
      : { data: [] as Array<{ lesson_id: string; levels_passed: number | null }> };
    const levels = new Map((progress ?? []).map((p) => [p.lesson_id as string, (p.levels_passed as number | null) ?? 0]));
    // A mais recente vence (ordem crescente: a última sobrescreve).
    for (const l of lessons ?? []) lessonOf.set(l.catalog_topic_id as string, { lessonId: l.id as string, levels: levels.get(l.id as string) ?? 0 });
  }

  return {
    group: { title: cur.topic_group as string, code: (cur.topic_group_code as string | null) ?? same.find((r) => r.topic_group_code)?.topic_group_code ?? null },
    discipline: cur.discipline_mode as string,
    items: same.map((r) => {
      const mine = lessonOf.get(r.id as string);
      return {
        topicId: r.id as string,
        title: r.title as string,
        code: (r.subtopic_code as string | null) ?? null,
        lessonId: mine?.lessonId ?? null,
        pct: mine ? Math.round((Math.min(3, mine.levels) / 3) * 100) : null,
        done: !!mine && mine.levels >= 3,
        current: r.id === catalogTopicId,
      };
    }),
  };
}
