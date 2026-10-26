"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logEvent } from "@/server/observability";
import { UserFacingError } from "@/server/services/trails";
import {
  createExam,
  createSubject,
  createTopic,
  decideQuestion,
  findSimilar,
  flagOutdated,
  requireBankStaff,
  resolveFlag,
  saveQuestion,
  saveSource,
  setSourceReuse,
  setStaffRole,
  setTopicStatus,
  type SimilarHit,
} from "@/server/services/bank";
import type { BankStatus } from "@/domain/bank/labels";
import { importBankUpload, previewBankUpload, type BankUploadPreview } from "@/server/services/bank-upload";

export interface BankResult<T = undefined> {
  ok: boolean;
  error?: string;
  data?: T;
}

async function run<T>(name: string, fn: () => Promise<T>, paths: string[] = []): Promise<BankResult<T>> {
  try {
    const data = await fn();
    for (const p of paths) revalidatePath(p);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    if (e instanceof z.ZodError) return { ok: false, error: e.issues[0]?.message ?? "Dados inválidos." };
    await logEvent(`bank.${name}_failed`, { error: (e as Error).message });
    return { ok: false, error: "Não foi possível concluir. Tente novamente." };
  }
}

export async function saveQuestionAction(id: string | null, payload: unknown) {
  return run("save_question", async () => saveQuestion(await requireBankStaff(), id, payload), ["/banco", "/banco/questoes"]);
}

export async function decideAction(id: string, to: BankStatus | null, reason: string, checks?: { content: boolean; answer: boolean; source: boolean; rights: boolean }) {
  return run("decide", async () => decideQuestion(await requireBankStaff(), id, to, reason, checks), ["/banco", "/banco/questoes", `/banco/questoes/${id}`]);
}

export async function similarAction(text: string, subjectId: string | null, excludeId: string | null): Promise<BankResult<SimilarHit[]>> {
  return run("similar", async () => {
    await requireBankStaff();
    return findSimilar(text, subjectId, excludeId);
  });
}

export async function resolveFlagAction(flagId: string, questionId: string, outcome: "resolvido" | "descartado" | "em_analise") {
  return run("flag", async () => resolveFlag(await requireBankStaff(), flagId, outcome), [`/banco/questoes/${questionId}`, "/banco"]);
}

export async function flagOutdatedAction(normNumber: string, article: string, details: string) {
  return run("outdated", async () => flagOutdated(await requireBankStaff(), normNumber, article, details), ["/banco", "/banco/questoes"]);
}

export async function saveSourceAction(id: string | null, payload: unknown) {
  return run("source", async () => saveSource(await requireBankStaff(), id, payload), ["/banco/fontes"]);
}

export async function sourceReuseAction(id: string, verified: boolean, note: string) {
  return run("source_reuse", async () => setSourceReuse(await requireBankStaff(), id, verified, note), ["/banco/fontes"]);
}

export async function createTopicAction(payload: unknown) {
  return run("topic", async () => createTopic(await requireBankStaff(), payload), ["/banco/assuntos"]);
}

export async function topicStatusAction(id: string, active: boolean) {
  return run("topic_status", async () => setTopicStatus(await requireBankStaff(), id, active), ["/banco/assuntos"]);
}

export async function createSubjectAction(payload: unknown) {
  return run("subject", async () => createSubject(await requireBankStaff(), payload), ["/banco/assuntos", "/banco"]);
}

export async function createExamAction(payload: unknown) {
  return run("exam", async () => createExam(await requireBankStaff(), payload), ["/banco/fontes"]);
}

export async function staffRoleAction(email: string, role: "autor" | "revisor", grant: boolean) {
  return run("staff", async () => setStaffRole(await requireBankStaff(), email, role, grant), ["/banco/equipe"]);
}

// ---------------------------------------------------------------------------
// Upload de questões de concurso (PDF ou .txt)
// ---------------------------------------------------------------------------

const pastedQuestions = (text: unknown) => {
  const t = typeof text === "string" ? text : "";
  if (!t.trim()) throw new UserFacingError("Cole as questões no campo.", "invalid_input");
  if (t.length > 400_000) throw new UserFacingError("Texto grande demais (máximo de 400 mil caracteres). Envie em partes.", "invalid_input");
  return t;
};

export async function previewBankUploadAction(text: string): Promise<BankResult<BankUploadPreview>> {
  return run("upload_preview", async () => {
    const staff = await requireBankStaff();
    if (!staff.roles.autor) throw new UserFacingError("Somente autores cadastram questões.", "forbidden");
    return previewBankUpload(pastedQuestions(text));
  });
}

export async function importBankUploadAction(text: string): Promise<BankResult<{ created: number; skipped: number; published: number; codes: string[] }>> {
  return run(
    "upload",
    async () => {
      const staff = await requireBankStaff();
      const t = pastedQuestions(text);
      const r = await importBankUpload(staff, t, { name: "texto colado", size: new TextEncoder().encode(t).length });
      return { created: r.created, skipped: r.skipped, published: r.published, codes: r.codes };
    },
    ["/banco", "/banco/questoes", "/questoes"],
  );
}
