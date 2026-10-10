import "server-only";
import { notFound } from "next/navigation";
import { createUserClient } from "./supabase";
import type { AuditReport } from "@/domain/content/audit";
import type { UnitState } from "@/domain/progress/state-machine";
import type { RulerState } from "@/components/coverage-ruler";

/**
 * Leituras das telas. Usam o cliente com a sessão do aluno: a RLS garante no banco
 * que só os dados dele retornam, mesmo que um id de outro usuário seja informado.
 */

export interface TrailSummary {
  id: string;
  title: string;
  board_slug: string;
  other_board_name: string | null;
  content_type: string;
  status: "pending" | "processing" | "review" | "active" | "failed";
  archived_at: string | null;
  last_studied_at: string | null;
  updated_at: string;
  created_at: string;
}

const TRAIL_COLS = "id, title, board_slug, other_board_name, content_type, status, archived_at, last_studied_at, updated_at, created_at";

export async function listTrails(includeArchived = false): Promise<TrailSummary[]> {
  const db = await createUserClient();
  let q = db.from("study_trails").select(TRAIL_COLS).order("updated_at", { ascending: false });
  if (!includeArchived) q = q.is("archived_at", null);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []) as TrailSummary[];
}

export async function getTrail(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = await createUserClient();
  const { data } = await db.from("study_trails").select(`${TRAIL_COLS}, discipline_mode, audit_report`).eq("id", id).maybeSingle();
  if (!data) notFound();
  return data as TrailSummary & { discipline_mode: string | null; audit_report: (AuditReport & { repairs?: Array<{ detail: string }>; ambiguities?: Array<{ description: string }> }) | null };
}

export async function getLatestJob(trailId: string, kind: "build_trail" | "generate_lesson", lessonId?: string) {
  const db = await createUserClient();
  let q = db
    .from("ai_generation_jobs")
    .select("id, kind, stage, status, progress, error_message, attempts, max_attempts, trail_id, lesson_id")
    .eq("trail_id", trailId)
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(1);
  if (lessonId) q = q.eq("lesson_id", lessonId);
  const { data } = await q.maybeSingle();
  return data;
}

export interface CoverageRow {
  node_id: string;
  key: string;
  path: string;
  kind: string;
  requires_direct_coverage: boolean;
  planned: boolean;
  taught: boolean;
  questions_available: number;
  questions_answered: number;
  mastered: boolean;
  verification_status: "nao_aplicavel" | "pendente" | "verificada" | "divergente";
  last_verified_at: string | null;
}

export async function getCoverage(trailId: string) {
  const db = await createUserClient();
  const [cov, nodes] = await Promise.all([
    db.from("topic_coverage").select("*").eq("trail_id", trailId),
    db.from("content_nodes").select("id, key, parent_id, kind, marker, title, depth, sort_order, relevance").eq("trail_id", trailId).order("sort_order"),
  ]);
  if (cov.error) throw new Error(cov.error.message);
  if (nodes.error) throw new Error(nodes.error.message);
  const byNode = new Map((cov.data as CoverageRow[]).map((c) => [c.node_id, c]));
  return (nodes.data ?? []).map((n) => ({
    ...(n as { id: string; key: string; parent_id: string | null; kind: string; marker: string | null; title: string; depth: number; sort_order: number; relevance: string | null }),
    coverage: byNode.get(n.id as string)!,
  }));
}

export function rulerStateOf(c: CoverageRow): RulerState {
  if (c.mastered) return "dominado";
  if (c.taught && (c.verification_status === "pendente" || c.verification_status === "divergente")) return "nao_verificado";
  if (c.taught && c.questions_answered > 0) return "praticado";
  if (c.taught) return "ensinado";
  if (c.planned) return "planejado";
  return "pendente";
}

export interface LessonListItem {
  id: string;
  key: string;
  title: string;
  objective: string;
  sort_order: number;
  estimated_minutes: number;
  status: "planned" | "generating" | "ready" | "failed" | "pending_validation";
  supplementary: Array<{ title: string; justification: string }>;
  module_id: string;
  verification_pending: boolean;
  state: UnitState | null;
  nodeKeys: string[];
}

export async function getTrailPlan(trailId: string) {
  const db = await createUserClient();
  const [mods, lessons, progress] = await Promise.all([
    db.from("learning_modules").select("id, key, title, sort_order").eq("trail_id", trailId).order("sort_order"),
    db
      .from("lessons")
      .select("id, key, title, objective, sort_order, estimated_minutes, status, supplementary, module_id, verification_pending, lesson_nodes(content_nodes(key))")
      .eq("trail_id", trailId)
      .order("sort_order"),
    db.from("learning_progress").select("lesson_id, state").eq("trail_id", trailId),
  ]);
  if (mods.error || lessons.error) throw new Error((mods.error ?? lessons.error)!.message);
  const stateBy = new Map((progress.data ?? []).map((p) => [p.lesson_id as string, p.state as UnitState]));
  const items: LessonListItem[] = (lessons.data ?? []).map((l) => {
    const { lesson_nodes, ...rest } = l as unknown as Omit<LessonListItem, "state" | "nodeKeys"> & {
      lesson_nodes: Array<{ content_nodes: { key: string } | null }>;
    };
    return {
      ...rest,
      state: stateBy.get(rest.id) ?? null,
      nodeKeys: lesson_nodes.map((x) => x.content_nodes?.key).filter((k): k is string => !!k),
    };
  });
  return (mods.data ?? []).map((m) => ({
    id: m.id as string,
    title: m.title as string,
    lessons: items.filter((l) => l.module_id === m.id),
  }));
}

export async function getLessonForStudy(lessonId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) notFound();
  const db = await createUserClient();
  const { data: lesson } = await db
    .from("lessons")
    .select("id, trail_id, key, title, objective, sort_order, estimated_minutes, status, supplementary, verification_pending, unverified_claims, generation_error, generated_at, study_trails(title, board_slug, other_board_name)")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) notFound();
  const [sections, refs, questions, progress, nodes, siblings] = await Promise.all([
    db.from("lesson_sections").select("id, kind, title, body_markdown, sort_order, node_keys, verification_status").eq("lesson_id", lessonId).order("sort_order"),
    db.from("source_references").select("kind, citation, verified").eq("lesson_id", lessonId),
    db
      .from("questions")
      .select("id, type, statement, difficulty, essential, origin, board_style, depends_on_external_source, node_id, question_options(id, label, text, sort_order)")
      .eq("lesson_id", lessonId)
      .eq("active", true)
      .order("created_at"),
    db.from("learning_progress").select("state, reading_completed_at, passed_at, mastered_at").eq("lesson_id", lessonId).maybeSingle(),
    db.from("lesson_nodes").select("taught, content_nodes(key, marker, title, path, kind)").eq("lesson_id", lessonId),
    db.from("lessons").select("id, title, sort_order").eq("trail_id", lesson.trail_id as string).order("sort_order"),
  ]);
  return {
    lesson: lesson as unknown as {
      id: string; trail_id: string; key: string; title: string; objective: string; sort_order: number; estimated_minutes: number;
      status: LessonListItem["status"]; supplementary: Array<{ title: string; justification: string }>; verification_pending: boolean;
      unverified_claims: string[]; generation_error: string | null; generated_at: string | null;
      study_trails: { title: string; board_slug: string; other_board_name: string | null };
    },
    sections: (sections.data ?? []) as Array<{ id: string; kind: string; title: string; body_markdown: string; node_keys: string[]; verification_status: string }>,
    references: (refs.data ?? []) as Array<{ kind: string; citation: string; verified: boolean }>,
    questions: (questions.data ?? []).map((q) => ({
      ...(q as unknown as { id: string; type: "multipla_escolha" | "certo_errado" | "situacional" | "discursiva"; statement: string; difficulty: number; essential: boolean; origin: string; board_style: string | null; depends_on_external_source: boolean }),
      options: ((q.question_options ?? []) as Array<{ id: string; label: string; text: string; sort_order: number }>).sort((a, b) => a.sort_order - b.sort_order),
    })),
    progress: progress.data as { state: UnitState; reading_completed_at: string | null; passed_at: string | null; mastered_at: string | null } | null,
    nodes: (nodes.data ?? []).map((n) => ({ taught: n.taught as boolean, ...(n.content_nodes as unknown as { key: string; marker: string | null; title: string; path: string; kind: string }) })),
    siblings: (siblings.data ?? []) as Array<{ id: string; title: string; sort_order: number }>,
  };
}

export async function getDueReviews() {
  const db = await createUserClient();
  const { data, error } = await db
    .from("review_schedules")
    .select("lesson_id, trail_id, due_at, lapses, step, ease, last_reviewed_at, lessons(title), study_trails(title, archived_at)")
    .order("due_at")
    .limit(100);
  if (error) throw new Error(error.message);
  return (data ?? []).filter((r) => !(r.study_trails as unknown as { archived_at: string | null } | null)?.archived_at);
}

export async function getProfile() {
  const db = await createUserClient();
  const [p, s] = await Promise.all([
    db.from("profiles").select("display_name, daily_goal_minutes, onboarding_completed").maybeSingle(),
    db.from("subscriptions").select("status, plan_id, plans(name, max_active_trails, max_trail_builds_per_month, max_lesson_generations_per_month)").maybeSingle(),
  ]);
  return { profile: p.data, subscription: s.data };
}
