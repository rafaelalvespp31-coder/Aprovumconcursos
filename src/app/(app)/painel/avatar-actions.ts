"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { saveMyAvatar, submitAvatarRequest, type AvatarRequest } from "@/server/services/avatar";
import { UserFacingError, enforceRateLimit } from "@/server/services/trails";
import { logEvent } from "@/server/observability";
import { ackLevelUps } from "@/server/services/gamification";
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

export type AvatarRequestResult = { ok: true; request: AvatarRequest } | { ok: false; error: string };

/** "Solicitar meu avatar": recebe a foto de corpo inteiro do aluno logado. */
export async function requestAvatarAction(form: FormData): Promise<AvatarRequestResult> {
  const user = await requireUser("/painel");
  try {
    await enforceRateLimit(user.id, "avatar_request", 3, 3600);
    const file = form.get("foto");
    if (!(file instanceof File) || !file.size) return { ok: false, error: "Escolha uma foto de corpo inteiro." };
    const request = await submitAvatarRequest(user.id, file);
    revalidatePath("/painel");
    return { ok: true, request };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("avatar.request_failed", { error: (e as Error).message });
    return { ok: false, error: "Não foi possível enviar a foto agora. Tente novamente." };
  }
}

/** Fecha o aviso de LEVEL UP do aluno logado (não mexe em XP nem nível). */
export async function ackLevelUpsAction(): Promise<void> {
  const user = await requireUser("/painel");
  await ackLevelUps(user.id);
}
