"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/services/catalog";
import { createTestimonial, createTestimonialUpload, deleteTestimonial, setTestimonialActive } from "@/server/services/testimonials";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";

type Result = { ok: boolean; error?: string };
const fail = (e: unknown, ctx: string): Result => {
  if (!(e instanceof UserFacingError)) void logEvent(`testimonial.${ctx}_failed`, { error: (e as Error)?.message ?? String(e) });
  return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível concluir. Tente de novo." };
};
const done = (): Result => {
  revalidatePath("/admin/depoimentos");
  revalidatePath("/depoimentos");
  return { ok: true };
};

export async function prepareUploadAction(contentType: string, size: number): Promise<{ ok: true; path: string; signedUrl: string; publicUrl: string; kind: "video" | "photo" } | { ok: false; error: string }> {
  await requireAdmin();
  try {
    return { ok: true, ...(await createTestimonialUpload(contentType, size)) };
  } catch (e) {
    return { ok: false, error: fail(e, "upload").error! };
  }
}

export async function createTestimonialAction(input: { name: string; headline?: string; videoUrl?: string; photoUrl?: string; paths?: string[] }): Promise<Result> {
  await requireAdmin();
  try {
    await createTestimonial(input);
    return done();
  } catch (e) {
    return fail(e, "create");
  }
}

export async function toggleTestimonialAction(id: string, active: boolean): Promise<Result> {
  await requireAdmin();
  try {
    await setTestimonialActive(id, active);
    return done();
  } catch (e) {
    return fail(e, "toggle");
  }
}

export async function deleteTestimonialAction(id: string): Promise<Result> {
  await requireAdmin();
  try {
    await deleteTestimonial(id);
    return done();
  } catch (e) {
    return fail(e, "delete");
  }
}
