"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth";
import { createTrail, UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";

export interface CreateTrailState {
  error?: string;
}

export async function createTrailAction(_: CreateTrailState, form: FormData): Promise<CreateTrailState> {
  const user = await requireUser("/nova-trilha");
  let result: { trailId: string; jobId: string };
  try {
    result = await createTrail(user.id, {
      board: form.get("board") || undefined,
      otherBoardName: form.get("otherBoardName") || undefined,
      contentType: form.get("contentType") || undefined,
      content: String(form.get("content") ?? ""),
      title: form.get("title") || undefined,
    });
  } catch (err) {
    if (err instanceof UserFacingError) return { error: err.message };
    await logEvent("trail.create_error", { userId: user.id, error: (err as Error).message });
    return { error: "Não foi possível criar a trilha agora. Tente novamente em instantes." };
  }
  redirect(`/trilhas/${result.trailId}/processando?job=${result.jobId}`);
}
