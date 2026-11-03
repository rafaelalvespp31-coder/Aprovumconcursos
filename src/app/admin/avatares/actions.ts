"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/server/services/catalog";
import { removeCustomAvatar, saveCustomAvatar, setAvatarRequestStatus, type AvatarRequestStatus } from "@/server/services/avatar";
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

/** Anexa a arte pronta como avatar do aluno da solicitação. */
export async function saveCustomAvatarAction(id: string, form: FormData): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    const art = form.get("arte");
    const lids = form.get("palpebras");
    await saveCustomAvatar(id, art instanceof File ? art : null, lids instanceof File ? lids : null, form.get("params"));
    revalidatePath("/admin/avatares");
    revalidatePath("/painel");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível salvar o avatar." };
  }
}

export async function removeCustomAvatarAction(id: string): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  try {
    await removeCustomAvatar(id);
    revalidatePath("/admin/avatares");
    revalidatePath("/painel");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof UserFacingError ? e.message : "Não foi possível remover." };
  }
}
