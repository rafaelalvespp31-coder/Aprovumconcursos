"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { activateTrail, setTrailArchived, UserFacingError } from "@/server/services/trails";

export async function startTrailAction(trailId: string) {
  const user = await requireUser();
  try {
    await activateTrail(trailId, user.id);
  } catch (e) {
    if (e instanceof UserFacingError) redirect(`/trilhas/${trailId}?erro=${encodeURIComponent(e.message)}`);
    throw e;
  }
  revalidatePath(`/trilhas/${trailId}`);
  redirect(`/trilhas/${trailId}`);
}

export async function archiveTrailAction(trailId: string, archived: boolean) {
  const user = await requireUser();
  await setTrailArchived(trailId, user.id, archived);
  revalidatePath("/trilhas");
  revalidatePath(`/trilhas/${trailId}`);
}
