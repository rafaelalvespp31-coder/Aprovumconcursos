import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDisciplines } from "../services/disciplines";
import type { ExtractedNode } from "@/domain/content/extract";
import { boardDisplayName, type ExamBoardSlug } from "@/domain/trail-input";
import type { DisciplineMode } from "@/ai/pedagogy";
import type { ScopeRecord, BuildRepo, FinalizedPlan, GenerationRecord, Job, TrailInfo } from "../pipeline/types";
import type { LevelKey } from "@/domain/progress/levels";
import type { LessonGenContext, LessonJobState, LessonRepo, LessonStatus } from "../pipeline/generate-lesson";
import { lessonToMarkdown } from "../pipeline/generate-lesson";
import { lessonPayload, nodesPayload, planPayload, questionsPayload, rowsToNodes, NODE_COLUMNS, type NodeRow } from "./payloads";
import { logEvent } from "../observability";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>;

/** Sem tipos gerados do Supabase, as linhas são tipadas como Row na fronteira do repositório. */
function must<T = Row>(res: { data: unknown; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Falha ao ${what}: ${res.error.message}`);
  if (res.data === null) throw new Error(`Falha ao ${what}: sem dados.`);
  return res.data as T;
}

export interface JobRow {
  id: string;
  user_id: string;
  trail_id: string;
  lesson_id: string | null;
  kind: "build_trail" | "generate_lesson";
  stage: string;
  status: Job["status"];
  progress: number;
  attempts: number;
  max_attempts: number;
  error_code: string | null;
  error_message: string | null;
  state: Record<string, unknown>;
}

export const JOB_COLUMNS =
  "id, user_id, trail_id, lesson_id, kind, stage, status, progress, attempts, max_attempts, error_code, error_message, state";

export function rowToJob<S>(r: JobRow): Job<S> {
  return {
    id: r.id,
    userId: r.user_id,
    trailId: r.trail_id,
    lessonId: r.lesson_id,
    kind: r.kind,
    stage: r.stage,
    status: r.status,
    progress: r.progress,
    attempts: r.attempts,
    maxAttempts: r.max_attempts,
    errorCode: r.error_code,
    errorMessage: r.error_message,
    state: r.state as S,
  };
}

async function saveJobRow(db: SupabaseClient, job: Job<unknown>) {
  const finished = job.status === "succeeded" || job.status === "failed";
  const res = await db
    .from("ai_generation_jobs")
    .update({
      stage: job.stage,
      status: job.status,
      progress: job.progress,
      attempts: job.attempts,
      error_code: job.errorCode,
      error_message: job.errorMessage,
      state: job.state,
      locked_until: null, // libera o lease ao fim de cada passo
      finished_at: finished ? new Date().toISOString() : null,
    })
    .eq("id", job.id)
    .eq("user_id", job.userId);
  if (res.error) throw new Error(`Falha ao salvar job: ${res.error.message}`);
}

async function recordGenerationRow(db: SupabaseClient, rec: GenerationRecord) {
  const r = await db.from("ai_generation_versions").insert({
    user_id: rec.userId,
    job_id: rec.jobId,
    trail_id: rec.trailId,
    lesson_id: rec.lessonId ?? null,
    task: rec.task,
    provider: rec.provider,
    model: rec.model,
    input_tokens: rec.usage.inputTokens,
    output_tokens: rec.usage.outputTokens,
    cost_usd: rec.usage.estimatedCostUsd,
    latency_ms: rec.latencyMs ?? null,
    warnings: rec.warnings,
    output: rec.output ?? null,
  });
  if (r.error) await logEvent("generation.record_failed", { task: rec.task, error: r.error.message });
}

/** Custos e tokens ficam em ai_generation_versions; cotas usam apenas usage_events (consume_quota). */
export async function loadTrailInfo(db: SupabaseClient, trailId: string, userId: string): Promise<TrailInfo & { disciplineMode: string | null; board: ExamBoardSlug; otherBoard: string | null }> {
  const t = must(
    await db
      .from("study_trails")
      .select("id, user_id, board_slug, other_board_name, content_type, discipline_mode, scope_outline, scope_answer, scope_summary")
      .eq("id", trailId)
      .eq("user_id", userId)
      .single(),
    "carregar trilha",
  );
  const v = must(
    await db
      .from("source_document_versions")
      .select("id, normalized_text, source_documents!inner(trail_id)")
      .eq("source_documents.trail_id", trailId)
      .eq("user_id", userId)
      .order("version", { ascending: false })
      .limit(1)
      .single(),
    "carregar conteúdo de origem",
  );
  return {
    id: t.id,
    userId: t.user_id,
    board: t.board_slug,
    otherBoard: t.other_board_name,
    boardName: boardDisplayName(t.board_slug, t.other_board_name),
    contentType: t.content_type,
    versionId: v.id,
    normalizedText: composeScopedText(v.normalized_text, t.scope_outline),
    sourceLength: v.normalized_text.length,
    scopeAnswer: t.scope_answer,
    scopeLegal: !!(t.scope_summary as { isLegal?: boolean } | null)?.isLegal,
    scopeDone: t.scope_summary !== null,
    disciplineMode: t.discipline_mode,
  };
}

/** Texto do aluno + roteiro de subtemas da IA (separado por linha em branco). */
export function composeScopedText(source: string, outline: string | null | undefined): string {
  return outline ? `${source}\n\n${outline}` : source;
}

async function loadNodes(db: SupabaseClient, trailId: string, userId: string): Promise<ExtractedNode[]> {
  const rows = must(
    await db.from("content_nodes").select(NODE_COLUMNS).eq("trail_id", trailId).eq("user_id", userId).order("sort_order"),
    "carregar mapa de cobertura",
  );
  return rowsToNodes(rows as unknown as NodeRow[]);
}

export class SupabaseBuildRepo implements BuildRepo {
  constructor(private db: SupabaseClient) {}

  getTrail(trailId: string, userId: string) {
    return loadTrailInfo(this.db, trailId, userId);
  }
  async replaceNodes(trail: TrailInfo, nodes: ExtractedNode[]) {
    const r = await this.db.rpc("replace_trail_nodes", {
      p_trail: trail.id,
      p_user: trail.userId,
      p_version: trail.versionId,
      p_nodes: nodesPayload(nodes, { sourceLength: trail.sourceLength, legal: trail.scopeLegal }),
    });
    if (r.error) throw new Error(`Falha ao gravar mapa: ${r.error.message}`);
  }
  getNodes(trail: TrailInfo) {
    return loadNodes(this.db, trail.id, trail.userId);
  }
  saveJob(job: Job) {
    return saveJobRow(this.db, job);
  }
  recordGeneration(rec: GenerationRecord) {
    return recordGenerationRow(this.db, rec);
  }
  async persistPlan(trail: TrailInfo, result: FinalizedPlan) {
    const r = await this.db.rpc("persist_trail_plan", { p_trail: trail.id, p_user: trail.userId, p_payload: planPayload(result) });
    if (r.error) throw new Error(`Falha ao gravar plano: ${r.error.message}`);
  }
  async setTrailStatus(trailId: string, userId: string, status: "processing" | "clarification" | "review" | "failed") {
    await this.db.from("study_trails").update({ status }).eq("id", trailId).eq("user_id", userId);
  }
  async saveScope(trail: TrailInfo, scope: ScopeRecord) {
    const patch: Record<string, unknown> = {};
    if (scope.summary !== undefined) patch.scope_summary = scope.summary;
    if (scope.outline !== undefined) patch.scope_outline = scope.outline;
    if (scope.question !== undefined) patch.scope_question = scope.question;
    const r = await this.db.from("study_trails").update(patch).eq("id", trail.id).eq("user_id", trail.userId);
    if (r.error) throw new Error(`Falha ao gravar escopo: ${r.error.message}`);
  }
  log(event: string, meta: Record<string, unknown>) {
    return logEvent(event, meta);
  }
}

export class SupabaseLessonRepo implements LessonRepo {
  constructor(private db: SupabaseClient) {}

  async getContext(lessonId: string, userId: string): Promise<LessonGenContext> {
    await ensureDisciplines();
    const l = must(
      await this.db
        .from("lessons")
        .select("id, trail_id, key, title, objective, sort_order, estimated_minutes, supplementary, lesson_nodes(content_nodes(key))")
        .eq("id", lessonId)
        .eq("user_id", userId)
        .single(),
      "carregar aula",
    );
    const trail = await loadTrailInfo(this.db, l.trail_id, userId);
    const nodes = await loadNodes(this.db, l.trail_id, userId);
    const prev = await this.db
      .from("lessons")
      .select("title")
      .eq("trail_id", l.trail_id)
      .lt("sort_order", l.sort_order)
      .order("sort_order");
    const nodeKeys = (l.lesson_nodes as Array<{ content_nodes: { key: string } | null }>)
      .map((x) => x.content_nodes?.key)
      .filter((k): k is string => !!k);
    return {
      trailId: l.trail_id,
      userId,
      boardName: trail.boardName,
      disciplineMode: (trail.disciplineMode ?? "outra") as DisciplineMode,
      nodes,
      previousLessonTitles: (prev.data ?? []).map((p) => p.title as string),
      lesson: {
        id: l.id,
        key: l.key,
        title: l.title,
        objective: l.objective,
        nodeKeys,
        supplementary: l.supplementary ?? [],
        prerequisiteLessonKeys: [],
        estimatedMinutes: l.estimated_minutes,
      },
    };
  }

  async saveLesson(ctx: LessonGenContext, out: Parameters<LessonRepo["saveLesson"]>[1], status: LessonStatus) {
    const r = await this.db.rpc("save_lesson_content", { p_lesson: ctx.lesson.id, p_user: ctx.userId, p_payload: lessonPayload(out, status) });
    if (r.error) throw new Error(`Falha ao gravar aula: ${r.error.message}`);
  }

  async getLessonMarkdown(lessonId: string, userId: string) {
    const l = must(await this.db.from("lessons").select("title").eq("id", lessonId).eq("user_id", userId).single(), "carregar aula");
    const s = must<Row[]>(
      await this.db.from("lesson_sections").select("kind, title, body_markdown").eq("lesson_id", lessonId).order("sort_order"),
      "carregar seções",
    );
    return lessonToMarkdown({
      title: l.title,
      sections: s.map((x) => ({ kind: x.kind, title: x.title, bodyMarkdown: x.body_markdown, nodeKeys: [] })),
    });
  }

  async saveQuestions(ctx: LessonGenContext, q: Parameters<LessonRepo["saveQuestions"]>[1], append = false, level?: LevelKey) {
    const r = await this.db.rpc("save_lesson_questions", {
      p_lesson: ctx.lesson.id,
      p_user: ctx.userId,
      p_board: ctx.boardName,
      p_questions: questionsPayload(q),
      p_append: append,
      p_level: level ?? null,
    });
    if (r.error) throw new Error(`Falha ao gravar questões: ${r.error.message}`);
    return r.data as number;
  }

  async setLessonStatus(lessonId: string, userId: string, status: LessonStatus, error: string | null = null) {
    await this.db.from("lessons").update({ status, generation_error: error }).eq("id", lessonId).eq("user_id", userId);
  }
  saveJob(job: Job<LessonJobState>) {
    return saveJobRow(this.db, job);
  }
  recordGeneration(rec: GenerationRecord) {
    return recordGenerationRow(this.db, rec);
  }
  log(event: string, meta: Record<string, unknown>) {
    return logEvent(event, meta);
  }
}
