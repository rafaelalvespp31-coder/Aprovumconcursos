"use server";

import { requireUser } from "@/server/auth";
import { requestPlan } from "@/server/services/plan-requests";
import { UserFacingError } from "@/server/services/trails";
import { logEvent } from "@/server/observability";

export type ChoosePlanResult = { ok: true; url: string | null } | { ok: false; error: string };

export async function choosePlanAction(plan: string): Promise<ChoosePlanResult> {
  const user = await requireUser("/plano");
  try {
    return { ok: true, ...(await requestPlan(user.id, plan)) };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent("plan.request.failed", { error: (e as Error).message });
    return { ok: false, error: "Não foi possível enviar agora. Tente novamente." };
  }
}
