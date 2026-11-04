"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAdmin, requireUser } from "@/server/auth";
import { requestLessonGeneration, UserFacingError } from "@/server/services/trails";
import { completeReading, evaluateLessonQuiz, startLesson } from "@/server/services/study";
import { logEvent } from "@/server/observability";
import { generateRecovery } from "@/server/services/recovery";
import type { LevelKey } from "@/domain/progress/levels";
import { createUserClient } from "@/server/supabase";
import type { ReaderQuestion } from "./reader";
import { z } from "zod";
import { getAIProvider, aiEnabled } from "@/ai";
import { AIError } from "@/ai/provider";
import { explainSelection } from "@/ai/services";
import { enforceRateLimit } from "@/server/services/trails";
import { createAdminClient } from "@/server/supabase";
import { explainCacheKey } from "@/domain/study/explain-cache";

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

const explainInput = z.object({
  lessonId: z.uuid(),
  selection: z.string().trim().min(2).max(600),
  around: z.string().max(1500).default(""),
});

/** Balão "Explicar": significado do trecho que o aluno selecionou, no contexto da aula. */
export async function explainSelectionAction(input: { lessonId: string; selection: string; around: string }): Promise<{ ok: true; meaning: string } | { ok: false; error: string }> {
  const user = await requireUser();
  const parsed = explainInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Selecione uma palavra, frase ou oração (até 600 caracteres)." };
  try {
    const db = await createUserClient();
    const { data } = await db.from("lessons").select("title").eq("id", parsed.data.lessonId).maybeSingle();
    if (!data) return { ok: false, error: "Aula não encontrada." };
    // Cache: o mesmo trecho no mesmo contexto já explicado volta na hora, sem gastar IA nem o limite do aluno.
    const key = explainCacheKey(parsed.data.selection, parsed.data.around);
    const admin = createAdminClient();
    const hit = await admin.from("selection_explanations").select("meaning, hits").eq("key", key).maybeSingle().then((r) => r.data as { meaning: string; hits: number } | null, () => null);
    if (hit?.meaning) {
      void admin.from("selection_explanations").update({ hits: hit.hits + 1, last_used_at: new Date().toISOString() }).eq("key", key).then(() => undefined, () => undefined);
      return { ok: true, meaning: hit.meaning };
    }
    if (!aiEnabled("estudos")) return { ok: false, error: "O explicador está temporariamente indisponível. Tente de novo mais tarde." };
    await enforceRateLimit(user.id, "explain_selection", 20);
    const meaning = await explainSelection(getAIProvider("estudos"), { lessonTitle: (data as { title: string }).title, selection: parsed.data.selection, around: parsed.data.around });
    await admin.from("selection_explanations").upsert({ key, selection: parsed.data.selection.slice(0, 600), meaning: meaning.slice(0, 900) }, { onConflict: "key" }).then(() => undefined, () => undefined);
    return { ok: true, meaning };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("lesson.explain_failed", { lessonId: input.lessonId, kind: e instanceof AIError ? e.kind : "unexpected", error: (e as Error).message });
    // A equipe vê o motivo real (chave, modelo, cota…); o aluno vê uma mensagem simples.
    if (e instanceof AIError && (await isAdmin().catch(() => false))) return { ok: false, error: `[Equipe] ${e.message}` };
    if (e instanceof AIError && e.kind === "rate_limited") return { ok: false, error: "Muitas explicações em pouco tempo. Aguarde alguns instantes e tente de novo." };
    return { ok: false, error: "Não consegui explicar agora. Tente de novo em instantes." };
  }
}
