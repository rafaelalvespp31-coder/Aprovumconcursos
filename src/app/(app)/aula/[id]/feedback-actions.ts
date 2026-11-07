"use server";

import { requireUser } from "@/server/auth";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import { dispensarFeedback, enviarFeedback } from "@/server/services/lesson-feedback";

export type FeedbackResult = { ok: true } | { ok: false; error: string };

export async function enviarFeedbackAction(lessonId: string, rating: number, comment: string): Promise<FeedbackResult> {
  const user = await requireUser();
  try {
    await enviarFeedback(user.id, { lessonId, rating, comment });
    return { ok: true };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("lesson.feedback_failed", { lessonId, error: (e as Error).message });
    return { ok: false, error: "Não foi possível registrar sua avaliação agora. Tente novamente." };
  }
}

export async function dispensarFeedbackAction(lessonId: string): Promise<FeedbackResult> {
  const user = await requireUser();
  try {
    await dispensarFeedback(user.id, lessonId);
    return { ok: true };
  } catch (e) {
    await logEvent("lesson.feedback_skip_failed", { lessonId, error: (e as Error).message });
    return { ok: true };
  }
}
