"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/services/catalog";
import { createApprovedBanner, deleteApprovedBanner, updateApprovedBanner } from "@/server/services/approved-banners";
import { UserFacingError } from "@/server/services/trails";

type Result = { ok: boolean; error?: string };
const done = () => {
  revalidatePath("/admin/aprovados");
  revalidatePath("/painel");
  return { ok: true };
};
const fail = (e: unknown): Result => ({ ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível salvar." });

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
