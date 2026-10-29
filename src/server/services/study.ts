import "server-only";
import { z } from "zod";
import { assertLesson } from "./plans";
import {
  DEFAULT_CRITERIA,
  transition,
  type MasteryCriteria,
  type QuizOutcome,
  type UnitEvent,
  type UnitProgress,
  type UnitState,
} from "@/domain/progress/state-machine";
import { DEFAULT_REVIEW_CONFIG, initialReviewState, scheduleNext } from "@/domain/progress/review";
import { levelByKey, levelByNumber, type LevelKey } from "@/domain/progress/levels";
import { createAdminClient } from "../supabase";
import { UserFacingError, enforceRateLimit } from "./trails";

interface ProgressRow {
  state: UnitState;
  resume_state: UnitState | null;
  reading_completed_at: string | null;
  passed_at: string | null;
  mastered_at: string | null;
  levels_passed: number | null;
  trail_id: string;
}

const d = (v: string | null) => (v ? new Date(v) : null);

async function loadProgress(userId: string, lessonId: string) {
  const db = createAdminClient();
  const r = await db
    .from("learning_progress")
    .select("state, resume_state, reading_completed_at, passed_at, mastered_at, levels_passed, trail_id")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  if (r.error) throw new Error(r.error.message);
  if (!r.data) throw new UserFacingError("Esta aula ainda não foi liberada na sua trilha.", "not_unlocked");
  const row = r.data as ProgressRow;
  const progress: UnitProgress = {
    state: row.state,
    resumeState: row.resume_state,
    readingCompletedAt: d(row.reading_completed_at),
    passedAt: d(row.passed_at),
    masteredAt: d(row.mastered_at),
    levelsPassed: row.levels_passed ?? 0,
  };
  return { progress, trailId: row.trail_id };
}

async function criteriaFor(trailId: string, userId: string): Promise<MasteryCriteria> {
  const db = createAdminClient();
  const r = await db.from("study_trails").select("mastery_criteria").eq("id", trailId).eq("user_id", userId).single();
  return { ...DEFAULT_CRITERIA, ...((r.data?.mastery_criteria as Partial<MasteryCriteria> | null) ?? {}) };
}

/** Aplica um evento à máquina de estados e persiste (com histórico de evidências). */
async function apply(userId: string, lessonId: string, event: UnitEvent) {
  const db = createAdminClient();
  const { progress, trailId } = await loadProgress(userId, lessonId);
  const criteria = await criteriaFor(trailId, userId);
  const t = transition(progress, event, criteria);
  const p = t.progress;
  const up = await db
    .from("learning_progress")
    .update({
      state: p.state,
      resume_state: p.resumeState,
      reading_completed_at: p.readingCompletedAt?.toISOString() ?? null,
      passed_at: p.passedAt?.toISOString() ?? null,
      mastered_at: p.masteredAt?.toISOString() ?? null,
      levels_passed: p.levelsPassed,
    })
    .eq("user_id", userId)
    .eq("lesson_id", lessonId);
  if (up.error) throw new Error(up.error.message);

  if (progress.state !== p.state || progress.levelsPassed !== p.levelsPassed) {
    await db.from("mastery_records").insert({
      user_id: userId,
      lesson_id: lessonId,
      from_state: progress.state,
      to_state: p.state,
      evidence:
        "outcome" in event
          ? { event: event.type, ...event.outcome, ...("level" in event && event.level ? { level: event.level } : {}), levelsPassed: p.levelsPassed }
          : { event: event.type },
    });
  }
  if (t.unlocksNext) await unlockNext(userId, trailId, lessonId);
  await db.from("study_trails").update({ last_studied_at: new Date().toISOString() }).eq("id", trailId).eq("user_id", userId);
  return { ...t, trailId };
}

async function unlockNext(userId: string, trailId: string, lessonId: string) {
  const db = createAdminClient();
  const cur = await db.from("lessons").select("sort_order").eq("id", lessonId).eq("user_id", userId).single();
  if (cur.error) return;
  const next = await db
    .from("lessons")
    .select("id")
    .eq("trail_id", trailId)
    .eq("user_id", userId)
    .gt("sort_order", cur.data.sort_order)
    .order("sort_order")
    .limit(1)
    .maybeSingle();
  if (!next.data) return;
  await db
    .from("learning_progress")
    .update({ state: "disponivel" })
    .eq("user_id", userId)
    .eq("lesson_id", next.data.id)
    .eq("state", "nao_iniciada");
}

export async function startLesson(userId: string, lessonId: string) {
  const { progress } = await loadProgress(userId, lessonId);
  if (progress.state === "nao_iniciada") {
    throw new UserFacingError("Conclua a aula anterior para liberar esta. Você pode revisar as aulas já liberadas a qualquer momento.", "locked");
  }
  if (progress.state === "disponivel") return apply(userId, lessonId, { type: "START" });
  return null;
}

export async function completeReading(userId: string, lessonId: string) {
  return apply(userId, lessonId, { type: "COMPLETE_READING" });
}

const answerSchema = z.object({
  questionId: z.uuid(),
  optionId: z.uuid().optional(),
  answerTrue: z.boolean().optional(),
  context: z.enum(["fixacao", "revisao", "simulado"]).default("fixacao"),
  /** Confiança declarada (1 baixa, 2 média, 3 alta). Registrada, mas nunca usada como prova de domínio. */
  confidence: z.number().int().min(1).max(3).optional(),
  seconds: z.number().int().min(0).max(86_400).optional(),
});

export interface AnswerFeedback {
  correct: boolean;
  justification: string;
  correctAnswerTrue: boolean | null;
  options: Array<{ id: string; label: string; isCorrect: boolean; explanation: string }>;
  attempts?: number;
}

/** Correção determinística no banco; o gabarito só sai daqui após a resposta. */
export async function submitAnswer(userId: string, input: unknown): Promise<AnswerFeedback> {
  const a = answerSchema.parse(input);
  if (!a.optionId && a.answerTrue === undefined) throw new UserFacingError("Selecione uma resposta.", "invalid_input");
  await enforceRateLimit(userId, "answer", 120);
  const db = createAdminClient();
  // Plano gratuito: responder as questões de uma aula conta como estudar aquela aula no dia.
  const { data: q } = await db.from("questions").select("lesson_id").eq("id", a.questionId).eq("user_id", userId).maybeSingle();
  if (q?.lesson_id) await assertLesson(userId, q.lesson_id as string);
  const r = await db.rpc("submit_answer", {
    p_user: userId,
    p_question: a.questionId,
    p_option: a.optionId ?? null,
    p_bool: a.answerTrue ?? null,
    p_context: a.context,
    p_confidence: a.confidence ?? null,
    p_seconds: a.seconds ?? null,
  });
  if (r.error) {
    if (r.error.code === "P0002" || r.error.code === "22023") throw new UserFacingError("Resposta inválida para esta questão.", "invalid_answer");
    throw new Error(r.error.message);
  }
  return r.data as AnswerFeedback;
}

/**
 * Avalia um nível (fixação) ou a revisão espaçada e atualiza progresso e revisão.
 * Na fixação, o nível avaliado é sempre o próximo a aprovar.
 */
export async function evaluateLessonQuiz(userId: string, lessonId: string, context: "fixacao" | "revisao", levelKey?: LevelKey) {
  const db = createAdminClient();
  let { progress } = await loadProgress(userId, lessonId);
  // Chegar às questões de fixação e pedir o resultado conclui a leitura: antes, a leitura só
  // era marcada ao concluir todos os cards no MESMO aparelho (lista guardada no navegador),
  // e quem pulava um card ou trocava de aparelho ficava sem conseguir concluir a matéria.
  if (context === "fixacao" && !progress.readingCompletedAt && progress.state !== "nao_iniciada") {
    await apply(userId, lessonId, { type: "COMPLETE_READING" });
    ({ progress } = await loadProgress(userId, lessonId));
  }
  const level = levelKey ? levelByKey(levelKey) : levelByNumber(Math.min(3, (progress.levelsPassed ?? 0) + 1))!;
  const o =
    context === "revisao"
      ? await db.rpc("lesson_quiz_outcome", { p_user: userId, p_lesson: lessonId, p_context: context })
      : await db.rpc("lesson_level_outcome", { p_user: userId, p_lesson: lessonId, p_level: level.key, p_context: "fixacao" });
  if (o.error) throw new Error(o.error.message);
  const outcome = o.data as QuizOutcome;
  const now = new Date();
  const result = await apply(
    userId,
    lessonId,
    context === "revisao" ? { type: "REVIEW_EVALUATED", outcome, at: now } : { type: "QUIZ_EVALUATED", outcome, at: now, level: level.n },
  );
  // A revisão espaçada só começa quando a unidade passa nos três níveis.
  if (context === "fixacao" && result.progress.levelsPassed < 3) {
    return { ...result, outcome, level: level.key, nextReviewAt: null as Date | null };
  }

  // Agenda/atualiza a revisão espaçada.
  const accuracy = outcome.answered ? outcome.correct / outcome.answered : 0;
  const existing = await db
    .from("review_schedules")
    .select("step, ease, lapses, attempts, last_reviewed_at, due_at")
    .eq("user_id", userId)
    .eq("lesson_id", lessonId)
    .maybeSingle();
  const base = existing.data
    ? {
        step: existing.data.step,
        ease: Number(existing.data.ease),
        lapses: existing.data.lapses,
        attempts: existing.data.attempts,
        lastReviewedAt: d(existing.data.last_reviewed_at),
        dueAt: new Date(existing.data.due_at),
      }
    : initialReviewState(now, DEFAULT_REVIEW_CONFIG);
  const next = existing.data || context === "revisao" ? scheduleNext(base, accuracy, now) : base;
  await db.from("review_schedules").upsert(
    {
      user_id: userId,
      lesson_id: lessonId,
      trail_id: result.trailId,
      step: next.step,
      ease: next.ease,
      lapses: next.lapses,
      attempts: next.attempts,
      last_reviewed_at: next.lastReviewedAt?.toISOString() ?? null,
      due_at: next.dueAt.toISOString(),
    },
    { onConflict: "user_id,lesson_id" },
  );
  return { ...result, outcome, level: level.key, nextReviewAt: next.dueAt as Date | null };
}
