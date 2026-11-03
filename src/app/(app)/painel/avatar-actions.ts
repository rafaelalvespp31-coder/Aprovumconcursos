"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { saveMyAvatar } from "@/server/services/avatar";
import { UserFacingError, enforceRateLimit } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import type { AvatarSaveResult } from "@/components/avatar/painel-avatar";

/** Salva o avatar do aluno logado (o id vem da sessão, nunca do navegador). */
export async function saveAvatarAction(input: unknown): Promise<AvatarSaveResult> {
  const user = await requireUser("/painel");
  try {
    await enforceRateLimit(user.id, "avatar_save", 30);
    const config = await saveMyAvatar(user.id, input);
    revalidatePath("/painel");
    return { ok: true, config };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("avatar.save_failed", { error: (e as Error).message });
    return { ok: false, error: "Não foi possível salvar agora. Tente novamente." };
  }
}
