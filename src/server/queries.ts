import "server-only";
import { notFound } from "next/navigation";
import { createUserClient } from "./supabase";
import type { AuditReport } from "@/domain/content/audit";
import type { UnitState } from "@/domain/progress/state-machine";
import type { RulerState } from "@/components/coverage-ruler";
import { summarizePerformance, type AttemptRecord } from "@/domain/progress/performance";
import { computeGamification, streakMessage, type StudyStats } from "@/domain/progress/gamification";

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
  status: "pending" | "processing" | "clarification" | "review" | "active" | "failed";
  archived_at: string | null;
  last_studied_at: string | null;
  updated_at: string;
  created_at: string;
}

/** Delimitação de escopo feita pela IA para pedidos breves (tema, artigo). */
export interface ScopeSummary {
  subject: string;
  scopeStatement: string;
  outOfScope: string[];
  isLegal: boolean;
  legalReferences: Array<{ norm: string; provisions: string }>;
  subtopicCount?: number;
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
  const { data } = await db
    .from("study_trails")
    .select(`${TRAIL_COLS}, discipline_mode, audit_report, scope_summary, scope_question, scope_answer, scope_outline`)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  return data as TrailSummary & {
    scope_summary: ScopeSummary | null;
    scope_question: { question: string; options: string[] } | null;
    scope_answer: string | null;
    scope_outline: string | null;
  } & { discipline_mode: string | null; audit_report: (AuditReport & { repairs?: Array<{ detail: string }>; ambiguities?: Array<{ description: string }> }) | null };
}

export async function getLatestJob(trailId: string, kind: "build_trail" | "generate_lesson", lessonId?: string) {
  const db = await createUserClient();
  let q = db
    .from("ai_generation_jobs")
    .select("id, kind, stage, status, progress, error_message, error_code, attempts, max_attempts, trail_id, lesson_id")
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
    db.from("content_nodes").select("id, key, parent_id, kind, marker, title, depth, sort_order, relevance, origin").eq("trail_id", trailId).order("sort_order"),
  ]);
  if (cov.error) throw new Error(cov.error.message);
  if (nodes.error) throw new Error(nodes.error.message);
  const byNode = new Map((cov.data as CoverageRow[]).map((c) => [c.node_id, c]));
  return (nodes.data ?? []).map((n) => ({
    ...(n as { id: string; key: string; parent_id: string | null; kind: string; marker: string | null; title: string; depth: number; sort_order: number; relevance: string | null; origin: "texto" | "ia" }),
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
  /** Níveis aprovados (0–3): fácil, médio, difícil. */
  levelsPassed: number;
  nodeKeys: string[];
  prerequisiteIds: string[];
  questionCount: number;
  reviewDue: boolean;
}

export async function getTrailPlan(trailId: string) {
  const db = await createUserClient();
  const [mods, lessons, progress, prereqs, questions, reviews] = await Promise.all([
    db.from("learning_modules").select("id, key, title, sort_order").eq("trail_id", trailId).order("sort_order"),
    db
      .from("lessons")
      .select("id, key, title, objective, sort_order, estimated_minutes, status, supplementary, module_id, verification_pending, lesson_nodes(content_nodes(key))")
      .eq("trail_id", trailId)
      .order("sort_order"),
    db.from("learning_progress").select("lesson_id, state, levels_passed").eq("trail_id", trailId),
    db.from("lesson_prerequisites").select("lesson_id, prerequisite_lesson_id, lessons!lesson_prerequisites_lesson_id_user_id_fkey!inner(trail_id)").eq("lessons.trail_id", trailId),
    db.from("questions").select("lesson_id, lessons!inner(trail_id)").eq("active", true).eq("lessons.trail_id", trailId),
    db.from("review_schedules").select("lesson_id, due_at").eq("trail_id", trailId).lte("due_at", new Date().toISOString()),
  ]);
  if (mods.error || lessons.error) throw new Error((mods.error ?? lessons.error)!.message);
  const stateBy = new Map((progress.data ?? []).map((p) => [p.lesson_id as string, p.state as UnitState]));
  const levelsBy = new Map((progress.data ?? []).map((p) => [p.lesson_id as string, (p.levels_passed as number | null) ?? 0]));
  const prereqBy = new Map<string, string[]>();
  for (const p of prereqs.data ?? []) {
    prereqBy.set(p.lesson_id as string, [...(prereqBy.get(p.lesson_id as string) ?? []), p.prerequisite_lesson_id as string]);
  }
  const qCount = new Map<string, number>();
  for (const q of questions.data ?? []) qCount.set(q.lesson_id as string, (qCount.get(q.lesson_id as string) ?? 0) + 1);
  const due = new Set((reviews.data ?? []).map((r) => r.lesson_id as string));
  const items: LessonListItem[] = (lessons.data ?? []).map((l) => {
    const { lesson_nodes, ...rest } = l as unknown as Omit<LessonListItem, "state" | "levelsPassed" | "nodeKeys" | "prerequisiteIds" | "questionCount" | "reviewDue"> & {
      lesson_nodes: Array<{ content_nodes: { key: string } | null }>;
    };
    return {
      ...rest,
      state: stateBy.get(rest.id) ?? null,
      levelsPassed: levelsBy.get(rest.id) ?? 0,
      nodeKeys: lesson_nodes.map((x) => x.content_nodes?.key).filter((k): k is string => !!k),
      prerequisiteIds: prereqBy.get(rest.id) ?? [],
      questionCount: qCount.get(rest.id) ?? 0,
      reviewDue: due.has(rest.id),
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
  const [sections, refs, questions, progress, nodes, siblings, annotations, clarifications, marks] = await Promise.all([
    db.from("lesson_sections").select("id, kind, title, body_markdown, sort_order, node_keys, verification_status").eq("lesson_id", lessonId).order("sort_order"),
    db.from("source_references").select("kind, citation, verified").eq("lesson_id", lessonId),
    db
      .from("questions")
      .select("id, type, statement, difficulty, essential, origin, board_style, depends_on_external_source, node_id, level, recovery_of, question_options(id, label, text, sort_order)")
      .eq("lesson_id", lessonId)
      .eq("active", true)
      // Fixação em progressão: do nível 1 ao 5; recuperações depois das oficiais.
      .order("difficulty")
      .order("created_at"),
    db.from("learning_progress").select("state, reading_completed_at, passed_at, mastered_at, levels_passed").eq("lesson_id", lessonId).maybeSingle(),
    db.from("lesson_nodes").select("taught, content_nodes(id, key, marker, title, path, kind)").eq("lesson_id", lessonId),
    db.from("lessons").select("id, title, sort_order").eq("trail_id", lesson.trail_id as string).order("sort_order"),
    db.from("lesson_annotations").select("id, section_id, section_title, kind, body, resolved, updated_at").eq("lesson_id", lessonId).order("created_at", { ascending: false }),
    db.from("concept_clarifications").select("id, section_id, question, answer_markdown, verification_pending").eq("lesson_id", lessonId).order("created_at"),
    db.from("question_marks").select("question_id"),
  ]);
  const nodeList = (nodes.data ?? [])
    .map((n) => ({ taught: n.taught as boolean, ...(n.content_nodes as unknown as { id: string; key: string; marker: string | null; title: string; path: string; kind: string }) }))
    .sort((a, b) => a.key.localeCompare(b.key));
  const keyById = new Map(nodeList.map((n) => [n.id, n.key]));
  const titleById = new Map(nodeList.map((n) => [n.id, n.title]));
  return {
    lesson: lesson as unknown as {
      id: string; trail_id: string; key: string; title: string; objective: string; sort_order: number; estimated_minutes: number;
      status: LessonListItem["status"]; supplementary: Array<{ title: string; justification: string }>; verification_pending: boolean;
      unverified_claims: string[]; generation_error: string | null; generated_at: string | null;
      study_trails: { title: string; board_slug: string; other_board_name: string | null };
    },
    sections: (sections.data ?? []) as Array<{ id: string; kind: string; title: string; body_markdown: string; node_keys: string[]; verification_status: string }>,
    references: (refs.data ?? []) as Array<{ kind: string; citation: string; verified: boolean }>,
    questions: (questions.data ?? []).map((q) => {
      const row = q as unknown as {
        id: string; type: "multipla_escolha" | "certo_errado" | "situacional" | "discursiva"; statement: string; difficulty: number; essential: boolean;
        origin: string; board_style: string | null; depends_on_external_source: boolean; node_id: string;
        level: "facil" | "medio" | "dificil"; recovery_of: string | null;
        question_options: Array<{ id: string; label: string; text: string; sort_order: number }> | null;
      };
      const { question_options, ...rest } = row;
      return {
        ...rest,
        nodeKey: keyById.get(row.node_id) ?? null,
        topic: titleById.get(row.node_id) ?? null,
        options: (question_options ?? []).sort((a, b) => a.sort_order - b.sort_order),
      };
    }),
    progress: progress.data as { state: UnitState; reading_completed_at: string | null; passed_at: string | null; mastered_at: string | null; levels_passed: number } | null,
    nodes: nodeList,
    siblings: (siblings.data ?? []) as Array<{ id: string; title: string; sort_order: number }>,
    annotations: (annotations.data ?? []) as Array<{ id: string; section_id: string | null; section_title: string | null; kind: "nota" | "revisar" | "duvida"; body: string; resolved: boolean; updated_at: string }>,
    clarifications: (clarifications.data ?? []) as Array<{ id: string; section_id: string | null; question: string; answer_markdown: string; verification_pending: boolean }>,
    markedQuestionIds: (marks.data ?? []).map((m) => m.question_id as string),
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
    db.from("profiles").select("display_name, daily_questions_goal, weekly_lessons_goal, onboarding_completed, created_at").maybeSingle(),
    db.from("subscriptions").select("status, plan_id, plans(name, max_active_trails, max_trail_builds_per_month, max_lesson_generations_per_month)").maybeSingle(),
  ]);
  return { profile: p.data, subscription: s.data };
}

// ---------------------------------------------------------------------------
// Banco de questões
// ---------------------------------------------------------------------------
export interface BankFilters {
  trilha?: string;
  banca?: string;
  materia?: string;
  assunto?: string;
  dificuldade?: string;
  situacao?: "todas" | "nao_respondidas" | "erradas" | "acertadas" | "marcadas";
}

export interface BankQuestion {
  id: string;
  type: "multipla_escolha" | "certo_errado" | "situacional" | "discursiva";
  statement: string;
  difficulty: number;
  essential: boolean;
  board_style: string | null;
  depends_on_external_source: boolean;
  options: Array<{ id: string; label: string; text: string }>;
  topic: string | null;
  lessonId: string;
  lessonTitle: string;
  moduleId: string;
  moduleTitle: string;
  trailId: string;
  trailTitle: string;
  board: string;
  marked: boolean;
  history: Array<{ correct: boolean; at: string; context: string; confidence: number | null }>;
}

export async function getQuestionBank(f: BankFilters) {
  const db = await createUserClient();
  const [qs, attempts, marks, trails] = await Promise.all([
    db
      .from("questions")
      .select(
        "id, type, statement, difficulty, essential, board_style, depends_on_external_source, question_options(id, label, text, sort_order), content_nodes(title), lessons!inner(id, title, sort_order, learning_modules(id, title), study_trails!inner(id, title, board_slug, other_board_name, archived_at))",
      )
      .eq("active", true)
      .is("lessons.study_trails.archived_at", null)
      .limit(2000),
    db.from("answer_attempts").select("question_id, is_correct, created_at, context, confidence").order("created_at", { ascending: false }).limit(5000),
    db.from("question_marks").select("question_id"),
    db.from("study_trails").select("id, title, board_slug, other_board_name").is("archived_at", null).order("updated_at", { ascending: false }),
  ]);
  if (qs.error) throw new Error(qs.error.message);
  const hist = new Map<string, BankQuestion["history"]>();
  for (const a of attempts.data ?? []) {
    const list = hist.get(a.question_id as string) ?? [];
    list.push({ correct: a.is_correct as boolean, at: a.created_at as string, context: a.context as string, confidence: (a.confidence as number | null) ?? null });
    hist.set(a.question_id as string, list);
  }
  const marked = new Set((marks.data ?? []).map((m) => m.question_id as string));

  const all: BankQuestion[] = (qs.data ?? []).map((raw) => {
    const q = raw as unknown as {
      id: string; type: BankQuestion["type"]; statement: string; difficulty: number; essential: boolean; board_style: string | null;
      depends_on_external_source: boolean; question_options: Array<{ id: string; label: string; text: string; sort_order: number }> | null;
      content_nodes: { title: string } | null;
      lessons: { id: string; title: string; sort_order: number; learning_modules: { id: string; title: string } | null; study_trails: { id: string; title: string; board_slug: string; other_board_name: string | null } };
    };
    return {
      id: q.id,
      type: q.type,
      statement: q.statement,
      difficulty: q.difficulty,
      essential: q.essential,
      board_style: q.board_style,
      depends_on_external_source: q.depends_on_external_source,
      options: (q.question_options ?? []).sort((a, b) => a.sort_order - b.sort_order).map(({ id, label, text }) => ({ id, label, text })),
      topic: q.content_nodes?.title ?? null,
      lessonId: q.lessons.id,
      lessonTitle: q.lessons.title,
      moduleId: q.lessons.learning_modules?.id ?? "",
      moduleTitle: q.lessons.learning_modules?.title ?? "",
      trailId: q.lessons.study_trails.id,
      trailTitle: q.lessons.study_trails.title,
      board: q.lessons.study_trails.board_slug === "outra" ? (q.lessons.study_trails.other_board_name ?? "outra") : q.lessons.study_trails.board_slug,
      marked: marked.has(q.id),
      history: hist.get(q.id) ?? [],
    };
  });

  const norm = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const filtered = all.filter((q) => {
    if (f.trilha && q.trailId !== f.trilha) return false;
    if (f.banca && q.board !== f.banca) return false;
    if (f.materia && q.moduleId !== f.materia) return false;
    if (f.assunto && !norm(`${q.topic ?? ""} ${q.lessonTitle}`).includes(norm(f.assunto))) return false;
    if (f.dificuldade && String(q.difficulty) !== f.dificuldade) return false;
    const last = q.history[0];
    switch (f.situacao) {
      case "nao_respondidas": return !last;
      case "erradas": return !!last && !last.correct;
      case "acertadas": return !!last && last.correct;
      case "marcadas": return q.marked;
      default: return true;
    }
  });

  const modules = new Map<string, string>();
  for (const q of all) if (!f.trilha || q.trailId === f.trilha) modules.set(q.moduleId, `${q.moduleTitle}`);
  return {
    questions: filtered,
    total: all.length,
    trails: (trails.data ?? []) as Array<{ id: string; title: string; board_slug: string; other_board_name: string | null }>,
    boards: [...new Set(all.map((q) => q.board))],
    modules: [...modules.entries()].map(([id, title]) => ({ id, title })),
  };
}

// ---------------------------------------------------------------------------
// Painel: todas as métricas derivadas de dados reais
// ---------------------------------------------------------------------------
export interface ModuleProgress {
  id: string;
  title: string;
  total: number;
  studied: number;
  practiced: number;
  mastered: number;
}

/** Contagens estudado/praticado/dominado por módulo a partir da cobertura real. */
export function moduleProgress(
  plan: Awaited<ReturnType<typeof getTrailPlan>>,
  coverage: Awaited<ReturnType<typeof getCoverage>>,
): ModuleProgress[] {
  const byKey = new Map(coverage.filter((c) => c.coverage?.requires_direct_coverage).map((c) => [c.key, c.coverage]));
  return plan.map((m) => {
    const keys = new Set(m.lessons.flatMap((l) => l.nodeKeys).filter((k) => byKey.has(k)));
    let studied = 0, practiced = 0, mastered = 0;
    for (const k of keys) {
      const c = byKey.get(k)!;
      if (c.taught) studied++;
      if (c.taught && c.questions_answered > 0) practiced++;
      if (c.mastered) mastered++;
    }
    return { id: m.id, title: m.title, total: keys.size, studied, practiced, mastered };
  });
}

export async function getDashboard() {
  const db = await createUserClient();
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // segunda-feira
  weekStart.setHours(0, 0, 0, 0);

  const [profile, activity, weekLessons, lastProgress, qCount, attempted, marks] = await Promise.all([
    db.from("profiles").select("display_name, daily_questions_goal, weekly_lessons_goal, onboarding_completed").maybeSingle(),
    db.rpc("my_daily_activity", { p_days: 14 }),
    db.rpc("my_lessons_completed_since", { p_since: weekStart.toISOString() }),
    db
      .from("learning_progress")
      .select("lesson_id, trail_id, state, updated_at, lessons(title, objective, estimated_minutes, learning_modules(title)), study_trails(title, archived_at)")
      .in("state", ["em_andamento", "aula_concluida", "em_revisao", "disponivel"])
      .order("updated_at", { ascending: false })
      .limit(5),
    db.from("questions").select("id, difficulty").eq("active", true).limit(5000),
    db.from("answer_attempts").select("question_id").limit(5000),
    db.from("question_marks").select("question_id", { count: "exact", head: true }),
  ]);
  const days = ((activity.data ?? []) as Array<{ day: string; correct: number; wrong: number }>).map((d) => ({
    day: d.day,
    correct: d.correct,
    wrong: d.wrong,
  }));
  const today = days.at(-1) ?? { day: "", correct: 0, wrong: 0 };
  const continueRow = (lastProgress.data ?? []).find((r) => !(r.study_trails as unknown as { archived_at: string | null } | null)?.archived_at);
  const answeredIds = new Set((attempted.data ?? []).map((a) => a.question_id as string));
  const totalAnswered = days.reduce((s, d) => s + d.correct + d.wrong, 0);
  const totalCorrect = days.reduce((s, d) => s + d.correct, 0);

  return {
    profile: profile.data as { display_name: string | null; daily_questions_goal: number | null; weekly_lessons_goal: number | null; onboarding_completed: boolean } | null,
    days,
    today: { answered: today.correct + today.wrong, correct: today.correct },
    weekLessonsCompleted: (weekLessons.data as number | null) ?? 0,
    accuracy14d: totalAnswered ? totalCorrect / totalAnswered : null,
    answered14d: totalAnswered,
    continueLesson: continueRow
      ? {
          id: continueRow.lesson_id as string,
          trailId: continueRow.trail_id as string,
          state: continueRow.state as UnitState,
          title: (continueRow.lessons as unknown as { title: string }).title,
          objective: (continueRow.lessons as unknown as { objective: string }).objective,
          estimatedMinutes: (continueRow.lessons as unknown as { estimated_minutes: number }).estimated_minutes,
          moduleTitle: (continueRow.lessons as unknown as { learning_modules: { title: string } | null }).learning_modules?.title ?? null,
          trailTitle: (continueRow.study_trails as unknown as { title: string }).title,
        }
      : null,
    questions: (() => {
      const active = (qCount.data ?? []).map((q) => ({ id: q.id as string, difficulty: Number(q.difficulty) }));
      const open = active.filter((q) => !answeredIds.has(q.id));
      return {
        total: active.length,
        unanswered: open.length,
        marked: marks.count ?? 0,
        // Fácil = níveis 1–2, Médio = 3, Difícil = 4–5 (níveis gerados para cada tema).
        unansweredByLevel: {
          facil: open.filter((q) => q.difficulty <= 2).length,
          medio: open.filter((q) => q.difficulty === 3).length,
          dificil: open.filter((q) => q.difficulty >= 4).length,
        },
      };
    })(),
  };
}

// ---------------------------------------------------------------------------
// Desempenho (somente tentativas reais do aluno; RLS garante que são dele)
// ---------------------------------------------------------------------------
export async function getPerformance(days = 30) {
  const db = await createUserClient();
  const [attempts, activity] = await Promise.all([
    db
      .from("answer_attempts")
      .select(
        "question_id, is_correct, created_at, context, confidence, questions!inner(statement, difficulty, board_style, content_nodes(title), lessons!inner(id, title, learning_modules(id, title)))",
      )
      .order("created_at", { ascending: false })
      .limit(5000),
    db.rpc("my_daily_activity", { p_days: days }),
  ]);
  if (attempts.error) throw new Error(attempts.error.message);
  const records: AttemptRecord[] = (attempts.data ?? []).map((raw) => {
    const r = raw as unknown as {
      question_id: string; is_correct: boolean; created_at: string; context: string; confidence: number | null;
      questions: {
        statement: string; difficulty: number; board_style: string | null; content_nodes: { title: string } | null;
        lessons: { id: string; title: string; learning_modules: { id: string; title: string } | null };
      };
    };
    return {
      questionId: r.question_id,
      correct: r.is_correct,
      at: r.created_at,
      context: r.context,
      confidence: r.confidence,
      difficulty: r.questions.difficulty,
      board: r.questions.board_style,
      subjectId: r.questions.lessons.learning_modules?.id ?? r.questions.lessons.id,
      subjectTitle: r.questions.lessons.learning_modules?.title ?? r.questions.lessons.title,
      topic: r.questions.content_nodes?.title ?? null,
      lessonId: r.questions.lessons.id,
      lessonTitle: r.questions.lessons.title,
      statement: r.questions.statement,
    };
  });
  const daily = ((activity.data ?? []) as Array<{ day: string; correct: number; wrong: number }>).map((d) => ({
    day: d.day,
    correct: d.correct,
    wrong: d.wrong,
  }));
  return { summary: summarizePerformance(records), daily, truncated: (attempts.data?.length ?? 0) >= 5000 };
}

// ---------------------------------------------------------------------------
// Casco "Leveza Pastel" e nível/conquistas (todas as métricas vêm do banco)
// ---------------------------------------------------------------------------
export async function getStudyStats(): Promise<StudyStats> {
  const db = await createUserClient();
  const { data, error } = await db.rpc("my_study_stats");
  if (error) throw new Error(error.message);
  const d = (data ?? {}) as Partial<StudyStats> & { activeDays?: string[] };
  return {
    answered: Number(d.answered ?? 0),
    correct: Number(d.correct ?? 0),
    activeDays: (d.activeDays ?? []).map(String),
    maxInDay: Number(d.maxInDay ?? 0),
    themesPassed: Number(d.themesPassed ?? 0),
    themesMastered: Number(d.themesMastered ?? 0),
    modulesClosed: Number(d.modulesClosed ?? 0),
    today: String(d.today ?? new Date().toISOString().slice(0, 10)),
  };
}

export interface ShellSummary {
  name: string | null;
  email: string | null;
  streak: { current: number; last7: boolean[]; message: string };
  level: number;
  counts: { trails: number; questions: number; dueReviews: number; answered: number };
}

export async function getShellSummary(email: string | null): Promise<ShellSummary> {
  const db = await createUserClient();
  const [profile, stats, trails, questions, reviews] = await Promise.all([
    db.from("profiles").select("display_name").maybeSingle(),
    getStudyStats(),
    db.from("study_trails").select("id", { count: "exact", head: true }).is("archived_at", null),
    db.from("questions").select("id", { count: "exact", head: true }).eq("active", true),
    db.from("review_schedules").select("lesson_id", { count: "exact", head: true }).lte("due_at", new Date().toISOString()),
  ]);
  const g = computeGamification(stats);
  return {
    name: (profile.data?.display_name as string | null | undefined)?.split(" ")[0] ?? null,
    email,
    streak: { current: g.streak.current, last7: g.streak.last7, message: streakMessage(g.streak) },
    level: g.level.level,
    counts: { trails: trails.count ?? 0, questions: questions.count ?? 0, dueReviews: reviews.count ?? 0, answered: stats.answered },
  };
}

// ---------------------------------------------------------------------------
// PDFs do conteúdo (somente do próprio aluno; RLS)
// ---------------------------------------------------------------------------
export interface StudyPdfItem {
  id: string;
  pdf_version: number;
  created_at: string;
  questions: number;
}

export async function listStudyPdfs(trailId: string): Promise<StudyPdfItem[]> {
  const db = await createUserClient();
  const { data, error } = await db
    .from("study_pdfs")
    .select("id, pdf_version, created_at, question_ids")
    .eq("trail_id", trailId)
    .order("pdf_version", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id as string, pdf_version: r.pdf_version as number, created_at: r.created_at as string, questions: (r.question_ids as string[]).length }));
}
