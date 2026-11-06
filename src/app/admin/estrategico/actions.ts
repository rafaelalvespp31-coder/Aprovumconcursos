"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/services/catalog";
import { UserFacingError } from "@/server/services/trails";
import { applyImport, deleteExam, previewImport, setExamStatus, type ExamStatus, type ImportPreview } from "@/server/services/strategic";

const MAX = 1_500_000;

export async function previewImportAction(json: string, examId?: string | null): Promise<ImportPreview> {
  await requireAdmin();
  if (json.length > MAX) return { ok: false, issues: [{ level: "erro", path: "json", message: "JSON grande demais (limite ~1,5 MB)." }], data: null, summary: null, existing: null };
  return previewImport(json, examId);
}

export async function applyImportAction(json: string, examId?: string | null): Promise<{ ok: true; examId: string; updated: boolean } | { ok: false; error: string }> {
  const admin = await requireAdmin();
  try {
    const r = await applyImport(admin.id, json, examId);
    revalidatePath("/admin/estrategico");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível salvar a importação." };
  }
}

export async function setStatusAction(id: string, to: ExamStatus) {
  const admin = await requireAdmin();
  await setExamStatus(admin.id, id, to);
  revalidatePath("/admin/estrategico");
  revalidatePath(`/admin/estrategico/${id}`);
}

export async function deleteExamAction(id: string) {
  const admin = await requireAdmin();
  await deleteExam(admin.id, id);
  revalidatePath("/admin/estrategico");
}
