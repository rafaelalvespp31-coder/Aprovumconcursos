import "server-only";
import { z } from "zod";
import { getAIProvider } from "@/ai";
import { generateQuestions, matchRecovery } from "@/ai/services";
import { LEVEL_KEYS, levelByKey, levelByNumber, type LevelKey } from "@/domain/progress/levels";
import { createAdminClient } from "../supabase";
import { SupabaseLessonRepo } from "../repos/supabase-repos";
import { questionsPayload } from "../repos/payloads";
import { UserFacingError, enforceRateLimit } from "./trails";
import { logEvent } from "../observability";
import { recoveryFromBank } from "./catalog";
import { wrongRoots, type RecoveryQuestionRow as QRow } from "@/domain/progress/recovery";

const MAX_PER_ROUND = 10;

/**
 * Gera exercícios de recuperação para as questões erradas de um nível. Cada exercício
 * substitui uma questão errada (mesmo item, mesmo nível); o aluno não refaz o nível todo.
 */
export async function generateRecovery(userId: string, input: { lessonId: string; level?: LevelKey }) {
  const { lessonId, level: levelKey } = z.object({ lessonId: z.uuid(), level: z.enum(LEVEL_KEYS).optional() }).parse(input);
  await enforceRateLimit(userId, "recovery", 4, 600);
  const db = createAdminClient();

  const prog = await db.from("learning_progress").select("levels_passed, reading_completed_at").eq("user_id", userId).eq("lesson_id", lessonId).maybeSingle();
  if (!prog.data) throw new UserFacingError("Esta unidade ainda não foi liberada.", "not_unlocked");
  if (!prog.data.reading_completed_at) throw new UserFacingError("Conclua a leitura da aula antes dos exercícios.", "reading_required");
  const passed = (prog.data.levels_passed as number | null) ?? 0;
  const level = levelKey ? levelByKey(levelKey) : levelByNumber(Math.min(3, passed + 1))!;
  if (level.n <= passed) throw new UserFacingError(`O nível ${level.label.toLowerCase()} já foi aprovado.`, "level_passed");
  if (level.n > passed + 1) throw new UserFacingError("Conclua o nível anterior primeiro.", "level_locked");

  const qs = await db
    .from("questions")
    .select("id, node_id, statement, recovery_of")
    .eq("lesson_id", lessonId)
    .eq("user_id", userId)
    .eq("level", level.key)
    .eq("active", true);
  if (qs.error) throw new Error(qs.error.message);
  const rows = (qs.data ?? []) as QRow[];
  const att = await db
    .from("answer_attempts")
    .select("question_id, is_correct, created_at")
    .eq("user_id", userId)
    .eq("context", "fixacao")
    .in("question_id", rows.map((r) => r.id).length ? rows.map((r) => r.id) : ["00000000-0000-0000-0000-000000000000"]);
  if (att.error) throw new Error(att.error.message);
  const { wrong, unanswered } = wrongRoots(rows, (att.data ?? []) as Array<{ question_id: string; is_correct: boolean; created_at: string }>);
  if (unanswered.length)
    throw new UserFacingError(
      unanswered.length === 1 ? "Falta responder 1 questão deste nível antes da recuperação." : `Faltam responder ${unanswered.length} questões deste nível antes da recuperação.`,
      "unanswered",
      { missing: unanswered.map((q) => q.id) },
    );
  if (!wrong.length) throw new UserFacingError("Não há erros a recuperar neste nível. Calcule o resultado do nível.", "nothing_wrong");

  const repo = new SupabaseLessonRepo(db);
  const ctx = await repo.getContext(lessonId, userId);
  const markdown = await repo.getLessonMarkdown(lessonId, userId);
  const keys = await db.from("content_nodes").select("id, key").in("id", [...new Set(wrong.map((w) => w.node_id))]);
  const keyById = new Map((keys.data ?? []).map((k) => [k.id as string, k.key as string]));
  const targets = wrong.slice(0, MAX_PER_ROUND).map((w) => ({ rootId: w.id, nodeKey: keyById.get(w.node_id) ?? "", statement: w.statement })).filter((t) => t.nodeKey);

  // Unidades do catálogo: recuperação vem do banco revisado, sem IA. Só o que faltar vai para a IA.
  let fromBank = 0;
  const lessonRow = await db.from("lessons").select("catalog_topic_id, catalog_key_map").eq("id", lessonId).eq("user_id", userId).single();
  if (lessonRow.data?.catalog_topic_id) {
    const b = await recoveryFromBank(
      { id: lessonId, userId, catalogTopicId: lessonRow.data.catalog_topic_id as string, keyMap: (lessonRow.data.catalog_key_map as Record<string, string>) ?? {} },
      level.key,
      targets.map((t) => ({ rootId: t.rootId, nodeKey: t.nodeKey })),
    );
    fromBank = b.saved;
    const pendingIds = new Set(b.pending.map((p) => p.rootId));
    targets.splice(0, targets.length, ...targets.filter((t) => pendingIds.has(t.rootId)));
    if (!targets.length) {
      await logEvent("recovery.from_bank", { lessonId, level: level.key, wrong: wrong.length, created: fromBank });
      return { created: fromBank, wrong: wrong.length, level: level.key };
    }
  }

  const r = await generateQuestions(getAIProvider(), {
    board: ctx.boardName,
    lesson: ctx.lesson,
    lessonMarkdown: markdown,
    nodes: ctx.nodes,
    level: level.key,
    count: targets.length,
    recovery: targets.map((t) => ({ nodeKey: t.nodeKey, statement: t.statement })),
  });
  const matched = matchRecovery(targets, r.data.questions);
  if (!matched.length) throw new UserFacingError("Não foi possível gerar exercícios de recuperação agora. Tente novamente.", "generation_failed");
  const saved = await db.rpc("save_recovery_questions", {
    p_user: userId,
    p_lesson: lessonId,
    p_board: ctx.boardName,
    p_questions: questionsPayload({ questions: matched }).map((q, i) => ({ ...q, recoveryOf: matched[i]!.recoveryOf })),
  });
  if (saved.error) throw new Error(saved.error.message);
  await db.from("ai_generation_versions").insert({
    user_id: userId,
    trail_id: ctx.trailId,
    lesson_id: lessonId,
    task: "generate_questions",
    provider: r.provider,
    model: r.model,
    input_tokens: r.usage.inputTokens,
    output_tokens: r.usage.outputTokens,
    cost_usd: r.usage.estimatedCostUsd,
    warnings: r.warnings,
    output: { purpose: "recuperacao", level: level.key },
  });
  await logEvent("recovery.generated", { lessonId, level: level.key, wrong: wrong.length, created: saved.data });
  return { created: (saved.data as number) + fromBank, wrong: wrong.length, level: level.key };
}
