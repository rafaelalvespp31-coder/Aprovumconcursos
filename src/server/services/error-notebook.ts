import "server-only";
import { z } from "zod";
import { createAdminClient, createUserClient } from "../supabase";
import type { ErrorNotebookSnapshot } from "../pdf/types";
import { UserFacingError, enforceRateLimit } from "./trails";
import { listNotebooks } from "./notebooks";

/**
 * Monta o caderno de erros de um caderno de questões do aluno: questões erradas ao menos uma vez
 * nele (pela tabela de respostas), agrupadas por matéria e assunto, com a última resposta, o
 * gabarito, as explicações das alternativas e o comentário. O caderno é lido com a sessão do
 * aluno (RLS do dono); o gabarito só entra porque a questão já foi respondida.
 */
export async function buildErrorNotebook(userId: string, notebookIdInput: string): Promise<ErrorNotebookSnapshot> {
  const notebookId = z.uuid().parse(notebookIdInput);
  await enforceRateLimit(userId, "error_pdf", 10);
  const db = await createUserClient();
  const { data: own } = await db.from("question_notebooks").select("id").eq("id", notebookId).eq("user_id", userId).maybeSingle();
  if (!own) throw new UserFacingError("Caderno não encontrado.", "not_found");
  const admin = createAdminClient();
  const [notebook, attempts, profile] = await Promise.all([
    listNotebooks(userId).then((l) => l.find((n) => n.id === notebookId) ?? null),
    admin.from("bank_attempts").select("question_id, is_correct, selected_label, answer_bool, created_at").eq("user_id", userId).eq("notebook_id", notebookId).order("created_at", { ascending: false }).limit(20000),
    admin.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
  ]);
  if (!notebook) throw new UserFacingError("Caderno não encontrado.", "not_found");
  if (attempts.error) throw new Error(attempts.error.message);

  type Att = { question_id: string; is_correct: boolean; selected_label: string | null; answer_bool: boolean | null; created_at: string };
  const byQ = new Map<string, Att[]>();
  for (const a of (attempts.data ?? []) as Att[]) byQ.set(a.question_id, [...(byQ.get(a.question_id) ?? []), a]);
  const answered = byQ.size;
  let correct = 0;
  for (const list of byQ.values()) if (list[0]!.is_correct) correct++;
  const wrongIds = [...byQ.entries()].filter(([, l]) => l.some((a) => !a.is_correct)).map(([id]) => id);

  type Q = {
    id: string; public_code: string | null; question_type: string; statement: string; case_context: string | null; justification: string | null; legal_basis: string | null;
    correct_answer_true: boolean | null; board_slug: string | null; year: number | null; subject_id: string | null; topic_id: string | null; exam_id: string | null;
    bank_question_options: Array<{ label: string; text: string; is_correct: boolean; explanation: string | null; sort_order: number }> | null;
  };
  const rows: Q[] = [];
  for (let i = 0; i < wrongIds.length; i += 100) {
    const part = await admin
      .from("bank_questions")
      .select("id, public_code, question_type, statement, case_context, justification, legal_basis, correct_answer_true, board_slug, year, subject_id, topic_id, exam_id, bank_question_options(label, text, is_correct, explanation, sort_order)")
      .in("id", wrongIds.slice(i, i + 100));
    if (part.error) throw new Error(part.error.message);
    rows.push(...((part.data ?? []) as Q[]));
  }
  const ids = (k: keyof Q) => [...new Set(rows.map((r) => r[k] as string | null).filter((x): x is string => !!x))];
  const [subjects, topics, boards, exams, notes] = await Promise.all([
    ids("subject_id").length ? admin.from("subjects").select("id, name").in("id", ids("subject_id")) : { data: [] },
    ids("topic_id").length ? admin.from("subject_topics").select("id, name").in("id", ids("topic_id")) : { data: [] },
    ids("board_slug").length ? admin.from("exam_boards").select("slug, name").in("slug", ids("board_slug")) : { data: [] },
    ids("exam_id").length ? admin.from("exams").select("id, name, role_name").in("id", ids("exam_id")) : { data: [] },
    wrongIds.length ? db.from("bank_question_notes").select("question_id, body").eq("user_id", userId).in("question_id", wrongIds) : { data: [] },
  ]);
  const name = <T extends Record<string, unknown>>(list: T[] | null | undefined, key: keyof T, val: keyof T) => new Map((list ?? []).map((x) => [x[key] as string, x[val] as string]));
  const subjectName = name((subjects.data ?? []) as Array<{ id: string; name: string }>, "id", "name");
  const topicName = name((topics.data ?? []) as Array<{ id: string; name: string }>, "id", "name");
  const boardName = name((boards.data ?? []) as Array<{ slug: string; name: string }>, "slug", "name");
  const examRows = new Map(((exams.data ?? []) as Array<{ id: string; name: string; role_name: string | null }>).map((e) => [e.id, e]));
  const noteOf = name((notes.data ?? []) as Array<{ question_id: string; body: string }>, "question_id", "body");

  const questions: ErrorNotebookSnapshot["questions"] = rows.map((r) => {
    const list = byQ.get(r.id)!;
    const last = list[0]!;
    const exam = r.exam_id ? examRows.get(r.exam_id) : undefined;
    const source = [r.board_slug ? (boardName.get(r.board_slug) ?? r.board_slug) : null, r.year ? String(r.year) : null, exam?.name ?? null, exam?.role_name ?? null].filter(Boolean).join(" · ") || null;
    return {
      id: r.id,
      code: r.public_code,
      subject: (r.subject_id && subjectName.get(r.subject_id)) || "Sem matéria",
      topic: (r.topic_id && topicName.get(r.topic_id)) || null,
      source,
      type: r.question_type,
      caseContext: r.case_context,
      statement: r.statement,
      options: (r.bank_question_options ?? []).sort((a, b) => a.sort_order - b.sort_order).map((o) => ({ label: o.label, text: o.text, correct: o.is_correct, explanation: o.explanation ?? "" })),
      correctAnswerTrue: r.question_type === "certo_errado" ? r.correct_answer_true : null,
      justification: [r.justification, r.legal_basis ? `Fundamentação: ${r.legal_basis}` : null].filter(Boolean).join("\n\n") || "Esta questão ainda não tem comentário validado.",
      answer: { label: last.selected_label, bool: last.answer_bool, correct: last.is_correct, at: last.created_at },
      attempts: list.length,
      wrongAttempts: list.filter((a) => !a.is_correct).length,
      note: noteOf.get(r.id) ?? null,
    };
  });
  // Matéria › assunto; dentro do assunto, as que continuam erradas primeiro.
  questions.sort((a, b) => a.subject.localeCompare(b.subject, "pt-BR") || (a.topic ?? "").localeCompare(b.topic ?? "", "pt-BR") || Number(a.answer.correct) - Number(b.answer.correct) || (a.code ?? "").localeCompare(b.code ?? ""));

  return {
    schema: 1,
    generatedAt: new Date().toISOString(),
    student: { name: ((profile.data as { display_name: string | null } | null)?.display_name ?? null) || null },
    notebook: { id: notebook.id, title: notebook.title, scope: notebook.scope, filters: notebook.labels },
    totals: { answered, correct, stillWrong: questions.filter((q) => !q.answer.correct).length, corrected: questions.filter((q) => q.answer.correct).length },
    questions,
  };
}
