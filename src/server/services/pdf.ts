import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { CONTENT_TYPE_OPTIONS, boardDisplayName, type ExamBoardSlug } from "@/domain/trail-input";
import type { LevelKey } from "@/domain/progress/levels";
import { createAdminClient } from "../supabase";
import type { PdfSnapshot } from "../pdf/types";
import { UserFacingError, enforceRateLimit } from "./trails";
import { auditLog, logEvent } from "../observability";
import type { ScopeSummary } from "../queries";

const LEVEL_ORDER: Record<LevelKey, number> = { facil: 0, medio: 1, dificil: 2 };

function must<T>(r: { data: T | null; error: { message: string } | null }, what: string): T {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as T;
}

/**
 * Monta o retrato do conteúdo estudado: teoria, fontes, questões efetivamente
 * respondidas (com a última resposta), erros e versões. Usa o cliente de serviço,
 * sempre filtrando pelo dono — nunca dados de outro aluno.
 */
export async function buildSnapshot(userId: string, trailId: string): Promise<{ snapshot: PdfSnapshot; questionIds: string[] }> {
  const db = createAdminClient();
  const trail = must(
    await db
      .from("study_trails")
      .select("id, title, board_slug, other_board_name, content_type, scope_summary, scope_outline")
      .eq("id", trailId)
      .eq("user_id", userId)
      .maybeSingle(),
    "carregar conteúdo",
  ) as {
    id: string; title: string; board_slug: string; other_board_name: string | null; content_type: string;
    scope_summary: unknown; scope_outline: string | null;
  } | null;
  if (!trail) throw new UserFacingError("Conteúdo não encontrado.", "not_found");

  const [profile, version, lessons, progress] = await Promise.all([
    db.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    db
      .from("source_document_versions")
      .select("version, normalized_text, created_at, sha256, source_documents!inner(trail_id)")
      .eq("source_documents.trail_id", trailId)
      .eq("user_id", userId)
      .order("version", { ascending: false })
      .limit(1)
      .single(),
    db.from("lessons").select("id, title, objective, generated_at, verification_pending, unverified_claims, sort_order").eq("trail_id", trailId).eq("user_id", userId).order("sort_order"),
    db.from("learning_progress").select("lesson_id, levels_passed").eq("trail_id", trailId).eq("user_id", userId),
  ]);
  const lessonRows = must(lessons, "carregar aulas") as Array<{ id: string; title: string; objective: string; generated_at: string | null; verification_pending: boolean; unverified_claims: string[] | null }>;
  const levelsBy = new Map(((progress.data ?? []) as Array<{ lesson_id: string; levels_passed: number }>).map((p) => [p.lesson_id, p.levels_passed]));
  if (!lessonRows.length || lessonRows.some((l) => (levelsBy.get(l.id) ?? 0) < 3)) {
    throw new UserFacingError("O PDF é liberado depois da aprovação nos três níveis (fácil, médio e difícil) de todas as unidades deste conteúdo.", "not_completed");
  }
  const ids = lessonRows.map((l) => l.id);
  const ver = must(version, "carregar fonte") as { version: number; normalized_text: string; created_at: string; sha256: string };

  const [sections, refs, questions] = await Promise.all([
    db.from("lesson_sections").select("lesson_id, kind, title, body_markdown, verification_status, sort_order").in("lesson_id", ids).eq("user_id", userId).order("sort_order"),
    db.from("source_references").select("lesson_id, kind, citation, verified").in("lesson_id", ids).eq("user_id", userId),
    db
      .from("questions")
      .select("id, lesson_id, type, statement, justification, level, recovery_of, correct_answer_true, created_at, content_nodes(title)")
      .in("lesson_id", ids)
      .eq("user_id", userId)
      .eq("active", true)
      .order("created_at"),
  ]);
  const qRows = must(questions, "carregar questões") as unknown as Array<{
    id: string; lesson_id: string; type: string; statement: string; justification: string; level: LevelKey;
    recovery_of: string | null; correct_answer_true: boolean | null; created_at: string; content_nodes: { title: string } | null;
  }>;
  const qIds = qRows.map((q) => q.id);
  const [options, attempts] = qIds.length
    ? await Promise.all([
        db.from("question_options").select("question_id, label, text, is_correct, explanation, sort_order").in("question_id", qIds).eq("user_id", userId).order("sort_order"),
        db
          .from("answer_attempts")
          .select("question_id, selected_option_id, answer_bool, is_correct, created_at, question_options(label)")
          .in("question_id", qIds)
          .eq("user_id", userId)
          .in("context", ["fixacao", "revisao"])
          .order("created_at"),
      ])
    : [{ data: [], error: null }, { data: [], error: null }];
  const optRows = must(options, "carregar alternativas") as Array<{ question_id: string; label: string; text: string; is_correct: boolean; explanation: string }>;
  const attRows = must(attempts, "carregar respostas") as unknown as Array<{
    question_id: string; answer_bool: boolean | null; is_correct: boolean; created_at: string; question_options: { label: string } | null;
  }>;

  const unitIndex = new Map(lessonRows.map((l, i) => [l.id, i]));
  const unitTitle = new Map(lessonRows.map((l) => [l.id, l.title]));
  const byQ = new Map<string, typeof attRows>();
  for (const a of attRows) byQ.set(a.question_id, [...(byQ.get(a.question_id) ?? []), a]);
  const optsBy = new Map<string, typeof optRows>();
  for (const o of optRows) optsBy.set(o.question_id, [...(optsBy.get(o.question_id) ?? []), o]);
  const rootCreated = new Map(qRows.map((q) => [q.id, q.created_at]));

  const answered = qRows
    .filter((q) => byQ.has(q.id))
    .sort((a, b) => {
      const ka = [unitIndex.get(a.lesson_id)!, LEVEL_ORDER[a.level], rootCreated.get(a.recovery_of ?? a.id) ?? a.created_at, a.recovery_of ? 1 : 0, a.created_at];
      const kb = [unitIndex.get(b.lesson_id)!, LEVEL_ORDER[b.level], rootCreated.get(b.recovery_of ?? b.id) ?? b.created_at, b.recovery_of ? 1 : 0, b.created_at];
      for (let i = 0; i < ka.length; i++) if (ka[i] !== kb[i]) return ka[i]! < kb[i]! ? -1 : 1;
      return 0;
    });

  const wrongByTopic = new Map<string, { topic: string; unitTitle: string; wrongAttempts: number }>();
  const snapshotQuestions: PdfSnapshot["questions"] = answered.map((q) => {
    const tries = byQ.get(q.id)!;
    const last = tries[tries.length - 1]!;
    const wrong = tries.filter((t) => !t.is_correct).length;
    const topic = q.content_nodes?.title ?? null;
    if (wrong) {
      const k = `${q.lesson_id}:${topic ?? "—"}`;
      const cur = wrongByTopic.get(k) ?? { topic: topic ?? "Item sem título", unitTitle: unitTitle.get(q.lesson_id) ?? "", wrongAttempts: 0 };
      cur.wrongAttempts += wrong;
      wrongByTopic.set(k, cur);
    }
    return {
      id: q.id,
      unitTitle: unitTitle.get(q.lesson_id) ?? "",
      level: q.level,
      recovery: !!q.recovery_of,
      type: q.type,
      statement: q.statement,
      topic,
      options: (optsBy.get(q.id) ?? []).map((o) => ({ label: o.label, text: o.text, correct: o.is_correct, explanation: o.explanation })),
      correctAnswerTrue: q.correct_answer_true,
      justification: q.justification,
      answer: { label: last.question_options?.label ?? null, bool: last.answer_bool, correct: last.is_correct, at: last.created_at },
      attempts: tries.length,
      everWrong: wrong > 0 || (!!q.recovery_of && (byQ.get(q.recovery_of) ?? []).some((t) => !t.is_correct)),
    };
  });

  const secRows = must(sections, "carregar seções") as Array<{ lesson_id: string; kind: string; title: string; body_markdown: string; verification_status: string }>;
  const refRows = must(refs, "carregar referências") as Array<{ lesson_id: string; kind: string; citation: string; verified: boolean }>;
  const scope = trail.scope_summary as ScopeSummary | null;
  const snapshot: PdfSnapshot = {
    schema: 1,
    generatedAt: new Date().toISOString(),
    student: { name: (profile.data?.display_name as string | null | undefined) ?? null },
    content: {
      trailId,
      title: trail.title as string,
      board: boardDisplayName(trail.board_slug as ExamBoardSlug, trail.other_board_name as string | null),
      contentTypeLabel: CONTENT_TYPE_OPTIONS.find((o) => o.value === trail.content_type)?.label ?? String(trail.content_type),
      subject: scope?.subject ?? null,
      scopeStatement: scope?.scopeStatement ?? null,
      outOfScope: scope?.outOfScope ?? [],
      legalReferences: scope?.legalReferences ?? [],
      aiOutline: (trail.scope_outline as string | null) ?? null,
      sourceText: ver.normalized_text,
      sourceVersion: ver.version,
      sourceCreatedAt: ver.created_at,
      sourceSha256: ver.sha256,
    },
    units: lessonRows.map((l) => ({
      id: l.id,
      title: l.title,
      objective: l.objective,
      generatedAt: l.generated_at,
      verificationPending: l.verification_pending,
      unverifiedClaims: l.unverified_claims ?? [],
      levelsPassed: levelsBy.get(l.id) ?? 0,
      sections: secRows.filter((s) => s.lesson_id === l.id).map((s) => ({ kind: s.kind, title: s.title, body: s.body_markdown, verificationStatus: s.verification_status })),
      references: refRows.filter((r) => r.lesson_id === l.id).map((r) => ({ kind: r.kind, citation: r.citation, verified: r.verified })),
    })),
    questions: snapshotQuestions,
    review: [...wrongByTopic.values()].sort((a, b) => b.wrongAttempts - a.wrongAttempts),
  };
  return { snapshot, questionIds: answered.map((q) => q.id) };
}

export function snapshotHash(s: PdfSnapshot): string {
  return createHash("sha256").update(JSON.stringify(s)).digest("hex");
}

/** Gera (grava) uma nova versão do PDF do conteúdo. O banco revalida a conclusão dos três níveis. */
export async function createStudyPdf(userId: string, trailIdInput: string): Promise<{ id: string; pdfVersion: number }> {
  const trailId = z.uuid().parse(trailIdInput);
  await enforceRateLimit(userId, "study_pdf", 3);
  const { snapshot, questionIds } = await buildSnapshot(userId, trailId);
  const hash = snapshotHash(snapshot);
  const db = createAdminClient();
  const r = await db.rpc("save_study_pdf", { p_user: userId, p_trail: trailId, p_snapshot: snapshot, p_question_ids: questionIds, p_hash: hash });
  if (r.error) {
    if (r.error.code === "P0001") throw new UserFacingError("O PDF é liberado depois da aprovação nos três níveis de todas as unidades.", "not_completed");
    throw new Error(r.error.message);
  }
  const out = r.data as { id: string; pdfVersion: number };
  await auditLog(db, { actorId: userId, userId, action: "study_pdf.created", entity: "study_pdfs", entityId: out.id, meta: { trailId, version: out.pdfVersion, questions: questionIds.length } });
  await logEvent("study_pdf.created", { trailId, version: out.pdfVersion });
  return out;
}
