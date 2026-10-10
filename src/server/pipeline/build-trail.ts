/**
 * Pipeline de construção de trilha (seções 4.D e 5), executado em PASSOS CURTOS.
 * Cada chamada de `advanceBuild` executa no máximo uma etapa ou um bloco de IA e
 * persiste o estado — permite retomar após falha, recarga de página ou timeout.
 *
 * extract (determinístico) → analyze (IA, por bloco) → plan (IA, por bloco)
 *   → audit (determinístico: mescla, corrige o seguro, audita) → done
 */
import { extractStructure } from "@/domain/content/extract";
import { auditPlan, autoRepairPlan } from "@/domain/content/audit";
import type { LessonPlan } from "@/domain/content/plan";
import { AIError, type AIProvider } from "@/ai/provider";
import { analyzeChunk, chunkNodes, planChunk } from "@/ai/services";
import { DISCIPLINE_MODES, type DisciplineMode } from "@/ai/pedagogy";
import type { BuildRepo, BuildStage, BuildState, Job } from "./types";

export interface StepResult {
  job: Job;
  done: boolean;
}

const PROGRESS: Record<BuildStage, [number, number]> = {
  extract: [0, 10],
  analyze: [10, 45],
  plan: [45, 88],
  audit: [88, 99],
  done: [100, 100],
};

export const STAGE_LABELS: Record<string, string> = {
  queued: "Na fila",
  extract: "Lendo e estruturando o conteúdo",
  analyze: "Analisando tópicos e pré-requisitos",
  plan: "Planejando módulos e aulas",
  audit: "Auditando a cobertura",
  done: "Trilha pronta para conferência",
};

export async function advanceBuild(
  job: Job,
  deps: { repo: BuildRepo; ai: AIProvider | (() => AIProvider) },
): Promise<StepResult> {
  if (job.status === "succeeded") return { job, done: true };
  if (job.status === "failed") return { job, done: true };

  const { repo } = deps;
  const getAI = () => (typeof deps.ai === "function" ? deps.ai() : deps.ai);
  const trail = await repo.getTrail(job.trailId, job.userId);
  const next: Job = { ...job, status: "running", state: { ...job.state } };
  const state = next.state as BuildState;
  const stage = (job.stage === "queued" ? "extract" : job.stage) as BuildStage;

  try {
    if (job.status === "queued") await repo.setTrailStatus(trail.id, trail.userId, "processing");
    switch (stage) {
      case "extract": {
        const ex = extractStructure(trail.normalizedText);
        if (ex.nodes.length === 0) {
          throw new PipelineError("Não foi possível identificar nenhum tópico no conteúdo informado.", "empty_content", false);
        }
        await repo.replaceNodes(trail, ex.nodes);
        state.chunks = chunkNodes(ex.nodes).map((c) => c.map((n) => n.key));
        state.unassigned = ex.unassigned;
        state.chunkIndex = 0;
        state.analyses = [];
        state.plans = [];
        state.warnings = [];
        next.stage = "analyze";
        next.progress = PROGRESS.extract[1];
        await repo.log("build.extracted", { jobId: job.id, nodes: ex.nodes.length, chunks: state.chunks.length });
        break;
      }

      case "analyze":
      case "plan": {
        const nodes = await repo.getNodes(trail);
        const byKey = new Map(nodes.map((n) => [n.key, n]));
        const chunks = state.chunks ?? [];
        const i = state.chunkIndex ?? 0;
        const chunk = (chunks[i] ?? []).map((k) => byKey.get(k)).filter((n): n is NonNullable<typeof n> => !!n);
        const ai = getAI();

        if (stage === "analyze") {
          const r = await analyzeChunk(ai, chunk, { board: trail.boardName, contentType: trail.contentType });
          state.analyses = [...(state.analyses ?? []), r.data];
          state.warnings = [...(state.warnings ?? []), ...r.warnings];
          await repo.recordGeneration({ jobId: job.id, userId: job.userId, trailId: trail.id, task: "analyze_content", provider: r.provider, model: r.model, usage: r.usage, warnings: r.warnings, output: r.data });
        } else {
          const r = await planChunk(ai, chunk, { board: trail.boardName, chunkIndex: i + 1, analysis: state.analyses?.[i] });
          state.plans = [...(state.plans ?? []), r.data];
          state.warnings = [...(state.warnings ?? []), ...r.warnings];
          await repo.recordGeneration({ jobId: job.id, userId: job.userId, trailId: trail.id, task: "plan_lessons", provider: r.provider, model: r.model, usage: r.usage, warnings: r.warnings, output: r.data });
        }

        const [lo, hi] = PROGRESS[stage];
        if (i + 1 < chunks.length) {
          state.chunkIndex = i + 1;
          next.progress = Math.round(lo + ((hi - lo) * (i + 1)) / chunks.length);
        } else {
          state.chunkIndex = 0;
          next.stage = stage === "analyze" ? "plan" : "audit";
          next.progress = hi;
        }
        break;
      }

      case "audit": {
        const nodes = await repo.getNodes(trail);
        const merged: LessonPlan = { modules: (state.plans ?? []).flatMap((p) => p.modules) };
        const { plan, repairs } = autoRepairPlan(merged, nodes);
        const audit = auditPlan({
          normalizedText: trail.normalizedText,
          nodes,
          unassigned: state.unassigned ?? [],
          plan,
        });
        const analyses = state.analyses ?? [];
        const modeVotes = new Map<string, number>();
        for (const a of analyses) modeVotes.set(a.disciplineMode, (modeVotes.get(a.disciplineMode) ?? 0) + a.nodes.length);
        const disciplineMode =
          [...modeVotes.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "outra";
        await repo.persistPlan(trail, {
          plan,
          analysis: analyses.flatMap((a) => a.nodes),
          disciplineMode: (DISCIPLINE_MODES as readonly string[]).includes(disciplineMode) ? (disciplineMode as DisciplineMode) : "outra",
          audit,
          repairs,
          ambiguities: analyses.flatMap((a) => a.ambiguities),
        });
        await repo.setTrailStatus(trail.id, trail.userId, "review");
        next.stage = "done";
        next.status = "succeeded";
        next.progress = 100;
        next.errorCode = null;
        next.errorMessage = null;
        await repo.log("build.completed", {
          jobId: job.id,
          errors: audit.summary.errors,
          warnings: audit.summary.warnings,
          repairs: repairs.length,
        });
        break;
      }

      case "done":
        next.status = "succeeded";
        break;
    }
    next.attempts = 0;
    next.errorCode = next.status === "succeeded" ? null : next.errorCode;
    if (next.status === "running") {
      next.errorCode = null;
      next.errorMessage = null;
    }
  } catch (err) {
    return handleFailure(next, err, repo);
  }

  await repo.saveJob(next);
  return { job: next, done: next.status === "succeeded" };
}

export class PipelineError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = "PipelineError";
  }
}

async function handleFailure(job: Job, err: unknown, repo: BuildRepo): Promise<StepResult> {
  const { code, message, retryable } =
    err instanceof AIError
      ? { code: `ai_${err.kind}`, message: err.message, retryable: err.retryable }
      : err instanceof PipelineError
        ? { code: err.code, message: err.message, retryable: err.retryable }
        : { code: "internal_error", message: "Erro interno durante o processamento.", retryable: true };

  const attempts = job.attempts + 1;
  const failed: Job = {
    ...job,
    attempts,
    errorCode: code,
    errorMessage: message,
    // Mantém stage e state: a nova tentativa retoma do mesmo ponto.
    status: retryable && attempts < job.maxAttempts ? "running" : "failed",
  };
  await repo.saveJob(failed);
  await repo.log("build.step_failed", { jobId: job.id, stage: job.stage, code, attempts, final: failed.status === "failed" });
  if (failed.status === "failed") await repo.setTrailStatus(job.trailId, job.userId, "failed");
  return { job: failed, done: failed.status === "failed" };
}

/** Prepara um job que falhou para ser retomado do mesmo estágio. */
export function resumeFailedJob(job: Job): Job {
  if (job.status !== "failed") return job;
  return { ...job, status: "queued", attempts: 0, errorCode: null, errorMessage: null };
}
