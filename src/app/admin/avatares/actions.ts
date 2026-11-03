"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/services/catalog";
import { setAvatarRequestStatus, type AvatarRequestStatus } from "@/server/services/avatar";
import { UserFacingError } from "@/server/services/trails";

export async function setRequestStatusAction(id: string, status: string, note: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    await setAvatarRequestStatus(String(id), status as AvatarRequestStatus, typeof note === "string" ? note : null);
    revalidatePath("/admin/avatares");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível salvar." };
  }
}
