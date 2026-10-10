/**
 * Geração de uma aula sob demanda: lesson → questions → done.
 * Só a unidade solicitada é gerada (nunca a trilha inteira de novo).
 */
import type { ExtractedNode } from "@/domain/content/extract";
import type { PlannedLesson } from "@/domain/content/plan";
import { AIError, type AIProvider } from "@/ai/provider";
import { generateLesson, generateQuestions, type Warning } from "@/ai/services";
import type { LessonOutput, QuestionsOutput } from "@/ai/schemas";
import type { DisciplineMode } from "@/ai/pedagogy";
import { SECTION_LABELS } from "@/ai/pedagogy";
import { PipelineError } from "./build-trail";
import type { GenerationRecord, Job } from "./types";

export interface LessonGenContext {
  trailId: string;
  userId: string;
  boardName: string;
  disciplineMode: DisciplineMode;
  lesson: PlannedLesson & { id: string };
  nodes: ExtractedNode[];
  previousLessonTitles: string[];
}

export type LessonStatus = "planned" | "generating" | "ready" | "failed" | "pending_validation";

export interface LessonRepo {
  getContext(lessonId: string, userId: string): Promise<LessonGenContext>;
  saveLesson(ctx: LessonGenContext, out: LessonOutput & { verificationPending: boolean }, status: LessonStatus, missing: string[]): Promise<void>;
  getLessonMarkdown(lessonId: string, userId: string): Promise<string>;
  saveQuestions(ctx: LessonGenContext, q: QuestionsOutput): Promise<number>;
  setLessonStatus(lessonId: string, userId: string, status: LessonStatus, error?: string | null): Promise<void>;
  saveJob(job: Job<LessonJobState>): Promise<void>;
  recordGeneration(rec: GenerationRecord): Promise<void>;
  log(event: string, meta: Record<string, unknown>): Promise<void>;
}

export interface LessonJobState {
  warnings?: Warning[];
  missingNodeKeys?: string[];
}

export const QUESTIONS_PER_LESSON = 6;

export function lessonToMarkdown(out: Pick<LessonOutput, "title" | "sections">): string {
  return [`# ${out.title}`, ...out.sections.map((s) => `## ${s.title || SECTION_LABELS[s.kind]}\n\n${s.bodyMarkdown}`)].join("\n\n");
}

export async function advanceLessonJob(
  job: Job<LessonJobState>,
  deps: { repo: LessonRepo; ai: AIProvider | (() => AIProvider) },
): Promise<{ job: Job<LessonJobState>; done: boolean }> {
  if (job.status === "succeeded" || job.status === "failed") return { job, done: true };
  const { repo } = deps;
  if (!job.lessonId) throw new PipelineError("Job de aula sem aula associada.", "invalid_job", false);
  const lessonId = job.lessonId;
  const next: Job<LessonJobState> = { ...job, status: "running", state: { ...job.state } };
  const stage = job.stage === "queued" ? "lesson" : job.stage;

  try {
    const ai = typeof deps.ai === "function" ? deps.ai() : deps.ai;
    const ctx = await repo.getContext(lessonId, job.userId);
    if (stage === "lesson") {
      await repo.setLessonStatus(lessonId, job.userId, "generating");
      const r = await generateLesson(ai, {
        board: ctx.boardName,
        disciplineMode: ctx.disciplineMode,
        lesson: ctx.lesson,
        nodes: ctx.nodes,
        previousLessonTitles: ctx.previousLessonTitles,
      });
      const required = ctx.nodes
        .filter((n) => ctx.lesson.nodeKeys.includes(n.key) && n.requiresDirectCoverage)
        .map((n) => n.key);
      const missing = required.filter((k) => !r.data.taughtNodeKeys.includes(k));
      await repo.saveLesson(ctx, r.data, missing.length ? "pending_validation" : "ready", missing);
      await repo.recordGeneration({ jobId: job.id, userId: job.userId, trailId: job.trailId, lessonId, task: "generate_lesson", provider: r.provider, model: r.model, usage: r.usage, warnings: r.warnings });
      next.state.warnings = [...(next.state.warnings ?? []), ...r.warnings];
      next.state.missingNodeKeys = missing;
      next.stage = "questions";
      next.progress = 60;
    } else if (stage === "questions") {
      const markdown = await repo.getLessonMarkdown(lessonId, job.userId);
      const r = await generateQuestions(ai, {
        board: ctx.boardName,
        lesson: ctx.lesson,
        lessonMarkdown: markdown,
        nodes: ctx.nodes,
        count: QUESTIONS_PER_LESSON,
      });
      const saved = await repo.saveQuestions(ctx, r.data);
      await repo.recordGeneration({ jobId: job.id, userId: job.userId, trailId: job.trailId, lessonId, task: "generate_questions", provider: r.provider, model: r.model, usage: r.usage, warnings: r.warnings });
      next.state.warnings = [...(next.state.warnings ?? []), ...r.warnings];
      if (saved === 0) {
        throw new PipelineError("Nenhuma questão válida foi gerada para esta aula.", "no_valid_questions", true);
      }
      next.stage = "done";
      next.status = "succeeded";
      next.progress = 100;
      await repo.log("lesson.generated", { jobId: job.id, lessonId, questions: saved, missing: next.state.missingNodeKeys?.length ?? 0 });
    }
    next.attempts = 0;
    next.errorCode = null;
    next.errorMessage = null;
  } catch (err) {
    const { code, message, retryable } =
      err instanceof AIError
        ? { code: `ai_${err.kind}`, message: err.message, retryable: err.retryable }
        : err instanceof PipelineError
          ? { code: err.code, message: err.message, retryable: err.retryable }
          : { code: "internal_error", message: "Erro interno ao gerar a aula.", retryable: true };
    const attempts = job.attempts + 1;
    const failed: Job<LessonJobState> = {
      ...next,
      attempts,
      errorCode: code,
      errorMessage: message,
      status: retryable && attempts < job.maxAttempts ? "running" : "failed",
    };
    await repo.saveJob(failed);
    await repo.log("lesson.step_failed", { jobId: job.id, stage, code, attempts });
    // Se a aula já foi salva e só as questões falharam, a aula continua disponível.
    if (failed.status === "failed" && stage === "lesson") {
      await repo.setLessonStatus(lessonId, job.userId, "failed", message);
    }
    return { job: failed, done: failed.status === "failed" };
  }

  await repo.saveJob(next);
  return { job: next, done: next.status === "succeeded" };
}
