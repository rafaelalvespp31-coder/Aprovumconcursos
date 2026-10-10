import "server-only";
import { z } from "zod";
import { getAIProvider } from "@/ai";
import { clarifyConcept } from "@/ai/services";
import { createAdminClient } from "../supabase";
import { UserFacingError, enforceRateLimit } from "./trails";
import { logEvent } from "../observability";
import { boardDisplayName, type ExamBoardSlug } from "@/domain/trail-input";

const clarifySchema = z.object({
  lessonId: z.uuid(),
  sectionId: z.uuid().nullable(),
  question: z.string().trim().min(3, "Escreva sua dúvida.").max(500, "Use no máximo 500 caracteres."),
});

export interface Clarification {
  id: string;
  question: string;
  answerMarkdown: string;
  verificationPending: boolean;
  sectionId: string | null;
}

/** Responde uma dúvida pontual sem sair da aula. Consome cota "clarification". */
export async function clarify(userId: string, input: unknown): Promise<Clarification> {
  const parsed = clarifySchema.safeParse(input);
  if (!parsed.success) throw new UserFacingError(parsed.error.issues[0]?.message ?? "Dúvida inválida.", "invalid_input");
  const { lessonId, sectionId, question } = parsed.data;
  await enforceRateLimit(userId, "clarify", 6);
  const db = createAdminClient();

  const lesson = await db
    .from("lessons")
    .select("id, title, study_trails(board_slug, other_board_name), lesson_nodes(content_nodes(source_text))")
    .eq("id", lessonId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!lesson.data) throw new UserFacingError("Aula não encontrada.", "not_found");
  const section = sectionId
    ? await db.from("lesson_sections").select("title, body_markdown").eq("id", sectionId).eq("lesson_id", lessonId).eq("user_id", userId).maybeSingle()
    : { data: null };

  const quota = await db.rpc("consume_quota", { p_user: userId, p_kind: "clarification", p_units: 1 });
  if (quota.error) throw new Error(quota.error.message);
  if (!(quota.data as { allowed: boolean }).allowed) {
    throw new UserFacingError("Você atingiu o limite mensal de esclarecimentos do seu plano.", "quota_exceeded");
  }

  const trail = lesson.data.study_trails as unknown as { board_slug: ExamBoardSlug; other_board_name: string | null };
  const sourceText = ((lesson.data.lesson_nodes ?? []) as unknown as Array<{ content_nodes: { source_text: string } | null }>)
    .map((n) => n.content_nodes?.source_text ?? "")
    .join("\n");
  const r = await clarifyConcept(getAIProvider(), {
    board: boardDisplayName(trail.board_slug, trail.other_board_name),
    lessonTitle: lesson.data.title as string,
    sectionTitle: (section.data?.title as string | undefined) ?? null,
    sectionMarkdown: (section.data?.body_markdown as string | undefined) ?? "",
    sourceText,
    question,
  });
  const saved = await db
    .from("concept_clarifications")
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      section_id: sectionId,
      question,
      answer_markdown: r.data.answerMarkdown,
      verification_pending: r.data.verificationPending,
    })
    .select("id")
    .single();
  if (saved.error) throw new Error(saved.error.message);
  await db.from("ai_generation_versions").insert({
    user_id: userId,
    trail_id: (await db.from("lessons").select("trail_id").eq("id", lessonId).single()).data?.trail_id,
    lesson_id: lessonId,
    task: "clarify",
    provider: r.provider,
    model: r.model,
    input_tokens: r.usage.inputTokens,
    output_tokens: r.usage.outputTokens,
    cost_usd: r.usage.estimatedCostUsd,
    warnings: r.warnings,
  });
  await logEvent("lesson.clarified", { lessonId, tokens: r.usage.outputTokens });
  return { id: saved.data.id as string, question, answerMarkdown: r.data.answerMarkdown, verificationPending: r.data.verificationPending, sectionId };
}
