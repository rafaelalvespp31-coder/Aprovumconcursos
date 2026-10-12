"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { requestLessonGeneration, UserFacingError } from "@/server/services/trails";
import { completeReading, evaluateLessonQuiz, startLesson } from "@/server/services/study";
import { logEvent } from "@/server/observability";
import { generateRecovery } from "@/server/services/recovery";
import type { LevelKey } from "@/domain/progress/levels";

export async function generateLessonAction(lessonId: string) {
  const user = await requireUser();
  let jobId: string;
  try {
    jobId = await requestLessonGeneration(lessonId, user.id);
  } catch (e) {
    if (e instanceof UserFacingError) redirect(`/aula/${lessonId}?erro=${encodeURIComponent(e.message)}`);
    throw e;
  }
  redirect(`/aula/${lessonId}?job=${jobId}`);
}

export async function startLessonAction(lessonId: string) {
  const user = await requireUser();
  try {
    await startLesson(user.id, lessonId);
  } catch (e) {
    if (!(e instanceof UserFacingError)) await logEvent("lesson.start_failed", { lessonId, error: (e as Error).message });
  }
}

export async function completeReadingAction(lessonId: string) {
  const user = await requireUser();
  const t = await completeReading(user.id, lessonId);
  revalidatePath(`/aula/${lessonId}`);
  return { explanation: t.explanation };
}

export interface QuizResult {
  ok: boolean;
  error?: string;
  explanation?: string;
  recommendations?: string[];
  unlocksNext?: boolean;
  accuracy?: number;
  nextReviewAt?: string;
  /** Nível avaliado e níveis aprovados após a avaliação. */
  level?: LevelKey;
  levelsPassed?: number;
  /** Para o aluno saber quanto faltou: acertos considerados e total do nível. */
  correct?: number;
  total?: number;
}

export async function evaluateQuizAction(lessonId: string, context: "fixacao" | "revisao", level?: LevelKey): Promise<QuizResult> {
  const user = await requireUser();
  try {
    const r = await evaluateLessonQuiz(user.id, lessonId, context, level);
    revalidatePath(`/aula/${lessonId}`);
    revalidatePath(`/trilhas/${r.trailId}`);
    const total = r.outcome.total ?? r.outcome.answered;
    return {
      ok: true,
      explanation: r.explanation,
      recommendations: r.recommendations,
      unlocksNext: r.unlocksNext,
      accuracy: total ? r.outcome.correct / total : 0,
      nextReviewAt: r.nextReviewAt?.toISOString(),
      level: r.level,
      levelsPassed: r.progress.levelsPassed,
      correct: r.outcome.correct,
      total,
    };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("quiz.evaluate_failed", { lessonId, error: (e as Error).message });
    return { ok: false, error: "Não foi possível calcular o resultado agora." };
  }
}

export interface RecoveryResult {
  ok: boolean;
  error?: string;
  created?: number;
  wrong?: number;
}

/** Gera exercícios de recuperação para os erros do nível atual. */
export async function generateRecoveryAction(lessonId: string, level?: LevelKey): Promise<RecoveryResult> {
  const user = await requireUser();
  try {
    const r = await generateRecovery(user.id, { lessonId, level });
    revalidatePath(`/aula/${lessonId}`);
    return { ok: true, created: r.created, wrong: r.wrong };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("recovery.failed", { lessonId, error: (e as Error).message });
    return { ok: false, error: "Não foi possível gerar os exercícios de recuperação agora." };
  }
}
