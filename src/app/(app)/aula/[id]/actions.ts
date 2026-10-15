"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { requestLessonGeneration, UserFacingError } from "@/server/services/trails";
import { completeReading, evaluateLessonQuiz, startLesson } from "@/server/services/study";
import { logEvent } from "@/server/observability";
import { generateRecovery } from "@/server/services/recovery";
import type { LevelKey } from "@/domain/progress/levels";
import { createUserClient } from "@/server/supabase";
import type { ReaderQuestion } from "./reader";

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
  /** Exercícios de recuperação ainda não respondidos deste nível, prontos para mostrar na hora. */
  questions?: ReaderQuestion[];
  /** Questões oficiais do nível ainda sem resposta (bloqueiam a recuperação). */
  missing?: string[];
}

/** Recuperações pendentes (não respondidas) do nível, com as alternativas — sem gabarito. */
async function pendingRecoveries(lessonId: string, level: LevelKey | undefined): Promise<ReaderQuestion[]> {
  const db = await createUserClient();
  let q = db
    .from("questions")
    .select("id, type, statement, difficulty, essential, board_style, depends_on_external_source, node_id, level, recovery_of, created_at, question_options(id, label, text, sort_order)")
    .eq("lesson_id", lessonId)
    .eq("active", true)
    .not("recovery_of", "is", null)
    .order("created_at");
  if (level) q = q.eq("level", level);
  const { data, error } = await q;
  if (error || !data?.length) return [];
  const ids = data.map((r) => r.id as string);
  const [att, nodes] = await Promise.all([
    db.from("answer_attempts").select("question_id").in("question_id", ids),
    db.from("content_nodes").select("id, key, title").in("id", [...new Set(data.map((r) => r.node_id as string))]),
  ]);
  const answered = new Set((att.data ?? []).map((a) => a.question_id as string));
  const node = new Map((nodes.data ?? []).map((n) => [n.id as string, n as { id: string; key: string; title: string }]));
  return data
    .filter((r) => !answered.has(r.id as string))
    .map((r) => {
      const row = r as unknown as {
        id: string; type: ReaderQuestion["type"]; statement: string; difficulty: number; essential: boolean; board_style: string | null;
        depends_on_external_source: boolean; node_id: string; level: LevelKey; recovery_of: string;
        question_options: Array<{ id: string; label: string; text: string; sort_order: number }> | null;
      };
      return {
        id: row.id,
        type: row.type,
        statement: row.statement,
        difficulty: row.difficulty,
        essential: row.essential,
        board_style: row.board_style,
        depends_on_external_source: row.depends_on_external_source,
        level: row.level,
        recovery_of: row.recovery_of,
        nodeKey: node.get(row.node_id)?.key ?? null,
        topic: node.get(row.node_id)?.title ?? null,
        options: (row.question_options ?? []).sort((x, y) => x.sort_order - y.sort_order).map(({ id, label, text }) => ({ id, label, text })),
      };
    });
}

/** Gera exercícios de recuperação para os erros do nível atual. */
export async function generateRecoveryAction(lessonId: string, level?: LevelKey): Promise<RecoveryResult> {
  const user = await requireUser();
  try {
    const r = await generateRecovery(user.id, { lessonId, level });
    revalidatePath(`/aula/${lessonId}`);
    return { ok: true, created: r.created, wrong: r.wrong, questions: await pendingRecoveries(lessonId, level ?? r.level) };
  } catch (e) {
    if (e instanceof UserFacingError) {
      const missing = e.code === "unanswered" ? ((e.data as { missing?: string[] } | undefined)?.missing ?? []) : undefined;
      return { ok: false, error: e.message, missing };
    }
    await logEvent("recovery.failed", { lessonId, error: (e as Error).message });
    return { ok: false, error: "Não foi possível gerar os exercícios de recuperação agora." };
  }
}
