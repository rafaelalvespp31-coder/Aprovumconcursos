import "server-only";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../supabase";
import { UserFacingError, enforceRateLimit } from "./trails";
import { plainJustification, plainToHtml, richToText, RICH_MAX, sanitizeRichHtml } from "@/domain/notebooks/rich-text";
import type { ErrorNotebookData, ErrorNotebookEdit, ErrorNotebookEntry } from "@/domain/notebooks/error-notebook";

/** O caderno precisa ser do aluno (lido com a sessão dele: RLS do dono). */
async function ownNotebook(userId: string, notebookId: string) {
  const db = await createUserClient();
  const { data } = await db.from("question_notebooks").select("id, title").eq("id", notebookId).eq("user_id", userId).maybeSingle();
  if (!data) throw new UserFacingError("Caderno não encontrado.", "not_found");
  return { db, notebook: data as { id: string; title: string } };
}

/**
 * Caderno de erros de um caderno de questões do aluno: as questões erradas ao menos uma vez nele,
 * organizadas por matéria › tema › assunto, cada uma com a justificativa (a original ou a versão
 * que o aluno editou). Sem enunciado, gabarito ou certo/errado.
 */
export async function loadErrorNotebook(userId: string, notebookIdInput: string): Promise<ErrorNotebookData> {
  const notebookId = z.uuid().parse(notebookIdInput);
  await enforceRateLimit(userId, "error_notebook_open", 30);
  const { db, notebook } = await ownNotebook(userId, notebookId);
  const admin = createAdminClient();
  const attempts = await admin.from("bank_attempts").select("question_id, is_correct, created_at").eq("user_id", userId).eq("notebook_id", notebookId).order("created_at", { ascending: false }).limit(20000);
  if (attempts.error) throw new Error(attempts.error.message);

  type Att = { question_id: string; is_correct: boolean };
  const byQ = new Map<string, Att[]>();
  for (const a of (attempts.data ?? []) as Att[]) byQ.set(a.question_id, [...(byQ.get(a.question_id) ?? []), a]);
  const wrongIds = [...byQ.entries()].filter(([, l]) => l.some((a) => !a.is_correct)).map(([id]) => id);
  if (!wrongIds.length) return { notebook, entries: [] };

  type Q = { id: string; public_code: string | null; justification: string | null; legal_basis: string | null; board_slug: string | null; year: number | null; subject_id: string | null; topic_id: string | null; exam_id: string | null };
  const rows: Q[] = [];
  for (let i = 0; i < wrongIds.length; i += 100) {
    const part = await admin.from("bank_questions").select("id, public_code, justification, legal_basis, board_slug, year, subject_id, topic_id, exam_id").in("id", wrongIds.slice(i, i + 100));
    if (part.error) throw new Error(part.error.message);
    rows.push(...((part.data ?? []) as Q[]));
  }
  const ids = (k: keyof Q) => [...new Set(rows.map((r) => r[k] as string | null).filter((x): x is string => !!x))];
  const [subjects, topics, boards, exams, saved] = await Promise.all([
    ids("subject_id").length ? admin.from("subjects").select("id, name").in("id", ids("subject_id")) : { data: [] },
    ids("subject_id").length ? admin.from("subject_topics").select("id, name, parent_id").in("subject_id", ids("subject_id")).limit(5000) : { data: [] },
    ids("board_slug").length ? admin.from("exam_boards").select("slug, name").in("slug", ids("board_slug")) : { data: [] },
    ids("exam_id").length ? admin.from("exams").select("id, name").in("id", ids("exam_id")) : { data: [] },
    db.from("error_notebook_entries").select("question_id, content_html, updated_at").eq("user_id", userId).eq("notebook_id", notebookId),
  ]);
  if ("error" in saved && saved.error) throw new Error(saved.error.message);
  const map = <T,>(list: unknown, key: keyof T, val: keyof T) => new Map(((list ?? []) as T[]).map((x) => [x[key] as string, x[val] as string]));
  const subjectName = map<{ id: string; name: string }>(subjects.data, "id", "name");
  const boardName = map<{ slug: string; name: string }>(boards.data, "slug", "name");
  const examName = map<{ id: string; name: string }>(exams.data, "id", "name");
  type TopicRow = { id: string; name: string; parent_id: string | null };
  const topicRows = new Map(((topics.data ?? []) as TopicRow[]).map((t) => [t.id, t]));
  const placeOf = (topicId: string | null): { theme: string; topic: string | null } => {
    const chain: TopicRow[] = [];
    for (let t = topicId ? topicRows.get(topicId) : undefined, guard = 0; t && guard < 10; t = t.parent_id ? topicRows.get(t.parent_id) : undefined, guard++) chain.unshift(t);
    if (!chain.length) return { theme: "Sem tema definido", topic: null };
    return { theme: chain[0]!.name, topic: chain.length > 1 ? chain.slice(1).map((t) => t.name).join(" › ") : null };
  };
  const savedBy = new Map(((saved.data ?? []) as Array<{ question_id: string; content_html: string; updated_at: string }>).map((s) => [s.question_id, s]));

  const entries: ErrorNotebookEntry[] = rows.map((r) => {
    const list = byQ.get(r.id)!;
    const raw = [r.justification ? plainJustification(r.justification) || r.justification : null, r.legal_basis ? `**Fundamentação:** ${r.legal_basis}` : null].filter(Boolean).join("\n\n");
    const originalHtml = plainToHtml(raw || "Esta questão ainda não tem comentário validado.");
    const mine = savedBy.get(r.id);
    return {
      questionId: r.id,
      code: r.public_code,
      subject: (r.subject_id && subjectName.get(r.subject_id)) || "Sem matéria",
      ...placeOf(r.topic_id),
      source: [r.board_slug ? (boardName.get(r.board_slug) ?? r.board_slug) : null, r.year ? String(r.year) : null, r.exam_id ? (examName.get(r.exam_id) ?? null) : null].filter(Boolean).join(" · ") || null,
      originalHtml,
      html: mine ? sanitizeRichHtml(mine.content_html) : originalHtml,
      edited: !!mine,
      updatedAt: mine?.updated_at ?? null,
      stillWrong: !list[0]!.is_correct,
      wrongAttempts: list.filter((a) => !a.is_correct).length,
    };
  });
  return { notebook, entries };
}

const editSchema = z
  .array(z.object({ questionId: z.uuid(), html: z.string().max(RICH_MAX * 2).nullable() }))
  .min(1, "Nada para salvar.")
  .max(500, "Muitas alterações de uma vez. Salve em partes.");

/**
 * Grava as edições do aluno no caderno de erros (só em erros reais daquele caderno dele).
 * O HTML é limpo aqui, no servidor; `null` (ou texto vazio) volta à justificativa original.
 */
export async function saveErrorNotebookEntries(userId: string, notebookIdInput: string, editsInput: ErrorNotebookEdit[]): Promise<{ savedAt: string }> {
  const notebookId = z.uuid().parse(notebookIdInput);
  const edits = editSchema.parse(editsInput);
  await enforceRateLimit(userId, "error_notebook_save", 30);
  const { db } = await ownNotebook(userId, notebookId);

  const qids = [...new Set(edits.map((e) => e.questionId))];
  const admin = createAdminClient();
  const wrong = await admin.from("bank_attempts").select("question_id").eq("user_id", userId).eq("notebook_id", notebookId).eq("is_correct", false).in("question_id", qids);
  if (wrong.error) throw new Error(wrong.error.message);
  const allowed = new Set(((wrong.data ?? []) as Array<{ question_id: string }>).map((w) => w.question_id));
  if (qids.some((q) => !allowed.has(q))) throw new UserFacingError("Esta questão não está no seu caderno de erros.", "not_found");

  const savedAt = new Date().toISOString();
  const upserts: Array<{ user_id: string; notebook_id: string; question_id: string; content_html: string; updated_at: string }> = [];
  const restores: string[] = [];
  for (const e of edits) {
    const clean = e.html === null ? "" : sanitizeRichHtml(e.html);
    if (clean.length > RICH_MAX) throw new UserFacingError("Uma anotação ficou grande demais. Encurte o texto e salve de novo.", "too_long");
    if (!richToText(clean)) restores.push(e.questionId);
    else upserts.push({ user_id: userId, notebook_id: notebookId, question_id: e.questionId, content_html: clean, updated_at: savedAt });
  }
  if (upserts.length) {
    const r = await db.from("error_notebook_entries").upsert(upserts, { onConflict: "user_id,notebook_id,question_id" });
    if (r.error) throw new Error(r.error.message);
  }
  if (restores.length) {
    const r = await db.from("error_notebook_entries").delete().eq("user_id", userId).eq("notebook_id", notebookId).in("question_id", restores);
    if (r.error) throw new Error(r.error.message);
  }
  return { savedAt };
}
