"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/server/auth";
import { UserFacingError } from "@/server/services/trails";
import { createFolder, deleteFolder, moveTrailToFolder, reorderTrail, updateFolder } from "@/server/services/folders";
import { logEvent } from "@/server/observability";

export interface FolderResult {
  ok: boolean;
  error?: string;
}

async function run(name: string, fn: (userId: string) => Promise<unknown>): Promise<FolderResult> {
  const user = await requireUser();
  try {
    await fn(user.id);
    revalidatePath("/trilhas");
    return { ok: true };
  } catch (e) {
    if (e instanceof UserFacingError) return { ok: false, error: e.message };
    await logEvent(`folder.${name}_failed`, { error: (e as Error).message });
    return { ok: false, error: "Não foi possível concluir. Tente novamente." };
  }
}

export async function createFolderAction(name: string, color?: string) {
  return run("create", (u) => createFolder(u, name, color));
}
export async function renameFolderAction(folderId: string, name: string) {
  return run("rename", (u) => updateFolder(u, folderId, { name }));
}
export async function deleteFolderAction(folderId: string) {
  return run("delete", (u) => deleteFolder(u, folderId));
}
export async function moveTrailAction(trailId: string, folderId: string | null) {
  return run("move", (u) => moveTrailToFolder(u, trailId, folderId || null));
}
export async function reorderTrailAction(trailId: string, direction: "up" | "down") {
  return run("reorder", (u) => reorderTrail(u, trailId, direction));
}
