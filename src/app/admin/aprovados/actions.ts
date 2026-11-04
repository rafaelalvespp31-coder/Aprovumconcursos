"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/services/catalog";
import { createApprovedBanner, createApprovedBannerFiles, deleteApprovedBanner, updateApprovedBanner } from "@/server/services/approved-banners";
import { logEvent } from "@/server/observability";
import { UserFacingError } from "@/server/services/trails";

type Result = { ok: boolean; error?: string };
const done = () => {
  revalidatePath("/admin/aprovados");
  revalidatePath("/painel");
  return { ok: true };
};
const fail = (e: unknown): Result => {
  if (!(e instanceof UserFacingError)) void logEvent("approved_banner.failed", { error: (e as Error)?.message ?? String(e) });
  return failResult(e);
};
const failResult = (e: unknown): Result => ({ ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível salvar. Tente de novo ou use outra imagem." });

export async function createBannerAction(form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const f = form.get("foto");
    await createApprovedBanner(admin.id, f instanceof File ? f : null, form.get("alt"), form.get("ordem"));
    return done();
  } catch (e) {
    return fail(e);
  }
}

/** Um aprovado por chamada: a arte já ajustada no navegador (grande e pequena). */
export async function publishApprovedAction(form: FormData): Promise<Result> {
  const admin = await requireAdmin();
  try {
    const f = (k: string) => { const v = form.get(k); return v instanceof File ? v : null; };
    await createApprovedBannerFiles(admin.id, f("grande"), f("pequena"), form.get("alt"), form.get("ordem"), String(form.get("nome") ?? ""));
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function updateBannerAction(id: string, form: FormData): Promise<Result> {
  await requireAdmin();
  try {
    await updateApprovedBanner(id, form.get("alt"), form.get("ordem"), form.get("ativo") === "on");
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function deleteBannerAction(id: string): Promise<Result> {
  await requireAdmin();
  try {
    await deleteApprovedBanner(id);
    return done();
  } catch (e) {
    return fail(e);
  }
}
