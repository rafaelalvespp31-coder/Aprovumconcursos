"use server";

import { requireUser } from "@/server/auth";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import { createPostit, createPostitPdf, deletePostit, listPostitPdfs, updatePostitNote, type CreatePostitInput, type Postit, type PostitPdfInfo } from "@/server/services/postits";

type R<T> = ({ ok: true } & T) | { ok: false; error: string };

async function guard<T>(what: string, fn: () => Promise<T>): Promise<R<T extends object ? T : { value: T }>> {
  try {
    const v = await fn();
    return { ok: true, ...(v as object) } as never;
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    // Erros de validação do zod e falhas inesperadas: mensagem segura, detalhe só no log.
    await logEvent(`postit.${what}_failed`, { error: (e as Error).message });
    return { ok: false, error: "Não foi possível concluir agora. Tente novamente." };
  }
}

export async function createPostitAction(input: CreatePostitInput): Promise<R<{ postit: Postit; duplicate: boolean }>> {
  const user = await requireUser();
  return guard("create", () => createPostit(user.id, input));
}

export async function updatePostitNoteAction(id: string, note: string): Promise<R<{ postit: Postit }>> {
  const user = await requireUser();
  return guard("update", async () => ({ postit: await updatePostitNote(user.id, id, note) }));
}

export async function deletePostitAction(id: string): Promise<R<{ deleted: true }>> {
  const user = await requireUser();
  return guard("delete", async () => {
    await deletePostit(user.id, id);
    return { deleted: true as const };
  });
}

export async function generatePostitPdfAction(lessonId: string): Promise<R<{ id: string; pdfVersion: number; reused: boolean; pdfs: PostitPdfInfo[] }>> {
  const user = await requireUser();
  return guard("pdf", async () => {
    const r = await createPostitPdf(user.id, lessonId);
    return { ...r, pdfs: await listPostitPdfs(lessonId) };
  });
}
