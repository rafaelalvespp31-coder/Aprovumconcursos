"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { requestLessonGeneration, UserFacingError } from "@/server/services/trails";
import { completeReading, evaluateLessonQuiz, startLesson, submitAnswer, type AnswerFeedback } from "@/server/services/study";
import { logEvent } from "@/server/observability";

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

export type AnswerResult = { ok: true; feedback: AnswerFeedback } | { ok: false; error: string };

export async function submitAnswerAction(input: { questionId: string; optionId?: string; answerTrue?: boolean; context: "fixacao" | "revisao" }): Promise<AnswerResult> {
  const user = await requireUser();
  try {
    return { ok: true, feedback: await submitAnswer(user.id, input) };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("answer.failed", { error: (e as Error).message });
    return { ok: false, error: "Não foi possível registrar a resposta. Verifique a conexão e tente novamente." };
  }
}

export interface QuizResult {
  ok: boolean;
  error?: string;
  explanation?: string;
  recommendations?: string[];
  unlocksNext?: boolean;
  accuracy?: number;
  nextReviewAt?: string;
}

export async function evaluateQuizAction(lessonId: string, context: "fixacao" | "revisao"): Promise<QuizResult> {
  const user = await requireUser();
  try {
    const r = await evaluateLessonQuiz(user.id, lessonId, context);
    revalidatePath(`/aula/${lessonId}`);
    revalidatePath(`/trilhas/${r.trailId}`);
    return {
      ok: true,
      explanation: r.explanation,
      recommendations: r.recommendations,
      unlocksNext: r.unlocksNext,
      accuracy: r.outcome.answered ? r.outcome.correct / r.outcome.answered : 0,
      nextReviewAt: r.nextReviewAt.toISOString(),
    };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("quiz.evaluate_failed", { lessonId, error: (e as Error).message });
    return { ok: false, error: "Não foi possível calcular o resultado agora." };
  }
}
