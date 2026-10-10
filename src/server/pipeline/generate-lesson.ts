/**
 * Geração de uma aula sob demanda: lesson → [sections] → questions → done.
 * "sections" só roda quando faltou alguma forma de ensino obrigatória: gera apenas
 * as seções ausentes (a aula não é reescrita).
 * Só a unidade solicitada é gerada (nunca a trilha inteira de novo).
 */
import type { ExtractedNode } from "@/domain/content/extract";
import type { PlannedLesson } from "@/domain/content/plan";
import { AIError, type AIProvider } from "@/ai/provider";
import { completeLessonSections, generateLesson, generateQuestions, questionCountFor, type Warning } from "@/ai/services";
import type { LessonOutput, QuestionsOutput } from "@/ai/schemas";
import type { DisciplineMode, LessonSectionKind } from "@/ai/pedagogy";
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
  /** append=false substitui as questões ativas do tema; append=true acrescenta. */
  saveQuestions(ctx: LessonGenContext, q: QuestionsOutput, append?: boolean): Promise<number>;
  setLessonStatus(lessonId: string, userId: string, status: LessonStatus, error?: string | null): Promise<void>;
  saveJob(job: Job<LessonJobState>): Promise<void>;
  recordGeneration(rec: GenerationRecord): Promise<void>;
  log(event: string, meta: Record<string, unknown>): Promise<void>;
}

export interface LessonJobState {
  warnings?: Warning[];
  missingNodeKeys?: string[];
  /** Formas de ensino obrigatórias que ainda faltam na aula. */
  missingKinds?: LessonSectionKind[];
  /** Rascunho da aula, mantido só enquanto as seções ausentes são geradas. */
  draft?: LessonOutput;
  /** Níveis de dificuldade (1–5) e itens que ainda não têm questão. */
  questionGaps?: { missingLevels: number[]; uncoveredNodeKeys: string[] };
  /** Enunciados já gravados (para a rodada complementar não repetir). */
  savedStatements?: string[];
}


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
    const lessonCtx = {
      board: ctx.boardName,
      disciplineMode: ctx.disciplineMode,
      lesson: ctx.lesson,
      nodes: ctx.nodes,
      previousLessonTitles: ctx.previousLessonTitles,
    };
    const requiredNodes = ctx.nodes
      .filter((n) => ctx.lesson.nodeKeys.includes(n.key) && n.requiresDirectCoverage)
      .map((n) => n.key);
    if (stage === "lesson" || stage === "sections") {
      if (stage === "lesson") await repo.setLessonStatus(lessonId, job.userId, "generating");
      const draft = job.state.draft;
      const r =
        stage === "sections" && draft
          ? await completeLessonSections(ai, lessonCtx, draft, job.state.missingKinds ?? [])
          : await generateLesson(ai, lessonCtx);
      const missingNodes = requiredNodes.filter((k) => !r.data.taughtNodeKeys.includes(k));
      const { missingKinds, ...lesson } = r.data;
      // Uma única rodada de complemento; se ainda faltar algo, a aula fica pendente de validação.
      const retrySections = stage === "lesson" && missingKinds.length > 0;
      const pending = missingNodes.length > 0 || missingKinds.length > 0;
      await repo.saveLesson(ctx, lesson, pending ? "pending_validation" : "ready", [
        ...missingNodes,
        ...missingKinds.map((k) => `secao:${k}`),
      ]);
      await repo.recordGeneration({ jobId: job.id, userId: job.userId, trailId: job.trailId, lessonId, task: "generate_lesson", provider: r.provider, model: r.model, usage: r.usage, warnings: r.warnings });
      next.state.warnings = [...(next.state.warnings ?? []), ...r.warnings];
      next.state.missingNodeKeys = missingNodes;
      next.state.missingKinds = missingKinds;
      if (retrySections) {
        next.state.draft = lesson;
        next.stage = "sections";
        next.progress = 45;
      } else {
        delete next.state.draft;
        next.stage = "questions";
        next.progress = 70;
      }
    } else if (stage === "questions" || stage === "questions_extra") {
      const extra = stage === "questions_extra";
      const gaps = job.state.questionGaps;
      const markdown = await repo.getLessonMarkdown(lessonId, job.userId);
      const scopeSize = requiredNodes.length;
      const r = await generateQuestions(ai, {
        board: ctx.boardName,
        lesson: ctx.lesson,
        lessonMarkdown: markdown,
        nodes: ctx.nodes,
        count: extra && gaps
          ? Math.min(15, Math.max(gaps.missingLevels.length, gaps.uncoveredNodeKeys.length, 1))
          : questionCountFor(scopeSize),
        focus: extra && gaps ? { ...gaps, existingStatements: job.state.savedStatements ?? [] } : undefined,
      });
      const saved = await repo.saveQuestions(ctx, r.data, extra);
      await repo.recordGeneration({ jobId: job.id, userId: job.userId, trailId: job.trailId, lessonId, task: "generate_questions", provider: r.provider, model: r.model, usage: r.usage, warnings: r.warnings });
      next.state.warnings = [...(next.state.warnings ?? []), ...r.warnings];
      if (!extra && saved === 0) {
        throw new PipelineError("Nenhuma questão válida foi gerada para esta aula.", "no_valid_questions", true);
      }
      if (!extra && (r.gaps.missingLevels.length || r.gaps.uncoveredNodeKeys.length)) {
        // Uma rodada complementar só com os níveis/itens que faltaram.
        next.state.questionGaps = r.gaps;
        next.state.savedStatements = r.data.questions.map((q) => q.statement);
        next.stage = "questions_extra";
        next.progress = 85;
      } else {
        if (extra && gaps) {
          const levels = new Set(r.data.questions.map((q) => q.difficulty));
          const nodes = new Set(r.data.questions.map((q) => q.nodeKey));
          next.state.questionGaps = {
            missingLevels: gaps.missingLevels.filter((l) => !levels.has(l)),
            uncoveredNodeKeys: gaps.uncoveredNodeKeys.filter((k) => !nodes.has(k)),
          };
        } else {
          next.state.questionGaps = r.gaps;
        }
        delete next.state.savedStatements;
        next.stage = "done";
        next.status = "succeeded";
        next.progress = 100;
        await repo.log("lesson.generated", {
          jobId: job.id,
          lessonId,
          questions: saved,
          missing: next.state.missingNodeKeys?.length ?? 0,
          missingKinds: next.state.missingKinds?.length ?? 0,
          missingLevels: next.state.questionGaps.missingLevels.length,
        });
      }
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
